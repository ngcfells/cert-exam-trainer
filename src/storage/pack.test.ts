import { describe, it, expect } from 'vitest';
import { createMemoryRepo } from './memoryRepo';
import { exportBackup, ImportError } from './backup';
import { exportPack, importPack, PACK_FORMAT } from './pack';
import { userQ } from './testFixtures';
import { registerExam } from '../banks';
import { dataPlusMeta } from '../banks/dataplus/meta';

let registered = false;
function registerOther() {
  if (!registered) registerExam({ ...dataPlusMeta, code: 'T-PACK' }, []);
  registered = true;
}

const pack = (questions: unknown[]) => JSON.stringify({ format: PACK_FORMAT, version: 1, exportedAt: '', questions });

describe('question pack', () => {
  it('exports only user questions for the exam', async () => {
    const repo = createMemoryRepo();
    await repo.upsertUserQuestion(userQ('u1'));
    await repo.upsertUserQuestion(userQ('u2', 'OTHER'));
    const file = await exportPack(repo, 'DA0-002', () => new Date(0));
    expect(file).toEqual({ format: PACK_FORMAT, version: 1, exportedAt: new Date(0).toISOString(), questions: [userQ('u1')] });
  });

  it('round-trips export to import', async () => {
    const repo = createMemoryRepo();
    await repo.upsertUserQuestion(userQ('u1'));
    const target = createMemoryRepo();
    expect(await importPack(target, JSON.stringify(await exportPack(repo)))).toEqual({ imported: 1, skipped: [] });
    expect(await target.getUserQuestions()).toEqual([userQ('u1')]);
  });

  it('fills defaults', async () => {
    const repo = createMemoryRepo();
    const bare: Partial<ReturnType<typeof userQ>> = userQ('u1');
    for (const k of ['source', 'acronyms', 'status', 'explanation'] as const) delete bare[k];
    await importPack(repo, pack([bare]));
    expect(await repo.getUserQuestions()).toEqual([userQ('u1')]);
  });

  it('rejects duplicate ids in a pack', async () => {
    const repo = createMemoryRepo();
    await expect(importPack(repo, pack([userQ('u1'), userQ('u1')]))).rejects.toThrow(/repeats an id/);
    expect(await repo.getUserQuestions()).toEqual([]);
  });

  it('skips ids used by bundled questions', async () => {
    const repo = createMemoryRepo();
    const res = await importPack(repo, pack([userQ('da2-seed-001'), userQ('u1')]));
    expect(res.imported).toBe(1);
    expect(res.skipped).toEqual([{ id: 'da2-seed-001', reason: 'id is already used by a bundled question' }]);
  });

  it('rejects a backup file with a clear message', async () => {
    const repo = createMemoryRepo();
    const backup = JSON.stringify(await exportBackup(repo));
    await expect(importPack(repo, backup)).rejects.toThrow(/backup file.*Import backup/);
  });

  it('an invalid question names its index and path', async () => {
    const repo = createMemoryRepo();
    const bad = { ...userQ('u1'), answer: { correct: ['z'] } };
    const err = await importPack(repo, pack([bad])).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ImportError);
    expect((err as Error).message).toMatch(/Question 1 \(u1\).*answer\.correct/);
  });

  it('skips questions for another exam when an exam is given', async () => {
    registerOther();
    const repo = createMemoryRepo();
    const res = await importPack(repo, pack([userQ('u1'), userQ('u2', 'T-PACK')]), 'DA0-002');
    expect(res).toEqual({ imported: 1, skipped: [{ id: 'u2', reason: 'it is for T-PACK, not DA0-002' }] });
  });

  it('imports a numeric user question and rejects a negative tolerance with a path', async () => {
    const num = { ...userQ('n1'), type: 'numeric', payload: { suffix: '%' }, answer: { value: 25, tolerance: 0.5 } };
    expect(await importPack(createMemoryRepo(), pack([num, userQ('u1')]))).toEqual({ imported: 2, skipped: [] });
    await expect(importPack(createMemoryRepo(), pack([{ ...num, answer: { value: 1, tolerance: -1 } }]))).rejects.toThrow(/answer\.tolerance/);
  });

  it('rejects invalid JSON', async () => {
    await expect(importPack(createMemoryRepo(), '{')).rejects.toThrow(/not valid JSON/);
  });
});
