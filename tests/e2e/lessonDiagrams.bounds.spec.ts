import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { expectNoSeriousAxe, openExam } from './util';
import { textOutOfBounds } from './bounds';

// Every shipped lesson that has a diagram shows it, readable, in bounds and axe clean, in both colour
// schemes at phone and desktop width. Runs against the shipped bank (dist-single).
const bankUrl = pathToFileURL(path.resolve('dist-single/index.html')).href;
const LESSONS = [
  'Distribution shape and the 68-95-99.7 rule',
  'Null and alternative hypotheses',
  'Type I and Type II errors',
  'p-values and significance',
  'Linear regression: slope, intercept and R',
  'Logistic regression',
  'Inner, left, right and full outer joins',
];

for (const width of [360, 1280]) {
  for (const scheme of ['light', 'dark'] as const) {
    test(`lesson diagrams at ${width}px, ${scheme}`, async ({ page }) => {
      test.setTimeout(3 * 60_000);
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(bankUrl);
      await openExam(page, 'DA0-002');
      await page.getByRole('button', { name: 'Learn: DA0-002' }).click();
      for (const title of LESSONS) {
        await page.getByRole('button', { name: new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) }).click();
        const fig = page.locator('figure.diagram svg[role="img"]');
        await expect(fig).toBeVisible();
        await expect(fig).toHaveAccessibleDescription(/.{40,}/);
        expect(await textOutOfBounds(page), title).toEqual([]);
        await expectNoSeriousAxe(page);
        if (process.env.DIAGRAM_SHOTS) {
          await page.locator('figure.diagram').screenshot({ path: path.join(process.env.DIAGRAM_SHOTS, `${title.slice(0, 12).replace(/\W+/g, '-')}-${width}-${scheme}.png`) });
        }
        await page.getByRole('navigation', { name: 'Page navigation', exact: true }).getByRole('button', { name: '← Back to lessons' }).click();
      }
    });
  }
}
