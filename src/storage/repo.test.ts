import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { Repo } from './repo';
import { createMemoryRepo } from './memoryRepo';
import { openIdbRepo } from './idbRepo';
import { openRepo } from './index';
import { userQ } from './testFixtures';

let dbCounter = 0;
const impls: [string, () => Promise<Repo>][] = [
  ['memory', async () => createMemoryRepo()],
  ['idb', async () => openIdbRepo(`test-db-${dbCounter++}`)],
];

describe.each(impls)('Repo contract: %s', (_name, make) => {
  let repo: Repo;
  beforeEach(async () => {
    repo = await make();
  });

  it('upserts then gets, filtered by exam', async () => {
    await repo.upsertUserQuestion(userQ('a'));
    await repo.upsertUserQuestion(userQ('b', 'OTHER'));
    expect((await repo.getUserQuestions()).map((q) => q.id).sort()).toEqual(['a', 'b']);
    expect((await repo.getUserQuestions('DA0-002')).map((q) => q.id)).toEqual(['a']);
  });

  it('replaces on same id', async () => {
    await repo.upsertUserQuestion(userQ('a'));
    await repo.upsertUserQuestion({ ...userQ('a'), stem: 'changed' });
    const all = await repo.getUserQuestions();
    expect(all).toHaveLength(1);
    expect(all[0].stem).toBe('changed');
  });

  it('deletes', async () => {
    await repo.upsertUserQuestion(userQ('a'));
    await repo.deleteUserQuestion('a');
    expect(await repo.getUserQuestions()).toEqual([]);
  });

  it('rejects source ours', async () => {
    await expect(repo.upsertUserQuestion({ ...userQ('a'), source: 'ours' })).rejects.toThrow();
    expect(await repo.getUserQuestions()).toEqual([]);
  });

  it('gets and sets settings', async () => {
    expect(await repo.getSetting('theme')).toBeUndefined();
    await repo.setSetting('theme', { dark: true });
    expect(await repo.getSetting('theme')).toEqual({ dark: true });
  });

  it('puts and lists records', async () => {
    await repo.putRecord('results', { id: 'r1', score: 700 });
    await repo.putRecord('srs', { id: 's1', box: 2 });
    expect(await repo.listRecords('results')).toEqual([{ id: 'r1', score: 700 }]);
    expect(await repo.listRecords('srs')).toEqual([{ id: 's1', box: 2 }]);
  });

  it('clears all', async () => {
    await repo.upsertUserQuestion(userQ('a'));
    await repo.setSetting('k', 1);
    await repo.putRecord('results', { id: 'r1' });
    await repo.clearAll();
    expect(await repo.getUserQuestions()).toEqual([]);
    expect(await repo.getSetting('k')).toBeUndefined();
    expect(await repo.listRecords('results')).toEqual([]);
  });
});

describe('openRepo', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('is persistent when IndexedDB works', async () => {
    expect((await openRepo()).persistent).toBe(true);
  });

  it('falls back to memory when indexedDB is undefined', async () => {
    vi.stubGlobal('indexedDB', undefined);
    const { repo, persistent } = await openRepo();
    expect(persistent).toBe(false);
    await repo.setSetting('x', 1);
    expect(await repo.getSetting('x')).toBe(1);
  });
});
