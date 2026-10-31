/**
 * Recomputes numeric answers from the numbers in each item's own stem, so a
 * typo in `answer.value` fails `bank.test.ts`. Keyed by question id.
 */
const percentChange = (oldValue: number, newValue: number) => ((newValue - oldValue) / oldValue) * 100;
const cagr = (start: number, end: number, years: number) => ((end / start) ** (1 / years) - 1) * 100;
const rule72 = (x: number) => 72 / x;
const weightedMean = (xs: number[], ws: number[]) => xs.reduce((s, x, i) => s + x * ws[i], 0) / ws.reduce((s, w) => s + w, 0);
const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length / 2;
  return s.length % 2 ? s[Math.floor(m)] : (s[m - 1] + s[m]) / 2;
};
const sumSq = (xs: number[]) => xs.reduce((s, x) => s + (x - mean(xs)) ** 2, 0);
const sampleVar = (xs: number[]) => sumSq(xs) / (xs.length - 1);

/** Sample (n − 1) standard deviation, for the descriptive-statistics items. */
export const sampleSd = (xs: number[]) => Math.sqrt(sampleVar(xs));
const popSd = (xs: number[]) => Math.sqrt(sumSq(xs) / xs.length);

export const NUMERIC_CHECKS: Record<string, () => number> = {
  'da2-3-2-num-001': () => percentChange(40, 50),
  'da2-3-2-num-002': () => percentChange(200, 150),
  'da2-3-2-num-003': () => 6 - 4,
  'da2-3-2-num-004': () => percentChange(4, 6),
  'da2-3-2-num-005': () => 60000 / 50000,
  'da2-3-2-num-006': () => percentChange(200, 220),
  'da2-3-2-num-007': () => cagr(100000, 121000, 2),
  'da2-3-2-num-008': () => cagr(500, 720, 2),
  'da2-3-2-num-009': () => rule72(8),
  'da2-3-2-num-010': () => rule72(6),
  'da2-3-2-num-011': () => weightedMean([80, 90], [3, 1]),
  'da2-3-2-num-012': () => weightedMean([20, 50], [100, 50]),
  'da2-3-2-num-013': () => mean([4, 8, 6, 2]),
  'da2-3-2-num-014': () => median([3, 9, 5, 7, 1, 11]),
  'da2-3-2-num-015': () => sampleSd([2, 4, 6, 8]),
  'da2-3-2-num-016': () => sampleVar([1, 3, 5]),
  'da2-3-2-num-017': () => popSd([2, 4, 4, 4, 5, 5, 7, 9]),
  'da2-3-2-num-018': () => 30 + 1.5 * (30 - 20),
  'da2-3-2-num-019': () => (70 - 60) / 5,
  'da2-3-2-num-020': () => 10 - 1.5 * (18 - 10),
  // 100 ± 2 × 10 is within 2 standard deviations: the 68-95-99.7 rule gives 95.
  'da2-3-2-num-021': () => ((100 + 2 * 10 - 100) / 10 === 2 ? 95 : NaN),
};
