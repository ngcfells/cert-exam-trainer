import { expect, type Page } from '@playwright/test';
import { singleUrl, openExam } from './util';

const OTHER_TYPES = [
  'Multiple choice',
  'Type a number',
  'Drag-and-drop match',
  'Order the steps',
  'Configure fields',
  'Label a diagram',
  'Data table or chart',
  'Select-all hotspot',
  'Sort into buckets',
];

/** Practice DA0-002 with only the "Logs and terminal" question (the grep log question). */
export async function startTerminalPractice(page: Page) {
  await page.goto(`${singleUrl}?seed=4`);
  await openExam(page, 'DA0-002');
  await page.getByRole('button', { name: 'Practice: DA0-002' }).click();
  for (const name of OTHER_TYPES) await page.getByRole('checkbox', { name }).uncheck();
  await page.getByRole('button', { name: 'Start practice' }).click();
  await expect(page.getByRole('button', { name: 'Command help' })).toBeVisible();
}
