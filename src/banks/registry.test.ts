import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRegistry } from './registry';
import { listExams, getBundledQuestions } from './index';
import { dataPlusMeta } from './dataplus/meta';
import { dataPlusQuestions } from './dataplus/questions';

afterEach(() => vi.unstubAllEnvs());

describe('bundled registry', () => {
  it('lists DA0-002', () => {
    expect(listExams().map((e) => e.code)).toContain('DA0-002');
  });

  it('returns only approved questions in production', () => {
    vi.stubEnv('DEV', false);
    expect(getBundledQuestions('DA0-002')).toHaveLength(6);
  });

  it('returns drafts when includeDrafts is true', () => {
    expect(getBundledQuestions('DA0-002', { includeDrafts: true })).toHaveLength(7);
  });

  it('returns empty for an unknown exam', () => {
    expect(getBundledQuestions('NOPE')).toEqual([]);
  });
});

describe('registerExam', () => {
  it('throws on an unknown objective', () => {
    const r = createRegistry();
    const bad = { ...dataPlusQuestions[0], objectiveIds: ['9.9'] };
    expect(() => r.registerExam(dataPlusMeta, [bad])).toThrow(/objective/);
  });

  it('throws on a duplicate id', () => {
    const r = createRegistry();
    const q = dataPlusQuestions[0];
    expect(() => r.registerExam(dataPlusMeta, [q, q])).toThrow(/duplicate/i);
  });

  it('throws on a question for a different exam', () => {
    const r = createRegistry();
    expect(() => r.registerExam(dataPlusMeta, [{ ...dataPlusQuestions[0], exam: 'X' }])).toThrow();
  });

  it('throws on a non-ours question', () => {
    const r = createRegistry();
    expect(() => r.registerExam(dataPlusMeta, [{ ...dataPlusQuestions[0], source: 'user' }])).toThrow();
  });
});
