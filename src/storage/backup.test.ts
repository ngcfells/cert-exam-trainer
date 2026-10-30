import { describe, it, expect, beforeEach } from 'vitest';
import { createMemoryRepo } from './memoryRepo';
import { exportBackup, importBackup, ImportError } from './backup';
import type { Repo } from './repo';
import { userQ } from './testFixtures';

async function seeded(): Promise<Repo> {
  const repo = createMemoryRepo();
  await repo.upsertUserQuestion(userQ('u1'));
  await repo.setSetting('theme', 'dark');
  await repo.putRecord('results', { id: 'r1', score: 700 });
  await repo.putRecord('srs', { id: 's1', box: 1 });
  return repo;
}

const snapshot = (repo: Repo) => exportBackup(repo, () => new Date(0));

describe('backup', () => {
  let repo: Repo;
  beforeEach(async () => {
    repo = await seeded();
  });

  it('round-trips into an empty repo', async () => {
    const file = await exportBackup(repo);
    expect(file.format).toBe('cert-exam-trainer-backup');
    const target = createMemoryRepo();
    const res = await importBackup(target, JSON.stringify(file), 'merge');
    expect(res).toEqual({ imported: 1, skipped: [] });
    expect(await snapshot(target)).toEqual(await snapshot(repo));
  });

  it('rejects invalid JSON and leaves repo unchanged', async () => {
    const before = await snapshot(repo);
    await expect(importBackup(repo, '{nope', 'replace')).rejects.toBeInstanceOf(ImportError);
    expect(await snapshot(repo)).toEqual(before);
  });

  it('rejects a wrong format', async () => {
    const file = { ...(await exportBackup(repo)), format: 'other' };
    await expect(importBackup(repo, JSON.stringify(file), 'merge')).rejects.toThrow(ImportError);
  });

  it('rejects the whole import when one question is invalid', async () => {
    const before = await snapshot(repo);
    const file = await exportBackup(createMemoryRepo());
    const bad = { ...userQ('u3'), answer: { correct: ['zzz'] } };
    const json = JSON.stringify({ ...file, userQuestions: [userQ('u2'), bad] });
    await expect(importBackup(repo, json, 'replace')).rejects.toThrow(/u3|question 2/);
    expect(await snapshot(repo)).toEqual(before);
  });

  it('skips bundled questions with a reason', async () => {
    const file = await exportBackup(createMemoryRepo());
    const json = JSON.stringify({ ...file, userQuestions: [{ ...userQ('o1'), source: 'ours' }, userQ('u2')] });
    const res = await importBackup(repo, json, 'merge');
    expect(res.imported).toBe(1);
    expect(res.skipped).toEqual([{ id: 'o1', reason: 'bundled questions cannot be imported' }]);
  });

  it('merge upserts, replace clears first', async () => {
    const file = await exportBackup(createMemoryRepo());
    const json = JSON.stringify({ ...file, userQuestions: [userQ('u2')] });

    await importBackup(repo, json, 'merge');
    expect((await repo.getUserQuestions()).map((q) => q.id).sort()).toEqual(['u1', 'u2']);
    expect(await repo.getSetting('theme')).toBe('dark');

    await importBackup(repo, json, 'replace');
    expect((await repo.getUserQuestions()).map((q) => q.id)).toEqual(['u2']);
    expect(await repo.getSetting('theme')).toBeUndefined();
    expect(await repo.listRecords('results')).toEqual([]);
  });
});
