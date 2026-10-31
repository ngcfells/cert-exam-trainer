import { test, expect, type Page } from '@playwright/test';
import { expectNoSeriousAxe, singleUrl } from './util';

// Runs in the phone and tablet projects. Seeds 4 and 67 together draw all 8 PBQ templates (see exam.spec.ts).
const SEEDS = [4, 67];
const TOTAL = 9;
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

async function startExam(page: Page, seed: number) {
  await page.goto(`${singleUrl}?seed=${seed}`);
  await page.getByRole('button', { name: /start mock exam/i }).click();
  await page.getByRole('button', { name: 'Start exam' }).click();
  await expect(page.getByText(`Question 1 of ${TOTAL}`)).toBeVisible();
}

test('the overflow check catches a too-wide element', async ({ page }) => {
  await page.goto(singleUrl);
  await page.evaluate(() => {
    const d = document.createElement('div');
    d.style.width = '2000px';
    d.style.height = '1px';
    document.body.append(d);
  });
  await expect(expectNoOverflow(page, 'probe')).rejects.toThrow(/horizontal overflow on probe/);
});

test('home fits and is axe clean in light and dark', async ({ page }) => {
  await page.goto(singleUrl);
  await expect(page.getByRole('heading', { name: 'Exams' })).toBeVisible();
  await checkBothSchemes(page, 'home');
});

test('about page fits and is axe clean in light and dark', async ({ page }) => {
  await page.goto(singleUrl);
  await page.getByRole('contentinfo').getByRole('button', { name: 'About' }).click();
  await checkBothSchemes(page, 'about');
});

test('a lesson and its numeric check item fit and are axe clean in light and dark', async ({ page }) => {
  await page.goto(singleUrl);
  await page.getByRole('button', { name: 'Learn: DA0-002' }).click();
  await checkBothSchemes(page, 'lesson list');
  await page.getByRole('button', { name: 'Fixture: percent change' }).click();
  await checkBothSchemes(page, 'lesson');
  await page.getByRole('button', { name: /Start the check/ }).click();
  await page.getByLabel(/Visits rose/).fill('abc');
  await checkBothSchemes(page, 'numeric item');
});

for (const seed of SEEDS) test(`every exam item fits and is axe clean (seed ${seed})`, async ({ page }) => {
  await startExam(page, seed);
  for (let i = 1; i <= TOTAL; i++) {
    await expect(page.getByText(`Question ${i} of ${TOTAL}`)).toBeVisible();
    await checkBothSchemes(page, `seed ${seed} item ${i}`);
    if (i < TOTAL) await page.getByRole('button', { name: 'Next' }).click();
  }
  await page.getByRole('button', { name: 'Review', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Review your answers' })).toBeVisible();
  await checkBothSchemes(page, 'review grid');
  await page.getByRole('button', { name: 'Submit exam' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.getByRole('heading', { name: /your score/i })).toBeVisible();
  await checkBothSchemes(page, 'results');
});

test('tap path works on selects and hotspot checkboxes', async ({ page }) => {
  await startExam(page, 4);
  let tappedSelect = false;
  let tappedCheck = false;
  for (let i = 1; i <= TOTAL && !(tappedSelect && tappedCheck); i++) {
    const select = page.locator('.exam-body select').first();
    if (!tappedSelect && (await select.count())) {
      await select.tap();
      const value = await select.locator('option').nth(1).getAttribute('value');
      await select.selectOption(value!);
      await expect(select).toHaveValue(value!);
      tappedSelect = true;
    }
    const check = page.locator('.hotspot ~ .parts input[type="checkbox"]').first();
    if (!tappedCheck && (await check.count())) {
      await check.tap();
      await expect(check).toBeChecked();
      tappedCheck = true;
    }
    if (i < TOTAL) await page.getByRole('button', { name: 'Next' }).click();
  }
  expect(tappedSelect && tappedCheck).toBe(true);
});
