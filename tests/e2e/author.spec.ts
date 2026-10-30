import { test, expect } from '@playwright/test';
import { expectNoSeriousAxe, singleUrl } from './util';

test('add an MCQ, switch to Mine, and practice it', async ({ page }) => {
  await page.goto(singleUrl);
  await page.getByRole('button', { name: 'My questions: DA0-002' }).click();
  await expect(page.getByText(/solely responsible/)).toBeVisible();
  await expectNoSeriousAxe(page);

  await page.getByRole('checkbox', { name: 'I understand' }).check();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Add question' }).click();
  await expect(page.getByRole('heading', { name: 'Add question' })).toBeVisible();

  await page.getByLabel('Question text').fill('Which value is the largest?');
  for (const [i, t] of ['Ten', 'Two', 'Five', 'One'].entries()) await page.getByLabel(`Option ${i + 1}`, { exact: true }).fill(t);
  await page.getByLabel('Option 1 is correct').check();
  await expect(page.getByRole('region', { name: 'Preview' })).toContainText('Which value is the largest?');
  await expectNoSeriousAxe(page);

  await page.getByLabel('Question type').selectOption('pbq-hotspot');
  await expect(page.getByRole('region', { name: 'Preview' })).toBeVisible();
  await expectNoSeriousAxe(page);
  await page.getByLabel('Question type').selectOption('mcq-single');
  await page.getByLabel('Option 1 is correct').check();

  await page.getByRole('button', { name: 'Save question' }).click();
  await expect(page.getByRole('button', { name: 'Edit: Which value is the largest?' })).toBeVisible();
  await expectNoSeriousAxe(page);

  await page.getByRole('button', { name: 'Back to home' }).click();
  await page.getByRole('radio', { name: 'Mine' }).check();
  await page.getByRole('button', { name: 'Practice: DA0-002' }).click();
  await expect(page.getByRole('status')).toHaveText(/Only 1 question match/);
  await page.getByRole('button', { name: 'Start practice' }).click();
  await expect(page.getByText('Which value is the largest?')).toBeVisible();
});
