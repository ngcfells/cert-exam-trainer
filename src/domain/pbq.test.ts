import { describe, it, expect } from 'vitest';
import { questionSchema } from './schema';
import { correctParts, elementIds, partLabel, valueText } from './pbq';
import type { Question } from './types';
import { fixtures, items } from './pbqFixtures';

const ok = (x: unknown) => questionSchema.safeParse(x).success;

describe('PBQ schemas', () => {
  it('accepts a valid question of each template', () => {
    for (const f of Object.values(fixtures)) expect(ok(f)).toBe(true);
  });

  it('rejects bad cross references', () => {
    const m = fixtures.match;
    expect(ok({ ...m, answer: { pairs: { p1: 'c2', p2: 'c1', px: 'c1' } } })).toBe(false);
    expect(ok({ ...m, answer: { pairs: { p1: 'c2' } } })).toBe(false);
    expect(ok({ ...m, answer: { pairs: { p1: 'c2', p2: 'zz' } } })).toBe(false);
    expect(ok({ ...fixtures.order, answer: { order: ['s1', 's1', 's3'] } })).toBe(false);
    expect(ok({ ...fixtures.order, answer: { order: ['s1', 's2'] } })).toBe(false);
    expect(ok({ ...fixtures.config, answer: { values: { f1: 'right' } } })).toBe(false);
    expect(ok({ ...fixtures.diagram, answer: { placements: { z1: 'l9' } } })).toBe(false);
    expect(ok({ ...m, payload: { ...m.payload, choices: items('c1', 'c1') } })).toBe(false);
    expect(ok({ ...m, payload: {} })).toBe(false);
  });

  it('flattens answers into parts', () => {
    const q = fixtures.order as unknown as Question;
    expect(correctParts(q)).toEqual({ '0': 's2', '1': 's1', '2': 's3' });
    expect(partLabel(q, '1')).toBe('Position 2');
    expect(valueText(q, '1', 's1')).toBe('T-s1');
    expect(correctParts(fixtures.match as unknown as Question)).toEqual({ p1: 'c2', p2: 'c1' });
  });

  it('lists the shuffleable elements', () => {
    expect(elementIds(fixtures.match as unknown as Question)).toEqual(['c1', 'c2', 'c3']);
    expect(elementIds(fixtures.order as unknown as Question)).toEqual(['s1', 's2', 's3']);
    expect(elementIds(fixtures.config as unknown as Question)).toEqual([]);
    expect(elementIds(fixtures.diagram as unknown as Question)).toEqual(['l1', 'l2']);
    expect(partLabel(fixtures.diagram as unknown as Question, 'z1')).toBe('Destination box');
  });
});
