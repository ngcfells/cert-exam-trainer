import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { test, expect, type Page } from '@playwright/test';
import { openExam } from './util';
import { textOutOfBounds } from './bounds';

// Standing rule (issues #4 and #7): every shipped question, and its review, keeps all text inside its
// bounds at phone and desktop width. Runs against the shipped bank (dist-single).
const bankUrl = pathToFileURL(path.resolve('dist-single/index.html')).href;
// BOUNDS_EXAM=<code> checks one exam (the content ship flow runs it for the exam being approved).
const EXAMS = process.env.BOUNDS_EXAM ? [process.env.BOUNDS_EXAM] : ['DA0-002', 'CY0-001', 'AT0-001'];
const WIDTHS = [360, 1280];

async function startFullPractice(page: Page, code: string): Promise<number> {
  await page.goto(bankUrl);
  await openExam(page, code);
  await page.getByRole('button', { name: `Practice: ${code}` }).click();
  await page.getByRole('spinbutton', { name: 'Number of questions' }).fill('5000');
  await page.getByRole('radio', { name: 'At the end' }).check();
  await page.getByRole('button', { name: 'Start practice' }).click();
  const heading = page.getByRole('heading', { name: /^Item 1 of \d+$/ });
  return Number((await heading.textContent())!.match(/of (\d+)/)![1]);
}

const examPage = (page: Page, code: string) => page.getByRole('button', { name: new RegExp(`^← Back to `) }).first().click().then(() => expect(page.getByRole('heading', { level: 2, name: new RegExp(`\\(${code}\\)`) })).toBeVisible());

// The same rule on every other screen: Home, Settings, About, and each exam's tools, lessons included.
for (const width of WIDTHS) {
  test(`every other screen keeps text in bounds at ${width}px`, async ({ page }) => {
    test.setTimeout(5 * 60_000);
    await page.setViewportSize({ width, height: 900 });
    const problems: string[] = [];
    const check = async (where: string) => problems.push(...(await textOutOfBounds(page)).map((p) => `${where}: ${p}`));
    await page.goto(bankUrl);
    await check('Home');
    await page.getByRole('button', { name: 'Settings' }).click();
    await check('Settings');
    await page.getByRole('button', { name: '⌂ All exams' }).first().click();
    await page.getByRole('button', { name: 'About' }).click();
    await check('About');
    for (const code of EXAMS) {
      await page.goto(bankUrl);
      await openExam(page, code);
      await check(`${code} exam page`);
      for (const tool of ['Start mock exam', 'Practice', 'Cram', 'Acronyms', 'Progress', 'My questions']) {
        await page.getByRole('button', { name: `${tool}: ${code}` }).click();
        await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible();
        if (tool === 'Acronyms') await page.getByText('Full list', { exact: true }).click();
        await check(`${code} ${tool}`);
        if (tool === 'Start mock exam') {
          await expect(page.getByText(/^Leaving the app ends this exam/)).toBeVisible();
          await page.getByRole('checkbox', { name: 'I understand' }).check();
          await page.getByRole('button', { name: 'Start exam' }).click();
          // The tool and Settings panels, over the first question.
          for (const name of ['Calculator', 'Whiteboard', 'Settings']) {
            await page.getByRole('button', { name, exact: true }).click();
            const panel = page.getByRole('dialog', { name });
            await expect(panel).toBeVisible();
            await check(`${code} mock exam ${name} panel`);
            await panel.getByRole('button', { name: 'Close' }).click();
          }
          // Review shows on the last question.
          const review = page.getByRole('button', { name: 'Review', exact: true });
          while (!(await review.isVisible())) await page.getByRole('button', { name: 'Next', exact: true }).click();
          await review.click();
          await check(`${code} mock exam review grid`);
          await page.getByRole('button', { name: 'Submit exam' }).click();
          await page.getByRole('dialog').getByRole('button', { name: 'Submit', exact: true }).click();
          await expect(page.getByRole('heading', { name: 'Review', exact: true })).toBeVisible();
          await check(`${code} mock exam results`);
          // A second mock that ends because the page was hidden: its results add the "left" line.
          await examPage(page, code);
          await page.getByRole('button', { name: `Start mock exam: ${code}` }).click();
          await page.getByRole('checkbox', { name: 'I understand' }).check();
          await page.getByRole('button', { name: 'Start exam' }).click();
          await page.evaluate(() => {
            Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
            document.dispatchEvent(new Event('visibilitychange'));
            Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
          });
          await expect(page.getByText('Ended because you left the exam.')).toBeVisible();
          await check(`${code} mock exam results after leaving`);
        }
        await examPage(page, code);
      }
      const learn = page.getByRole('button', { name: `Learn: ${code}` });
      if (await learn.count()) {
        await learn.click();
        await check(`${code} lesson list`);
        const titles = await page.getByRole('main').getByRole('listitem').getByRole('button').allTextContents();
        for (const title of titles) {
          await page.getByRole('button', { name: title, exact: true }).click();
          await check(`${code} lesson "${title}"`);
          await page.getByRole('button', { name: '← Back to lessons' }).first().click();
        }
      }
    }
    expect(problems).toEqual([]);
  });
}

for (const code of EXAMS) {
  for (const width of WIDTHS) {
    test(`${code}: every question and its review keep text in bounds at ${width}px`, async ({ page }) => {
      test.setTimeout(15 * 60_000);
      await page.setViewportSize({ width, height: 900 });
      const total = await startFullPractice(page, code);
      const problems: string[] = [];
      for (let i = 1; i <= total; i++) {
        await expect(page.getByRole('heading', { name: `Item ${i} of ${total}` })).toBeVisible();
        const found = await textOutOfBounds(page);
        if (found.length) {
          const stem = (await page.getByRole('region').first().innerText()).replace(/\s+/g, ' ').slice(14, 90);
          problems.push(...found.map((p) => `item ${i} (${stem}…): ${p}`));
          // A picture of each failing item for the report (npx playwright show-report).
          await test.info().attach(`item ${i} at ${width}px`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
        }
        if (i < total) await page.getByRole('button', { name: 'Next', exact: true }).click();
      }
      // Finishing unanswered puts every item in the results review, Parts tables included.
      await page.getByRole('button', { name: 'Finish', exact: true }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Finish', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Review', exact: true })).toBeVisible();
      problems.push(...(await textOutOfBounds(page)).map((p) => `results review: ${p}`));
      expect(problems).toEqual([]);
    });
  }
}
