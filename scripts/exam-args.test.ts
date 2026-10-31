import { describe, it, expect } from 'vitest';
import { examFromArgs, parseArgs } from './exam-args';

describe('parseArgs', () => {
  it('splits flags from files and skips the npm separator', () => {
    expect(parseArgs(['--', '--exam', 'CY0-001', 'a.json', '--ref', 'notes', 'b.json'])).toEqual({
      flags: { exam: 'CY0-001', ref: 'notes' },
      positional: ['a.json', 'b.json'],
    });
  });

  it('rejects a flag with no value', () => {
    expect(() => parseArgs(['--exam'])).toThrow('--exam needs a value');
  });
});

describe('examFromArgs', () => {
  it('returns the named exam', () => {
    expect(examFromArgs(parseArgs(['--exam', 'CY0-001'])).meta.code).toBe('CY0-001');
    expect(examFromArgs(parseArgs(['--exam', 'DA0-002'])).items.length).toBeGreaterThan(0);
  });

  it('requires a known --exam', () => {
    expect(() => examFromArgs(parseArgs(['x.json']))).toThrow(/missing --exam/);
    expect(() => examFromArgs(parseArgs(['--exam', 'XX0-000']))).toThrow('unknown exam "XX0-000"');
  });
});
