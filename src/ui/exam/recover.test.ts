import { describe, expect, it } from 'vitest';
import { createMemoryRepo } from '../../storage/memoryRepo';
import { examResultSchema } from '../../exam/result';
import { IN_PROGRESS_SETTING, loadInProgress, saveInProgress } from '../../exam/inProgress';
import { sampleMock } from '../../exam/testMock';
import { recoverMock } from './recover';

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
