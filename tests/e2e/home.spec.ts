import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import { expectNoSeriousAxe, openExam, singleUrl, allExams } from './util';

const card = (page: Page, code: string) => page.getByRole('button', { name: new RegExp(`\\(${code}\\)`) });

test('home shows one card per exam with its counts and passes axe', async ({ page }) => {
  await page.goto(singleUrl);
  await expect(card(page, 'DA0-002')).toContainText('CompTIA Data+ (DA0-002)');
  await expect(card(page, 'CY0-001')).toContainText('CompTIA SecAI+ (CY0-001)');
  await expect(card(page, 'AT0-001')).toContainText('CompTIA AutoOps+ (AT0-001)');
  await expect(card(page, 'DA0-002').getByText('Stock: 11 questions', { exact: true })).toBeVisible();
  await expect(card(page, 'DA0-002').getByText('Custom: 0 questions', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Settings' })).toBeVisible();
  // The study tools live on each exam's page, not on Home.
  await expect(page.getByRole('button', { name: 'Practice: DA0-002' })).toHaveCount(0);
  await expectNoSeriousAxe(page);
});

test('each exam page shows only the tools that exam has', async ({ page }) => {
  await page.goto(singleUrl);
  await openExam(page, 'DA0-002');
  await expect(page.getByRole('button', { name: 'Learn: DA0-002' })).toBeVisible();
  await allExams(page);
  await openExam(page, 'CY0-001');
  await expect(page.getByRole('button', { name: 'Practice: CY0-001' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Learn: CY0-001' })).toHaveCount(0);
  await allExams(page);
  await openExam(page, 'AT0-001');
  await expect(page.getByRole('button', { name: 'Practice: AT0-001' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Acronyms: AT0-001' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Learn: AT0-001' })).toHaveCount(0);
});

test('importing a backup on Settings updates the Custom count on Home', async ({ page }) => {
  await page.goto(singleUrl);
  await expect(card(page, 'DA0-002').getByText('Custom: 0 questions', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByLabel(/import backup/i).setInputFiles(path.resolve('tests/e2e/fixtures/backup-one-question.json'));
  await expect(page.getByText(/^Imported 1 question\./)).toBeVisible();
  await expectNoSeriousAxe(page);
  await allExams(page);
  await expect(card(page, 'DA0-002').getByText('Custom: 1 question', { exact: true })).toBeVisible();
});
