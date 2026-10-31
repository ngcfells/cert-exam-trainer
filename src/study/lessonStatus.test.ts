import { describe, expect, it } from 'vitest';
import { createMemoryRepo } from '../storage/memoryRepo';
import type { ScoreReport } from '../exam/scoring';
import { checkFraction, lessonState, loadLessonStatus, markOpened, recordCheck } from './lessonStatus';

describe('lesson status', () => {
  it('goes not started → in progress → done, keeping the best score', async () => {
    const repo = createMemoryRepo();
    expect(lessonState((await loadLessonStatus(repo, 'X'))['l1'])).toBe('not-started');
    await markOpened(repo, 'X', 'l1');
    expect(lessonState((await loadLessonStatus(repo, 'X'))['l1'])).toBe('in-progress');
    await recordCheck(repo, 'X', 'l1', 0.67);
    expect(lessonState((await loadLessonStatus(repo, 'X'))['l1'])).toBe('in-progress');
    await recordCheck(repo, 'X', 'l1', 0.9);
    await recordCheck(repo, 'X', 'l1', 0.5);
    await markOpened(repo, 'X', 'l1');
    const s = await loadLessonStatus(repo, 'X');
    expect(s.l1).toEqual({ best: 0.9 });
    expect(lessonState(s.l1)).toBe('done');
    expect(await loadLessonStatus(repo, 'OTHER')).toEqual({});
  });

  it('80% is done, just under is not', () => {
    expect(lessonState({ best: 0.8 })).toBe('done');
    expect(lessonState({ best: 0.79 })).toBe('in-progress');
  });

  it.each(['x', { a: { best: 'y' } }, { a: { best: 2 } }, null])('a corrupt setting %j loads as empty', async (bad) => {
    const repo = createMemoryRepo();
    await repo.setSetting('lessonStatus:X', bad);
    expect(await loadLessonStatus(repo, 'X')).toEqual({});
  });
});

describe('checkFraction', () => {
  it('counts unseen check items as 0', () => {
    const report = { items: [{ questionId: 'a', earned: 300, possible: 300, fraction: 1, answered: true }] } as ScoreReport;
    expect(checkFraction(report, ['a', 'b', 'c'])).toBeCloseTo(1 / 3);
  });
});
