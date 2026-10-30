import { describe, it, expect } from 'vitest';
import { mulberry32, newSeed, shuffle, weightedPick } from './rng';

describe('rng', () => {
  it('is deterministic per seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const xs = Array.from({ length: 5 }, () => a());
    expect(Array.from({ length: 5 }, () => b())).toEqual(xs);
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });

  it('stays in [0, 1)', () => {
    const r = mulberry32(3);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('shuffles into a permutation without mutating input', () => {
    const xs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const out = shuffle(xs, mulberry32(7));
    expect([...out].sort((p, q) => p - q)).toEqual(xs);
    expect(xs).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(shuffle(xs, mulberry32(7))).toEqual(out);
  });

  it('picks by weight', () => {
    const r = mulberry32(9);
    for (let i = 0; i < 100; i++) expect(weightedPick([0, 1, 0], r)).toBe(1);
    let ones = 0;
    for (let i = 0; i < 10000; i++) if (weightedPick([1, 3], r) === 1) ones++;
    expect(ones / 10000).toBeGreaterThan(0.72);
    expect(ones / 10000).toBeLessThan(0.78);
  });

  it('makes a uint32 seed', () => {
    const s = newSeed();
    expect(Number.isInteger(s)).toBe(true);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThan(2 ** 32);
  });
});
