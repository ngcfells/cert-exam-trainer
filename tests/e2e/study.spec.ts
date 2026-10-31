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
  await expect(page.getByRole('heading', { name: /^Practice complete/ })).toBeVisible();
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
