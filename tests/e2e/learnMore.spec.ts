import { test, expect } from '@playwright/test';
import { expectNoSeriousAxe, singleUrl, openExam } from './util';

const PBQ_NAMES = [
  'Drag-and-drop match',
  'Order the steps',
  'Configure fields',
  'Label a diagram',
  'Logs and terminal',
  'Data table or chart',
  'Select-all hotspot',
  'Sort into buckets',
  'Type a number',
];

test('practice: Learn more appears only after checking, opens search links, passes axe', async ({ page }) => {
  await page.goto(`${singleUrl}?seed=4`);
  await openExam(page, 'DA0-002');
  await page.getByRole('button', { name: 'Practice: DA0-002' }).click();
  for (const name of PBQ_NAMES) await page.getByRole('checkbox', { name }).uncheck();
  await page.getByRole('button', { name: 'Start practice' }).click();
  await expect(page.getByRole('heading', { name: /^Item 1 of/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Learn more/ })).toHaveCount(0);

  await page.locator('.mcq input').first().check();
  await page.getByRole('button', { name: 'Check answer' }).click();
  const more = page.getByRole('button', { name: /Learn more/ });
  await expect(more).toBeVisible();
  await more.click();
  await expect(more).toHaveAttribute('aria-expanded', 'true');
  const web = page.getByRole('link', { name: /Web search/ });
  await expect(web).toHaveAttribute('target', '_blank');
  await expect(web).toHaveAttribute('href', /^https:\/\/duckduckgo\.com\/\?q=[^&]+$/);
  await expectNoSeriousAxe(page);
});

test('mock: no Learn more during the exam, but it shows in the finished review', async ({ page }) => {
  await page.goto(`${singleUrl}?seed=4`);
  await openExam(page, 'DA0-002');
  await page.getByRole('button', { name: 'Start mock exam: DA0-002' }).click();
  await page.getByRole('checkbox', { name: 'I understand' }).check();
  await page.getByRole('button', { name: 'Start exam' }).click();
  await expect(page.getByRole('button', { name: /Learn more/ })).toHaveCount(0);
  for (let i = 1; i < 9; i++) await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Review', exact: true }).click();
  await page.getByRole('button', { name: 'Submit exam' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.getByRole('heading', { name: /your score/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Learn more/ }).first()).toBeVisible();
});

test.describe('phone width', () => {
  test.use({ viewport: { width: 360, height: 740 } });
  test('the Learn more menu does not scroll the page sideways', async ({ page }) => {
    await page.goto(`${singleUrl}?seed=4`);
    await openExam(page, 'DA0-002');
    await page.getByRole('button', { name: 'Practice: DA0-002' }).click();
    for (const name of PBQ_NAMES) await page.getByRole('checkbox', { name }).uncheck();
    await page.getByRole('button', { name: 'Start practice' }).click();
    await page.locator('.mcq input').first().check();
    await page.getByRole('button', { name: 'Check answer' }).click();
    await page.getByRole('button', { name: /Learn more/ }).click();
    const wide = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(wide).toBe(false);
  });
});
