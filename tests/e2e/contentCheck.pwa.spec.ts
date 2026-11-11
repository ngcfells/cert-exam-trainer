import { test, expect, type Page } from '@playwright/test';
import { shippedHashes } from '../../scripts/hashes-lib';
import { sealExam, type ExamHashes } from '../../src/integrity/hashes';
import { HASHES_URL, nextManifest } from '../../src/integrity/manifest';
import { expectNoSeriousAxe, PWA_URL } from './util';

// The hosted build (dist/, the shipped banks) checked against a list this test serves in place of the Security branch.
// No service worker here, so every request the page makes can be answered by the test.
test.use({ serviceWorkers: 'block' });

const INFO = { date: '2026-11-10', commit: 'abc1234', appVersion: '0.1.0' };
const LIST = `${HASHES_URL}?t=*`;

async function openSettings(page: Page) {
  await page.goto(PWA_URL);
  await page.getByRole('button', { name: /settings/i }).first().click();
  await expect(page.getByRole('heading', { name: 'Check the content' })).toBeVisible();
}

const check = (page: Page) => page.getByRole('button', { name: 'Check content' }).click();

test('the hashes the browser works out match the ones made from the bank files', async ({ page }) => {
  const manifest = nextManifest(null, shippedHashes(process.cwd()), INFO)!;
  await page.route(LIST, (route) => route.fulfill({ json: manifest }));
  await openSettings(page);
  await check(page);
  await expect(page.getByRole('status').filter({ hasText: 'Verified' })).toHaveText(
    'Verified. The stock content matches the current official release (10 Nov 2026).',
  );
  await expectNoSeriousAxe(page);
});

test('an earlier release is out of date, and Update now says when nothing newer is there', async ({ page }) => {
  const old = nextManifest(null, shippedHashes(process.cwd()), INFO)!;
  const h = 'b'.repeat(64);
  const newer: Record<string, ExamHashes> = { 'ZZ0-000': sealExam({ meta: h, questions: {}, lessons: {} }) };
  await page.route(LIST, (route) => route.fulfill({ json: nextManifest(old, newer, INFO)! }));
  await openSettings(page);
  await check(page);
  await expect(page.getByText('This content is official but out of date.')).toBeVisible();
  await page.getByRole('button', { name: 'Update now' }).click();
  await expect(page.getByText('No newer version is available yet. Try again in a few minutes.')).toBeVisible();
});

test('content that matches no release is called out, with the official address', async ({ page }) => {
  const h = 'c'.repeat(64);
  const other: Record<string, ExamHashes> = { 'DA0-002': sealExam({ meta: h, questions: { 'da2-1-1-mcq-001': h }, lessons: {} }) };
  await page.route(LIST, (route) => route.fulfill({ json: nextManifest(null, other, INFO)! }));
  await openSettings(page);
  await check(page);
  await expect(page.getByText('This content does not match any official release.')).toBeVisible();
  await expect(page.getByText(/^DA0-002: \d+ questions and \d+ lessons differ; the exam details differ\.$/)).toBeVisible();
  await expect(page.getByText(/^Do not rely on this copy\./)).toBeVisible();
  await expectNoSeriousAxe(page);
});

test('an unreachable or unreadable list is never a pass', async ({ page }) => {
  await page.route(LIST, (route) => route.abort());
  await openSettings(page);
  await check(page);
  await expect(page.getByText('Could not reach the official list. Check your connection and try again.')).toBeVisible();

  await page.unroute(LIST);
  await page.route(LIST, (route) => route.fulfill({ json: { format: 2 } }));
  await check(page);
  await expect(page.getByText('Could not reach the official list. Check your connection and try again.')).toBeVisible();
  await expect(page.getByText(/Verified/)).toHaveCount(0);
});

test('a copy that is not at the official address says so in the footer', async ({ page }) => {
  await page.goto(PWA_URL);
  await expect(page.getByRole('contentinfo').getByText('This is not the official copy of Cert Exam Trainer.')).toBeVisible();
  await expectNoSeriousAxe(page);
});
