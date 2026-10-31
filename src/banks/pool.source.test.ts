import { describe, it, expect } from 'vitest';
import { createMemoryRepo } from '../storage/memoryRepo';
import { getSourceFilter, setSourceFilter, SOURCE_SETTING, sourceSettingKey } from './pool';

describe('per-exam source filter', () => {
  it('keys the setting by exam', () => {
    expect(sourceSettingKey('DA0-002')).toBe('sourceFilter:DA0-002');
  });

  it('falls back to the old global value until an exam has its own', async () => {
    const repo = createMemoryRepo();
    await repo.setSetting(SOURCE_SETTING, 'ours');
    expect(await getSourceFilter(repo, 'DA0-002')).toBe('ours');
    await setSourceFilter(repo, 'DA0-002', 'mine');
    expect(await getSourceFilter(repo, 'DA0-002')).toBe('mine');
    expect(await getSourceFilter(repo, 'CY0-001')).toBe('ours');
    expect(await repo.getSetting(SOURCE_SETTING)).toBe('ours');
  });

  it('ignores a nonsense per-exam value', async () => {
    const repo = createMemoryRepo();
    await repo.setSetting(SOURCE_SETTING, 'mine');
    await repo.setSetting(sourceSettingKey('DA0-002'), 'nonsense');
    expect(await getSourceFilter(repo, 'DA0-002')).toBe('mine');
    await repo.setSetting(SOURCE_SETTING, 'nonsense');
    expect(await getSourceFilter(repo, 'DA0-002')).toBe('both');
  });
});
