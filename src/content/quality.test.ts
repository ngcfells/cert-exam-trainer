import { describe, it, expect } from 'vitest';
import type { Question } from '../domain/types';
import { answerBalance, listPositionTokens, longestOptionTell, nearDuplicates } from './quality';

describe('listPositionTokens', () => {
  const withStem = (stem: string): Question => ({ ...mcq('q', ['a']), stem });
  it('finds OWASP-style list positions', () => {
    expect(listPositionTokens(withStem('Which risk does LLM01 covers?'))).toEqual(['LLM01']);
    expect(listPositionTokens(withStem('See ML05 and A03: Injection.'))).toEqual(['ML05', 'A03:']);
  });
  it('ignores plain mentions of LLMs and ML', () => {
    expect(listPositionTokens(withStem('an LLM and ML model'))).toEqual([]);
  });
});

const mcq = (id: string, correct: string[], texts = ['w', 'x', 'y', 'z'], stem = id): Question =>
  ({
    id,
    type: correct.length > 1 ? 'mcq-multi' : 'mcq-single',
    stem,
    payload: { options: texts.map((text, i) => ({ id: 'abcd'[i], text })) },
    answer: { correct },
  }) as Question;

describe('nearDuplicates', () => {
  it('flags stems that differ by one word, ignoring case and punctuation', () => {
    const a = mcq('a', ['a'], undefined, 'An analyst needs to combine two tables that share a customer key. Which join keeps every row?');
    const b = mcq('b', ['a'], undefined, 'an analyst needs to combine two tables that share a CUSTOMER key; which join keeps all rows');
    const c = mcq('c', ['a'], undefined, 'Which chart best shows the share of revenue by region for a single quarter?');
    const found = nearDuplicates([a, b, c]);
    expect(found.map(([x, y]) => [x, y])).toEqual([['a', 'b']]);
    expect(found[0][2]).toBeGreaterThanOrEqual(0.6);
  });
});

describe('answerBalance', () => {
  it('gives the share of single-answer MCQs by correct option position', () => {
    const qs = [mcq('1', ['a']), mcq('2', ['a']), mcq('3', ['b']), mcq('4', ['c']), mcq('5', ['a', 'b'])];
    expect(answerBalance(qs)).toEqual({ '0': 0.5, '1': 0.25, '2': 0.25, '3': 0 });
  });

  it('ignores PBQs', () => {
    expect(answerBalance([{ id: 'p', type: 'pbq-order' } as Question])).toEqual({ '0': 0, '1': 0, '2': 0, '3': 0 });
  });
});

describe('longestOptionTell', () => {
  it('is 0 for no questions', () => {
    expect(longestOptionTell([])).toBe(0);
  });

  it('counts only a strictly longest correct option', () => {
    const qs = [
      mcq('1', ['a'], ['longest one', 'b', 'c', 'd']),
      mcq('2', ['a'], ['tie', 'tie', 'c', 'd']),
      mcq('3', ['b'], ['long text', 'b', 'c', 'd']),
      mcq('4', ['c'], ['a', 'b', 'the longest', 'd']),
    ];
    expect(longestOptionTell(qs)).toBe(0.5);
  });
});
