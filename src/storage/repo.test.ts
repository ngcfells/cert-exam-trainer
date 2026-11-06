import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { Repo } from './repo';
import { createMemoryRepo } from './memoryRepo';
import { openIdbRepo } from './idbRepo';
import { openRepo } from './index';
import { userQ } from './testFixtures';
import { openDB } from 'idb';
import { MAX_OUTBOX, OutboxFullError, type OutboxReport } from '../report/outbox';

const outboxRec = (n: number): OutboxReport => ({
  id: `3b241101-e2bb-4255-8caf-${String(n).padStart(12, '0')}`,
  type: 'bug',
  title: `Report ${n}`,
  details: 'Details.',
  version: '0.1.0',
  savedAt: '2026-11-06T12:00:00.000Z',
});

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

  it('lists waiting reports oldest first', async () => {
    await repo.putOutbox({ ...outboxRec(1), savedAt: '2026-11-06T12:00:00.000Z' });
    await repo.putOutbox({ ...outboxRec(2), savedAt: '2026-11-05T12:00:00.000Z' });
    await repo.putOutbox({ ...outboxRec(3), savedAt: '2026-11-07T12:00:00.000Z' });
    expect((await repo.listOutbox()).map((r) => r.id)).toEqual([outboxRec(2).id, outboxRec(1).id, outboxRec(3).id]);
  });

  it('puts, lists and deletes outbox reports', async () => {
    await repo.putOutbox(outboxRec(1));
    await repo.putOutbox(outboxRec(2));
    expect((await repo.listOutbox()).map((r) => r.id).sort()).toEqual([outboxRec(1).id, outboxRec(2).id]);
    await repo.deleteOutbox(outboxRec(1).id);
    expect((await repo.listOutbox()).map((r) => r.id)).toEqual([outboxRec(2).id]);
  });

  it('refuses an 11th new outbox report', async () => {
    for (let i = 1; i <= MAX_OUTBOX; i++) await repo.putOutbox(outboxRec(i));
    await expect(repo.putOutbox(outboxRec(11))).rejects.toBeInstanceOf(OutboxFullError);
    expect(await repo.listOutbox()).toHaveLength(MAX_OUTBOX);
  });

  it('replaces an outbox report with the same id, even when full', async () => {
    for (let i = 1; i <= MAX_OUTBOX; i++) await repo.putOutbox(outboxRec(i));
    await repo.putOutbox({ ...outboxRec(3), title: 'Changed' });
    const all = await repo.listOutbox();
    expect(all).toHaveLength(MAX_OUTBOX);
    expect(all.find((r) => r.id === outboxRec(3).id)?.title).toBe('Changed');
  });

  it('a stored outbox report has no turnstileToken', async () => {
    await repo.putOutbox({ ...outboxRec(1), turnstileToken: 'tok' } as OutboxReport);
    expect((await repo.listOutbox())[0]).not.toHaveProperty('turnstileToken');
  });

  it('clearAll keeps the outbox (only backup import calls it)', async () => {
    await repo.putOutbox(outboxRec(1));
    await repo.clearAll();
    expect(await repo.listOutbox()).toHaveLength(1);
  });
});

describe('idb upgrade', () => {
  it('opens a version-1 database and keeps its results', async () => {
    const name = `v1-db-${dbCounter++}`;
    const v1 = await openDB(name, 1, {
      upgrade(db) {
        const qs = db.createObjectStore('userQuestions', { keyPath: 'id' });
        qs.createIndex('exam', 'exam');
        db.createObjectStore('settings');
        db.createObjectStore('results', { keyPath: 'id' });
        db.createObjectStore('srs', { keyPath: 'id' });
      },
    });
    await v1.put('results', { id: 'r1', score: 700 });
    v1.close();
    const repo = await openIdbRepo(name);
    expect(await repo.listRecords('results')).toEqual([{ id: 'r1', score: 700 }]);
    expect(await repo.listOutbox()).toEqual([]);
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

  it('falls back to memory when IndexedDB never answers', async () => {
    vi.stubGlobal('indexedDB', { open: () => new EventTarget() });
    const { persistent } = await openRepo({ timeoutMs: 50 });
    expect(persistent).toBe(false);
  });
});
