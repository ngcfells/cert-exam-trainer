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
const predict = (m: number, b: number, x: number) => m * x + b;
const slope = (x1: number, y1: number, x2: number, y2: number) => (y2 - y1) / (x2 - x1);
/** Mean of the last k values. */
const movingAvg = (xs: number[], k: number) => mean(xs.slice(-k));
/** Naive trend forecast: the last value plus the average change per period. */
const trendForecast = (xs: number[]) => xs[xs.length - 1] + (xs[xs.length - 1] - xs[0]) / (xs.length - 1);
const minMax = (x: number, lo: number, hi: number) => (x - lo) / (hi - lo);
const zScore = (x: number, m: number, s: number) => (x - m) / s;
/** Whole days from start to end (end minus start), dates as YYYY-MM-DD in UTC. */
const daysBetween = (start: string, end: string) => (Date.parse(end) - Date.parse(start)) / 86_400_000;

type Key = string | null;
// Row count of a join on key lists. A null key never matches anything.
const joinRows = (left: Key[], right: Key[], kind: 'inner' | 'left' | 'right' | 'full') => {
  const matches = (k: Key, other: Key[]) => (k === null ? 0 : other.filter((o) => o === k).length);
  const inner = left.reduce((s, k) => s + matches(k, right), 0);
  const leftOnly = left.filter((k) => matches(k, right) === 0).length;
  const rightOnly = right.filter((k) => matches(k, left) === 0).length;
  return inner + (kind === 'left' || kind === 'full' ? leftOnly : 0) + (kind === 'right' || kind === 'full' ? rightOnly : 0);
};
const EMP_DEPT = ['10', '20', '20', '30', '40'];
const DEPTS = ['10', '20', '50'];
const CUSTS = ['K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7', 'K8'];
const CUST_ORDERS = ['K1', 'K2', 'K2', 'K4', 'K6', 'K9'];

export const NUMERIC_CHECKS: Record<string, () => number> = {
  'da2-1-1-num-001': () => 10 - new Set([101, 102, 103, 103, 104, 105, 105, 105, 106, 107]).size,
  'da2-1-1-num-002': () =>
    ['C1', 'C2', 'C2', 'C4', 'C5', null, 'C7', 'C1'].filter((k) => k !== null && !['C1', 'C2', 'C3', 'C5'].includes(k)).length,
  'da2-2-3-num-013': () => joinRows(EMP_DEPT, DEPTS, 'inner'),
  'da2-2-3-num-014': () => joinRows(EMP_DEPT, DEPTS, 'left'),
  'da2-2-3-num-015': () => joinRows(EMP_DEPT, DEPTS, 'right'),
  'da2-2-3-num-016': () => joinRows(EMP_DEPT, DEPTS, 'full'),
  'da2-2-3-num-017': () => 4 * 6,
  'da2-2-3-num-018': () => 120 * 15,
  'da2-2-3-num-019': () => joinRows(['P1', 'P2', 'P3'], ['P1', 'P2', 'P2', 'P2', 'P3'], 'inner'),
  // Order O1 ($80) matches 2 payment rows, order O2 ($120) matches 3.
  'da2-2-3-num-020': () => 80 * 2 + 120 * 3,
  'da2-2-3-num-021': () => joinRows(CUSTS, CUST_ORDERS, 'left') - joinRows(CUSTS, CUST_ORDERS, 'inner'),
  'da2-2-3-num-022': () => 40 + 35 - 5,
  'da2-2-3-num-023': () => 12 * 3,
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
  'da2-3-2-num-021': () => 95,
  // 6 ± 1 × 2 is within 1 standard deviation: the rule gives 68.
  'da2-3-2-num-022': () => 68,
  'da2-3-2-num-023': () => (250 / 5000) * 100,
  'da2-3-2-num-024': () => (1 - 0.01) * 100,
  'da2-3-2-num-025': () => 30 - 4,
  'da2-3-2-num-026': () => (50 - 42) / 2,
  'da2-3-2-num-027': () => 120 + 6.5,
  'da2-3-2-num-028': () => predict(3, 20, 10),
  'da2-3-2-num-029': () => slope(2, 10, 6, 30),
  'da2-3-2-num-030': () => 0.8 ** 2 * 100,
  'da2-3-2-num-031': () => [0.82, 0.45, 0.67, 0.3, 0.51, 0.49].filter((p) => p >= 0.5).length,
  'da2-3-2-num-032': () => movingAvg([40, 50, 60, 70, 80], 3),
  'da2-3-2-num-033': () => trendForecast([100, 110, 120, 130]),
  'da2-2-3-num-001': () => 0.035 * 100,
  'da2-2-3-num-002': () => 3_700_000 / 1000,
  'da2-2-3-num-003': () => 200 / 3,
  'da2-2-3-num-004': () => minMax(30, 10, 50),
  'da2-2-3-num-005': () => zScore(32, 40, 5),
  'da2-2-3-num-006': () => 50 + -1.5 * 10,
  'da2-2-3-num-007': () => (95 - 20) / 5,
  // Bins of width 20 starting at 0: bin 1 is 0 to under 20, and so on.
  'da2-2-3-num-008': () => Math.floor((52 - 0) / 20) + 1,
  'da2-2-3-num-009': () => daysBetween('2026-02-20', '2026-03-05'),
  'da2-2-3-num-010': () => (16 * 60 + 15 - (7 * 60 + 45)) / 60,
  'da2-2-3-num-011': () => (27 / 450) * 100,
  'da2-2-3-num-012': () => 90 + 140 + 70,
  'da2-2-2-num-001': () => weightedMean([12, 42], [200, 50]),
  'da2-2-2-num-002': () => weightedMean([2, 7], [4, 16]) - mean([2, 7]),
  // Order A ($150) matches 4 shipment rows, order B ($250) matches 2.
  'da2-2-2-num-003': () => 150 * 4 + 250 * 2,
};
