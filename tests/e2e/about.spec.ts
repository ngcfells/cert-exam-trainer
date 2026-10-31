import { test, expect } from '@playwright/test';
import { expectNoSeriousAxe, singleUrl, topNav } from './util';

test('About on Home opens the About page, axe clean, Back returns home', async ({ page }) => {
  await page.goto(singleUrl);
  await page.getByRole('button', { name: 'About' }).click();
  await expect(page.getByRole('heading', { name: 'About Cert Exam Trainer' })).toBeFocused();
  await expect(page.getByRole('link', { name: 'Tips (opens Ko-fi in a new tab)' })).toBeVisible();
  await expectNoSeriousAxe(page);
  await topNav(page).getByRole('button', { name: '← Back' }).click();
  await expect(page.getByRole('heading', { name: 'Exams' })).toBeVisible();
});
