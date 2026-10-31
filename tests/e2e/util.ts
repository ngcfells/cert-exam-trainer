import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export const PWA_PORT = 4173;
export const PWA_URL = `http://localhost:${PWA_PORT}/cert-exam-trainer/`;

export const singleUrl =pathToFileURL(path.resolve('dist-e2e/index.html')).href;

export async function expectNoSeriousAxe(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  const bad = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(bad).toEqual([]);
}

/** Opens an exam's page from the Home cards, where the study tools live. */
export async function openExam(page: Page, code: string): Promise<void> {
  await page.getByRole('button', { name: new RegExp(`\\(${code}\\)`) }).click();
  await expect(page.getByRole('heading', { level: 2, name: new RegExp(`\\(${code}\\)`) })).toBeFocused();
}
