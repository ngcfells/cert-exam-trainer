import { test, expect } from '@playwright/test';
import { singleUrl, openExam } from './util';

test('mock: no Command help on any item', async ({ page }) => {
  await page.goto(`${singleUrl}?seed=4`);
  await openExam(page, 'DA0-002');
  await page.getByRole('button', { name: 'Start mock exam: DA0-002' }).click();
  await page.getByRole('checkbox', { name: 'I understand' }).check();
  await page.getByRole('button', { name: 'Start exam' }).click();
  for (let i = 1; i <= 9; i++) {
    await expect(page.getByRole('heading', { name: `Question ${i}`, exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Command help' })).toHaveCount(0);
    if (i < 9) await page.getByRole('button', { name: 'Next', exact: true }).click();
  }
});
