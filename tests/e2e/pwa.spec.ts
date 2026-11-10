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
  const manifest = await res.json();
  expect(manifest.start_url).toBe('./');
  const sizes = manifest.icons.map((i: { sizes: string; type: string }) => `${i.sizes} ${i.type}`);
  expect(sizes).toContain('192x192 image/png');
  expect(sizes).toContain('512x512 image/png');
});

test('settings offers the install hint on an iPhone', async ({ browser }) => {
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  const page = await context.newPage();
  await page.goto(PWA_URL);
  await page.getByRole('button', { name: /settings/i }).first().click();
  await expect(page.getByRole('heading', { name: 'Install as an app' })).toBeVisible();
  await expect(page.getByText(/Add to Home Screen/)).toBeVisible();
  await context.close();
});
