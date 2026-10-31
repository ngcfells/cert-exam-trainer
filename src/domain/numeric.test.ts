import { describe, expect, it } from 'vitest';
import { formatNumericAnswer, isUnitItem, numericCorrect, parseNumeric } from './numeric';
import type { Question } from './types';

describe('parseNumeric', () => {
  it.each([
    ['1,250', 1250], ['$12.50', 12.5], ['25 %', 25], ['-3.5', -3.5], ['.5', 0.5], ['7.', 7], [' 42 ', 42],
    ['−25', -25], ['–3.5', -3.5], ['12,345,678', 12345678],
    ['1,2,3', null], ['12,5', null], [',100', null],
    ['1.2.3', null], ['--4', null], ['abc', null], ['.', null], ['', null], ['-', null], ['4-', null],
  ])('%j -> %j', (text, out) => {
    expect(parseNumeric(text)).toBe(out);
  });
});

describe('numericCorrect', () => {
  const a = { value: 12.5, tolerance: 0.05 };
  it('accepts the tolerance edge despite float error', () => expect(numericCorrect(a, '12.55')).toBe(true));
  it('rejects just outside', () => expect(numericCorrect(a, '12.56')).toBe(false));
  it('keeps the edge for large values', () => {
    expect(numericCorrect({ value: 125000000.1, tolerance: 0.05 }, '125000000.15')).toBe(true);
  });
  it('rejects blank and unparseable', () => {
    expect(numericCorrect(a, undefined)).toBe(false);
    expect(numericCorrect(a, 'x')).toBe(false);
  });
});

describe('isUnitItem', () => {
  it('is true for one-unit types only', () => {
    for (const type of ['mcq-single', 'mcq-multi', 'numeric'] as const) expect(isUnitItem({ type })).toBe(true);
    expect(isUnitItem({ type: 'pbq-match' })).toBe(false);
  });
});

describe('formatNumericAnswer', () => {
  const q = (payload: object, answer: object) => ({ type: 'numeric', payload, answer }) as unknown as Question;
  it('adds affixes and the tolerance when above 0', () => {
    expect(formatNumericAnswer(q({ prefix: '$' }, { value: 12.5, tolerance: 0 }))).toBe('$12.5');
    expect(formatNumericAnswer(q({ suffix: '%' }, { value: 25, tolerance: 0.5 }))).toBe('25% (± 0.5)');
  });
});
