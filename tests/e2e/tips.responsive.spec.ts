import path from 'node:path';
import { test, expect, type Page } from '@playwright/test';
import { allExams, expectNoSeriousAxe, openExam, singleUrl } from './util';
import { textOutOfBounds } from './bounds';
import { eligible } from '../../src/tips/picker';
import { TIPS } from '../../src/tips/list';

// Study tips (issue #3): the box shows above the question, cycles through every DA0-002 tip in bounds,
// is axe clean in light and dark, and the Settings switch turns it off. Runs in the phone and tablet projects.
const PBQ_NAMES = ['Drag-and-drop match', 'Order the steps', 'Configure fields', 'Label a diagram', 'Logs and terminal', 'Data table or chart', 'Select-all hotspot', 'Sort into buckets'];
const TIP = /^(Study|Test-room) tip$/;

async function importTipDue(page: Page) {
  await page.goto(singleUrl);
  await page.getByRole('button', { name: 'Settings' }).click();
  // The backup stores a tip count of 9 with a gap of 10: the first question reached brings a tip.
  await page.getByLabel(/import backup/i).setInputFiles(path.resolve('tests/e2e/fixtures/backup-tip-due.json'));
  await expect(page.getByText(/^Imported 1 question\./)).toBeVisible();
}

async function startPractice(page: Page) {
  await allExams(page);
  await openExam(page, 'DA0-002');
  await page.getByRole('button', { name: 'Practice: DA0-002' }).click();
  for (const name of [...PBQ_NAMES, 'Type a number']) await page.getByRole('checkbox', { name }).uncheck();
  await page.getByRole('spinbutton', { name: 'Number of questions' }).fill('2');
  await page.getByRole('button', { name: 'Start practice' }).click();
  await expect(page.getByRole('heading', { name: 'Item 1 of 2' })).toBeVisible();
}

async function fits(page: Page, where: string) {
  expect(await textOutOfBounds(page), `out of bounds: ${where}`).toEqual([]);
}

test('the tip box shows above the question, cycles in bounds, and closes', async ({ page }) => {
  await importTipDue(page);
  await startPractice(page);
  const box = page.getByRole('region', { name: TIP });
  await expect(box).toBeVisible();
  // Above the question, and focus stays on the item heading.
  const [boxTop, stemTop] = await Promise.all([box.boundingBox(), page.locator('legend.stem').first().boundingBox()]);
  expect(boxTop!.y).toBeLessThan(stemTop!.y);
  await expect(page.getByRole('heading', { name: 'Item 1 of 2' })).toBeFocused();

  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    await fits(page, `first tip (${colorScheme})`);
    await expectNoSeriousAxe(page);
  }

  // Next stays on the same tip; the box stays open across questions.
  const first = await box.locator('p').textContent();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(box.locator('p')).toHaveText(first!);

  const count = eligible(TIPS, 'DA0-002').length;
  for (let i = 1; i < count; i++) {
    await box.getByRole('button', { name: 'Next tip' }).click();
    await fits(page, `tip ${i + 1} of ${count}`);
  }
  await box.getByRole('button', { name: 'Previous tip' }).click();
  await expect(box.getByRole('button', { name: 'Previous tip' })).toBeEnabled();
  await box.getByRole('button', { name: 'Close tip' }).click();
  await expect(box).toHaveCount(0);
});

test('turning tips off in Settings stops the box', async ({ page }) => {
  await importTipDue(page);
  await page.getByRole('checkbox', { name: 'Show study tips in practice and cram' }).uncheck();
  await expectNoSeriousAxe(page);
  await fits(page, 'settings');
  await startPractice(page);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Item 2 of 2' })).toBeVisible();
  await expect(page.getByRole('region', { name: TIP })).toHaveCount(0);
});
