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
      'b-distribution-shape': 'bell-rule',
      'c-hypotheses': 'tail-curve',
      'c-type-errors': 'error-matrix',
      'c-p-values': 'tail-curve',
      'd-linear-regression': 'regression-fit',
      'd-logistic-regression': 'sigmoid-curve',
      'f-join-types': 'join-venn',
    });
  });

  it('exposes the shipped lessons for the bank checks', () => {
    expect(shippedLessons.map((l) => l.id)).toContain('a-percent-change');
  });
});
