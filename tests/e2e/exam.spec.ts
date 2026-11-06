import { test, expect, type Page } from '@playwright/test';
import { expectNoSeriousAxe, singleUrl, openExam } from './util';

// Each seed draws 6 PBQs, then the 2 approved MCQs. Together they cover all 8 templates:
// seed 4: diagram, terminal, config, buckets, match, order; seed 67 adds data and hotspot.
// src/exam/assemble.test.ts ("e2e seeds") checks this.
const SEEDS = [4, 67];
const seeded = `${singleUrl}?seed=${SEEDS[0]}`;
const TOTAL = 9;

async function startExam(page: Page) {
  await page.goto(seeded);
  await openExam(page, 'DA0-002');
  await page.getByRole('button', { name: 'Start mock exam: DA0-002' }).click();
  await page.getByRole('checkbox', { name: 'I understand' }).check();
  await page.getByRole('button', { name: 'Start exam' }).click();
  await expect(page.getByText(`Question 1 of ${TOTAL}`)).toBeVisible();
}

async function toReview(page: Page) {
  for (let i = 1; i < TOTAL; i++) await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Review', exact: true }).click();
}

async function submit(page: Page) {
  await page.getByRole('button', { name: 'Submit exam' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.getByRole('heading', { name: /your score/i })).toBeVisible();
}

for (const seed of SEEDS) test(`mock exam screens (seed ${seed}) pass axe`, async ({ page }) => {
  await page.goto(`${singleUrl}?seed=${seed}`);
  await openExam(page, 'DA0-002');
  await page.getByRole('button', { name: 'Start mock exam: DA0-002' }).click();
  await expect(page.getByRole('button', { name: 'Start exam' })).toBeVisible();
  await expectNoSeriousAxe(page);

  await page.getByRole('checkbox', { name: 'I understand' }).check();
  await page.getByRole('button', { name: 'Start exam' }).click();
  let lockedChecked = false;
  for (let i = 1; i <= TOTAL; i++) {
    await expect(page.getByText(`Question ${i} of ${TOTAL}`)).toBeVisible();
    await expectNoSeriousAxe(page);
    // A "Select 2." item with two picks locks the other boxes; that state must pass axe too.
    if ((await page.locator('.mcq .hint').allTextContents())[0] === 'Select 2.') {
      const boxes = page.locator('.mcq input[type="checkbox"]');
      await boxes.nth(0).check();
      await boxes.nth(1).check();
      await expect(boxes.nth(2)).toBeDisabled();
      await expectNoSeriousAxe(page);
      lockedChecked = true;
    }
    if (i < TOTAL) await page.getByRole('button', { name: 'Next', exact: true }).click();
  }
  expect(lockedChecked).toBe(true);
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
  await openExam(page, 'DA0-002');
  await page.getByRole('button', { name: 'Start mock exam: DA0-002' }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('checkbox', { name: 'I understand' }).focus();
  await page.keyboard.press('Space');
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
    // A "Select N." multi-answer item needs N picks to count as answered; anything else needs one.
    const hints = await page.locator('.mcq .hint').allTextContents(); // no wait: PBQ screens have none
    const hint = hints[0];
    const need = Number(/^Select (\d+)\.$/.exec(hint ?? '')?.[1] ?? 1);
    let picks = 0;
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      const a = await active();
      if (a.text === name) return page.keyboard.press('Enter');
      if (a.tag === 'SELECT') await page.keyboard.press('ArrowDown');
      if (a.tag === 'INPUT' && a.type === 'text') await page.keyboard.type(a.mode === 'decimal' ? '25' : 'grep ERROR load_orders.log');
      if (a.text === 'Keep this order') await page.keyboard.press('Enter');
      if (picks < need && (a.type === 'radio' || a.type === 'checkbox')) {
        await page.keyboard.press('Space');
        picks += a.type === 'radio' ? need : 1;
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

const LEFT = 'Ended because you left the exam.';

test('hiding the page ends and scores the mock', async ({ page }) => {
  await startExam(page);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByRole('heading', { name: /your score/i })).toBeVisible();
  await expect(page.getByText(LEFT)).toBeVisible();
});

test('a refresh ends and scores the mock, keeping the answer given', async ({ page }) => {
  await startExam(page);
  // PBQs come first; answer the first item with a radio or checkbox.
  for (let i = 1; i <= TOTAL; i++) {
    const choice = page.locator('.exam-body input[type="radio"], .exam-body input[type="checkbox"]').first();
    if (await choice.count()) {
      await choice.check();
      break;
    }
    await page.getByRole('button', { name: 'Next', exact: true }).click();
  }
  // The save is async; give it a moment before the reload cuts the page off.
  await page.waitForTimeout(300);
  await page.reload();
  await expect(page.getByRole('heading', { name: /your score/i })).toBeVisible();
  await expect(page.getByText(LEFT)).toBeVisible();
  const saved = await page.evaluate(
    () =>
      new Promise<{ endedBy?: string; answered: number }[]>((resolve, reject) => {
        const open = indexedDB.open('cert-exam-trainer');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const get = open.result.transaction('results').objectStore('results').getAll();
          get.onsuccess = () => resolve(get.result.map((r) => ({ endedBy: r.endedBy, answered: Object.keys(r.responses).length })));
          get.onerror = () => reject(get.error);
        };
      }),
  );
  expect(saved).toEqual([{ endedBy: 'left', answered: 1 }]);
  // A second reload does not score it again.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Exams' })).toBeVisible();
});

test('Cancel on the leave prompt keeps the exam running; OK scores it', async ({ page }) => {
  await startExam(page);
  page.once('dialog', (d) => void d.dismiss());
  await page.goBack();
  await page.waitForTimeout(1000);
  await expect(page.getByText(`Question 1 of ${TOTAL}`)).toBeVisible();
  await expect(page.getByText(LEFT)).toHaveCount(0);
  const choice = page.locator('.exam-body input, .exam-body select').first();
  await expect(choice).toBeEnabled();
  page.once('dialog', (d) => void d.accept());
  await page.goBack();
  await expect(page.getByText(LEFT)).toBeVisible();
});

test('Tab wraps at the ends of the exam page and of a panel, so the keyboard never tabs out', async ({ page }) => {
  await startExam(page);
  // The first or last visible control in the open panel, or else the page: focus it, or check it has focus.
  const end = (which: 'first' | 'last', focus: boolean) =>
    page.evaluate(
      ([w, f]) => {
        const scope = document.querySelector('dialog[open]') ?? document.body;
        const els = [...scope.querySelectorAll<HTMLElement>('button:not([disabled]), input, select, textarea, a[href]')].filter((e) => e.offsetParent !== null);
        const el = w === 'first' ? els[0] : els[els.length - 1];
        if (f) el.focus();
        return document.activeElement === el;
      },
      [which, focus] as const,
    );
  // Tab from the last control on the page comes round to the first, and Shift+Tab goes back.
  await end('last', true);
  await page.keyboard.press('Tab');
  expect(await end('first', false)).toBe(true);
  await page.keyboard.press('Shift+Tab');
  expect(await end('last', false)).toBe(true);
  // The same inside a panel.
  await page.getByRole('button', { name: 'Calculator' }).click();
  await expect(page.getByRole('dialog', { name: 'Calculator' })).toBeVisible();
  await end('first', true);
  await page.keyboard.press('Shift+Tab');
  expect(await end('last', false)).toBe(true);
  await page.keyboard.press('Tab');
  expect(await end('first', false)).toBe(true);
  await expect(page.getByText(LEFT)).toHaveCount(0);
});

test('the calculator, whiteboard and Settings panels do not end the exam, and pass axe in light and dark', async ({ page }) => {
  await startExam(page);
  const still = async () => {
    await expect(page.getByText(`Question 1 of ${TOTAL}`)).toBeVisible();
    await expect(page.getByText(LEFT)).toHaveCount(0);
  };
  const check = async (name: string) => {
    const panel = page.getByRole('dialog', { name });
    await expect(panel).toBeVisible();
    await expect(panel.getByText(/^Time left: (\d+:)?\d+:\d\d$/)).toBeVisible();
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme });
      await expectNoSeriousAxe(page);
    }
    return panel;
  };

  await page.getByRole('button', { name: 'Calculator' }).click();
  const calc = await check('Calculator');
  await page.keyboard.type('12*3');
  await page.keyboard.press('Enter');
  await expect(calc.getByLabel('Calculator display')).toHaveText('36');
  await calc.getByRole('button', { name: 'Close' }).click();
  await still();

  await page.getByRole('button', { name: 'Whiteboard' }).click();
  const board = await check('Whiteboard');
  await board.getByRole('textbox', { name: 'Notes' }).fill('B then C');
  const box = (await board.getByRole('img', { name: 'Drawing area' }).boundingBox())!;
  await page.mouse.move(box.x + 10, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(box.x + 60, box.y + 40);
  await page.mouse.up();
  await expect(board.getByRole('button', { name: 'Clear drawing' })).toBeEnabled();
  await board.getByRole('button', { name: 'Close' }).click();
  await still();

  await page.getByRole('button', { name: 'Settings' }).click();
  const settings = await check('Settings');
  await settings.getByRole('button', { name: 'Close' }).click();
  await still();

  await page.waitForTimeout(1000);
  await still();
  await toReview(page);
  await submit(page);
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    await expectNoSeriousAxe(page);
  }
});

test('the setup warning passes axe in light and dark', async ({ page }) => {
  await page.goto(seeded);
  await openExam(page, 'DA0-002');
  await page.getByRole('button', { name: 'Start mock exam: DA0-002' }).click();
  await expect(page.getByRole('button', { name: 'Start exam' })).toBeDisabled();
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    await expectNoSeriousAxe(page);
  }
});
