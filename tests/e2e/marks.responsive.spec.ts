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
  test(`${style}: a checked answer fits and is axe clean`, async ({ page }) => {
    await page.goto(singleUrl);
    await chooseStyle(page, style);
    await startPractice(page, 1);
    await page.locator('.mcq input').first().check();
    await page.getByRole('button', { name: 'Check answer' }).click();
    await expect(page.getByRole('status')).toHaveText(/^(Correct|Partly correct|Incorrect)/);
    await fitsAndAxeClean(page, `${style} check`);
  });
}

test('the results review marks an unanswered question', async ({ page }) => {
  await page.goto(singleUrl);
  await chooseStyle(page, 'Smiley and frowny');
  await startPractice(page, 1);
  await page.getByRole('button', { name: 'Finish', exact: true }).click();
  await page.getByRole('dialog', { name: 'Finish now?' }).getByRole('button', { name: 'Finish', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^Practice complete/ })).toBeVisible();
  await expect(page.locator('.mark.mark-wrong').first()).toHaveText('Incorrect. Not answered');
  await fitsAndAxeClean(page, 'results review');
});
