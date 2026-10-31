import { test, expect, type Page } from '@playwright/test';
import { expectNoSeriousAxe, singleUrl } from './util';

// Each seed draws 6 PBQs, then the 2 approved MCQs. Together they cover all 8 templates:
// seed 4: diagram, terminal, data, buckets, hotspot, match; seed 67 adds order and config.
const SEEDS = [4, 67];
const seeded = `${singleUrl}?seed=${SEEDS[0]}`;
const TOTAL = 9;

async function startExam(page: Page) {
  await page.goto(seeded);
  await page.getByRole('button', { name: 'Start mock exam: DA0-002' }).click();
  await page.getByRole('button', { name: 'Start exam' }).click();
  await expect(page.getByText(`Question 1 of ${TOTAL}`)).toBeVisible();
}

async function toReview(page: Page) {
  for (let i = 1; i < TOTAL; i++) await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Review', exact: true }).click();
}

async function submit(page: Page) {
  await page.getByRole('button', { name: 'Submit exam' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.getByRole('heading', { name: /your score/i })).toBeVisible();
}

for (const seed of SEEDS) test(`mock exam screens (seed ${seed}) pass axe`, async ({ page }) => {
  await page.goto(`${singleUrl}?seed=${seed}`);
  await page.getByRole('button', { name: 'Start mock exam: DA0-002' }).click();
  await expect(page.getByRole('button', { name: 'Start exam' })).toBeVisible();
  await expectNoSeriousAxe(page);

  await page.getByRole('button', { name: 'Start exam' }).click();
  for (let i = 1; i <= TOTAL; i++) {
    await expect(page.getByText(`Question ${i} of ${TOTAL}`)).toBeVisible();
    await expectNoSeriousAxe(page);
    if (i < TOTAL) await page.getByRole('button', { name: 'Next' }).click();
  }
  await page.getByRole('button', { name: 'Review', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Review your answers' })).toBeVisible();
  await expectNoSeriousAxe(page);

  await page.getByRole('button', { name: 'Submit exam' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expectNoSeriousAxe(page);

  await page.getByRole('dialog').getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.getByRole('heading', { name: /your score/i })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Parts' }).first()).toBeVisible();
  await expectNoSeriousAxe(page);
});

for (const seed of SEEDS) test(`a mock exam with PBQs (seed ${seed}) can be completed with the keyboard only`, async ({ page }) => {
  await page.goto(`${singleUrl}?seed=${seed}`);
  await page.getByRole('button', { name: 'Start mock exam: DA0-002' }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Start exam' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText(`Question 1 of ${TOTAL}`)).toBeVisible();

  const active = () =>
    page.evaluate(() => {
      const el = document.activeElement as HTMLInputElement | null;
      return { tag: el?.tagName ?? '', type: el?.type ?? '', mode: el?.inputMode ?? '', label: el?.getAttribute('aria-label') ?? '', text: el?.textContent ?? '' };
    });

  /** Tab through the screen, filling every part, and stop on the nav button `name`. */
  const answerThen = async (name: string) => {
    let picked = false;
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      const a = await active();
      if (a.text === name) return page.keyboard.press('Enter');
      if (a.tag === 'SELECT') await page.keyboard.press('ArrowDown');
      if (a.tag === 'INPUT' && a.type === 'text') await page.keyboard.type(a.mode === 'decimal' ? '25' : 'grep ERROR load_orders.log');
      if (a.text === 'Keep this order') await page.keyboard.press('Enter');
      if (!picked && (a.type === 'radio' || a.type === 'checkbox')) {
        await page.keyboard.press('Space');
        picked = true;
      }
    }
    throw new Error(`could not tab to ${name}`);
  };
  const press = async (name: string) => {
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      if ((await active()).text === name) return page.keyboard.press('Enter');
    }
    throw new Error(`could not tab to ${name}`);
  };

  for (let i = 1; i <= TOTAL; i++) {
    await answerThen(i < TOTAL ? 'Next' : 'Review');
  }
  await expect(page.getByRole('button', { name: /^Question \d+, answered/ })).toHaveCount(TOTAL);
  await press('Submit exam');
  await press('Submit');
  await expect(page.getByRole('heading', { name: /your score/i })).toBeVisible();
});

test('home still loads after finishing an exam and reloading', async ({ page }) => {
  await startExam(page);
  await toReview(page);
  await submit(page);
  await page.reload();
  await expect(page.getByText('CompTIA Data+ (DA0-002)')).toBeVisible();
});
