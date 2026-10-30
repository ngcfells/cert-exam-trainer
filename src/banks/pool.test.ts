import { describe, it, expect } from 'vitest';
import { createMemoryRepo } from '../storage/memoryRepo';
import { userQ } from '../storage/testFixtures';
import { getBundledQuestions } from './index';
import { getSourceFilter, loadPool, SOURCE_SETTING } from './pool';

async function repoWithMine() {
  const repo = createMemoryRepo();
  await repo.upsertUserQuestion(userQ('u1'));
  return repo;
}

describe('loadPool', () => {
  it('defaults to both', async () => {
    const repo = await repoWithMine();
    expect(await getSourceFilter(repo)).toBe('both');
    await repo.setSetting(SOURCE_SETTING, 'nonsense');
    expect(await getSourceFilter(repo)).toBe('both');
    expect(await loadPool(repo, 'DA0-002')).toEqual([...getBundledQuestions('DA0-002'), userQ('u1')]);
  });

  it('ours excludes user questions', async () => {
    const repo = await repoWithMine();
    await repo.setSetting(SOURCE_SETTING, 'ours');
    expect(await loadPool(repo, 'DA0-002')).toEqual(getBundledQuestions('DA0-002'));
  });

  it('leaves out user drafts and reviewed questions', async () => {
    const repo = await repoWithMine();
    await repo.upsertUserQuestion({ ...userQ('u2'), status: 'draft' });
    await repo.upsertUserQuestion({ ...userQ('u3'), status: 'reviewed' });
    await repo.setSetting(SOURCE_SETTING, 'mine');
    expect(await loadPool(repo, 'DA0-002')).toEqual([userQ('u1')]);
  });

  it('mine excludes bundled', async () => {
    const repo = await repoWithMine();
    await repo.setSetting(SOURCE_SETTING, 'mine');
    expect(await loadPool(repo, 'DA0-002')).toEqual([userQ('u1')]);
  });
});
