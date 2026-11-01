import { test, expect, type Page } from '@playwright/test';
import { expectNoSeriousAxe, singleUrl, openExam, topNav } from './util';

const PBQ_NAMES = [
  'Drag-and-drop match',
  'Order the steps',
  'Configure fields',
  'Label a diagram',
  'Logs and terminal',
  'Data table or chart',
  'Select-all hotspot',
  'Sort into buckets',
];

/** Practice and cram ask before finishing with unfinished questions; answer Finish. */
async function finishAnyway(page: Page) {
  const dialog = page.getByRole('dialog', { name: 'Finish now?' });
  // Wait for either the dialog or the summary, so the check below doesn't race the render.
  await expect(dialog.or(page.getByRole('heading', { name: /complete/ }))).toBeVisible();
  if (await dialog.isVisible()) await dialog.getByRole('button', { name: 'Finish', exact: true }).click();
}

/** Practice setup limited to the bundled MCQs, `count` questions. */
async function mcqOnlyPractice(page: Page, count: number) {
  for (const name of [...PBQ_NAMES, 'Type a number']) await page.getByRole('checkbox', { name }).uncheck();
  await page.getByRole('spinbutton', { name: 'Number of questions' }).fill(String(count));
}

async function submitEmptyMock(page: Page) {
  await page.goto(`${singleUrl}?seed=4`);
  await openExam(page, 'DA0-002');
  await page.getByRole('button', { name: 'Start mock exam: DA0-002' }).click();
  await page.getByRole('button', { name: 'Start exam' }).click();
  for (let i = 1; i < 9; i++) await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Review', exact: true }).click();
  await page.getByRole('button', { name: 'Submit exam' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.getByRole('heading', { name: /your score/i })).toBeVisible();
}

test('practice setup, a checked question and results pass axe', async ({ page }) => {
  await page.goto(singleUrl);
  await openExam(page, 'DA0-002');
  await page.getByRole('button', { name: 'Practice: DA0-002' }).click();
  await expect(page.getByRole('heading', { name: /^Practice:/ })).toBeVisible();
  await expectNoSeriousAxe(page);

  await mcqOnlyPractice(page, 2);
  await expect(page.getByRole('status')).toHaveText('2 questions match.');
  await page.getByRole('button', { name: 'Start practice' }).click();
  await expect(page.getByRole('heading', { name: 'Item 1 of 2' })).toBeVisible();
  await expectNoSeriousAxe(page);

  await page.locator('.mcq input').first().check();
  await page.getByRole('button', { name: 'Check answer' }).click();
  await expect(page.getByRole('status')).toHaveText(/^(Correct|Partly correct|Incorrect)$/);
  await expectNoSeriousAxe(page);

  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Finish' }).click();
  // Item 2 is unanswered, so practice asks first. Item 1 counts too if it is a select-two with one pick
  // (the run's order is random).
  const dialog = page.getByRole('dialog', { name: 'Finish now?' });
  await expect(dialog).toContainText(/You have (1 unanswered or partly answered question|2 unanswered or partly answered questions)\./);
  await expect(dialog.getByRole('button', { name: 'Keep going' })).toBeFocused();
  await expectNoSeriousAxe(page);
  await dialog.getByRole('button', { name: 'Finish', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^Practice complete/ })).toBeVisible();
  await expectNoSeriousAxe(page);
});

test('practice with every PBQ type passes axe on each item', async ({ page }) => {
  await page.goto(`${singleUrl}?seed=1`);
  await openExam(page, 'DA0-002');
  await page.getByRole('button', { name: 'Practice: DA0-002' }).click();
  await page.getByRole('checkbox', { name: 'Multiple choice' }).uncheck();
  await page.getByRole('checkbox', { name: 'Type a number' }).uncheck();
  await expect(page.getByRole('status')).toHaveText('Only 8 questions match; the session will use all of them.');
  await page.getByRole('radio', { name: 'At the end' }).check();
  await page.getByRole('button', { name: 'Start practice' }).click();
  for (let i = 1; i <= 8; i++) {
    await expect(page.getByRole('heading', { name: `Item ${i} of 8` })).toBeVisible();
    await expectNoSeriousAxe(page);
    if (i < 8) await page.getByRole('button', { name: 'Next' }).click();
  }
  await page.getByRole('button', { name: 'Finish' }).click();
  await finishAnyway(page);
  await expect(page.getByRole('heading', { name: /^Practice complete/ })).toBeVisible();
});

// Plan Review Focus 1: code in a stem stays readable on a phone, with no sideways scroll.
test('an AT0-001 code block fits a 360 px screen and passes axe', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto(singleUrl);
  await openExam(page, 'AT0-001');
  await page.getByRole('button', { name: 'Practice: AT0-001' }).click();
  // Domain 3 holds only the fixture item with the YAML block (at1-fx-mcq-002).
  for (const d of ['1', '2', '4']) await page.getByRole('checkbox', { name: `All of domain ${d}` }).uncheck();
  await expect(page.getByRole('status')).toHaveText(/^Only 1 question matches/);
  await page.getByRole('button', { name: 'Start practice' }).click();
  await expect(page.getByRole('heading', { name: 'Item 1 of 1' })).toBeVisible();
  const block = page.locator('.code-block');
  await expect(block).toBeVisible();
  await expect(block).toContainText('needs: [unit-tests]');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  const box = (await block.boundingBox())!;
  expect(box.x + box.width).toBeLessThanOrEqual(360);
  await expectNoSeriousAxe(page);
});

test('practice can be completed with the keyboard only', async ({ page }) => {
  await page.goto(singleUrl);
  await openExam(page, 'DA0-002');
  await page.getByRole('button', { name: 'Practice: DA0-002' }).focus();
  await page.keyboard.press('Enter');
  for (const name of [...PBQ_NAMES, 'Type a number']) {
    await page.getByRole('checkbox', { name }).focus();
    await page.keyboard.press('Space');
  }
  await page.getByRole('spinbutton', { name: 'Number of questions' }).focus();
  await page.keyboard.press('Control+A');
  await page.keyboard.type('1');
  await page.getByRole('button', { name: 'Start practice' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Item 1 of 1' })).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Space');
  await page.getByRole('button', { name: 'Check answer' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toHaveText(/^(Correct|Partly correct|Incorrect)$/);
  await page.getByRole('button', { name: 'Finish' }).focus();
  await page.keyboard.press('Enter');
  // A select-two item with one pick is partly answered: the dialog opens on Keep going.
  const dialog = page.getByRole('dialog', { name: 'Finish now?' });
  await expect(dialog.or(page.getByRole('heading', { name: /^Practice complete/ }))).toBeVisible();
  if (await dialog.isVisible()) {
    await page.keyboard.press('Shift+Tab');
    await expect(dialog.getByRole('button', { name: 'Finish', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
  }
  await expect(page.getByRole('heading', { name: /^Practice complete/ })).toBeFocused();
});

test('cram with a countdown passes axe and reaches the summary', async ({ page }) => {
  await page.goto(singleUrl);
  await openExam(page, 'DA0-002');
  await page.getByRole('button', { name: 'Cram: DA0-002' }).click();
  await expect(page.getByRole('heading', { name: /^Cram:/ })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Use a countdown' }).check();
  await expect(page.getByRole('spinbutton', { name: 'Minutes' })).toHaveValue('10');
  await expectNoSeriousAxe(page);
  await page.getByRole('button', { name: 'Start cram' }).click();
  await expect(page.getByRole('timer')).toHaveText(/^(10:00|9:5\d)$/);
  await expectNoSeriousAxe(page);
  await page.getByRole('button', { name: 'Finish now' }).click();
  await finishAnyway(page);
  await expect(page.getByRole('heading', { name: /^Cram complete/ })).toBeVisible();
  await expectNoSeriousAxe(page);
});

test('progress after a mock exam shows history and passes axe', async ({ page }) => {
  await submitEmptyMock(page);
  await topNav(page).getByRole('button', { name: '← Back to Data+' }).click();
  await page.getByRole('button', { name: 'Progress: DA0-002' }).click();
  const history = page.getByRole('table', { name: 'History' });
  await expect(history.getByRole('row')).toHaveCount(2);
  await expect(history).toContainText('Mock exam');
  await expect(page.getByRole('table', { name: 'Mastery by domain' })).toContainText('0%');
  await expectNoSeriousAxe(page);
});

test('Drill these from mock results opens practice with the weak objectives checked', async ({ page }) => {
  await submitEmptyMock(page);
  await page.getByRole('button', { name: 'Drill these' }).click();
  await expect(page.getByRole('heading', { name: /^Practice:/ })).toBeVisible();
  const checked = await page.getByRole('checkbox', { name: /^\d\.\d / }).evaluateAll((els) => els.filter((e) => (e as HTMLInputElement).checked).length);
  expect(checked).toBeGreaterThan(0);
  expect(checked).toBeLessThanOrEqual(5);
});
