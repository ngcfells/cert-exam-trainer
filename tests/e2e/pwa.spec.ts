import { test, expect } from '@playwright/test';
import { openExam, PWA_URL } from './util';

// dist/ served under the GitHub Pages subpath (/cert-exam-trainer/) by the pwa project's web server.
test('installs a service worker and works offline under the Pages subpath', async ({ page, context }) => {
  await page.goto(PWA_URL);
  await expect(page.getByRole('heading', { name: 'Cert Exam Trainer' })).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Cert Exam Trainer' })).toBeVisible();
  await openExam(page, 'DA0-002');
  await page.getByRole('button', { name: 'Practice: DA0-002' }).click();
  await expect(page.getByRole('heading', { name: /practice/i }).first()).toBeVisible();
});

test('manifest is linked and served', async ({ page }) => {
  await page.goto(PWA_URL);
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const res = await page.request.get(new URL(href!, PWA_URL).href);
  expect(res.ok()).toBe(true);
  expect((await res.json()).start_url).toBe('./');
});
