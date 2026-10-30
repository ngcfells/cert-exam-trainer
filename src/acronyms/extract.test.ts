import { describe, it, expect } from 'vitest';
import type { Question } from '../domain/types';
import { extractAcronyms, NOT_ACRONYMS, questionText } from './extract';

describe('extractAcronyms', () => {
  it('finds capitals tokens', () => {
    expect(extractAcronyms('Load the CSV via an API, then run SQL and ETL2 jobs.')).toEqual(['API', 'CSV', 'ETL2', 'SQL']);
  });

  it('drops plural s', () => {
    expect(extractAcronyms('Two APIs and three KPIs')).toEqual(['API', 'KPI']);
  });

  it('ignores single letters and lower case', () => {
    expect(extractAcronyms('A table, I think; json and Api are not tokens. X1 neither.')).toEqual([]);
  });

  it('ignores more SQL keywords and types', () => {
    expect(extractAcronyms('WHERE EXISTS, EXCEPT, CAST(x AS VARCHAR), EXTRACT(YEAR FROM d), DATE BETWEEN, COALESCE, LEFT JOIN, OFFSET, PARTITION, OVER, COUNTIF, DATEDIFF, STDEV, IFERROR, VLOOKUP')).toEqual([]);
  });

  it('ignores the select-count words in stems', () => {
    expect(extractAcronyms('Which TWO apply? Which THREE apply? Pick FOUR.')).toEqual([]);
  });

  it('ignores tokens longer than 8 characters', () => {
    expect(extractAcronyms('ABCDEFGHI')).toEqual([]);
  });

  it('ignores NOT_ACRONYMS', () => {
    for (const w of NOT_ACRONYMS) expect(extractAcronyms(`${w} PII`)).toEqual(['PII']);
  });
});

describe('questionText', () => {
  it('questionText walks payload strings', () => {
    const q = {
      stem: 'stem SQL',
      explanation: 'why ETL',
      partExplanations: { p1: 'part PII' },
      payload: { options: [{ id: 'a', text: 'opt CSV' }], nested: { deep: ['JSON'] }, n: 3 },
    } as unknown as Question;
    expect(extractAcronyms(questionText(q))).toEqual(['CSV', 'ETL', 'JSON', 'PII', 'SQL']);
  });
});
