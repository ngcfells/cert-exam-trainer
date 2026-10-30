import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { singleUrl } from './util';

test('renders from file:// with no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(singleUrl);
  await expect(page.getByRole('heading', { name: 'Cert Exam Trainer' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('has no serious or critical axe violations', async ({ page }) => {
  await page.goto(singleUrl);
  await expect(page.locator('main')).toBeAttached();
  const results = await new AxeBuilder({ page }).analyze();
  const bad = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(bad).toEqual([]);
});

test('single-file HTML references no external URLs', async () => {
  const fs = await import('node:fs');
  const html = fs.readFileSync('dist-single/index.html', 'utf8');
  expect(html).not.toMatch(/(src|href)=["']https?:/);
});
