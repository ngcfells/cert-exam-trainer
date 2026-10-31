import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseExamMeta } from '../../domain/schema';
import { secAiMeta as meta } from './meta';

describe('SecAI+ metadata', () => {
  it('matches the v4.0 test details', () => {
    expect(() => parseExamMeta(meta)).not.toThrow();
    expect(meta).toMatchObject({ code: 'CY0-001', version: '1', name: 'CompTIA SecAI+', maxQuestions: 60, timeLimitMinutes: 60, passingScore: 600 });
  });

  it('has the four domains with weights 17, 40, 24, 19', () => {
    expect(meta.domains.map((d) => d.weight)).toEqual([17, 40, 24, 19]);
    expect(meta.domains.reduce((n, d) => n + d.weight, 0)).toBe(100);
    expect(meta.domains.map((d) => d.title)).toEqual([
      'Basic AI Concepts Related to Cybersecurity',
      'Securing AI Systems',
      'AI-assisted Security',
      'AI Governance, Risk, and Compliance',
    ]);
  });

  it('has the 15 published objectives, each under its domain', () => {
    expect(meta.objectives.map((o) => o.id)).toEqual([
      '1.1', '1.2', '1.3', '2.1', '2.2', '2.3', '2.4', '2.5', '2.6', '3.1', '3.2', '3.3', '4.1', '4.2', '4.3',
    ]);
    for (const o of meta.objectives) expect(o.id.split('.')[0]).toBe(o.domainId);
    expect(meta.objectives.every((o) => !o.title.startsWith('Objective '))).toBe(true);
  });

  it('carries the 63 official acronyms without repeats', () => {
    const terms = meta.acronyms.map((a) => a.term);
    expect(new Set(terms).size).toBe(terms.length);
    expect(meta.acronyms.filter((a) => a.source === 'official')).toHaveLength(63);
    expect(meta.acronyms.find((a) => a.term === 'IP')?.expansion).toBe('Intellectual Property');
    expect(meta.acronyms.find((a) => a.term === 'SOC')?.expansion).toBe('Security Operations Center');
    for (const t of ['CI/CD', 'PCI DSS', 'SOC 2', 'IaC', 'IdP', 'DoS', 'DDoS', 'MLOps', 'OAuth']) expect(terms).toContain(t);
  });

  it('has no unverified values left', () => {
    expect(readFileSync(path.resolve(__dirname, 'meta.ts'), 'utf8')).not.toMatch(/VERIFY|Placeholder/);
  });
});
