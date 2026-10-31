import { test, expect } from '@playwright/test';
import { expectNoSeriousAxe, openExam, singleUrl } from './util';

const examHeading = (page: import('@playwright/test').Page) => page.getByRole('heading', { level: 2, name: 'CompTIA Data+ (DA0-002)' });

test('home has no nav bar; the exam page has one and passes axe', async ({ page }) => {
  await page.goto(singleUrl);
  await expect(page.getByRole('navigation', { name: 'Navigation' })).toHaveCount(0);
  await openExam(page, 'DA0-002');
  await expect(page.getByRole('navigation', { name: 'Navigation' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Stock + Custom' })).toBeChecked();
  await expectNoSeriousAxe(page);
});

test('card, tool, then Back returns to the exam page, and All exams returns home', async ({ page }) => {
  await page.goto(singleUrl);
  await openExam(page, 'DA0-002');
  await page.getByRole('button', { name: 'Practice: DA0-002' }).click();
  await expect(page.getByRole('heading', { name: /^Practice:/ })).toBeVisible();
  await page.getByRole('button', { name: '← Back' }).click();
  await expect(examHeading(page)).toBeFocused();
  await page.getByRole('button', { name: 'Progress: DA0-002' }).click();
  await page.getByRole('button', { name: '⌂ All exams' }).click();
  await expect(page.getByRole('heading', { name: 'Exams' })).toBeVisible();
});

test('the browser Back button steps through screens in the app', async ({ page }) => {
  await page.goto(singleUrl);
  await openExam(page, 'DA0-002');
  await page.getByRole('button', { name: 'Cram: DA0-002' }).click();
  await expect(page.getByRole('heading', { name: /^Cram:/ })).toBeVisible();
  await page.goBack();
  await expect(examHeading(page)).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Exams' })).toBeVisible();
  await page.goForward();
  await expect(examHeading(page)).toBeVisible();
});

test('leaving a mock exam after an answer asks first; Cancel keeps the answer', async ({ page }) => {
  await page.goto(`${singleUrl}?seed=4`);
  await openExam(page, 'DA0-002');
  await page.getByRole('button', { name: 'Start mock exam: DA0-002' }).click();
  await page.getByRole('button', { name: 'Start exam' }).click();
  await expect(page.getByText('Question 1 of 9')).toBeVisible();

  // Dialogs 1 and 3 are dismissed (stay), 2 and 4 accepted (leave).
  let asked = 0;
  page.on('dialog', (d) => {
    asked++;
    expect(d.message()).toBe('Leave this exam? Your answers will be lost.');
    void (asked === 1 || asked === 3 ? d.dismiss() : d.accept());
  });
  const answerFirst = async () => {
    for (let i = 1; i <= 9; i++) {
      const choice = page.locator('.exam-body input[type="radio"], .exam-body input[type="checkbox"]').first();
      if (await choice.count()) return choice.check();
      await page.getByRole('button', { name: 'Next' }).click();
    }
    throw new Error('no item with a radio or checkbox');
  };
  await answerFirst();
  const answered = page.getByText(/^Question \d+ of 9$/);
  const where = await answered.textContent();

  await page.goBack();
  await expect(page.getByText(where!)).toBeVisible();
  await expect(page.locator('.exam-body input:checked').first()).toBeChecked();

  await page.goBack();
  await expect(page.getByRole('heading', { level: 2, name: 'CompTIA Data+ (DA0-002)' })).toBeVisible();
  expect(asked).toBe(2);

  await page.getByRole('button', { name: 'Start mock exam: DA0-002' }).click();
  await page.getByRole('button', { name: 'Start exam' }).click();
  await answerFirst();
  await page.getByRole('button', { name: '⌂ All exams' }).click();
  await expect(page.getByText(/^Question \d+ of 9$/)).toBeVisible();
  await page.getByRole('button', { name: '⌂ All exams' }).click();
  await expect(page.getByRole('heading', { name: 'Exams' })).toBeVisible();
  expect(asked).toBe(4);
});

test('the source choice is kept per exam', async ({ page }) => {
  await page.goto(singleUrl);
  await openExam(page, 'DA0-002');
  await page.getByRole('radio', { name: 'Stock only' }).check();
  await page.getByRole('button', { name: '⌂ All exams' }).click();
  await openExam(page, 'CY0-001');
  await expect(page.getByRole('radio', { name: 'Stock + Custom' })).toBeChecked();
  await page.getByRole('button', { name: '⌂ All exams' }).click();
  await openExam(page, 'DA0-002');
  await expect(page.getByRole('radio', { name: 'Stock only' })).toBeChecked();
});

test('Settings opens from Home, passes axe, and Back returns home', async ({ page }) => {
  await page.goto(singleUrl);
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeFocused();
  await expect(page.getByLabel(/import backup/i)).toBeAttached();
  await expectNoSeriousAxe(page);
  await page.getByRole('button', { name: '← Back' }).click();
  await expect(page.getByRole('heading', { name: 'Exams' })).toBeVisible();
});
