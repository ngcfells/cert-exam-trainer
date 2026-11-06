import { describe, expect, it } from 'vitest';
import { createMemoryRepo } from '../../storage/memoryRepo';
import { examResultSchema } from '../../exam/result';
import { IN_PROGRESS_SETTING, loadInProgress, saveInProgress } from '../../exam/inProgress';
import { sampleMock } from '../../exam/testMock';
import { metaFor } from '../../banks/metas';
import { recoverMock } from './recover';
import { finishAttempt } from './saveAttempt';

describe('recoverMock', () => {
  it('scores a saved mock as left, at the time it was last saved, and clears the record', async () => {
    const repo = createMemoryRepo();
    const p = sampleMock();
    await saveInProgress(repo, p);
    const got = await recoverMock(repo);
    expect(got?.examCode).toBe('DA0-002');
    expect(got?.finished.result).toMatchObject({ endedBy: 'left', autoSubmitted: false, finishedAt: p.savedAt, startedAt: p.startedAt, responses: p.responses, flagged: p.flagged, seed: 42 });
    const saved = (await repo.listRecords('results')).map((r) => examResultSchema.parse(r));
    expect(saved).toHaveLength(1);
    expect(saved[0].endedBy).toBe('left');
    expect(await loadInProgress(repo)).toBeNull();
  });

  it('skips an attempt already in history', async () => {
    const repo = createMemoryRepo();
    const p = sampleMock();
    await saveInProgress(repo, p);
    await recoverMock(repo);
    // The result saved, but the record came back (for example, a late save landed after the clear).
    await saveInProgress(repo, p);
    expect(await recoverMock(repo)).toBeNull();
    expect(await repo.listRecords('results')).toHaveLength(1);
    expect(await loadInProgress(repo)).toBeNull();
  });

  it('two calls at once (StrictMode runs the startup effect twice) score the attempt once', async () => {
    const repo = createMemoryRepo();
    await saveInProgress(repo, sampleMock());
    let puts = 0;
    const put = repo.putRecord.bind(repo);
    repo.putRecord = (async (store: string, rec: unknown) => {
      if (store === 'results') puts++;
      return put(store as never, rec as never);
    }) as typeof repo.putRecord;
    const [a, b] = await Promise.all([recoverMock(repo), recoverMock(repo)]);
    expect(a).toEqual(b);
    expect(puts).toBe(1);
  });

  it('a tab that already scored the attempt and a recovery in another tab leave one result', async () => {
    const repo = createMemoryRepo();
    const p = sampleMock();
    await saveInProgress(repo, p);
    const meta = metaFor('DA0-002')!;
    // Tab B opens and recovers the attempt while tab A still runs it; then A submits, later than B's last save.
    expect(await recoverMock(repo)).not.toBeNull();
    await finishAttempt(repo, meta, p.exam, new Date(p.startedAt), { responses: p.responses, flagged: p.flagged, finishedAt: new Date(2_000_000), autoSubmitted: false });
    const saved = (await repo.listRecords('results')).map((r) => examResultSchema.parse(r));
    expect(saved).toHaveLength(1);
    expect(saved[0].finishedAt).toBe(new Date(2_000_000).toISOString());
  });

  it('returns null with no record', async () => {
    expect(await recoverMock(createMemoryRepo())).toBeNull();
  });

  it('drops a record for an exam this build does not have', async () => {
    const repo = createMemoryRepo();
    const p = sampleMock();
    await saveInProgress(repo, { ...p, exam: { ...p.exam, exam: 'ZZ0-999' } });
    expect(await recoverMock(repo)).toBeNull();
    expect(await repo.getSetting(IN_PROGRESS_SETTING)).toBeNull();
    expect(await repo.listRecords('results')).toHaveLength(0);
  });
});
