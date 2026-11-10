import { describe, it, expect } from 'vitest';
import { assembleCram, assemblePractice, CRAM_ACRONYMS, CRAM_SIZE, matchingPool, onlySeen } from './session';
import { computeMastery } from './mastery';
import { review } from './srs';
import { bank, mcq, meta3, numeric, pbq } from '../exam/testFixtures';
import type { ExamMeta } from '../domain/types';
import { pbqFixture } from '../domain/pbqFixtures';
import type { ExamResult } from '../exam/result';

const now = new Date('2026-01-01T00:00:00Z');
const pool = [...bank({ A: 4, B: 4, C: 4 }), pbq('P1', 2), { ...pbqFixture('order'), id: 'P2', pbqWeight: 3 }];
const allTypes = ['mcq-single', 'mcq-multi', 'pbq-match', 'pbq-order'] as const;
const ids = (xs: { question: { id: string } }[]) => xs.map((i) => i.question.id);
type PracticeIn = Parameters<typeof assemblePractice>[0];
const practice = (over: Partial<PracticeIn['options']> = {}, seed = 1, rest: Partial<Omit<PracticeIn, 'options'>> = {}) =>
  assemblePractice({
    meta: meta3,
    pool,
    seed,
    chances: new Map(),
    options: { objectiveIds: ['A.1', 'B.1', 'C.1'], types: [...allTypes], count: 5, ...over },
    ...rest,
  });
const byDomain = (xs: string[]) => ['A', 'B', 'C'].map((d) => xs.filter((id) => id.startsWith(d)).length);
const mcqTypes = ['mcq-single', 'mcq-multi'] as const;

describe('practice', () => {
  it('filters by objective and type', () => {
    expect(matchingPool(pool, { objectiveIds: ['B.1'], types: ['mcq-single'] }).map((q) => q.id)).toEqual(['B0', 'B1', 'B2', 'B3']);
    const ex = practice({ objectiveIds: ['A.1'], types: ['pbq-order'], count: 5 });
    expect(ids(ex.items)).toEqual(['P2']);
    expect(ex).toMatchObject({ mcqCount: 0, pbqWeightSum: 3 });
  });

  it('mixes PBQs in with the MCQs and shuffles options', () => {
    const runs = Array.from({ length: 50 }, (_, s) => practice({ count: 14 }, s));
    expect(runs.some((ex) => ids(ex.items).slice(0, 2).sort().join() !== 'P1,P2')).toBe(true);
    const ex = runs[0];
    expect(ex.mcqCount).toBe(12);
    expect(ex.items.find((i) => i.question.type === 'mcq-single')!.optionOrder).toHaveLength(4);
    expect(ex.items.find((i) => i.question.id === 'P1')!.elementOrder).toBeDefined();
  });

  it('splits the count across domains by exam weight', () => {
    for (let s = 0; s < 10; s++) {
      const ex = practice({ types: [...mcqTypes], count: 10 }, s, { pool: bank({ A: 30, B: 30, C: 60 }) });
      expect(byDomain(ids(ex.items))).toEqual([5, 3, 2]);
    }
  });

  it('renormalises the weights to the chosen domains', () => {
    const ex = practice({ objectiveIds: ['A.1', 'C.1'], types: [...mcqTypes], count: 7 }, 1, { pool: bank({ A: 30, B: 30, C: 30 }) });
    expect(byDomain(ids(ex.items))).toEqual([5, 0, 2]);
  });

  it('takes the whole count from one domain when only one is chosen', () => {
    const ex = practice({ objectiveIds: ['B.1'], types: [...mcqTypes], count: 3 });
    expect(byDomain(ids(ex.items))).toEqual([0, 3, 0]);
  });

  it('takes the whole count from the domains that have matching questions', () => {
    const ex = practice({ types: [...mcqTypes], count: 6 }, 1, { pool: bank({ A: 4, C: 4 }) });
    expect(ex.items).toHaveLength(6);
    expect(byDomain(ids(ex.items))[1]).toBe(0);
  });

  it('draws by chance', () => {
    const chances = new Map(['B0', 'B1', 'B2'].map((id) => [id, 0.01]));
    let hits = 0;
    for (let s = 0; s < 50; s++) if (ids(practice({ objectiveIds: ['B.1'], count: 1 }, s, { chances }).items)[0] === 'B3') hits++;
    expect(hits).toBeGreaterThanOrEqual(45);
  });

  it('a count above the pool returns every match, at any chance', () => {
    expect(practice({ count: 99 }).items).toHaveLength(14);
    const chances = new Map(pool.map((q) => [q.id, 0.01]));
    expect(practice({ count: 99 }, 1, { chances }).items).toHaveLength(14);
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
const cram = (srs: unknown[], results: unknown[] = [], meta = meta3, chances: Map<string, number> = new Map(), seed = 1) =>
  assembleCram({ meta, acronyms: meta.acronyms, pool: big, seed, srs, mastery: computeMastery(meta, results, big), now, chances });

describe('cram', () => {
  it('puts due questions first, most overdue first, and skips ones not yet due', () => {
    const notDue = review(undefined, { exam: 'T-001', kind: 'question', itemId: 'C5', quality: 5 }, now);
    const s = cram([missed('B3', 1000), missed('C2', 5000), notDue]);
    expect(ids(s.exam.items).slice(0, 2)).toEqual(['C2', 'B3']);
    expect(ids(s.exam.items).filter((i) => i === 'C5').length).toBeLessThanOrEqual(1);
  });

  it('keeps due questions first when chances are set', () => {
    const chances = new Map(big.map((q) => [q.id, 0.01]));
    expect(ids(cram([missed('B3', 1000)], [], meta3, chances).exam.items)[0]).toBe('B3');
  });

  it('orders the rest by chance', () => {
    const chances = new Map(big.filter((q) => q.id !== 'B5').map((q) => [q.id, 0.01]));
    let hits = 0;
    for (let s = 0; s < 50; s++) if (ids(cram([], [], meta3, chances, s).exam.items).includes('B5')) hits++;
    expect(hits).toBeGreaterThanOrEqual(48);
  });

  it('then draws from the weakest objectives, the weakest first', () => {
    // C.1 is weakest (0%), B.1 next (100%) and A.1 untried counts after attempted ones.
    const s = cram([], [result({ C0: ['b'], B0: ['a'] })], metaAc);
    const firstTen = ids(s.exam.items).slice(0, 10);
    const count = (d: string) => firstTen.filter((id) => id.startsWith(d)).length;
    expect(count('C')).toBeGreaterThan(count('B'));
    expect(count('C') + count('B') + count('A')).toBe(10);
  });

  it('spreads the draw over the weak objectives and varies between sessions (issue #18)', () => {
    // Every objective has exactly 10 questions and C is weakest: drawing all ten from C gave the same ten each time.
    const results = [result({ C0: ['b'], B0: ['a'] })];
    const seen = new Set<string>();
    for (let seed = 1; seed <= 20; seed++) {
      const picked = ids(cram([], results, metaAc, new Map(), seed).exam.items);
      expect(new Set(picked.map((id) => id[0])).size).toBeGreaterThanOrEqual(2);
      picked.forEach((id) => seen.add(id));
    }
    expect(seen.size).toBeGreaterThan(14);
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
    const small = assembleCram({ meta: meta3, acronyms: [], pool: [mcq('A0', 'A'), pbq('P1', 1)], seed: 1, srs: [], mastery: computeMastery(meta3, [], []), now, chances: new Map() });
    expect(ids(small.exam.items)).toEqual(['A0']);
  });

  it('includes numeric items and counts them as one unit each', () => {
    const s = assembleCram({ meta: meta3, acronyms: [], pool: [mcq('A0', 'A'), numeric('N0', 'B'), pbq('P1', 1)], seed: 1, srs: [], mastery: computeMastery(meta3, [], []), now, chances: new Map() });
    expect(ids(s.exam.items).sort()).toEqual(['A0', 'N0']);
    expect(s.exam.mcqCount).toBe(2);
    expect(onlySeen(s.exam, ['N0'])).toMatchObject({ mcqCount: 1, pbqWeightSum: 0 });
  });
});
