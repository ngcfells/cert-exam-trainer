import { describe, expect, it } from 'vitest';
import { createMemoryRepo } from '../storage/memoryRepo';
import { clearInProgress, IN_PROGRESS_SETTING, loadInProgress, saveInProgress } from './inProgress';
import { sampleMock } from './testMock';

describe('mock in progress', () => {
  it('round-trips through the repo', async () => {
    const repo = createMemoryRepo();
    const p = sampleMock();
    await saveInProgress(repo, p);
    expect(await loadInProgress(repo)).toEqual(p);
  });

  it('loads missing or garbage records as null', async () => {
    const repo = createMemoryRepo();
    expect(await loadInProgress(repo)).toBeNull();
    await repo.setSetting(IN_PROGRESS_SETTING, { exam: 'nope' });
    expect(await loadInProgress(repo)).toBeNull();
    await repo.setSetting(IN_PROGRESS_SETTING, { ...sampleMock(), startedAt: 'not a date' });
    expect(await loadInProgress(repo)).toBeNull();
  });

  it('clears to null', async () => {
    const repo = createMemoryRepo();
    await saveInProgress(repo, sampleMock());
    await clearInProgress(repo);
    expect(await repo.getSetting(IN_PROGRESS_SETTING)).toBeNull();
    expect(await loadInProgress(repo)).toBeNull();
  });
});
