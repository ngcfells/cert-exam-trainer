import { test, expect, type Page } from '@playwright/test';
import { allExams, expectNoSeriousAxe, openExam, singleUrl, topNav } from './util';

const examHeading = (page: Page) => page.getByRole('heading', { level: 2, name: 'CompTIA Data+ (DA0-002)' });
const landing = (page: Page) => page.getByRole('heading', { name: 'Exams' });
const bottomNav = (page: Page) => page.getByRole('navigation', { name: 'Page navigation (bottom)' });

for (const size of [{ width: 360, height: 780 }, { width: 1280, height: 800 }]) {
  test(`landing and exam page pass axe in light and dark at ${size.width}px`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto(singleUrl);
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme });
      await expect(landing(page)).toBeVisible();
      await expectNoSeriousAxe(page);
    }
    await openExam(page, 'DA0-002');
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme });
      await expectNoSeriousAxe(page);
    }
  });
}

test('home has Settings in the header, About at the bottom, and no nav bar', async ({ page }) => {
  await page.goto(singleUrl);
  await expect(page.locator('.app-header').getByRole('button', { name: 'Settings' })).toBeVisible();
  await expect(page.getByRole('contentinfo').getByRole('button')).toHaveCount(0);
  await expect(page.getByRole('main').getByRole('button', { name: 'About' })).toBeVisible();
  await expect(topNav(page)).toHaveCount(0);
  await openExam(page, 'DA0-002');
  await expect(topNav(page).getByRole('button', { name: '← Back' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Stock + Custom' })).toBeChecked();
});

test('keyboard only: card, Practice, Back to Data+, All exams', async ({ page }) => {
  await page.goto(singleUrl);
  const tabTo = async (name: string | RegExp) => {
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      const text = await page.evaluate(() => document.activeElement?.textContent ?? '');
      if (typeof name === 'string' ? text === name : name.test(text)) return page.keyboard.press('Enter');
    }
    throw new Error(`could not tab to ${name}`);
  };
  await tabTo(/\(DA0-002\)/);
  await expect(examHeading(page)).toBeFocused();
  await tabTo('Practice: DA0-002');
  await expect(page.getByRole('heading', { name: /^Practice:/ })).toBeVisible();
  await page.locator('body').focus();
  await tabTo('← Back to Data+');
  await expect(examHeading(page)).toBeFocused();
  await page.locator('body').focus();
  await tabTo('⌂ All exams');
  await expect(landing(page)).toBeVisible();
});

test('the browser Back button climbs like the nav bar, then leaves the app from the landing page', async ({ page }) => {
  await page.goto('about:blank');
  await page.goto(singleUrl);
  await openExam(page, 'DA0-002');
  await page.getByRole('button', { name: 'Learn: DA0-002' }).click();
  await page.getByRole('button', { name: 'Fixture: percent change' }).click();
  await expect(topNav(page).getByRole('button', { name: '← Back to lessons' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: /^Learn:/ })).toBeVisible();
  await page.goBack();
  await expect(examHeading(page)).toBeFocused();
  await page.goBack();
  await expect(landing(page)).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL('about:blank');
});

test('All exams from deep inside, then browser Back still leaves the app', async ({ page }) => {
  await page.goto('about:blank');
  await page.goto(singleUrl);
  await openExam(page, 'DA0-002');
  await page.getByRole('button', { name: 'Cram: DA0-002' }).click();
  await allExams(page);
  await expect(landing(page)).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL('about:blank');
});

test('leaving a mock exam after an answer asks first; Cancel keeps the answer', async ({ page }) => {
  await page.goto(`${singleUrl}?seed=4`);
  await openExam(page, 'DA0-002');
  await page.getByRole('button', { name: 'Start mock exam: DA0-002' }).click();
  await page.getByRole('button', { name: 'Start exam' }).click();
  await expect(page.getByText('Question 1 of 9')).toBeVisible();

  // Dialogs 1 and 3 are dismissed (stay), 2 and 4 accepted (leave).
  const messages: string[] = [];
  page.on('dialog', (d) => {
    messages.push(d.message());
    void (messages.length % 2 === 1 ? d.dismiss() : d.accept());
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
  const where = await page.getByText(/^Question \d+ of 9$/).textContent();

  await page.goBack();
  await expect(page.getByText(where!)).toBeVisible();
  await expect(page.locator('.exam-body input:checked').first()).toBeChecked();
  await page.goBack();
  await expect(examHeading(page)).toBeVisible();

  await page.getByRole('button', { name: 'Start mock exam: DA0-002' }).click();
  await page.getByRole('button', { name: 'Start exam' }).click();
  await answerFirst();
  await allExams(page);
  await expect(page.getByText(/^Question \d+ of 9$/)).toBeVisible();
  await allExams(page);
  await expect(landing(page)).toBeVisible();
  expect(messages).toEqual(Array(4).fill('Leave this exam? Your answers will be lost.'));
});

test('the source choice is kept per exam', async ({ page }) => {
  await page.goto(singleUrl);
  await openExam(page, 'DA0-002');
  await page.getByRole('radio', { name: 'Stock only' }).check();
  await allExams(page);
  await openExam(page, 'CY0-001');
  await expect(page.getByRole('radio', { name: 'Stock + Custom' })).toBeChecked();
  await allExams(page);
  await openExam(page, 'DA0-002');
  await expect(page.getByRole('radio', { name: 'Stock only' })).toBeChecked();
});

test('Settings passes axe, has no bottom bar on a desktop window, and Back returns home', async ({ page }) => {
  // 1200 tall: with the answer mark choices (issue #10), Settings no longer fits an 800 px window.
  await page.setViewportSize({ width: 1280, height: 1200 });
  await page.goto(singleUrl);
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeFocused();
  await expect(page.getByLabel(/import backup/i)).toBeAttached();
  await expect(bottomNav(page)).toHaveCount(0);
  await expectNoSeriousAxe(page);
  await topNav(page).getByRole('button', { name: '← Back' }).click();
  await expect(landing(page)).toBeVisible();
});

test('a tall lesson on a phone repeats the nav bar at the bottom', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto(singleUrl);
  await openExam(page, 'DA0-002');
  await page.getByRole('button', { name: 'Learn: DA0-002' }).click();
  await page.getByRole('button', { name: 'Fixture: percent change' }).click();
  await expect(bottomNav(page)).toBeVisible();
  await expectNoSeriousAxe(page);
  await bottomNav(page).getByRole('button', { name: '← Back to lessons' }).click();
  await expect(page.getByRole('heading', { name: /^Learn:/ })).toBeVisible();
});
