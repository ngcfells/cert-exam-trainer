import { describe, it, expect } from 'vitest';
import { computeMastery, history, trendPoints, weakestObjectives } from './mastery';
import { mcq, meta3, numeric, pbq } from '../exam/testFixtures';
import type { ExamResult } from '../exam/result';

let n = 0;
function res(responses: ExamResult['responses'], extra: Partial<ExamResult> = {}): ExamResult {
  n++;
  return {
    id: `r${n}`,
    exam: 'T-001',
    seed: 1,
    startedAt: new Date(n * 1000).toISOString(),
    finishedAt: new Date(n * 1000 + 500).toISOString(),
    autoSubmitted: false,
    questionIds: Object.keys(responses),
    optionOrders: {},
    responses,
    flagged: [],
    score: 500,
    passed: false,
    ...extra,
  };
}

const qs = [mcq('A0', 'A'), mcq('A1', 'A'), mcq('B0', 'B'), pbq('P', 3)];
const obj = (m: ReturnType<typeof computeMastery>, id: string) => m.objectives.find((o) => o.objectiveId === id)!;

describe('mastery', () => {
  it('averages answers per objective', () => {
    const m = computeMastery(meta3, [res({ A0: ['a'] }), res({ A1: ['b'] })], qs);
    expect(obj(m, 'A.1')).toMatchObject({ fraction: 0.5, attempts: 2, domainId: 'A', title: 'Objective A1' });
    expect(m.domains.find((d) => d.domainId === 'A')!.fraction).toBe(0.5);
  });

  it('weights PBQs by pbqWeight', () => {
    const m = computeMastery(meta3, [res({ P: { p1: 'c1' }, A0: ['a'] })], qs);
    expect(obj(m, 'A.1')).toMatchObject({ earned: 2.5, possible: 4, fraction: 2.5 / 4 });
  });

  it('skips unknown question ids and other exams; untouched objectives are null', () => {
    const m = computeMastery(meta3, [res({ gone: ['a'], B0: ['a'] }), res({ A0: ['a'] }, { exam: 'OTHER' }), { id: 'junk' }], qs);
    expect(obj(m, 'A.1')).toMatchObject({ attempts: 0, fraction: null });
    expect(obj(m, 'B.1')).toMatchObject({ attempts: 1, fraction: 1 });
    expect(obj(m, 'C.1').fraction).toBeNull();
  });

  it('weakestObjectives: attempted ascending, then unattempted in meta order', () => {
    const m = computeMastery(meta3, [res({ A0: ['b'], B0: ['a'] })], qs);
    expect(weakestObjectives(m, 3)).toEqual(['A.1', 'B.1', 'C.1']);
    expect(weakestObjectives(m, 1)).toEqual(['A.1']);
  });

  it('history is newest first; trendPoints are mock only, oldest first', () => {
    const a = res({ A0: ['a'] }, { score: 600 });
    const b = res({ A0: ['a'] }, { mode: 'practice', score: 900 });
    const c = res({ A0: ['a'] }, { score: 700, passed: true });
    const h = history([a, b, c, res({}, { exam: 'OTHER' })], 'T-001');
    expect(h.map((x) => x.id)).toEqual([c.id, b.id, a.id]);
    expect(h[1].mode).toBe('practice');
    expect(trendPoints(h).map((p) => p.score)).toEqual([600, 700]);
  });
});

describe('numeric in mastery', () => {
  it('weights a numeric item as 1', () => {
    const m = computeMastery(meta3, [res({ N: ['25'], A0: ['b'] })], [...qs, numeric('N', 'A')]);
    expect(obj(m, 'A.1')).toMatchObject({ earned: 1, possible: 2 });
  });
});
