import { test, expect, type Page } from '@playwright/test';
import { allExams, expectNoSeriousAxe, openExam, singleUrl } from './util';

// Answer marks (issue #10): every style is axe clean and fits at phone and tablet width, light and dark.
// Named *.responsive.spec.ts so it runs in the phone and tablet projects.
const STYLES = ['Check and X banner', 'Smiley and frowny', 'Thumbs up and down', "Grader's stamp", 'Circle, triangle, cross', 'Quiet edge', 'Plain text'];
const PBQ_NAMES = ['Drag-and-drop match', 'Order the steps', 'Configure fields', 'Label a diagram', 'Logs and terminal', 'Data table or chart', 'Select-all hotspot', 'Sort into buckets'];

async function fitsAndAxeClean(page: Page, where: string) {
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    const width = page.viewportSize()!.width;
    const scroll = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scroll, `horizontal overflow on ${where} (${colorScheme})`).toBeLessThanOrEqual(width);
    await expectNoSeriousAxe(page);
  }
}

async function chooseStyle(page: Page, style: string) {
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('radio', { name: style }).check();
  await allExams(page);
}

async function startPractice(page: Page, count: number) {
  await openExam(page, 'DA0-002');
  await page.getByRole('button', { name: 'Practice: DA0-002' }).click();
  for (const name of [...PBQ_NAMES, 'Type a number']) await page.getByRole('checkbox', { name }).uncheck();
  await page.getByRole('spinbutton', { name: 'Number of questions' }).fill(String(count));
  await page.getByRole('button', { name: 'Start practice' }).click();
  await expect(page.getByRole('heading', { name: `Item 1 of ${count}` })).toBeVisible();
}

test('the Settings mark previews fit and are axe clean', async ({ page }) => {
  await page.goto(singleUrl);
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('group', { name: 'Answer marks' })).toBeVisible();
  await fitsAndAxeClean(page, 'settings');
});

for (const style of STYLES) {
  test(`${style}: a partly right check and the results review fit and are axe clean`, async ({ page }) => {
    await page.goto(singleUrl);
    await chooseStyle(page, style);
    // The fixture bank's two MCQs: a single-answer one and "Which TWO … central tendency?" (Median and Mode).
    await startPractice(page, 2);
    const median = page.getByLabel('Median', { exact: true });
    if (!(await median.isVisible())) await page.getByRole('button', { name: 'Next', exact: true }).click();
    await median.check();
    await page.getByRole('button', { name: 'Check answer' }).click();
    await expect(page.getByRole('status')).toHaveText(/^Partly correct/);
    await fitsAndAxeClean(page, `${style} check`);

    // The other question is reached but left unanswered (unreached ones are left out of the result),
    // so the review shows a partly mark and a "Not answered" mark.
    if (await page.getByRole('heading', { name: 'Item 1 of 2' }).isVisible()) await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.getByRole('button', { name: 'Finish', exact: true }).click();
    await page.getByRole('dialog', { name: 'Finish now?' }).getByRole('button', { name: 'Finish', exact: true }).click();
    await expect(page.getByRole('heading', { name: /^Practice complete/ })).toBeVisible();
    await expect(page.locator('.mark.mark-partly')).toHaveCount(1);
    await expect(page.locator('.mark.mark-wrong')).toHaveText('Incorrect. Not answered');
    await fitsAndAxeClean(page, `${style} results review`);
  });
}
