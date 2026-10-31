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

for (const name of PBQ_NAMES) {
  test(`a one-question ${name} practice renders and passes axe`, async ({ page }) => {
    await page.goto(bankUrl);
    await page.getByRole('button', { name: 'Practice: DA0-002' }).click();
    await page.getByRole('checkbox', { name: 'Multiple choice' }).uncheck();
    for (const other of PBQ_NAMES) if (other !== name) await page.getByRole('checkbox', { name: other }).uncheck();
    await page.getByRole('spinbutton', { name: 'Number of questions' }).fill('1');
    await page.getByRole('button', { name: 'Start practice' }).click();
    await expect(page.getByRole('heading', { name: 'Item 1 of 1' })).toBeVisible();
    await expectNoSeriousAxe(page);
  });
}
