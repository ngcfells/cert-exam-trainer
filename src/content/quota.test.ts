import { describe, it, expect } from 'vitest';
import type { ExamMeta, Question } from '../domain/types';
import { coverage, objectiveQuotas, pbqTypeCounts } from './quota';

const meta = {
  code: 'X',
  version: '1',
  name: 'X',
  maxQuestions: 10,
  timeLimitMinutes: 10,
  passingScore: 600,
  domains: [
    { id: '1', title: 'A', weight: 60 },
    { id: '2', title: 'B', weight: 40 },
  ],
  objectives: [
    { id: '1.1', domainId: '1', title: 'a' },
    { id: '1.2', domainId: '1', title: 'b' },
    { id: '2.1', domainId: '2', title: 'c' },
  ],
  acronyms: [],
} as ExamMeta;

const q = (id: string, type: Question['type'], obj: string): Question =>
  ({ id, type, objectiveIds: [obj] }) as Question;

describe('objectiveQuotas', () => {
  it('splits each total by domain weight, then evenly across the domain, rounding up', () => {
    expect(objectiveQuotas(meta, { mcq: 10, pbq: 5 })).toEqual({
      '1.1': { mcq: 3, pbq: 2 },
      '1.2': { mcq: 3, pbq: 2 },
      '2.1': { mcq: 4, pbq: 2 },
    });
  });
});

describe('coverage', () => {
  it('counts MCQs and PBQs by first objective, with zeros for empty objectives', () => {
    const qs = [q('a', 'mcq-single', '1.1'), q('b', 'mcq-multi', '1.1'), q('c', 'pbq-order', '2.1')];
    expect(coverage(meta, qs)).toEqual({
      '1.1': { mcq: 2, pbq: 0 },
      '1.2': { mcq: 0, pbq: 0 },
      '2.1': { mcq: 0, pbq: 1 },
    });
  });
});

describe('pbqTypeCounts', () => {
  it('counts every template, including those with none', () => {
    const counts = pbqTypeCounts([q('a', 'pbq-order', '1.1'), q('b', 'pbq-order', '1.1'), q('c', 'mcq-single', '1.1')]);
    expect(counts['pbq-order']).toBe(2);
    expect(counts['pbq-match']).toBe(0);
    expect(Object.keys(counts)).toHaveLength(8);
  });
});
