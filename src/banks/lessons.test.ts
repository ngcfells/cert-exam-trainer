import { describe, expect, it } from 'vitest';
import { getBundledQuestions } from '.';
import { getLessons, shippedLessons } from './lessons';

describe('getLessons', () => {
  it('returns the fixture lessons in tests, each linking approved bundled questions', () => {
    const lessons = getLessons('DA0-002');
    expect(lessons.map((l) => l.id)).toEqual(['fx-percent-change']);
    const ids = new Set(getBundledQuestions('DA0-002').map((q) => q.id));
    for (const l of lessons) expect(l.checkIds.filter((id) => !ids.has(id))).toEqual([]);
  });

  it('returns nothing for an unknown exam', () => {
    expect(getLessons('NOPE')).toEqual([]);
  });

  it('gives the lessons that a picture clarifies their diagram', () => {
    const kinds = Object.fromEntries(shippedLessons.filter((l) => l.diagram).map((l) => [l.id, l.diagram!.kind]));
    expect(kinds).toEqual({
      'b-outliers-iqr': 'box-plot',
      'b-distribution-shape': 'bell-rule',
      'c-hypotheses': 'tail-curve',
      'c-type-errors': 'error-matrix',
      'c-p-values': 'tail-curve',
      'd-linear-regression': 'regression-fit',
      'd-logistic-regression': 'sigmoid-curve',
      'f-join-types': 'join-venn',
      'g-putting-it-together': 'decision-chain',
    });
  });

  it('teaches the error term in linear regression, and says logistic regression has none', () => {
    const lin = shippedLessons.find((l) => l.id === 'd-linear-regression')!;
    expect(lin.formula!.text).toBe('y = mx + b + ε');
    expect(lin.formula!.spoken).toMatch(/plus epsilon/);
    const eps = lin.formula!.symbols.find((s) => s.symbol === 'ε')!;
    expect(eps.meaning).toMatch(/error/i);
    expect(eps.meaning).toMatch(/residual/i);
    const log = shippedLessons.find((l) => l.id === 'd-logistic-regression')!;
    expect(log.rule!.join(' ')).toMatch(/no error term/i);
  });

  it('exposes the shipped lessons for the bank checks', () => {
    expect(shippedLessons.map((l) => l.id)).toContain('a-percent-change');
  });
});
