import { describe, it, expect } from 'vitest';
import { hasAnswer, isAnswered, isComplete, itemFraction, mcqFraction, pbqFraction, scoreExam, type Responses } from './scoring';
import type { AssembledExam } from './assemble';
import { mcq, meta3, numeric, pbq } from './testFixtures';
import type { Question } from '../domain/types';
import { pbqFixture } from '../domain/pbqFixtures';

function examOf(qs: Question[]): AssembledExam {
  const pbqs = qs.filter((q) => q.type.startsWith('pbq'));
  return {
    exam: 'T-001',
    seed: 1,
    items: qs.map((question) => ({ question })),
    mcqCount: qs.length - pbqs.length,
    pbqWeightSum: pbqs.reduce((s, q) => s + (q.pbqWeight ?? 0), 0),
  };
}

describe('PBQ part scoring', () => {
  const p = pbq('P1', 3); // pairs p1->c1, p2->c2
  const ex = () => examOf([p, mcq('A0', 'A')]);

  it('awards each PBQ part in proportion', () => {
    expect(pbqFraction(p, { p1: 'c1', p2: 'c3' })).toBe(0.5);
    const r = scoreExam(ex(), { P1: { p1: 'c1', p2: 'c3' } }, meta3);
    expect(r.items[0]).toMatchObject({ fraction: 0.5, answered: true, possible: (900 * 3) / 4, earned: (900 * 1.5) / 4 });
    expect(r.items[0].parts).toEqual([{ partId: 'p1', correct: true }, { partId: 'p2', correct: false }]);
  });

  it('scores an untouched PBQ as unanswered 0', () => {
    const r = scoreExam(ex(), { P1: { p1: '' } }, meta3);
    expect(r.items[0]).toMatchObject({ fraction: 0, answered: false });
  });

  it('treats mismatched response shapes as no answer', () => {
    const r = scoreExam(ex(), { P1: ['c1'], A0: { x: 'a' } }, meta3);
    expect(r.items.map((i) => i.fraction)).toEqual([0, 0]);
  });

  it('counts a PBQ complete only when every part is filled', () => {
    expect(isComplete(p, { p1: 'c1' })).toBe(false);
    expect(isComplete(p, { p1: 'c1', p2: 'c3' })).toBe(true);
    expect(isComplete(mcq('A0', 'A'), ['a'])).toBe(true);
  });

  it('knows when a response is answered', () => {
    expect(isAnswered(undefined)).toBe(false);
    expect(isAnswered([])).toBe(false);
    expect(isAnswered({ a: '' })).toBe(false);
    expect(isAnswered({ a: '   ' })).toBe(false);
    expect(isAnswered({ a: 'x' })).toBe(true);
    expect(isAnswered(['a'])).toBe(true);
  });
});

/** A multi with five options a–e; `correct` and `pick` as given. */
const multi = (correct: string[], pick?: number | 'all'): Question => ({
  ...mcq('M', 'A', 'mcq-multi'),
  payload: { options: ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, text: id })) },
  answer: { correct },
  ...(pick === undefined ? {} : { pick }),
});

describe('mcqFraction', () => {
  it('scores single answers', () => {
    const s = mcq('S', 'A');
    expect(mcqFraction(s, ['a'])).toBe(1);
    expect(mcqFraction(s, ['b'])).toBe(0);
    expect(mcqFraction(s, [])).toBe(0);
  });
  it('select two: an equal share per right pick, wrong picks cost nothing', () => {
    const q = multi(['a', 'c'], 2);
    expect(mcqFraction(q, ['a', 'c'])).toBe(1);
    expect(mcqFraction(q, ['a', 'b'])).toBe(0.5);
    expect(mcqFraction(q, ['a'])).toBe(0.5);
    expect(mcqFraction(q, ['b', 'd'])).toBe(0);
  });
  it('select two: more picks than allowed scores 0', () => {
    expect(mcqFraction(multi(['a', 'c'], 2), ['a', 'c', 'b'])).toBe(0);
  });
  it('select three: two right and one wrong is two thirds', () => {
    expect(mcqFraction(multi(['a', 'c', 'e'], 3), ['a', 'c', 'b'])).toBeCloseTo(2 / 3);
  });
  it('missing pick behaves as the correct count', () => {
    expect(mcqFraction(multi(['a', 'c']), ['a', 'b'])).toBe(0.5);
  });
  it('select all: a wrong pick cancels a right one, floored at 0', () => {
    const q = multi(['a', 'c'], 'all');
    expect(mcqFraction(q, ['a', 'c'])).toBe(1);
    expect(mcqFraction(q, ['a', 'c', 'b'])).toBe(0.5);
    expect(mcqFraction(q, ['a'])).toBe(0.5);
    expect(mcqFraction(q, ['a', 'b', 'd'])).toBe(0);
  });
  it('select all: picking every choice scores 0 unless all are correct', () => {
    expect(mcqFraction(multi(['a', 'b', 'c', 'd'], 'all'), ['a', 'b', 'c', 'd', 'e'])).toBe(0);
    expect(mcqFraction(multi(['a', 'b', 'c', 'd', 'e'], 'all'), ['a', 'b', 'c', 'd', 'e'])).toBe(1);
  });
});

describe('isComplete for multi-answer', () => {
  it('select two needs exactly two picks', () => {
    expect(isComplete(multi(['a', 'c'], 2), ['a'])).toBe(false);
    expect(isComplete(multi(['a', 'c']), ['a'])).toBe(false);
    expect(isComplete(multi(['a', 'c'], 2), ['a', 'b'])).toBe(true);
  });
  it('select all needs one pick', () => {
    expect(isComplete(multi(['a', 'c'], 'all'), ['a'])).toBe(true);
    expect(isComplete(multi(['a', 'c'], 'all'), [])).toBe(false);
  });
});

describe('scoreExam', () => {
  it('matches the spec example: 72 MCQs + 3 PBQs of weight 6', () => {
    const mcqs = Array.from({ length: 72 }, (_, i) => mcq(`A${i}`, 'A'));
    const ex = examOf([pbq('P1', 6), pbq('P2', 6), pbq('P3', 6), ...mcqs]);
    const responses: Responses = Object.fromEntries(mcqs.map((q) => [q.id, ['a']]));
    const r = scoreExam(ex, responses, { ...meta3, maxQuestions: 90 });
    expect(r.score).toBe(720);
    expect(r.items.find((i) => i.questionId === 'A0')!.possible).toBeCloseTo(10);
    expect(r.items.find((i) => i.questionId === 'P1')!.possible).toBeCloseTo(60);
  });

  it('scales a small bank to 900', () => {
    const ex = examOf([mcq('A0', 'A'), mcq('B0', 'B')]);
    const one = scoreExam(ex, { A0: ['a'], B0: ['b'] }, meta3);
    expect(one.score).toBe(450);
    expect(one.passed).toBe(false);
    const both = scoreExam(ex, { A0: ['a'], B0: ['a'] }, meta3);
    expect(both.score).toBe(900);
    expect(both.passed).toBe(true);
  });

  it('decides pass on the raw score, not the rounded one', () => {
    const qs = Array.from({ length: 7 }, (_, i) => mcq(`A${i}`, 'A'));
    const responses = Object.fromEntries(qs.slice(0, 5).map((q) => [q.id, ['a']]));
    const r = scoreExam(examOf(qs), responses, { ...meta3, passingScore: 643 });
    expect(r.score).toBe(643); // raw 642.857…
    expect(r.passed).toBe(false);
  });

  it('marks unanswered items', () => {
    const r = scoreExam(examOf([mcq('A0', 'A'), mcq('B0', 'B')]), { A0: ['a'] }, meta3);
    expect(r.items[1]).toMatchObject({ questionId: 'B0', answered: false, earned: 0 });
  });

  it('breaks down by domain and lists weakest objectives', () => {
    const r = scoreExam(examOf([mcq('A0', 'A'), mcq('A1', 'A'), mcq('B0', 'B'), mcq('C0', 'C')]), { A0: ['a'], B0: ['a'] }, meta3);
    expect(r.byDomain.reduce((s, d) => s + d.possible, 0)).toBeCloseTo(900, 9);
    expect(r.weakestObjectives.map((o) => o.objectiveId)).toEqual(['C.1', 'A.1']);
    expect(r.weakestObjectives[0]).toMatchObject({ title: 'Objective C1', fraction: 0 });
  });
});

describe('templates 5-8 scoring', () => {
  const terminal = pbqFixture('terminal');
  const hotspot = pbqFixture('hotspot');
  const buckets = pbqFixture('buckets');

  it('scores terminal steps by pattern and choice', () => {
    expect(pbqFraction(terminal, { t1: 'grep  ERROR app.log', t2: 'wrong' })).toBe(0.5);
    expect(pbqFraction(terminal, { t1: 'grep ERROR app.log', t2: 'a2' })).toBe(1);
  });

  it('scores hotspots with the select-all rule', () => {
    expect(pbqFraction(hotspot, {})).toBe(0);
    expect(pbqFraction(hotspot, { s1: 'on' })).toBe(0.5);
    expect(pbqFraction(hotspot, { s1: 'on', s3: 'on', s2: 'on' })).toBe(0.5);
    expect(pbqFraction(hotspot, { s1: 'on', s2: 'on', s3: 'on', s4: 'on' })).toBe(0);
    expect(isComplete(hotspot, {})).toBe(false);
    expect(isComplete(hotspot, { s1: 'on' })).toBe(true);
  });

  it('reports hotspot parts but earns nothing when untouched', () => {
    const r = scoreExam({ exam: 'T-001', seed: 1, items: [{ question: hotspot }], mcqCount: 0, pbqWeightSum: 3 }, {}, meta3);
    expect(r.items[0].fraction).toBe(0);
    expect(r.items[0].answered).toBe(false);
    expect(r.items[0].parts).toEqual([
      { partId: 's1', correct: false },
      { partId: 's2', correct: true },
      { partId: 's3', correct: false },
      { partId: 's4', correct: true },
    ]);
  });

  it('scores buckets per item and requires blank-free terminal text', () => {
    expect(pbqFraction(buckets, { i1: 'b2', i2: 'b1', i3: 'b2' })).toBeCloseTo(2 / 3, 9);
    expect(isComplete(terminal, { t1: '   ', t2: 'a2' })).toBe(false);
    expect(isComplete(terminal, { t1: 'ls', t2: 'a2' })).toBe(true);
  });
});

describe('itemFraction', () => {
  it('scores MCQs and PBQs the same way scoreExam does', () => {
    const m = mcq('M', 'A', 'mcq-multi');
    const p = pbq('P', 2);
    expect(itemFraction(m, ['a', 'b'])).toBe(0.5); // select two: a wrong pick costs nothing
    expect(itemFraction(m, ['a'])).toBe(0.5);
    expect(itemFraction(m, undefined)).toBe(0);
    expect(itemFraction(p, { p1: 'c1' })).toBe(0.5);
    const r = scoreExam(examOf([p, m]), { P: { p1: 'c1' }, M: ['a'] }, meta3);
    expect(r.items.map((i) => i.fraction)).toEqual([0.5, 0.5]);
  });
});

describe('numeric scoring', () => {
  const n = numeric('N', 'A', 12.5, 0.05);
  it('gives full credit at the tolerance edge, one unit out of 900 shared with an MCQ', () => {
    const r = scoreExam(examOf([mcq('A0', 'A'), n]), { N: ['12.55'], A0: ['a'] }, meta3);
    expect(r.items.map((i) => i.earned)).toEqual([450, 450]);
    expect(r.items[1].answered).toBe(true);
  });
  it('treats unparseable text as unanswered 0', () => {
    const r = scoreExam(examOf([n]), { N: ['abc'] }, meta3);
    expect(r.items[0]).toMatchObject({ earned: 0, answered: false });
    expect(hasAnswer(n, ['abc'])).toBe(false);
    expect(hasAnswer(n, ['1,250'])).toBe(true);
    expect(isComplete(n, ['12'])).toBe(true);
    expect(isComplete(n, [''])).toBe(false);
  });
});
