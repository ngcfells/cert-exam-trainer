import { test, expect } from '@playwright/test';
import { expectNoSeriousAxe, openExam, singleUrl } from './util';

const examHeading = (page: import('@playwright/test').Page) => page.getByRole('heading', { level: 2, name: 'CompTIA Data+ (DA0-002)' });

test('home has no nav bar; the exam page has one and passes axe', async ({ page }) => {
  await page.goto(singleUrl);
  await expect(page.getByRole('navigation', { name: 'Navigation' })).toHaveCount(0);
  await openExam(page, 'DA0-002');
  await expect(page.getByRole('navigation', { name: 'Navigation' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Stock + Custom' })).toBeChecked();
  await expectNoSeriousAxe(page);
});

test('card, tool, then Back returns to the exam page, and All exams returns home', async ({ page }) => {
  await page.goto(singleUrl);
  await openExam(page, 'DA0-002');
  await page.getByRole('button', { name: 'Practice: DA0-002' }).click();
  await expect(page.getByRole('heading', { name: /^Practice:/ })).toBeVisible();
  await page.getByRole('button', { name: '← Back' }).click();
  await expect(examHeading(page)).toBeFocused();
  await page.getByRole('button', { name: 'Progress: DA0-002' }).click();
  await page.getByRole('button', { name: '⌂ All exams' }).click();
  await expect(page.getByRole('heading', { name: 'Exams' })).toBeVisible();
});

test('the browser Back button steps through screens in the app', async ({ page }) => {
  await page.goto(singleUrl);
  await openExam(page, 'DA0-002');
  await page.getByRole('button', { name: 'Cram: DA0-002' }).click();
  await expect(page.getByRole('heading', { name: /^Cram:/ })).toBeVisible();
  await page.goBack();
  await expect(examHeading(page)).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Exams' })).toBeVisible();
  await page.goForward();
  await expect(examHeading(page)).toBeVisible();
});

test('the source choice is kept per exam', async ({ page }) => {
  await page.goto(singleUrl);
  await openExam(page, 'DA0-002');
  await page.getByRole('radio', { name: 'Stock only' }).check();
  await page.getByRole('button', { name: '⌂ All exams' }).click();
  await openExam(page, 'CY0-001');
  await expect(page.getByRole('radio', { name: 'Stock + Custom' })).toBeChecked();
  await page.getByRole('button', { name: '⌂ All exams' }).click();
  await openExam(page, 'DA0-002');
  await expect(page.getByRole('radio', { name: 'Stock only' })).toBeChecked();
});

test('Settings opens from Home, passes axe, and Back returns home', async ({ page }) => {
  await page.goto(singleUrl);
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeFocused();
  await expect(page.getByLabel(/import backup/i)).toBeAttached();
  await expectNoSeriousAxe(page);
  await page.getByRole('button', { name: '← Back' }).click();
  await expect(page.getByRole('heading', { name: 'Exams' })).toBeVisible();
});
