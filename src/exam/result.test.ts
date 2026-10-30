import { describe, it, expect } from 'vitest';
import { buildResult, examResultSchema, recentQuestionIds, type ExamResult } from './result';
import { assembleExam } from './assemble';
import { scoreExam } from './scoring';
import { bank, meta3 } from './testFixtures';

function sample(): ExamResult {
  const exam = assembleExam({ meta: meta3, pool: bank({ A: 5, B: 5, C: 5 }), seed: 3, recentIds: new Set(), pbqTypes: [] });
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

  it('rejects a record without a seed', () => {
    const rest: Partial<ExamResult> = sample();
    delete rest.seed;
    expect(examResultSchema.safeParse(rest).success).toBe(false);
  });

  it('returns ids from the 3 newest results for the exam', () => {
    const results = [
      fake('r1', 'T-001', 1, ['old']),
      fake('r2', 'T-001', 2, ['q2']),
      fake('r3', 'T-001', 3, ['q3']),
      fake('r4', 'T-001', 4, ['q4']),
      fake('x', 'OTHER', 5, ['other']),
      { id: 'garbage' },
    ];
    expect(recentQuestionIds(results, 'T-001')).toEqual(new Set(['q2', 'q3', 'q4']));
  });
});
