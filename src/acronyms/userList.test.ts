import { describe, it, expect } from 'vitest';
import { SOURCE_SETTING } from '../banks/pool';
import type { Question } from '../domain/types';
import { createMemoryRepo } from '../storage/memoryRepo';
import type { AcronymEntry } from './list';
import { deleteUserAcronym, loadAcronyms, loadUserAcronyms, saveUserAcronym, unexpandedUserTerms, userAcronymSetting } from './userList';

const EXAM = 'DA0-002';

describe('user acronyms', () => {
  it('refuses bank terms and normalizes', async () => {
    const repo = createMemoryRepo();
    expect(await saveUserAcronym(repo, EXAM, ' etl ', 'Extract, Transform, Load')).toEqual({ error: 'ETL is already in the built-in list (shown when questions come from Ours or Both).' });
    expect(await saveUserAcronym(repo, EXAM, ' kpi ', '  Key Performance Indicator ')).toEqual({});
    expect(await saveUserAcronym(repo, EXAM, '', 'x')).toEqual({ error: 'Enter the acronym.' });
    expect(await saveUserAcronym(repo, EXAM, 'ROI', ' ')).toEqual({ error: 'Enter what it stands for.' });
    expect(await loadUserAcronyms(repo, EXAM)).toEqual([{ term: 'KPI', expansion: 'Key Performance Indicator', source: 'mine' }]);
  });

  it('replaces an existing mine expansion', async () => {
    const repo = createMemoryRepo();
    await saveUserAcronym(repo, EXAM, 'KPI', 'old');
    await saveUserAcronym(repo, EXAM, 'kpi', 'Key Performance Indicator');
    expect((await loadUserAcronyms(repo, EXAM)).map((a) => a.expansion)).toEqual(['Key Performance Indicator']);
    await deleteUserAcronym(repo, EXAM, 'KPI');
    expect(await loadUserAcronyms(repo, EXAM)).toEqual([]);
  });

  it('drops malformed stored entries', async () => {
    const repo = createMemoryRepo();
    await repo.setSetting(userAcronymSetting(EXAM), [
      { term: 'KPI', expansion: 'Key Performance Indicator', source: 'mine' },
      { term: '', expansion: 'x', source: 'mine' },
      { term: 'ROI', source: 'mine' },
      'junk',
      { term: 'AAA', expansion: 'x', source: 'official' },
    ]);
    expect((await loadUserAcronyms(repo, EXAM)).map((a) => a.term)).toEqual(['KPI']);
    await repo.setSetting(userAcronymSetting(EXAM), [
      { term: ' kpi ', expansion: 'first', source: 'mine' },
      { term: 'KPI', expansion: ' Key Performance Indicator ', source: 'mine' },
    ]);
    expect(await loadUserAcronyms(repo, EXAM)).toEqual([{ term: 'KPI', expansion: 'Key Performance Indicator', source: 'mine' }]);
    await repo.setSetting(userAcronymSetting(EXAM), 'not an array');
    expect(await loadUserAcronyms(repo, EXAM)).toEqual([]);
  });

  it('loadAcronyms applies the source filter', async () => {
    const repo = createMemoryRepo();
    await saveUserAcronym(repo, EXAM, 'KPI', 'Key Performance Indicator');
    expect((await loadAcronyms(repo, EXAM)).map((a) => a.term)).toContain('KPI');
    expect((await loadAcronyms(repo, EXAM)).map((a) => a.term)).toContain('SQL');
    await repo.setSetting(SOURCE_SETTING, 'mine');
    expect((await loadAcronyms(repo, EXAM)).map((a) => a.term)).toEqual(['KPI']);
    await repo.setSetting(SOURCE_SETTING, 'ours');
    expect((await loadAcronyms(repo, EXAM)).map((a) => a.term)).not.toContain('KPI');
  });

  it('unexpandedUserTerms lists only unknown tokens', () => {
    const q = { stem: 'Which KPI tracks ROI from SQL?', explanation: '', payload: { options: [] }, acronyms: ['CAGR'] } as unknown as Question;
    const list: AcronymEntry[] = [{ term: 'SQL', expansion: 'Structured Query Language', source: 'community' }];
    expect(unexpandedUserTerms([q], list)).toEqual(['CAGR', 'KPI', 'ROI']);
  });
});
