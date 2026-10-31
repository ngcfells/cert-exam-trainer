import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { dataPlusMeta as meta } from './meta';

describe('Data+ metadata', () => {
  it('has domain weights that sum to 100', () => {
    expect(meta.domains.reduce((n, d) => n + d.weight, 0)).toBe(100);
  });

  it('gives every domain an objective numbered under it', () => {
    for (const d of meta.domains) expect(meta.objectives.some((o) => o.domainId === d.id)).toBe(true);
    for (const o of meta.objectives) {
      expect(o.id).toMatch(/^[1-5]\.\d+$/);
      expect(o.id.split('.')[0]).toBe(o.domainId);
    }
  });

  it('has the 18 published objectives', () => {
    expect(meta.objectives.map((o) => o.id)).toEqual([
      '1.1', '1.2', '1.3', '1.4', '1.5', '2.1', '2.2', '2.3', '3.1', '3.2', '3.3', '4.1', '4.2', '4.3', '5.1', '5.2', '5.3', '5.4',
    ]);
  });

  it('has no unverified values left', () => {
    expect(readFileSync(path.resolve(__dirname, 'meta.ts'), 'utf8')).not.toMatch(/VERIFY/);
  });

  it('carries the official acronym list without repeats', () => {
    const terms = meta.acronyms.map((a) => a.term);
    expect(new Set(terms).size).toBe(terms.length);
    expect(meta.acronyms.filter((a) => a.source === 'official')).toHaveLength(41);
    expect(meta.acronyms.filter((a) => a.source === 'community')).toHaveLength(24);
  });
});
