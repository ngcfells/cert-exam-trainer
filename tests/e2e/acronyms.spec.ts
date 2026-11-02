import { test, expect, type Page } from '@playwright/test';
import { dataPlusMeta } from '../../src/banks/dataplus/meta';
import { expectNoSeriousAxe, singleUrl, openExam } from './util';

const BUILT_IN = dataPlusMeta.acronyms.length;

async function openSetup(page: Page) {
  await page.goto(`${singleUrl}?seed=1`);
  await openExam(page, 'DA0-002');
  await page.getByRole('button', { name: 'Acronyms: DA0-002' }).click();
  await expect(page.getByRole('heading', { name: /^Acronyms:/ })).toBeVisible();
}

async function cards(page: Page, n: number) {
  await page.getByRole('radio', { name: 'All' }).check();
  await page.getByRole('spinbutton', { name: 'Number of cards' }).fill(String(n));
}

test('CY0-001 lists compound and mixed-case official terms and passes axe', async ({ page }) => {
  await page.goto(singleUrl);
  await openExam(page, 'CY0-001');
  await page.getByRole('button', { name: 'Acronyms: CY0-001' }).click();
  await expect(page.getByRole('heading', { name: /^Acronyms:/ })).toBeVisible();
  await page.getByText('Full list', { exact: true }).click();
  const table = page.getByRole('table', { name: 'Full list of acronyms' });
  for (const term of ['CI/CD', 'PCI DSS', 'SOC 2', 'DDoS']) await expect(table.getByRole('rowheader', { name: term, exact: true })).toBeVisible();
  await expectNoSeriousAxe(page);
});

test('AT0-001 lists compound and mixed-case official terms and passes axe', async ({ page }) => {
  await page.goto(singleUrl);
  await openExam(page, 'AT0-001');
  await page.getByRole('button', { name: 'Acronyms: AT0-001' }).click();
  await expect(page.getByRole('heading', { name: /^Acronyms:/ })).toBeVisible();
  await page.getByText('Full list', { exact: true }).click();
  const table = page.getByRole('table', { name: 'Full list of acronyms' });
  for (const term of ['CI/CD', 'FaaS', 'WinRM', 'IaC']) await expect(table.getByRole('rowheader', { name: term, exact: true })).toBeVisible();
  const mttr = table.getByRole('row').filter({ has: page.getByRole('rowheader', { name: 'MTTR', exact: true }) });
  await expect(mttr).toContainText('Mean Time to Recovery (also: Mean Time to Repair; Mean Time to Restore)');
  await expectNoSeriousAxe(page);
});

test('flashcards, results and my acronyms pass axe', async ({ page }) => {
  await openSetup(page);
  await expectNoSeriousAxe(page);
  await page.getByText('Full list', { exact: true }).click();
  await expect(page.getByRole('table', { name: 'Full list of acronyms' })).toBeVisible();
  await expectNoSeriousAxe(page);

  await cards(page, 2);
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByRole('heading', { name: 'Card 1 of 2' })).toBeFocused();
  await page.getByRole('button', { name: 'Show answer' }).click();
  await expect(page.getByRole('button', { name: 'I knew it' })).toBeFocused();
  await expectNoSeriousAxe(page);
  await page.getByRole('button', { name: 'I knew it' }).click();
  await page.getByRole('button', { name: 'Show answer' }).click();
  await page.getByRole('button', { name: "I didn't know it" }).click();
  await expect(page.getByText('1 of 2 known')).toBeVisible();
  await expect(page.getByRole('table', { name: 'Not known yet' })).toBeVisible();
  await expectNoSeriousAxe(page);

  await page.getByRole('button', { name: 'Study again' }).click();
  await expect(page.getByText(`${BUILT_IN} acronyms, 0 due for review`)).toBeVisible();
  const mine = page.getByRole('region', { name: 'My acronyms' });
  await mine.getByRole('textbox', { name: 'Acronym' }).fill('arr');
  await mine.getByRole('textbox', { name: 'Meaning' }).fill('Annual Recurring Revenue');
  await mine.getByRole('button', { name: 'Save acronym' }).click();
  await expect(page.getByText('Saved ARR.')).toBeVisible();
  await expect(page.getByText(`${BUILT_IN + 1} acronyms, 0 due for review`)).toBeVisible();
  await expectNoSeriousAxe(page);
});

test('typed quiz accepts the expansion from the full list', async ({ page }) => {
  await openSetup(page);
  await page.getByRole('radio', { name: 'Quiz' }).check();
  await cards(page, 1);
  await page.getByRole('button', { name: 'Start' }).click();
  const term = (await page.locator('.acronym-term').textContent())!;
  await page.getByRole('button', { name: 'Finish' }).click();
  await page.getByRole('button', { name: 'Study again' }).click();

  await page.getByText('Full list', { exact: true }).click();
  const row = page.getByRole('row').filter({ has: page.getByRole('rowheader', { name: term, exact: true }) });
  const expansion = (await row.getByRole('cell').first().textContent())!;
  await page.getByRole('radio', { name: 'Quiz' }).check();
  await cards(page, 6);
  await page.getByRole('button', { name: 'Start' }).click();
  // Seed 1 gives the same order, so the first card is the same term.
  await expect(page.locator('.acronym-term')).toHaveText(term);
  await page.getByRole('textbox', { name: 'Your answer' }).fill(expansion.toLowerCase());
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toHaveText('Correct');
  await expectNoSeriousAxe(page);
});

test('choice quiz works with the keyboard alone', async ({ page }) => {
  await openSetup(page);
  await page.getByRole('radio', { name: 'Quiz' }).check();
  await page.getByRole('radio', { name: 'Choose' }).check();
  await page.getByRole('radio', { name: '2 minutes' }).check();
  await cards(page, 1);
  await page.getByRole('button', { name: 'Start' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Card 1 of 1' })).toBeFocused();
  await expect(page.getByRole('timer', { name: 'Time left' })).toBeVisible();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toHaveText(/^(Correct|Not quite: .+)$/);
  await expect(page.getByRole('status')).toBeFocused();
  await expectNoSeriousAxe(page);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.getByText(/of 1 correct/)).toBeVisible();
});
