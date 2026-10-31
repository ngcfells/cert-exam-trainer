import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { dataPlusItems } from './items';
import { dataPlusFixtureQuestions } from './fixture';
import { dataPlusQuestions } from './questions';

const dir = path.resolve(__dirname, 'items');

describe('Data+ bank files', () => {
  it('loads every item file', () => {
    const total = readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .reduce((n, f) => n + (JSON.parse(readFileSync(path.join(dir, f), 'utf8')) as unknown[]).length, 0);
    expect(dataPlusItems).toHaveLength(total);
  });

  it('keeps the fixture set', () => {
    expect(dataPlusFixtureQuestions.map((q) => q.id)).toEqual([
      'da2-seed-001',
      'da2-seed-002',
      'da2-pbq-match-001',
      'da2-pbq-order-001',
      'da2-pbq-config-001',
      'da2-pbq-diagram-001',
      'da2-pbq-terminal-001',
      'da2-pbq-data-001',
      'da2-pbq-hotspot-001',
      'da2-pbq-buckets-001',
      'da2-seed-003',
    ]);
  });

  it('unit tests run against the fixture bank', () => {
    expect(dataPlusQuestions).toBe(dataPlusFixtureQuestions);
  });
});
