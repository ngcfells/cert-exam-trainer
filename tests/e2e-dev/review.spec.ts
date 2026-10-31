import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { expectNoSeriousAxe, openExam } from '../e2e/util';

test('the bank review tool passes axe', async ({ page }) => {
  await page.goto('/');
  await openExam(page, 'DA0-002');
  await page.getByRole('button', { name: 'Review bank (dev): DA0-002' }).click();
  await expect(page.getByRole('heading', { name: /Review bank/ })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Answer key' })).toBeVisible();
  await expectNoSeriousAxe(page);
});

test('the write-back endpoint saves an unchanged item and rejects a bad one', async ({ request }) => {
  const file = path.resolve('src/banks/dataplus/items/1.1.json');
  const before = readFileSync(file, 'utf8');
  const [first] = JSON.parse(before) as unknown[];
  const saved = await request.post('/__review/item', { data: { question: first } });
  expect(saved.status()).toBe(200);
  expect(readFileSync(file, 'utf8')).toBe(before);

  const bad = await request.post('/__review/item', { data: { question: { id: 'nope' } } });
  expect(bad.status()).toBe(400);
});
