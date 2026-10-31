import { fixtures } from './pbqFixtures';
import { describe, it, expect } from 'vitest';
import { parseQuestion, parseExamMeta } from './schema';

const mcq = {
  id: 'q1',
  exam: 'DA0-002',
  source: 'ours',
  type: 'mcq-single',
  objectiveIds: ['1.1'],
  difficulty: 1,
  stem: 'Which is a primary key?',
  payload: { options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }] },
  answer: { correct: ['a'] },
  explanation: 'Because.',
  acronyms: [],
  status: 'approved',
};

const meta = {
  code: 'DA0-002',
  version: '2',
  name: 'CompTIA Data+',
  maxQuestions: 90,
  timeLimitMinutes: 90,
  passingScore: 675,
  domains: [
    { id: '1', title: 'A', weight: 60 },
    { id: '2', title: 'B', weight: 40 },
  ],
  objectives: [{ id: '1.1', domainId: '1', title: 'x' }],
  acronyms: [],
};

describe('numeric questions', () => {
  const num = { ...mcq, id: 'n1', type: 'numeric', payload: { suffix: '%' }, answer: { value: 25, tolerance: 0.5 } };
  it('parses a valid numeric', () => {
    expect(parseQuestion(num).type).toBe('numeric');
  });
  it.each([
    ['pbqWeight', { ...num, pbqWeight: 2 }, 'pbqWeight'],
    ['negative tolerance', { ...num, answer: { value: 25, tolerance: -1 } }, 'answer'],
    ['infinite value', { ...num, answer: { value: Infinity, tolerance: 0 } }, 'answer'],
    ['missing value', { ...num, answer: { tolerance: 0 } }, 'answer'],
    ['extra payload key', { ...num, payload: { suffix: '%', options: [] } }, 'payload'],
  ])('rejects %s', (_n, q, path) => {
    expect(() => parseQuestion(q)).toThrow(new RegExp(path));
  });
});

describe('parseQuestion', () => {
  it('parses a valid mcq-single', () => {
    expect(parseQuestion(mcq).id).toBe('q1');
  });

  it('rejects mcq-single with 2 correct', () => {
    expect(() => parseQuestion({ ...mcq, answer: { correct: ['a', 'b'] } })).toThrow();
  });

  it('rejects mcq-multi with only 1 correct', () => {
    expect(() => parseQuestion({ ...mcq, type: 'mcq-multi' })).toThrow();
  });

  it('rejects pbq-order without pbqWeight', () => {
    expect(() => parseQuestion({ ...mcq, type: 'pbq-order', payload: {}, answer: {} })).toThrow();
  });

  it('accepts a PBQ with pbqWeight', () => {
    expect(parseQuestion({ ...fixtures.terminal, pbqWeight: 3 }).pbqWeight).toBe(3);
  });

  it('rejects pbqWeight 7', () => {
    expect(() => parseQuestion({ ...mcq, type: 'pbq-order', pbqWeight: 7, payload: {}, answer: {} })).toThrow();
  });

  it('rejects mcq with pbqWeight', () => {
    expect(() => parseQuestion({ ...mcq, pbqWeight: 2 })).toThrow();
  });

  it('rejects correct id not in options', () => {
    expect(() => parseQuestion({ ...mcq, answer: { correct: ['z'] } })).toThrow();
  });
});

describe('parseExamMeta', () => {
  it('rejects a repeated acronym term', () => {
    const entry = { term: 'SQL', expansion: 'Structured Query Language', source: 'community' };
    expect(() => parseExamMeta({ ...meta, acronyms: [entry, { ...entry, source: 'official' }] })).toThrow(/repeated acronym \\"SQL\\"/);
  });

  it('parses valid meta', () => {
    expect(parseExamMeta(meta).code).toBe('DA0-002');
  });

  it('rejects domain weights not summing to 100', () => {
    expect(() =>
      parseExamMeta({ ...meta, domains: [{ id: '1', title: 'A', weight: 50 }] }),
    ).toThrow();
  });
});
