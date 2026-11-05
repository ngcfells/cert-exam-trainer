import { describe, it, expect } from 'vitest';
import { buildResult, examResultSchema, resultMode, type ExamResult } from './result';
import { assembleExam } from './assemble';
import { scoreExam } from './scoring';
import { bank, meta3 } from './testFixtures';

function sample(): ExamResult {
  const exam = assembleExam({ meta: meta3, pool: bank({ A: 5, B: 5, C: 5 }), seed: 3, chances: new Map(), pbqTypes: [] });
  const responses = { [exam.items[0].question.id]: ['a'] };
  return buildResult({
    exam,
    responses,
    flagged: [],
    report: scoreExam(exam, responses, meta3),
    startedAt: new Date(1000),
    finishedAt: new Date(2000),
    autoSubmitted: false,
  });
}

const fake = (id: string, exam: string, t: number, qs: string[]): ExamResult => ({ ...sample(), id, exam, finishedAt: new Date(t).toISOString(), questionIds: qs });

describe('result', () => {
  it('builds a record that passes the schema', () => {
    const r = sample();
    expect(r.id).toBe('T-001-2000-3');
    expect(r.seed).toBe(3);
    expect(examResultSchema.parse(r)).toEqual(r);
  });

  it('accepts MCQ arrays and PBQ part maps', () => {
    expect(examResultSchema.safeParse({ ...sample(), responses: { q1: ['a'], p1: { x: 'y' } } }).success).toBe(true);
    expect(examResultSchema.safeParse({ ...sample(), elementOrders: { p1: ['b', 'a'] } }).success).toBe(true);
    expect(examResultSchema.safeParse({ ...sample(), partOrders: { p1: { f1: ['b', 'a'] } } }).success).toBe(true);
    expect(examResultSchema.safeParse({ ...sample(), partOrders: { p1: ['b'] } }).success).toBe(false);
  });

  it('rejects a record without a seed', () => {
    const rest: Partial<ExamResult> = sample();
    delete rest.seed;
    expect(examResultSchema.safeParse(rest).success).toBe(false);
  });

  it('an old result without mode parses and reads as mock', () => {
    const r = sample();
    expect(r.mode).toBeUndefined();
    expect(resultMode(examResultSchema.parse(r))).toBe('mock');
  });

  it('buildResult stores a practice mode', () => {
    const exam = assembleExam({ meta: meta3, pool: bank({ A: 2 }), seed: 1, chances: new Map(), pbqTypes: [] });
    const r = buildResult({
      exam,
      responses: {},
      flagged: [],
      report: scoreExam(exam, {}, meta3),
      startedAt: new Date(0),
      finishedAt: new Date(1),
      autoSubmitted: false,
      mode: 'practice',
    });
    expect(r.mode).toBe('practice');
    expect(resultMode(r)).toBe('practice');
  });

  it('accepts a lesson result', () => {
    expect(examResultSchema.safeParse({ ...fake('r4', 'T-001', 4, ['lesson']), mode: 'lesson' }).success).toBe(true);
  });
});
