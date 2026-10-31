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
    expect(await saveUserAcronym(repo, EXAM, ' etl ', 'Extract, Transform, Load')).toEqual({ error: 'ETL is already in the stock list (shown when questions use Stock).' });
    expect(await saveUserAcronym(repo, EXAM, ' arr ', '  Annual Recurring Revenue ')).toEqual({});
    expect(await saveUserAcronym(repo, EXAM, '', 'x')).toEqual({ error: 'Enter the acronym.' });
    expect(await saveUserAcronym(repo, EXAM, 'ROI', ' ')).toEqual({ error: 'Enter what it stands for.' });
    expect(await loadUserAcronyms(repo, EXAM)).toEqual([{ term: 'ARR', expansion: 'Annual Recurring Revenue', source: 'mine' }]);
  });

  it('replaces an existing mine expansion', async () => {
    const repo = createMemoryRepo();
    await saveUserAcronym(repo, EXAM, 'ARR', 'old');
    await saveUserAcronym(repo, EXAM, 'arr', 'Annual Recurring Revenue');
    expect((await loadUserAcronyms(repo, EXAM)).map((a) => a.expansion)).toEqual(['Annual Recurring Revenue']);
    await deleteUserAcronym(repo, EXAM, 'ARR');
    expect(await loadUserAcronyms(repo, EXAM)).toEqual([]);
  });

  it('drops malformed stored entries', async () => {
    const repo = createMemoryRepo();
    await repo.setSetting(userAcronymSetting(EXAM), [
      { term: 'ARR', expansion: 'Annual Recurring Revenue', source: 'mine' },
      { term: '', expansion: 'x', source: 'mine' },
      { term: 'ROI', source: 'mine' },
      'junk',
      { term: 'AAA', expansion: 'x', source: 'official' },
    ]);
    expect((await loadUserAcronyms(repo, EXAM)).map((a) => a.term)).toEqual(['ARR']);
    await repo.setSetting(userAcronymSetting(EXAM), [
      { term: ' arr ', expansion: 'first', source: 'mine' },
      { term: 'ARR', expansion: ' Annual Recurring Revenue ', source: 'mine' },
    ]);
    expect(await loadUserAcronyms(repo, EXAM)).toEqual([{ term: 'ARR', expansion: 'Annual Recurring Revenue', source: 'mine' }]);
    await repo.setSetting(userAcronymSetting(EXAM), 'not an array');
    expect(await loadUserAcronyms(repo, EXAM)).toEqual([]);
  });

  it('loadAcronyms applies the source filter', async () => {
    const repo = createMemoryRepo();
    await saveUserAcronym(repo, EXAM, 'ARR', 'Annual Recurring Revenue');
    expect((await loadAcronyms(repo, EXAM)).map((a) => a.term)).toContain('ARR');
    expect((await loadAcronyms(repo, EXAM)).map((a) => a.term)).toContain('SQL');
    await repo.setSetting(SOURCE_SETTING, 'mine');
    expect((await loadAcronyms(repo, EXAM)).map((a) => a.term)).toEqual(['ARR']);
    await repo.setSetting(SOURCE_SETTING, 'ours');
    expect((await loadAcronyms(repo, EXAM)).map((a) => a.term)).not.toContain('ARR');
  });

  it('unexpandedUserTerms lists only unknown tokens', () => {
    const q = { stem: 'Which MAU tracks ROI from SQL?', explanation: '', payload: { options: [] }, acronyms: ['CAGR'] } as unknown as Question;
    const list: AcronymEntry[] = [{ term: 'SQL', expansion: 'Structured Query Language', source: 'community' }];
    expect(unexpandedUserTerms([q], list)).toEqual(['CAGR', 'MAU', 'ROI']);
  });
});
