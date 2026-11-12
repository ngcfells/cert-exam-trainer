import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseExamMeta } from '../../domain/schema';
import { cysaMeta as meta } from './meta';

describe('CySA+ metadata', () => {
  it('matches the V4 test details', () => {
    expect(() => parseExamMeta(meta)).not.toThrow();
    expect(meta).toMatchObject({ code: 'CS0-004', version: '4', name: 'CompTIA CySA+', maxQuestions: 85, timeLimitMinutes: 165, passingScore: 750 });
  });

  it('has the four domains with weights 34, 26, 24, 16', () => {
    expect(meta.domains.map((d) => d.weight)).toEqual([34, 26, 24, 16]);
    expect(meta.domains.reduce((n, d) => n + d.weight, 0)).toBe(100);
    expect(meta.domains.map((d) => d.title)).toEqual([
      'Security Operations',
      'Vulnerability Management',
      'Incident Response and Management',
      'Reporting and Communication',
    ]);
  });

  it('has the 15 published objectives, each under its domain', () => {
    expect(meta.objectives.map((o) => o.id)).toEqual([
      '1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '2.1', '2.2', '2.3', '2.4', '3.1', '3.2', '3.3', '4.1', '4.2',
    ]);
    for (const o of meta.objectives) expect(o.id.split('.')[0]).toBe(o.domainId);
    expect(meta.objectives.find((o) => o.id === '1.6')?.title).toBe('Summarize concepts related to the use of AI in security operations.');
    expect(meta.objectives.find((o) => o.id === '4.2')?.title).toBe(
      'Explain the importance of security operations and incident response reporting and communication.',
    );
  });

  it('carries the 81 official acronyms as printed, without repeats', () => {
    const terms = meta.acronyms.map((a) => a.term);
    expect(new Set(terms).size).toBe(terms.length);
    expect(meta.acronyms.filter((a) => a.source === 'official')).toHaveLength(81);
    // As printed in the objectives, even where the usual expansion differs.
    expect(meta.acronyms.find((a) => a.term === 'ASN')?.expansion).toBe('Anonymous System Number');
    expect(meta.acronyms.find((a) => a.term === 'DNS')?.expansion).toBe('Domain Name Service');
    expect(meta.acronyms.find((a) => a.term === 'STRIDE')?.expansion).toBe(
      'Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, and Elevation of privilege',
    );
    for (const t of ['PCI DSS', 'TTPs', 'IoC', 'GeoIP', 'OpenVAS', 'ZTNA']) expect(terms).toContain(t);
  });

  it('has no unverified values left', () => {
    expect(readFileSync(path.resolve(__dirname, 'meta.ts'), 'utf8')).not.toMatch(/VERIFY|Placeholder/);
  });
});
