/**
 * Recomputes numeric answers from the numbers in each item's own stem, so a
 * typo in `answer.value` fails `bank.test.ts`. Keyed by question id.
 */
const percentChange = (oldValue: number, newValue: number) => ((newValue - oldValue) / oldValue) * 100;

/** Sample (n − 1) standard deviation, for the descriptive-statistics items. */
export const sampleSd = (xs: number[]) => {
  const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
  return Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / (xs.length - 1));
};

export const NUMERIC_CHECKS: Record<string, () => number> = {
  'da2-3-2-num-001': () => percentChange(40, 50),
  'da2-3-2-num-002': () => percentChange(200, 150),
};
