import { describe, expect, it } from 'vitest';
import { createMemoryRepo } from '../storage/memoryRepo';
import { clearInProgress, IN_PROGRESS_ANSWERS_SETTING, IN_PROGRESS_SETTING, loadInProgress, saveInProgress, saveProgress } from './inProgress';
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

  it('clears a record that does not parse, so it is not read again on every start', async () => {
    const repo = createMemoryRepo();
    await repo.setSetting(IN_PROGRESS_SETTING, { exam: 'nope' });
    await repo.setSetting(IN_PROGRESS_ANSWERS_SETTING, { junk: true });
    expect(await loadInProgress(repo)).toBeNull();
    expect(await repo.getSetting(IN_PROGRESS_SETTING)).toBeNull();
    expect(await repo.getSetting(IN_PROGRESS_ANSWERS_SETTING)).toBeNull();
  });

  it('saves answers without rewriting the exam, and loads them over it', async () => {
    const repo = createMemoryRepo();
    const p = sampleMock({ responses: {}, flagged: [] });
    await saveInProgress(repo, p);
    const writes: string[] = [];
    const set = repo.setSetting.bind(repo);
    repo.setSetting = (async (k: string, v: unknown) => {
      writes.push(k);
      return set(k, v);
    }) as typeof repo.setSetting;
    const answers = { startedAt: p.startedAt, savedAt: new Date(1_090_000).toISOString(), responses: sampleMock().responses, flagged: ['x'] };
    await saveProgress(repo, answers);
    expect(writes).toEqual([IN_PROGRESS_ANSWERS_SETTING]);
    expect(await loadInProgress(repo)).toEqual({ ...p, ...answers });
  });

  it('ignores answers left from another attempt', async () => {
    const repo = createMemoryRepo();
    const p = sampleMock();
    await saveProgress(repo, { startedAt: new Date(5).toISOString(), savedAt: new Date(6).toISOString(), responses: {}, flagged: ['old'] });
    await saveInProgress(repo, p);
    expect(await loadInProgress(repo)).toEqual(p);
  });

  it('clears to null', async () => {
    const repo = createMemoryRepo();
    const p = sampleMock();
    await saveInProgress(repo, p);
    await saveProgress(repo, { startedAt: p.startedAt, savedAt: p.savedAt, responses: {}, flagged: [] });
    await clearInProgress(repo);
    expect(await repo.getSetting(IN_PROGRESS_SETTING)).toBeNull();
    expect(await repo.getSetting(IN_PROGRESS_ANSWERS_SETTING)).toBeNull();
    expect(await loadInProgress(repo)).toBeNull();
  });
});
