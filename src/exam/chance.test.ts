import { describe, it, expect } from 'vitest';
import { buildChances, chanceFromViews, chanceOf, weightedOrder, type View } from './chance';
import { mulberry32 } from './rng';
import { bank, mcq } from './testFixtures';

const now = new Date('2026-06-01T00:00:00Z');
const iso = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86_400_000).toISOString();
const R = (daysAgo = 0): View => ({ right: true, at: iso(daysAgo) });
const W = (daysAgo = 0): View => ({ right: false, at: iso(daysAgo) });
const times = (n: number, v: () => View) => Array.from({ length: n }, v);

describe('chanceFromViews', () => {
  it('follows the answer rule', () => {
    expect(chanceFromViews([], now)).toBe(1);
    expect(chanceFromViews([R()], now)).toBeCloseTo(0.5);
    expect(chanceFromViews(times(4, R), now)).toBeCloseTo(0.0625);
    expect(chanceFromViews(times(5, R), now)).toBeCloseTo(0.01);
    expect(chanceFromViews(times(6, R), now)).toBeCloseTo(0.01);
    expect(chanceFromViews([W()], now)).toBeCloseTo(0.75);
    expect(chanceFromViews([W(), R()], now)).toBeCloseTo(0.375);
    expect(chanceFromViews([W(), R(), R(), R()], now)).toBeCloseTo(0.15);
    expect(chanceFromViews([...times(5, R), W()], now)).toBeCloseTo(0.15);
  });

  it('raises a question whose latest answer was right, from day 30', () => {
    const fiveRight = (last: number) => [...times(4, () => R(last + 1)), R(last)];
    expect(chanceFromViews(fiveRight(29), now)).toBeCloseTo(0.01);
    expect(chanceFromViews(fiveRight(30), now)).toBeCloseTo(0.1);
    expect(chanceFromViews(fiveRight(60), now)).toBeCloseTo(0.25);
    expect(chanceFromViews(fiveRight(90), now)).toBeCloseTo(0.4);
    expect(chanceFromViews(fiveRight(210), now)).toBeCloseTo(1);
    expect(chanceFromViews(fiveRight(400), now)).toBeCloseTo(1);
    expect(chanceFromViews([W(92), R(91), R(91), R(90)], now)).toBeCloseTo(0.4);
  });

  it('gives no time rise when the latest answer was a miss', () => {
    expect(chanceFromViews([R(92), R(91), R(91), W(90)], now)).toBeCloseTo(0.15);
    expect(chanceFromViews([W(400)], now)).toBeCloseTo(0.75);
  });

  it('ignores the time rule for a view with a garbled date', () => {
    expect(chanceFromViews([{ right: true, at: 'garbage' }], now)).toBeCloseTo(0.5);
  });

  it('gives no time rise for a view dated in the future', () => {
    expect(chanceFromViews([...times(4, () => R(-4)), R(-5)], now)).toBeCloseTo(0.01);
  });
});

describe('buildChances', () => {
  const pool = [...bank({ A: 2, B: 10 }), mcq('M0', 'A', 'mcq-multi')];
  const result = (id: string, exam: string, daysAgo: number, responses: Record<string, string[]>) => ({
    id,
    exam,
    seed: 1,
    startedAt: iso(daysAgo),
    finishedAt: iso(daysAgo),
    autoSubmitted: false,
    questionIds: Object.keys(responses),
    optionOrders: {},
    responses,
    flagged: [],
    score: 0,
    passed: false,
    mode: 'practice',
  });

  it('rescores every view of every mode, oldest first', () => {
    const results = [
      result('new', 'T-001', 1, { A0: ['a'], M0: ['a'] }),
      result('old', 'T-001', 2, { A0: ['b'] }),
      { ...result('mock', 'T-001', 3, { A1: ['a'] }), mode: undefined },
    ];
    const c = buildChances(results, pool, 'T-001', now);
    expect(chanceOf(c, 'A0')).toBeCloseTo(0.375);
    expect(chanceOf(c, 'M0')).toBeCloseTo(0.75); // one of two keys: partial credit is a miss
    expect(chanceOf(c, 'A1')).toBeCloseTo(0.5);
  });

  it('skips other exams, invalid records and questions not in the pool', () => {
    const results = [result('x', 'X-001', 1, { B0: ['a'] }), {}, result('gone', 'T-001', 1, { Z9: ['a'] })];
    const c = buildChances(results, pool, 'T-001', now);
    expect(chanceOf(c, 'B0')).toBe(1);
    expect(c.has('Z9')).toBe(false);
    expect(chanceOf(c, 'B9')).toBe(1);
  });
});

describe('weightedOrder', () => {
  const items = Array.from({ length: 10 }, (_, i) => i);
  const weight = (i: number) => (i === 9 ? 0.01 : 1);

  it('returns a permutation, the same for the same seed', () => {
    const a = weightedOrder(items, weight, mulberry32(7));
    expect([...a].sort((x, y) => x - y)).toEqual(items);
    expect(weightedOrder(items, weight, mulberry32(7))).toEqual(a);
  });

  it('puts zero and non-finite weights last, still as a permutation', () => {
    const odd = (i: number) => (i === 0 ? 0 : i === 1 ? NaN : 1);
    for (let s = 0; s < 50; s++) {
      const o = weightedOrder([0, 1, 2, 3, 4], odd, mulberry32(s));
      expect([...o].sort()).toEqual([0, 1, 2, 3, 4]);
      expect(o.slice(3).sort()).toEqual([0, 1]);
    }
  });

  it('draws in proportion to weight', () => {
    const hits = new Array(10).fill(0);
    for (let s = 0; s < 2000; s++) for (const i of weightedOrder(items, weight, mulberry32(s)).slice(0, 5)) hits[i]++;
    expect(hits[9] / 2000).toBeLessThan(0.02);
    for (let i = 0; i < 9; i++) {
      expect(hits[i] / 2000).toBeGreaterThan(0.5);
      expect(hits[i] / 2000).toBeLessThan(0.62);
    }
  });
});
