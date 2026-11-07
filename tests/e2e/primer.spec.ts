import { test, expect } from '@playwright/test';
import { startTerminalPractice } from './primerUtil';
import { expectNoSeriousAxe, singleUrl, openExam } from './util';

test('mock: no Command help on any item', async ({ page }) => {
  await page.goto(`${singleUrl}?seed=4`);
  await openExam(page, 'DA0-002');
  await page.getByRole('button', { name: 'Start mock exam: DA0-002' }).click();
  await page.getByRole('checkbox', { name: 'I understand' }).check();
  await page.getByRole('button', { name: 'Start exam' }).click();
  for (let i = 1; i <= 9; i++) {
    await expect(page.getByRole('heading', { name: `Question ${i}`, exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Command help' })).toHaveCount(0);
    if (i < 9) await page.getByRole('button', { name: 'Next', exact: true }).click();
  }
});

test('practice: Command help keeps the half-typed answer', async ({ page }) => {
  await startTerminalPractice(page);
  const box = page.getByRole('textbox').first();
  await box.fill('grep ERR');
  const opener = page.getByRole('button', { name: 'Command help' });
  await opener.click();
  const dialog = page.getByRole('dialog', { name: 'Command help' });
  await expect(dialog).toBeVisible();
  // The question also shows cat and tail, which come first in topic order; pick grep.
  await dialog.getByRole('list', { name: 'Commands in this question' }).getByRole('button', { name: 'grep', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: 'grep', exact: true })).toBeVisible();
  const more = dialog.getByRole('button', { name: 'Learn more' });
  await more.click();
  await expect(more).toHaveAttribute('aria-expanded', 'true');
  await more.click();
  await expect(more).toHaveAttribute('aria-expanded', 'false');
  await expectNoSeriousAxe(page);
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(box).toHaveValue('grep ERR');
  await expect(opener).toBeFocused();
});

test('the primer screen opens from the exam page and passes axe', async ({ page }) => {
  await page.goto(singleUrl);
  await openExam(page, 'DA0-002');
  await page.getByRole('button', { name: 'Command primer: DA0-002' }).click();
  await expect(page.getByRole('heading', { name: 'Command primer: DA0-002', level: 2 })).toBeFocused();
  await expect(page.getByRole('heading', { name: 'grep', exact: true })).toBeVisible();
  await expectNoSeriousAxe(page);
  const more = page.getByRole('button', { name: 'Learn more' }).first();
  await more.click();
  await expect(more).toHaveAttribute('aria-expanded', 'true');
  await expectNoSeriousAxe(page);
  await page.getByRole('button', { name: /Back/ }).first().click();
  await expect(page.getByRole('button', { name: 'Command primer: DA0-002' })).toBeVisible();
});
