import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../exam/rng';
import { review } from '../study/srs';
import type { AcronymEntry } from './list';
import { assembleDeck, buildChoices, isCorrect, normalizeAnswer } from './quiz';

const e = (term: string, expansion: string): AcronymEntry => ({ term, expansion, source: 'community' });
const entries = [
  e('API', 'Application Programming Interface'),
  e('CSV', 'Comma-Separated Values'),
  e('ETL', 'Extract, Transform, Load'),
  e('PII', 'Personally Identifiable Information (PII)'),
  e('SQL', 'Structured Query Language'),
];
const now = new Date('2026-10-30T12:00:00Z');
const rec = (term: string, quality: number, at: Date) => review(undefined, { exam: 'X', kind: 'acronym', itemId: term, quality }, at);

describe('assembleDeck', () => {
  it('due deck puts overdue first then new', () => {
    const srs = [
      rec('SQL', 1, new Date('2026-10-30T10:00:00Z')), // due 10:10
      rec('API', 1, new Date('2026-10-30T09:00:00Z')), // due 09:10, more overdue
      rec('CSV', 5, now), // not due
      { ...rec('ETL', 1, new Date('2026-10-01T00:00:00Z')), exam: 'OTHER', id: 'OTHER:a:ETL' }, // other exam
    ];
    const deck = assembleDeck({ entries, srs, exam: 'X', now, seed: 1, scope: 'due', count: 10 });
    expect(deck.slice(0, 2).map((d) => d.term)).toEqual(['API', 'SQL']);
    expect(deck.slice(2).map((d) => d.term).sort()).toEqual(['ETL', 'PII']);
  });

  it('all deck is seeded', () => {
    const a = assembleDeck({ entries, srs: [], exam: 'X', now, seed: 7, scope: 'all', count: 3 });
    expect(a).toHaveLength(3);
    expect(assembleDeck({ entries, srs: [], exam: 'X', now, seed: 7, scope: 'all', count: 3 })).toEqual(a);
  });
});

describe('answer matching', () => {
  it('normalizeAnswer folds case, punctuation and ampersands', () => {
    expect(normalizeAnswer('  Research &  Development (R&D) ')).toBe('research and development');
  });

  it('matching ignores case, punctuation and parentheticals', () => {
    expect(isCorrect(entries[2], 'term', 'extract transform load')).toBe(true);
    expect(isCorrect(entries[2], 'term', 'Extract-Transform-Load')).toBe(true);
    expect(isCorrect(entries[3], 'term', 'personally identifiable information')).toBe(true);
    expect(isCorrect(entries[2], 'term', 'extract load')).toBe(false);
  });

  it('term direction ignores case and spaces', () => {
    expect(isCorrect(entries[4], 'expansion', ' s q l ')).toBe(true);
    expect(isCorrect(entries[4], 'expansion', 'S.Q.L.')).toBe(true);
    expect(isCorrect(entries[4], 'expansion', 'sq')).toBe(false);
  });

  it('empty input is wrong', () => {
    expect(isCorrect(entries[0], 'term', '   ')).toBe(false);
    expect(isCorrect(entries[0], 'expansion', '')).toBe(false);
  });
});

describe('buildChoices', () => {
  it('choices contain the answer once and no repeats', () => {
    const dup = [...entries, e('XYZ', 'Comma-Separated Values')];
    for (let seed = 0; seed < 20; seed++) {
      const c = buildChoices(entries[1], dup, 'term', mulberry32(seed));
      expect(c).toHaveLength(4);
      expect(new Set(c).size).toBe(4);
      expect(c.filter((x) => x === 'Comma-Separated Values')).toHaveLength(1);
    }
    expect(buildChoices(entries[1], entries, 'expansion', mulberry32(1))).toContain('CSV');
  });

  it('choices need two entries', () => {
    expect(buildChoices(entries[0], [entries[0]], 'term', mulberry32(1))).toEqual(['Application Programming Interface']);
  });
});
