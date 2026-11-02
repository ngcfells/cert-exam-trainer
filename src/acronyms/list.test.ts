import { describe, it, expect } from 'vitest';
import { meaningText, mergeAcronyms, type AcronymEntry } from './list';

const bank = [
  { term: 'SQL', expansion: 'Structured Query Language', source: 'official' as const },
  { term: 'ETL', expansion: 'Extract, Transform, Load', source: 'community' as const },
];
const mine: AcronymEntry[] = [
  { term: 'SQL', expansion: 'mine wins never', source: 'mine' },
  { term: 'KPI', expansion: 'Key Performance Indicator', source: 'mine' },
];

describe('mergeAcronyms', () => {
  it('merge prefers official over community over mine', () => {
    const both = mergeAcronyms(
      [...bank, { term: 'KPI', expansion: 'community one', source: 'community' }],
      mine,
      'both',
    );
    expect(both.map((a) => [a.term, a.source])).toEqual([
      ['ETL', 'community'],
      ['KPI', 'community'],
      ['SQL', 'official'],
    ]);
  });

  it('keeps alternates from the bank list', () => {
    const alt = [{ term: 'CD', expansion: 'Continuous Delivery', alternates: ['Continuous Deployment'], source: 'official' as const }];
    expect(mergeAcronyms(alt, [], 'both')[0].alternates).toEqual(['Continuous Deployment']);
    expect(mergeAcronyms(bank, [], 'both')[0]).not.toHaveProperty('alternates');
  });

  it('meaningText lists the alternates in a parenthetical', () => {
    expect(meaningText({ term: 'CD', expansion: 'Continuous Delivery', alternates: ['Continuous Deployment'], source: 'official' }))
      .toBe('Continuous Delivery (also: Continuous Deployment)');
    expect(meaningText({ term: 'MTTR', expansion: 'Mean Time to Recovery', alternates: ['Mean Time to Repair', 'Mean Time to Restore'], source: 'community' }))
      .toBe('Mean Time to Recovery (also: Mean Time to Repair; Mean Time to Restore)');
    expect(meaningText(bank[0])).toBe('Structured Query Language');
  });

  it('filter ours drops mine', () => {
    expect(mergeAcronyms(bank, mine, 'ours').map((a) => a.term)).toEqual(['ETL', 'SQL']);
  });

  it('filter mine keeps only mine', () => {
    expect(mergeAcronyms(bank, mine, 'mine').map((a) => a.term)).toEqual(['KPI', 'SQL']);
  });
});
