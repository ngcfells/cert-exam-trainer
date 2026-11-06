import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { expectNoSeriousAxe, openExam, PWA_URL } from './util';

// `npm run check` builds dist/ with a stand-in relay URL (build:check), so these always run there. Whatever URL the
// build has, any POST to /report off the app's own origin is answered here: no real issue is ever sent.
const APP_ORIGIN = new URL(PWA_URL).origin;

let posted: Record<string, unknown>[] = [];

// Stub first, then load the app once; each test starts on the home screen.
test.beforeEach(async ({ page, context }) => {
  posted = await stubNetwork(context);
  await page.goto(PWA_URL);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const reportsOn = (await page.getByRole('button', { name: 'Report', exact: true }).count()) > 0;
  test.skip(!reportsOn, 'Reports are off in this build: run npm run build:check first (see README).');
});

const ISSUE = { number: 99, url: 'https://github.com/ngcfells/cert-exam-trainer/issues/99' };

// Stands in for Cloudflare: execute() answers at once with a test token.
const TURNSTILE_STUB = `
window.turnstile = {
  render(el, o) { window.__ts = o; return 'w0'; },
  execute() { setTimeout(() => window.__ts.callback('test-token'), 0); },
  reset() {},
  remove() {},
};`;

async function stubNetwork(context: BrowserContext): Promise<Record<string, unknown>[]> {
  const posted: Record<string, unknown>[] = [];
  await context.route('https://challenges.cloudflare.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/javascript', body: TURNSTILE_STUB }),
  );
  await context.route((url) => url.origin !== APP_ORIGIN && url.pathname.endsWith('/report'), async (route) => {
    const cors = {
      'Access-Control-Allow-Origin': APP_ORIGIN,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      Vary: 'Origin',
    };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    posted.push(route.request().postDataJSON() as Record<string, unknown>);
    return route.fulfill({ status: 201, headers: cors, contentType: 'application/json', body: JSON.stringify(ISSUE) });
  });
  return posted;
}

async function startPractice(page: Page) {
  await openExam(page, 'DA0-002');
  await page.getByRole('button', { name: 'Practice: DA0-002' }).click();
  for (const name of ['Drag-and-drop match', 'Order the steps', 'Configure fields', 'Label a diagram', 'Logs and terminal', 'Data table or chart', 'Select-all hotspot', 'Sort into buckets', 'Type a number']) {
    await page.getByRole('checkbox', { name }).uncheck();
  }
  await page.getByRole('spinbutton', { name: 'Number of questions' }).fill('2');
  await page.getByRole('button', { name: 'Start practice' }).click();
  await expect(page.getByRole('heading', { name: 'Item 1 of 2' })).toBeVisible();
}

async function fillReport(page: Page, title: string) {
  const dialog = page.getByRole('dialog', { name: 'Report a problem or request a feature' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Title').fill(title);
  await dialog.getByRole('textbox', { name: 'Details' }).fill('The key looks wrong.');
  return dialog;
}

test('reports a problem from a practice question and keeps the answer', async ({ page }) => {
  await startPractice(page);
  const first = page.locator('.mcq input').first();
  await first.check();

  await page.getByRole('button', { name: 'Report a problem' }).click();
  const dialog = await fillReport(page, 'Wrong key');
  await expect(dialog.getByRole('radio', { name: 'A problem with this question' })).toBeChecked();
  await expectNoSeriousAxe(page);
  await dialog.getByRole('button', { name: 'Send' }).click();
  await expect(dialog.getByRole('link', { name: /View issue #99/ })).toBeVisible();
  await expectNoSeriousAxe(page);
  await dialog.getByRole('button', { name: 'Close' }).click();

  await expect(page.getByRole('heading', { name: 'Item 1 of 2' })).toBeVisible();
  await expect(first).toBeChecked();
  expect(posted).toHaveLength(1);
  expect(posted[0]).toMatchObject({ type: 'question', title: 'Wrong key', turnstileToken: 'test-token' });
  expect(typeof posted[0].questionId).toBe('string');
  expect(posted[0].context).toMatchObject({ exam: 'DA0-002', mode: 'practice' });
});

test('no Report button while a mock runs, and it is back on the results', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Report', exact: true })).toBeVisible();
  await openExam(page, 'DA0-002');
  await page.getByRole('button', { name: 'Start mock exam: DA0-002' }).click();
  await page.getByRole('checkbox', { name: 'I understand' }).check();
  await page.getByRole('button', { name: 'Start exam' }).click();
  await expect(page.getByRole('timer', { name: 'Time remaining' })).toBeVisible();

  await expect(page.getByRole('button', { name: /^Report/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Flag for my review' }).click();

  const review = page.getByRole('button', { name: 'Review', exact: true });
  while (!(await review.isVisible())) await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Report/ })).toHaveCount(0);
  await review.click();
  await page.getByRole('button', { name: 'Submit exam' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.getByRole('heading', { name: /your score/i })).toBeVisible();

  await expect(page.getByRole('button', { name: 'Report', exact: true })).toBeVisible();
  const flagged = page.getByRole('region', { name: 'Questions you flagged' });
  await expect(flagged).toContainText('You flagged 1 question for your review. Is anything wrong with it?');
  await flagged.getByRole('button', { name: 'Report a problem with question 1' }).click();
  await expect(page.getByRole('dialog', { name: 'Report a problem or request a feature' })).toBeVisible();
});

test('an offline report waits and sends later', async ({ page, context }) => {
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Report', exact: true }).click();
  const dialog = await fillReport(page, 'Offline idea');
  await dialog.getByRole('radio', { name: 'A feature request' }).check();
  await dialog.getByRole('button', { name: 'Send' }).click();
  await expect(dialog.getByText('Saved on this device. You can send it when you are back online.')).toBeVisible();
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('status').filter({ hasText: '1 report waiting to send' })).toBeVisible();
  expect(posted).toHaveLength(0);

  await context.setOffline(false);
  await page.getByRole('button', { name: 'Send or discard' }).click();
  const waiting = page.getByRole('region', { name: 'Waiting to send' });
  await expectNoSeriousAxe(page);
  await waiting.getByRole('button', { name: 'Send Offline idea' }).click();
  await expect(waiting.getByRole('link', { name: /View issue #99/ })).toBeVisible();
  expect(posted).toHaveLength(1);
  expect(posted[0]).toMatchObject({ type: 'feature', title: 'Offline idea' });
  expect(posted[0]).not.toHaveProperty('savedAt');

  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByText(/waiting to send/)).toHaveCount(0);
});
