import { describe, it, expect } from 'vitest';
import { extractAcronyms, questionText } from '../../acronyms/extract';
import { CONTENT_TARGETS, answerBalance, longestOptionTell, nearDuplicates } from '../../content';
import { createRegistry } from '../registry';
import { dataPlusItems } from './items';
import { dataPlusMeta } from './meta';

// Checks on the shipped bank. Unit tests otherwise run against the fixture bank (VITE_BANK=fixture).
const items = dataPlusItems;
const singleCount = items.filter((q) => q.type === 'mcq-single').length;

describe('shipped Data+ bank', () => {
  it('registers: schema, ids, objectives and source all valid', () => {
    expect(() => createRegistry().registerExam(dataPlusMeta, items)).not.toThrow();
  });

  it('every acronym token and tag has an expansion', () => {
    const listed = new Set(dataPlusMeta.acronyms.map((a) => a.term));
    const tokens = new Set(items.flatMap((q) => [...extractAcronyms(questionText(q)), ...q.acronyms]));
    expect([...tokens].filter((t) => !listed.has(t)).sort()).toEqual([]);
  });

  it('has no near-duplicate stems', () => {
    expect(nearDuplicates(items)).toEqual([]);
  });

  it.runIf(singleCount >= 40)('spreads the correct answer across positions', () => {
    for (const share of Object.values(answerBalance(items))) expect(share).toBeLessThanOrEqual(CONTENT_TARGETS.maxPositionShare);
  });

  it.runIf(singleCount >= 40)('does not make the correct answer the longest option too often', () => {
    expect(longestOptionTell(items)).toBeLessThanOrEqual(CONTENT_TARGETS.maxLongestShare);
  });
});
