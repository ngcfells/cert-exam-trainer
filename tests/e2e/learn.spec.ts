import { test, expect } from '@playwright/test';
import { expectNoSeriousAxe, singleUrl, openExam, topNav } from './util';

const LESSON = 'Fixture: percent change';
const row = (page: import('@playwright/test').Page) => page.getByRole('listitem').filter({ has: page.getByRole('button', { name: LESSON }) });

test('a lesson by keyboard: read, check, and the status reaches Done; axe clean throughout', async ({ page }) => {
  await page.goto(singleUrl);
  await openExam(page, 'DA0-002');
  await page.getByRole('button', { name: 'Learn: DA0-002' }).click();
  await expect(page.getByRole('heading', { name: /^Learn:/ })).toBeFocused();
  await expect(row(page)).toContainText('Not started');
  await expectNoSeriousAxe(page);

  await page.getByRole('button', { name: LESSON }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 2, name: LESSON })).toBeFocused();
  await expect(page.getByRole('math')).toHaveAccessibleName(/divided by old value/);
  await expectNoSeriousAxe(page);
  await topNav(page).getByRole('button', { name: '← Back to lessons' }).click();
  await expect(row(page)).toContainText('In progress');

  await page.getByRole('button', { name: LESSON }).click();
  await page.getByRole('button', { name: /Start the check/ }).click();
  await expect(page.getByRole('heading', { name: 'Item 1 of 3' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel(/Visits rose from 40 to 50/)).toBeFocused();
  await page.keyboard.type('25');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Check answer' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.study-status')).toHaveText('Correct');
  await expectNoSeriousAxe(page);

  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByLabel('Primary key').check();
  await page.getByRole('button', { name: 'Check answer' }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByLabel('Median').check();
  await page.getByLabel('Mode').check();
  await page.getByRole('button', { name: 'Check answer' }).click();
  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page.getByRole('heading', { name: 'Lesson check complete: 100%' })).toBeVisible();
  await expectNoSeriousAxe(page);

  await topNav(page).getByRole('button', { name: '← Back to lesson' }).click();
  await topNav(page).getByRole('button', { name: '← Back to lessons' }).click();
  await expect(row(page)).toContainText('Done');
});
