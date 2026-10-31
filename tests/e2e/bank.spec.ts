import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { expectNoSeriousAxe } from './util';

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

test('Home shows the full Data+ bundled count', async ({ page }) => {
  await page.goto(bankUrl);
  const text = await page.getByText(/^\d+ questions \(ours\)$/).first().textContent();
  expect(Number(text?.match(/^\d+/)?.[0])).toBeGreaterThanOrEqual(580);
});

// The bank fills the exam: 90 slots, where each PBQ takes its weight in slots, so fewer than 90 items show.
test('a mock exam is filled from the bank', async ({ page }) => {
  await page.goto(`${bankUrl}?seed=1`);
  await page.getByRole('button', { name: /start mock exam/i }).click();
  await page.getByRole('button', { name: 'Start exam' }).click();
  const text = await page.getByText(/^Question 1 of \d+$/).textContent();
  const total = Number(text?.match(/\d+$/)?.[0]);
  expect(total).toBeGreaterThanOrEqual(75);
  expect(total).toBeLessThanOrEqual(90);
});

test('a one-question typed-number practice renders and passes axe', async ({ page }) => {
  await page.goto(bankUrl);
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
      if (i < total) await page.getByRole('button', { name: 'Next' }).click();
    }
  });
}

for (const name of PBQ_NAMES) {
  test(`a one-question ${name} practice renders and passes axe`, async ({ page }) => {
    await page.goto(bankUrl);
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
