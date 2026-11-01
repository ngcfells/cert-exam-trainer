import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseExamMeta } from '../../domain/schema';
import { autoOpsMeta as meta } from './meta';

describe('AutoOps+ metadata', () => {
  it('matches the V1 test details', () => {
    expect(() => parseExamMeta(meta)).not.toThrow();
    expect(meta).toMatchObject({ code: 'AT0-001', version: '1', name: 'CompTIA AutoOps+', maxQuestions: 60, timeLimitMinutes: 60, passingScore: 600 });
  });

  it('has the four domains with weights 31, 25, 24, 20', () => {
    expect(meta.domains.map((d) => d.weight)).toEqual([31, 25, 24, 20]);
    expect(meta.domains.reduce((n, d) => n + d.weight, 0)).toBe(100);
    expect(meta.domains.map((d) => d.title)).toEqual([
      'Automation Coding Concepts',
      'System Configuration',
      'Continuous Integration',
      'Continuous Delivery',
    ]);
  });

  it('has the 14 published objectives, each under its domain', () => {
    expect(meta.objectives.map((o) => o.id)).toEqual([
      '1.1', '1.2', '1.3', '1.4', '2.1', '2.2', '2.3', '2.4', '3.1', '3.2', '3.3', '4.1', '4.2', '4.3',
    ]);
    for (const o of meta.objectives) expect(o.id.split('.')[0]).toBe(o.domainId);
    expect(meta.objectives.find((o) => o.id === '2.3')?.title).toMatch(/^Given a scenario, interact with Representational State Transfer.+\(CRUD\) operations\.$/);
    expect(meta.objectives.find((o) => o.id === '3.3')?.title).toBe('Given a scenario, analyze configurations to manage basic automation pipelines.');
  });

  it('carries the 33 official acronyms as printed, without repeats', () => {
    const terms = meta.acronyms.map((a) => a.term);
    expect(new Set(terms).size).toBe(terms.length);
    expect(meta.acronyms.filter((a) => a.source === 'official')).toHaveLength(33);
    // As printed in the objectives, even where the exam context suggests another meaning.
    expect(meta.acronyms.find((a) => a.term === 'POST')?.expansion).toBe('Power-on Self-test');
    expect(meta.acronyms.find((a) => a.term === 'CD')?.expansion).toBe('Continuous Delivery');
    for (const t of ['CI/CD', 'FaaS', 'IaC', 'WinRM', 'SBOM', 'YAML']) expect(terms).toContain(t);
  });

  it('has no unverified values left', () => {
    expect(readFileSync(path.resolve(__dirname, 'meta.ts'), 'utf8')).not.toMatch(/VERIFY|Placeholder/);
  });
});
