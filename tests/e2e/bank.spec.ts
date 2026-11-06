import { readdirSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { test, expect, type Page } from '@playwright/test';
import { expectNoSeriousAxe, openExam } from './util';

// Runs against the shipped bank (dist-single), not the fixture build.
const bankUrl = pathToFileURL(path.resolve('dist-single/index.html')).href;

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

const examCard = (page: Page, code: string) => page.getByRole('button', { name: new RegExp(`\\(${code}\\)`) });

test('Home shows the full Data+ bundled count', async ({ page }) => {
  await page.goto(bankUrl);
  const text = await examCard(page, 'DA0-002').getByText(/^Stock: \d+ questions$/).textContent();
  expect(Number(text?.match(/\d+/)?.[0])).toBeGreaterThanOrEqual(580);
});

// The bank fills the exam: 90 slots, where each PBQ takes its weight in slots, so fewer than 90 items show.
test('a mock exam is filled from the bank', async ({ page }) => {
  await page.goto(`${bankUrl}?seed=1`);
  await openExam(page, 'DA0-002');
  await page.getByRole('button', { name: 'Start mock exam: DA0-002' }).click();
  await page.getByRole('checkbox', { name: 'I understand' }).check();
  await page.getByRole('button', { name: 'Start exam' }).click();
  const text = await page.getByText(/^Question 1 of \d+$/).textContent();
  const total = Number(text?.match(/\d+$/)?.[0]);
  expect(total).toBeGreaterThanOrEqual(75);
  expect(total).toBeLessThanOrEqual(90);
});

test('a one-question typed-number practice renders and passes axe', async ({ page }) => {
  await page.goto(bankUrl);
  await openExam(page, 'DA0-002');
  await page.getByRole('button', { name: 'Practice: DA0-002' }).click();
  await page.getByRole('checkbox', { name: 'Multiple choice' }).uncheck();
  for (const other of PBQ_NAMES) await page.getByRole('checkbox', { name: other }).uncheck();
  await page.getByRole('spinbutton', { name: 'Number of questions' }).fill('1');
  await page.getByRole('button', { name: 'Start practice' }).click();
  await expect(page.getByRole('textbox')).toHaveAttribute('inputmode', 'decimal');
  await expectNoSeriousAxe(page);
});

test('the percent-change lesson renders from the shipped bank and passes axe', async ({ page }) => {
  await page.goto(bankUrl);
  await openExam(page, 'DA0-002');
  await page.getByRole('button', { name: 'Learn: DA0-002' }).click();
  await page.getByRole('button', { name: 'Percent change' }).click();
  await expect(page.getByRole('table', { name: /Percent change from May to June/ })).toBeVisible();
  await expectNoSeriousAxe(page);
  await page.getByRole('button', { name: 'Start the check (3 questions)' }).click();
  await expect(page.getByRole('heading', { name: 'Item 1 of 3' })).toBeVisible();
  await expectNoSeriousAxe(page);
});

// Issue #1: every shipped hotspot label must fit inside its spot, at phone width too.
for (const width of [360, 1280]) {
  test(`every hotspot label fits its spot at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(bankUrl);
    await openExam(page, 'DA0-002');
    await page.getByRole('button', { name: 'Practice: DA0-002' }).click();
    await page.getByRole('checkbox', { name: 'Multiple choice' }).uncheck();
    await page.getByRole('checkbox', { name: 'Type a number' }).uncheck();
    for (const other of PBQ_NAMES) if (other !== 'Select-all hotspot') await page.getByRole('checkbox', { name: other }).uncheck();
    await page.getByRole('spinbutton', { name: 'Number of questions' }).fill('50');
    await page.getByRole('button', { name: 'Start practice' }).click();
    const heading = page.getByRole('heading', { name: /^Item 1 of \d+$/ });
    const total = Number((await heading.textContent())!.match(/of (\d+)/)![1]);
    expect(total).toBeGreaterThanOrEqual(10);
    for (let i = 1; i <= total; i++) {
      await expect(page.getByRole('heading', { name: `Item ${i} of ${total}` })).toBeVisible();
      const overflow = await page.locator('.hotspot .spot-label').evaluateAll((els) =>
        els.filter((e) => e.scrollHeight > e.clientHeight + 1 || e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent),
      );
      expect(overflow, `item ${i}`).toEqual([]);
      if (i < total) await page.getByRole('button', { name: 'Next', exact: true }).click();
    }
  });
}

for (const name of PBQ_NAMES) {
  test(`a one-question ${name} practice renders and passes axe`, async ({ page }) => {
    await page.goto(bankUrl);
    await openExam(page, 'DA0-002');
    await page.getByRole('button', { name: 'Practice: DA0-002' }).click();
    await page.getByRole('checkbox', { name: 'Multiple choice' }).uncheck();
    await page.getByRole('checkbox', { name: 'Type a number' }).uncheck();
    for (const other of PBQ_NAMES) if (other !== name) await page.getByRole('checkbox', { name: other }).uncheck();
    await page.getByRole('spinbutton', { name: 'Number of questions' }).fill('1');
    await page.getByRole('button', { name: 'Start practice' }).click();
    await expect(page.getByRole('heading', { name: 'Item 1 of 1' })).toBeVisible();
    await expectNoSeriousAxe(page);
  });
}

// CY0-001 (SecAI+): runs once the shipped bank has approved items. Read from the JSON files, since
// Playwright cannot evaluate the app's import.meta.glob.
const PBQ_TEMPLATES = ['pbq-match', 'pbq-order', 'pbq-config', 'pbq-diagram', 'pbq-terminal', 'pbq-data', 'pbq-hotspot', 'pbq-buckets'];
const secAiDir = path.resolve('src/banks/secai/items');
const secAiApproved = readdirSync(secAiDir)
  .filter((f) => f.endsWith('.json'))
  .flatMap((f) => JSON.parse(readFileSync(path.join(secAiDir, f), 'utf8')) as { type: string; status: string }[])
  .filter((q) => q.status === 'approved');

test.describe('CY0-001 shipped bank', () => {
  test.skip(secAiApproved.length < 1, 'no approved CY0-001 items yet');

  // 60 slots; PBQs take their weight in slots (at most 6 PBQs of weight up to 6), so 30 to 60 items show once the bank fills the exam.
  test('a mock exam is filled from the bank', async ({ page }) => {
    await page.goto(`${bankUrl}?seed=1`);
    await openExam(page, 'CY0-001');
    await page.getByRole('button', { name: 'Start mock exam: CY0-001' }).click();
    await page.getByRole('checkbox', { name: 'I understand' }).check();
    await page.getByRole('button', { name: 'Start exam' }).click();
    const text = await page.getByText(/^Question 1 of \d+$/).textContent();
    const total = Number(text?.match(/\d+$/)?.[0]);
    expect(total).toBeGreaterThanOrEqual(Math.min(30, secAiApproved.length));
    expect(total).toBeLessThanOrEqual(60);
    await expectNoSeriousAxe(page);
  });

  PBQ_TEMPLATES.forEach((type, i) => {
    const name = PBQ_NAMES[i];
    test(`a one-question ${name} practice renders and passes axe`, async ({ page }) => {
      test.skip(!secAiApproved.some((q) => q.type === type), `no approved ${type} yet`);
      await page.goto(bankUrl);
      await openExam(page, 'CY0-001');
      await page.getByRole('button', { name: 'Practice: CY0-001' }).click();
      await page.getByRole('checkbox', { name: 'Multiple choice' }).uncheck();
      await page.getByRole('checkbox', { name: 'Type a number' }).uncheck();
      for (const other of PBQ_NAMES) if (other !== name) await page.getByRole('checkbox', { name: other }).uncheck();
      await page.getByRole('spinbutton', { name: 'Number of questions' }).fill('1');
      await page.getByRole('button', { name: 'Start practice' }).click();
      await expect(page.getByRole('heading', { name: 'Item 1 of 1' })).toBeVisible();
      await expectNoSeriousAxe(page);
    });
  });
});
