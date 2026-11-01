import { describe, expect, it } from 'vitest';
import { checkExpansion, expandTerms, ollamaChat, parseExpandArgs } from './expand-lib';

const stream = (body: string) => (async () => new Response(body)) as unknown as typeof fetch;

describe('ollamaChat', () => {
  it('joins streamed content, including a last line with no newline', async () => {
    const chat = ollamaChat('m', 1000, stream('{"message":{"content":"{\\"it"}}\n{"message":{"content":"ems\\":[]}"}}'));
    expect(await chat('x')).toBe('{"items":[]}');
  });
  it('throws on an error line', async () => {
    await expect(ollamaChat('m', 1000, stream('{"error":"model not found"}\n'))('x')).rejects.toThrow(/model not found/);
  });
});

describe('parseExpandArgs', () => {
  it('parses flags and defaults', () => {
    expect(parseExpandArgs(['--', '--report', 'r.json'])).toEqual({ report: 'r.json', out: '', model: 'qwen3.6:27b', minCount: 1, terms: [] });
    expect(parseExpandArgs(['--report', 'r.json', '--min-count', '3', '--model', 'q', '--out', 'o.json']))
      .toEqual({ report: 'r.json', out: 'o.json', model: 'q', minCount: 3, terms: [] });
  });
  it('--terms takes a comma list, trimmed and de-duplicated, case kept', () => {
    expect(parseExpandArgs(['--report', 'r', '--terms', 'MTTR, SHA,,MTTR,FaaS']).terms).toEqual(['MTTR', 'SHA', 'FaaS']);
    expect(() => parseExpandArgs(['--report', 'r', '--terms', ' , '])).toThrow(/--terms/);
  });
  it('rejects bad input', () => {
    expect(() => parseExpandArgs(['--report', 'r', '--min-count', 'abc'])).toThrow(/min-count/);
    expect(() => parseExpandArgs(['--report', 'r', '--min-count', '0'])).toThrow(/min-count/);
    expect(() => parseExpandArgs([])).toThrow(/--report/);
    expect(() => parseExpandArgs(['--report', 'r', '--x', '1'])).toThrow(/--x/);
  });
});

describe('checkExpansion', () => {
  it('SQL → Structured Query Language passes checkExpansion', () => {
    expect(checkExpansion('SQL', 'Structured Query Language')).toBeNull();
  });
  it('KPI → Key Performance Indicator passes', () => {
    expect(checkExpansion('KPI', 'Key Performance Indicator')).toBeNull();
  });
  it('JSON → JavaScript Object Notation passes (two letters from one word)', () => {
    expect(checkExpansion('JSON', 'JavaScript Object Notation')).toBeNull();
    expect(checkExpansion('BLOB', 'Binary Large Object')).toBeNull();
    expect(checkExpansion('XML', 'Extensible Markup Language')).toBeNull();
    expect(checkExpansion('CSV', 'Comma-Separated Values')).toBeNull();
    expect(checkExpansion('ETL', 'Extract, Transform, Load')).toBeNull();
    expect(checkExpansion('DBMS', 'Database Management System')).toBeNull();
    expect(checkExpansion('PII', 'Personally Identifiable Information')).toBeNull();
  });
  it('SQL → Data Warehouse is flagged', () => {
    expect(checkExpansion('SQL', 'Data Warehouse')).toMatch(/initials/);
    expect(checkExpansion('KPI', '')).toMatch(/empty/);
  });
  it('rejects one-word and padded expansions', () => {
    expect(checkExpansion('DBA', 'Database')).toMatch(/one word/);
    expect(checkExpansion('KPI', 'Key Performance Indicator Dashboard')).toMatch(/initials/);
    expect(checkExpansion('KPI', 'Main Key Performance Indicator')).toMatch(/initials/);
    expect(checkExpansion('DBA', 'Database Administrator')).toBeNull();
    expect(checkExpansion('DB', 'Database')).toBeNull();
    // Strict on purpose: a trailing word the term does not use goes to a person.
    expect(checkExpansion('CAP', 'Consistency, Availability, Partition Tolerance')).toMatch(/initials/);
  });
  it('digits must appear in the expansion', () => {
    expect(checkExpansion('S3', 'Simple Storage Service')).toMatch(/initials/);
    expect(checkExpansion('IPV4', 'Internet Protocol version 4')).toBeNull();
  });
});

const answer = (items: unknown[]) => JSON.stringify({ items });

describe('expandTerms', () => {
  it('keeps ok rows that pass the local check, and flags ones that fail', async () => {
    const chat = async () => answer([
      { term: 'SQL', expansion: 'Structured Query Language', verdict: 'ok', reason: '' },
      { term: 'KPI', expansion: 'Data Warehouse', verdict: 'ok', reason: '' },
      { term: 'ZZQ', expansion: '', verdict: 'flag', reason: 'not an acronym' },
    ]);
    const rows = await expandTerms({ terms: ['SQL', 'KPI', 'ZZQ'], exam: 'DA0-002', examTitle: 'CompTIA Data+', chat });
    expect(rows.map((r) => [r.term, r.verdict])).toEqual([['SQL', 'ok'], ['KPI', 'flag'], ['ZZQ', 'flag']]);
    expect(rows[1].reason).toMatch(/initials/);
    expect(rows[2].reason).toBe('not an acronym');
  });

  it('term dropped by the model is flagged "no answer"', async () => {
    const rows = await expandTerms({ terms: ['SQL', 'KPI'], exam: 'X', examTitle: 'X', chat: async () => answer([{ term: 'SQL', expansion: 'Structured Query Language', verdict: 'ok', reason: '' }]) });
    expect(rows[1]).toEqual({ term: 'KPI', expansion: '', verdict: 'flag', reason: 'no answer' });
  });

  it('invalid JSON from the model flags the whole batch, does not throw', async () => {
    const rows = await expandTerms({ terms: ['SQL', 'KPI'], exam: 'X', examTitle: 'X', chat: async () => 'not json' });
    expect(rows.every((r) => r.verdict === 'flag' && r.reason === 'no answer')).toBe(true);
    const thrown = await expandTerms({ terms: ['SQL'], exam: 'X', examTitle: 'X', chat: async () => { throw new Error('down'); } });
    expect(thrown[0].reason).toBe('no answer');
  });

  it('describes the field from the exam domains, not a fixed subject', async () => {
    const prompts: string[] = [];
    await expandTerms({
      terms: ['SRE'], exam: 'AT0-001', examTitle: 'CompTIA AutoOps+', topics: ['Source Control', 'Continuous Delivery'],
      chat: async (p) => { prompts.push(p); return answer([]); },
    });
    expect(prompts[0]).toContain('Source Control; Continuous Delivery');
    expect(prompts[0]).not.toMatch(/analytics/i);
    const noTopics: string[] = [];
    await expandTerms({ terms: ['SRE'], exam: 'X', examTitle: 'X', chat: async (p) => { noTopics.push(p); return answer([]); } });
    expect(noTopics[0]).not.toMatch(/analytics/i);
  });

  it('batches of 25', async () => {
    const prompts: string[] = [];
    const terms = Array.from({ length: 60 }, (_, i) => `T${String(i).padStart(2, '0')}X`);
    await expandTerms({ terms, exam: 'X', examTitle: 'X', chat: async (p) => { prompts.push(p); return answer([]); } });
    expect(prompts).toHaveLength(3);
    expect(prompts[2]).toContain('T59X');
    expect(prompts[2]).not.toContain('T24X');
  });
});
