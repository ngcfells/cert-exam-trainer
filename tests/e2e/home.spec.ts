import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import path from 'node:path';
import { singleUrl } from './util';

test('home screen lists Data+ and passes axe', async ({ page }) => {
  await page.goto(singleUrl);
  await expect(page.getByText('CompTIA Data+ (DA0-002)')).toBeVisible();
  await expect(page.getByText('11 questions (ours)')).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  const bad = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(bad).toEqual([]);
});

test('importing a backup with one user question updates the mine count', async ({ page }) => {
  await page.goto(singleUrl);
  await expect(page.getByText('0 questions (mine)')).toBeVisible();
  await page.getByLabel(/import backup/i).setInputFiles(path.resolve('tests/e2e/fixtures/backup-one-question.json'));
  await expect(page.getByText('1 question (mine)')).toBeVisible();
});
