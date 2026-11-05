import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Set PWA_PORT when another app holds 4173 (playwright.config.ts reads the same variable).
export const PWA_PORT = Number(process.env.PWA_PORT ?? 4173);
export const PWA_URL = `http://localhost:${PWA_PORT}/cert-exam-trainer/`;

export const singleUrl =pathToFileURL(path.resolve('dist-e2e/index.html')).href;

export async function expectNoSeriousAxe(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  const bad = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(bad).toEqual([]);
}

/** The top nav bar; tall pages repeat it at the bottom, so clicks target this one. */
export const topNav = (page: Page) => page.getByRole('navigation', { name: 'Page navigation', exact: true });

export const allExams = (page: Page) => topNav(page).getByRole('button', { name: '⌂ All exams' }).click();

/** Opens an exam's page from the Home cards, where the study tools live. */
export async function openExam(page: Page, code: string): Promise<void> {
  await page.getByRole('button', { name: new RegExp(`\\(${code}\\)`) }).click();
  await expect(page.getByRole('heading', { level: 2, name: new RegExp(`\\(${code}\\)`) })).toBeFocused();
}
