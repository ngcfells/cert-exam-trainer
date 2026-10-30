import { test, expect } from '@playwright/test';
import { expectNoSeriousAxe, singleUrl } from './util';

test('mock exam screens pass axe', async ({ page }) => {
  await page.goto(singleUrl);
  await page.getByRole('button', { name: /start mock exam/i }).click();
  await expect(page.getByRole('button', { name: 'Start exam' })).toBeVisible();
  await expectNoSeriousAxe(page);

  await page.getByRole('button', { name: 'Start exam' }).click();
  await expect(page.getByText('Question 1 of 2')).toBeVisible();
  await expectNoSeriousAxe(page);

  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Review', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Review your answers' })).toBeVisible();
  await expectNoSeriousAxe(page);

  await page.getByRole('button', { name: 'Submit exam' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expectNoSeriousAxe(page);

  await page.getByRole('dialog').getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.getByRole('heading', { name: /your score/i })).toBeVisible();
  await expectNoSeriousAxe(page);
});

test('a mock exam can be completed with the keyboard only', async ({ page }) => {
  await page.goto(singleUrl);
  const start = page.getByRole('button', { name: /start mock exam/i });
  await start.focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Start exam' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Question 1 of 2')).toBeVisible();

  // Tab into the first option and select it.
  for (let i = 0; i < 2; i++) {
    await page.keyboard.press('Tab');
    const role = await page.evaluate(() => (document.activeElement as HTMLInputElement | null)?.type);
    if (role === 'radio' || role === 'checkbox') break;
  }
  await page.keyboard.press('Space');

  const next = async (name: string) => {
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      const label = await page.evaluate(() => document.activeElement?.textContent ?? '');
      if (label === name) return page.keyboard.press('Enter');
    }
    throw new Error(`could not tab to ${name}`);
  };
  await next('Next');
  await next('Review');
  await next('Submit exam');
  await next('Submit');
  await expect(page.getByRole('heading', { name: /your score/i })).toBeVisible();
});

test('home still loads after finishing an exam and reloading', async ({ page }) => {
  await page.goto(singleUrl);
  await page.getByRole('button', { name: /start mock exam/i }).click();
  await page.getByRole('button', { name: 'Start exam' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Review', exact: true }).click();
  await page.getByRole('button', { name: 'Submit exam' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.getByRole('heading', { name: /your score/i })).toBeVisible();
  await page.reload();
  await expect(page.getByText('CompTIA Data+ (DA0-002)')).toBeVisible();
});
