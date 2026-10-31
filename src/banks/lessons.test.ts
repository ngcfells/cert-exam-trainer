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

  it('exposes the shipped lessons for the bank checks', () => {
    expect(shippedLessons.map((l) => l.id)).toContain('a-percent-change');
  });
});
