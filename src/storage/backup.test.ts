import { describe, it, expect, beforeEach } from 'vitest';
import { createMemoryRepo } from './memoryRepo';
import { exportBackup, importBackup, ImportError } from './backup';
import type { Repo } from './repo';
import { resultRec, srsRec, userQ } from './testFixtures';
import { IN_PROGRESS_ANSWERS_SETTING, IN_PROGRESS_SETTING, saveInProgress, saveProgress } from '../exam/inProgress';
import { sampleMock } from '../exam/testMock';

async function seeded(): Promise<Repo> {
  const repo = createMemoryRepo();
  await repo.upsertUserQuestion(userQ('u1'));
  await repo.setSetting('theme', 'dark');
  await repo.putRecord('results', { ...resultRec('r1') });
  await repo.putRecord('srs', srsRec('s1'));
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

  it('round-trips a numeric user question with a numeric response', async () => {
    await repo.upsertUserQuestion({ ...userQ('n1'), type: 'numeric', payload: {}, answer: { value: 3, tolerance: 0 } });
    await repo.putRecord('results', { ...resultRec('r2'), questionIds: ['n1'], optionOrders: {}, responses: { n1: ['3'] } });
    const target = createMemoryRepo();
    expect(await importBackup(target, JSON.stringify(await exportBackup(repo)), 'merge')).toEqual({ imported: 2, skipped: [] });
    expect(await snapshot(target)).toEqual(await snapshot(repo));
  });

  it('round-trips multi-answer user questions with a pick', async () => {
    const multi = (id: string, pick: number | 'all') => ({
      ...userQ(id), type: 'mcq-multi' as const, pick,
      payload: { options: ['a', 'b', 'c'].map((o) => ({ id: o, text: o })) }, answer: { correct: ['a', 'c'] },
    });
    await repo.upsertUserQuestion(multi('m2', 2));
    await repo.upsertUserQuestion(multi('ma', 'all'));
    const target = createMemoryRepo();
    expect(await importBackup(target, JSON.stringify(await exportBackup(repo)), 'merge')).toEqual({ imported: 3, skipped: [] });
    expect(await snapshot(target)).toEqual(await snapshot(repo));
    expect((await target.getUserQuestions()).map((q) => q.pick)).toEqual(expect.arrayContaining([2, 'all']));
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

  it('rejects a question for an unknown exam and leaves repo unchanged', async () => {
    const before = await snapshot(repo);
    const file = await exportBackup(createMemoryRepo());
    const json = JSON.stringify({ ...file, userQuestions: [userQ('u2', 'XYZ-999')] });
    await expect(importBackup(repo, json, 'replace')).rejects.toThrow(/unknown exam "XYZ-999"/);
    expect(await snapshot(repo)).toEqual(before);
  });

  it('rejects a question with an unknown objective', async () => {
    const file = await exportBackup(createMemoryRepo());
    const json = JSON.stringify({ ...file, userQuestions: [{ ...userQ('u2'), objectiveIds: ['9.9'] }] });
    await expect(importBackup(repo, json, 'merge')).rejects.toThrow(/unknown objective "9.9"/);
  });

  it('skips a user question whose id collides with a bundled question', async () => {
    const file = await exportBackup(createMemoryRepo());
    const json = JSON.stringify({ ...file, userQuestions: [userQ('da2-seed-003')] });
    const res = await importBackup(repo, json, 'merge');
    expect(res.imported).toBe(0);
    expect(res.skipped).toEqual([{ id: 'da2-seed-003', reason: 'id is already used by a bundled question' }]);
  });

  it('restores the previous data when a write fails midway through replace', async () => {
    const before = await snapshot(repo);
    let failNext = true;
    const flaky: Repo = {
      ...repo,
      async upsertUserQuestion(q) {
        if (failNext && q.id === 'u2') {
          failNext = false;
          throw new Error('QuotaExceededError');
        }
        return repo.upsertUserQuestion(q);
      },
    };
    const file = await exportBackup(createMemoryRepo());
    const json = JSON.stringify({ ...file, userQuestions: [userQ('u2')] });
    await expect(importBackup(flaky, json, 'replace')).rejects.toThrow(/previous data was restored/);
    expect(await snapshot(repo)).toEqual(before);
  });

  it('rejects a results record that is not a valid exam result', async () => {
    const file = await exportBackup(createMemoryRepo());
    const json = JSON.stringify({ ...file, results: [{ id: 'x' }] });
    await expect(importBackup(repo, json, 'merge')).rejects.toThrow(/results/);
  });

  it('rejects a malformed srs record, names srs.0 and leaves the repo unchanged', async () => {
    const before = await snapshot(repo);
    const file = await exportBackup(createMemoryRepo());
    const json = JSON.stringify({ ...file, srs: [{ id: 'x', box: 1 }] });
    await expect(importBackup(repo, json, 'replace')).rejects.toThrow(/srs\.0/);
    expect(await snapshot(repo)).toEqual(before);
  });

  it('round-trips a valid srs record', async () => {
    const target = createMemoryRepo();
    await importBackup(target, JSON.stringify(await exportBackup(repo)), 'merge');
    expect(await target.listRecords('srs')).toEqual([srsRec('s1')]);
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

  it('never carries a mock in progress: export leaves it out, import does not write it', async () => {
    const p = sampleMock();
    await saveInProgress(repo, p);
    await saveProgress(repo, { startedAt: p.startedAt, savedAt: p.savedAt, responses: {}, flagged: [] });
    const file = await exportBackup(repo);
    expect(file.settings).not.toHaveProperty(IN_PROGRESS_SETTING);
    expect(file.settings).not.toHaveProperty(IN_PROGRESS_ANSWERS_SETTING);
    expect(file.settings).toHaveProperty('theme', 'dark');

    const target = createMemoryRepo();
    const withRecord = { ...file, settings: { ...file.settings, [IN_PROGRESS_SETTING]: p, [IN_PROGRESS_ANSWERS_SETTING]: { startedAt: p.startedAt } } };
    await importBackup(target, JSON.stringify(withRecord), 'merge');
    expect(await target.getSetting(IN_PROGRESS_SETTING)).toBeUndefined();
    expect(await target.getSetting(IN_PROGRESS_ANSWERS_SETTING)).toBeUndefined();
    expect(await target.getSetting('theme')).toBe('dark');
  });

  it('export leaves out the outbox, and a replace import keeps waiting reports', async () => {
    const waiting = {
      id: '3b241101-e2bb-4255-8caf-000000000001',
      type: 'bug' as const,
      title: 'Timer stops',
      details: 'It froze.',
      version: '0.1.0',
      savedAt: '2026-11-06T12:00:00.000Z',
    };
    await repo.putOutbox(waiting);
    const file = await exportBackup(repo);
    expect(JSON.stringify(file)).not.toContain(waiting.id);
    expect(Object.keys(file)).not.toContain('outbox');
    await importBackup(repo, JSON.stringify(file), 'replace');
    expect(await repo.listOutbox()).toEqual([waiting]);
  });
});
