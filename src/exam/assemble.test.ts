import { describe, it, expect } from 'vitest';
import { allocateByWeight, assembleExam, itemFor, type AssembleInput } from './assemble';
import { bank, mcq, meta3, numeric, pbq } from './testFixtures';
import type { McqPayload } from '../domain/types';
import type { Question } from '../domain/types';
import { pbqFixture } from '../domain/pbqFixtures';
import { mulberry32 } from './rng';

const input = (over: Partial<AssembleInput> = {}): AssembleInput => ({
  meta: meta3,
  pool: bank({ A: 30, B: 30, C: 30 }),
  seed: 1,
  recentIds: new Set(),
  pbqTypes: [],
  ...over,
});
const domainOf = (id: string) => id[0];
const countBy = (ids: string[]) => ['A', 'B', 'C'].map((d) => ids.filter((i) => domainOf(i) === d).length);

describe('allocateByWeight', () => {
  it('uses largest remainder', () => {
    expect(allocateByWeight(10, [50, 30, 20])).toEqual([5, 3, 2]);
    expect(allocateByWeight(7, [50, 30, 20])).toEqual([4, 2, 1]);
  });
});

describe('assembleExam', () => {
  it('fills the exam by domain weight with no duplicates', () => {
    const ex = assembleExam(input());
    const ids = ex.items.map((i) => i.question.id);
    expect(ids).toHaveLength(10);
    expect(ex.mcqCount).toBe(10);
    expect(new Set(ids).size).toBe(10);
    expect(countBy(ids)).toEqual([5, 3, 2]);
  });

  it('is reproducible by seed and varies across seeds', () => {
    const a = assembleExam(input());
    const b = assembleExam(input());
    expect(b.items).toEqual(a.items);
    const c = assembleExam(input({ seed: 2 }));
    expect(new Set(c.items.map((i) => i.question.id))).not.toEqual(new Set(a.items.map((i) => i.question.id)));
  });

  it('redistributes a domain shortfall', () => {
    const ex = assembleExam(input({ pool: bank({ A: 30, B: 30, C: 1 }) }));
    const ids = ex.items.map((i) => i.question.id);
    expect(ids).toHaveLength(10);
    expect(countBy(ids)[2]).toBe(1);
  });

  it('uses every question when the bank is small', () => {
    const ex = assembleExam(input({ pool: [mcq('A0', 'A'), mcq('B0', 'B')] }));
    expect(ex.items).toHaveLength(2);
    expect(ex.mcqCount).toBe(2);
  });

  it('prefers fresh questions over recent ones', () => {
    const pool = bank({ A: 6, B: 30, C: 30 });
    const recentIds = new Set(['A0', 'A1', 'A2', 'A3', 'A4']);
    for (let seed = 0; seed < 20; seed++) {
      const ids = assembleExam(input({ pool, recentIds, seed })).items.map((i) => i.question.id);
      expect(ids).toContain('A5');
    }
  });

  it('shuffles option order as a permutation', () => {
    for (const item of assembleExam(input()).items) {
      const ids = (item.question.payload as McqPayload).options.map((o) => o.id);
      expect([...item.optionOrder!].sort()).toEqual([...ids].sort());
    }
  });

  it('puts PBQs first and subtracts their weight from the MCQ count', () => {
    const pool = [...bank({ A: 30, B: 30, C: 30 }), pbq('P1', 2), pbq('P2', 2), pbq('P3', 2), pbq('P4', 2)];
    const ex = assembleExam(input({ pool, pbqTypes: ['pbq-match'] }));
    const types = ex.items.map((i) => i.question.type);
    const pbqCount = types.filter((t) => t === 'pbq-match').length;
    expect(pbqCount).toBeGreaterThanOrEqual(1);
    expect(pbqCount).toBeLessThanOrEqual(4);
    expect(types.slice(0, pbqCount).every((t) => t === 'pbq-match')).toBe(true);
    expect(ex.pbqWeightSum).toBe(pbqCount * 2);
    expect(ex.mcqCount).toBe(10 - ex.pbqWeightSum);
  });

  it('shuffles PBQ elements per attempt, reproducibly', () => {
    const run = (seed: number) => assembleExam(input({ seed, pool: [...bank({ A: 9 }), pbq('P1', 2)], pbqTypes: ['pbq-match'] })).items[0];
    expect([...run(1).elementOrder!].sort()).toEqual(['c1', 'c2', 'c3']);
    expect(run(1).elementOrder).toEqual(run(1).elementOrder);
    const seen = new Set(Array.from({ length: 20 }, (_, i) => run(i + 1).elementOrder!.join()));
    expect(seen.size).toBeGreaterThan(1);
  });

  it('shuffles select options per part for config, data and terminal PBQs', () => {
    const q = { ...pbqFixture('config'), payload: { fields: [{ id: 'f1', label: 'Join', options: ['a', 'b', 'c', 'd'].map((id) => ({ id, text: id })) }] } } as Question;
    const orders = Array.from({ length: 20 }, (_, i) => itemFor(q, mulberry32(i + 1)).partOrders!.f1);
    for (const o of orders) expect([...o].sort()).toEqual(['a', 'b', 'c', 'd']);
    expect(new Set(orders.map((o) => o.join())).size).toBeGreaterThan(1);
    expect(itemFor(q, mulberry32(7))).toEqual(itemFor(q, mulberry32(7)));
    expect(itemFor(pbqFixture('match'), mulberry32(1)).partOrders).toBeUndefined();
  });

  it('rarely shows the keyed chips in answer order, but does not rule it out', () => {
    const labels = ['x', 'y', 'z', 'd1', 'd2'].map((id) => ({ id, text: id }));
    const zones = ['z1', 'z2', 'z3'].map((id, i) => ({ id, name: id, x: i * 100, y: 0 }));
    const diagram = (keys: string[]) =>
      ({ ...pbqFixture('diagram'), payload: { ...(pbqFixture('diagram').payload as object), labels, zones: zones.slice(0, keys.length) }, answer: { placements: Object.fromEntries(keys.map((k, i) => [`z${i + 1}`, k])) } }) as Question;
    const rate = (q: Question, n: number) => {
      const keys = Object.values((q.answer as { placements: Record<string, string> }).placements);
      let hit = 0;
      for (let s = 1; s <= n; s++) {
        const pos = keys.map((k) => itemFor(q, mulberry32(s)).elementOrder!.indexOf(k));
        if (pos.every((p, j) => j === 0 || p > pos[j - 1])) hit++;
      }
      return hit / n;
    };
    // A fair shuffle shows 3 keys in answer order 1 time in 6, and 2 keys half the time.
    expect(rate(diagram(['x', 'y', 'z']), 1200)).toBeLessThan(0.02);
    const two = rate(diagram(['x', 'y']), 2000);
    expect(two).toBeLessThan(0.15);
    expect(two).toBeGreaterThan(0);
    const q = diagram(['x', 'y', 'z']);
    expect(itemFor(q, mulberry32(9))).toEqual(itemFor(q, mulberry32(9)));
  });

  it('never lets PBQ weight fill the whole exam', () => {
    const ex = assembleExam(input({ meta: { ...meta3, maxQuestions: 6 }, pool: [...bank({ A: 9 }), pbq('P1', 6)], pbqTypes: ['pbq-match'] }));
    expect(ex.pbqWeightSum).toBe(0);
    expect(ex.items.every((i) => i.question.type.startsWith('mcq'))).toBe(true);
  });
});

describe('numeric items in assembly', () => {
  it('draws numeric items into the one-unit pool and counts them as MCQ units', () => {
    const ex = assembleExam(input({ pool: [numeric('N0', 'A'), numeric('N1', 'B'), mcq('C0', 'C')] }));
    expect(ex.mcqCount).toBe(3);
    expect(ex.items.find((i) => i.question.id === 'N0')).toEqual({ question: expect.objectContaining({ id: 'N0' }) });
  });
});
