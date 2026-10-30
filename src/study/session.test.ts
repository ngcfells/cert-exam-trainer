import { describe, it, expect } from 'vitest';
import { assembleCram, assemblePractice, CRAM_ACRONYMS, CRAM_SIZE, matchingPool } from './session';
import { computeMastery } from './mastery';
import { review } from './srs';
import { bank, mcq, meta3, pbq } from '../exam/testFixtures';
import type { ExamMeta } from '../domain/types';
import { pbqFixture } from '../domain/pbqFixtures';
import type { ExamResult } from '../exam/result';

const now = new Date('2026-01-01T00:00:00Z');
const pool = [...bank({ A: 4, B: 4, C: 4 }), pbq('P1', 2), { ...pbqFixture('order'), id: 'P2', pbqWeight: 3 }];
const allTypes = ['mcq-single', 'mcq-multi', 'pbq-match', 'pbq-order'] as const;
const ids = (xs: { question: { id: string } }[]) => xs.map((i) => i.question.id);
const practice = (over: Partial<Parameters<typeof assemblePractice>[0]['options']> = {}, seed = 1) =>
  assemblePractice({
    meta: meta3,
    pool,
    seed,
    recentIds: new Set(),
    options: { objectiveIds: ['A.1', 'B.1', 'C.1'], types: [...allTypes], count: 5, ...over },
  });

describe('practice', () => {
  it('filters by objective and type', () => {
    expect(matchingPool(pool, { objectiveIds: ['B.1'], types: ['mcq-single'] }).map((q) => q.id)).toEqual(['B0', 'B1', 'B2', 'B3']);
    const ex = practice({ objectiveIds: ['A.1'], types: ['pbq-order'], count: 5 });
    expect(ids(ex.items)).toEqual(['P2']);
    expect(ex).toMatchObject({ mcqCount: 0, pbqWeightSum: 3 });
  });

  it('puts PBQs first and shuffles options', () => {
    const ex = practice({ count: 14 });
    expect(ids(ex.items).slice(0, 2).sort()).toEqual(['P1', 'P2']);
    expect(ex.mcqCount).toBe(12);
    expect(ex.items[2].optionOrder).toHaveLength(4);
    expect(ex.items.find((i) => i.question.id === 'P1')!.elementOrder).toBeDefined();
  });

  it('a count above the pool returns every match', () => {
    expect(practice({ count: 99 }).items).toHaveLength(14);
  });

  it('the same seed gives the same session; zero matches gives no items', () => {
    expect(ids(practice({}, 7).items)).toEqual(ids(practice({}, 7).items));
    expect(practice({ types: [] }).items).toEqual([]);
  });
});

const metaAc: ExamMeta = {
  ...meta3,
  acronyms: ['AAA', 'BBB', 'CCC', 'DDD', 'EEE', 'FFF', 'GGG'].map((term) => ({ term, expansion: `${term} long`, source: 'official' as const })),
};
const big = [...bank({ A: 10, B: 10, C: 10 }), pbq('P1', 2)];
const missed = (id: string, ms: number) => ({ ...review(undefined, { exam: 'T-001', kind: 'question', itemId: id, quality: 1 }, now), due: new Date(now.getTime() - ms).toISOString() });
const result = (responses: ExamResult['responses']): ExamResult => ({
  id: 'r',
  exam: 'T-001',
  seed: 1,
  startedAt: now.toISOString(),
  finishedAt: now.toISOString(),
  autoSubmitted: false,
  questionIds: Object.keys(responses),
  optionOrders: {},
  responses,
  flagged: [],
  score: 0,
  passed: false,
});
const cram = (srs: unknown[], results: unknown[] = [], meta = meta3) =>
  assembleCram({ meta, pool: big, seed: 1, srs, mastery: computeMastery(meta, results, big), now });

describe('cram', () => {
  it('puts due questions first, most overdue first, and skips ones not yet due', () => {
    const notDue = review(undefined, { exam: 'T-001', kind: 'question', itemId: 'C5', quality: 5 }, now);
    const s = cram([missed('B3', 1000), missed('C2', 5000), notDue]);
    expect(ids(s.exam.items).slice(0, 2)).toEqual(['C2', 'B3']);
    expect(ids(s.exam.items).filter((i) => i === 'C5').length).toBeLessThanOrEqual(1);
  });

  it('then draws from the weakest objectives', () => {
    // C.1 is weakest (0%), B.1 next (100%) and A.1 untried counts after attempted ones.
    const s = cram([], [result({ C0: ['b'], B0: ['a'] })]);
    const firstTen = ids(s.exam.items).slice(0, 10);
    expect(firstTen.every((id) => id.startsWith('C'))).toBe(true);
  });

  it('ignores a malformed srs record', () => {
    expect(() => cram([{ id: 'junk' }, null])).not.toThrow();
    expect(cram([{ id: 'junk' }]).exam.items).toHaveLength(CRAM_SIZE);
  });

  it('includes up to 5 acronyms, due ones before new ones', () => {
    const dueAc = { ...review(undefined, { exam: 'T-001', kind: 'acronym', itemId: 'GGG', quality: 1 }, now), due: new Date(0).toISOString() };
    const s = cram([dueAc], [], metaAc);
    expect(s.acronyms).toHaveLength(CRAM_ACRONYMS);
    expect(s.acronyms[0]).toEqual({ term: 'GGG', expansion: 'GGG long' });
    expect(s.exam.items).toHaveLength(CRAM_SIZE - CRAM_ACRONYMS);
  });

  it('never repeats an acronym listed twice', () => {
    const dup: ExamMeta = { ...metaAc, acronyms: [...metaAc.acronyms.slice(0, 2), metaAc.acronyms[0]] };
    const due = { ...review(undefined, { exam: 'T-001', kind: 'acronym', itemId: 'AAA', quality: 1 }, now), due: new Date(0).toISOString() };
    expect(cram([due], [], dup).acronyms.map((a) => a.term)).toEqual(['AAA', 'BBB']);
  });

  it('skips acronyms reviewed but not yet due', () => {
    const ok = review(undefined, { exam: 'T-001', kind: 'acronym', itemId: 'AAA', quality: 5 }, now);
    expect(cram([ok], [], metaAc).acronyms.map((a) => a.term)).not.toContain('AAA');
  });

  it('with no acronyms fills with questions, never PBQs, capped by the pool', () => {
    const s = cram([]);
    expect(s.acronyms).toEqual([]);
    expect(s.exam.items).toHaveLength(CRAM_SIZE);
    expect(s.exam.pbqWeightSum).toBe(0);
    const small = assembleCram({ meta: meta3, pool: [mcq('A0', 'A'), pbq('P1', 1)], seed: 1, srs: [], mastery: computeMastery(meta3, [], []), now });
    expect(ids(small.exam.items)).toEqual(['A0']);
  });
});
