import { describe, it, expect } from 'vitest';
import { isAnswered, isComplete, mcqFraction, pbqFraction, scoreExam, type Responses } from './scoring';
import type { AssembledExam } from './assemble';
import { mcq, meta3, pbq } from './testFixtures';
import type { Question } from '../domain/types';

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
    expect(isAnswered({ a: 'x' })).toBe(true);
    expect(isAnswered(['a'])).toBe(true);
  });
});

describe('mcqFraction', () => {
  it('scores single answers', () => {
    expect(mcqFraction(['a'], ['a'], 'mcq-single')).toBe(1);
    expect(mcqFraction(['a'], ['b'], 'mcq-single')).toBe(0);
    expect(mcqFraction(['a'], [], 'mcq-single')).toBe(0);
  });
  it('scores select-all as correct minus wrong, floored at 0', () => {
    expect(mcqFraction(['a', 'c'], ['a'], 'mcq-multi')).toBe(0.5);
    expect(mcqFraction(['a', 'c'], ['a', 'b'], 'mcq-multi')).toBe(0);
    expect(mcqFraction(['a', 'c'], ['a', 'c', 'd'], 'mcq-multi')).toBe(0.5);
    expect(mcqFraction(['a', 'c'], ['b', 'd'], 'mcq-multi')).toBe(0);
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
