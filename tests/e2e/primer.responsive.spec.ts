import { test, expect, type Page } from '@playwright/test';
import { expectNoSeriousAxe, singleUrl, openExam } from './util';
import { startTerminalPractice } from './primerUtil';

// Runs in the phone and tablet projects (plan Review Focus 5).
const SCHEMES = ['light', 'dark'] as const;

async function expectNoOverflow(page: Page, where: string) {
  // Compare with the emulated device width: on mobile emulation innerWidth widens to fit overflowing content.
  const width = page.viewportSize()!.width;
  const scroll = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scroll, `horizontal overflow on ${where}`).toBeLessThanOrEqual(width);
}

async function checkBothSchemes(page: Page, where: string) {
  for (const colorScheme of SCHEMES) {
    await page.emulateMedia({ colorScheme });
    await expectNoOverflow(page, `${where} (${colorScheme})`);
    await expectNoSeriousAxe(page);
  }
}

test('the primer screen with every Learn more open fits and is axe clean', async ({ page }) => {
  // Every topic open, scanned twice: axe needs more than the default 30 s once all groups are written.
  test.slow();
  await page.goto(singleUrl);
  await openExam(page, 'DA0-002');
  await page.getByRole('button', { name: 'Command primer: DA0-002' }).click();
  await page.getByRole('button', { name: 'Show all topics' }).click();
  const buttons = page.getByRole('button', { name: 'Learn more' });
  const n = await buttons.count();
  expect(n).toBeGreaterThan(9);
  for (let i = 0; i < n; i++) await buttons.nth(i).click();
  await checkBothSchemes(page, 'primer screen');
});

test('the practice Command help panel fits and is axe clean', async ({ page }) => {
  await startTerminalPractice(page);
  await page.getByRole('button', { name: 'Command help' }).click();
  const dialog = page.getByRole('dialog', { name: 'Command help' });
  await dialog.getByRole('button', { name: 'Learn more' }).click();
  await checkBothSchemes(page, 'Command help panel');
});
