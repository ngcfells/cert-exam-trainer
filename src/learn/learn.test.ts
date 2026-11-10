import { describe, it, expect } from 'vitest';
import type { ExamMeta, Question } from '../domain/types';
import { learnUrl, searchPhrase, searchTopic, sourcesFor } from './learn';
import { LEARN_SOURCES } from './sources';

const meta = {
  code: 'T-001',
  name: 'Test Exam',
  objectives: [{ id: '1.1', domainId: '1', title: 'Caching' }],
} as unknown as ExamMeta;

function q(over: Partial<Question> = {}): Question {
  return {
    id: 'q', exam: 'T-001', source: 'ours', type: 'mcq-single', objectiveIds: ['1.1'], difficulty: 1,
    stem: 's', payload: {}, answer: {}, explanation: '', acronyms: [], status: 'approved', ...over,
  };
}

describe('searchPhrase', () => {
  it('uses the question\'s own search term', () => {
    expect(searchPhrase(q({ searchTerm: 'DNS TTL', acronyms: ['X'] }), meta)).toBe('DNS TTL');
  });
  it('falls back to acronyms plus the objective title', () => {
    expect(searchPhrase(q({ acronyms: ['DNS', 'TTL'] }), meta)).toBe('DNS TTL Caching');
  });
  it('falls back to the objective title alone with no acronyms', () => {
    expect(searchPhrase(q(), meta)).toBe('Caching');
  });
  it('falls back to acronyms when the objective is missing from the meta', () => {
    expect(searchPhrase(q({ objectiveIds: ['9.9'], acronyms: ['DNS'] }), meta)).toBe('DNS');
  });
  it('falls back to the exam name, then the exam code, never empty', () => {
    expect(searchPhrase(q({ objectiveIds: ['9.9'] }), meta)).toBe('Test Exam');
    expect(searchPhrase(q({ objectiveIds: ['9.9'] }), undefined)).toBe('T-001');
  });
  it('ignores an invalid search term', () => {
    expect(searchPhrase(q({ searchTerm: 'x&y z' }), meta)).toBe('Caching');
  });
});

describe('searchTopic', () => {
  it.each([
    ['Given a scenario, use configuration management techniques to deploy a solution.', 'configuration management techniques'],
    ['Identify artificial intelligence (AI) concepts.', 'artificial intelligence concepts'],
    ['Compare and contrast various AI types and techniques used in cybersecurity.', 'various AI types and techniques'],
    ['Given a scenario, troubleshoot issues using report validation techniques.', 'troubleshoot issues using report validation techniques'],
    ['Given a set of requirements, determine the best chart type for a report.', 'the best chart type'],
    ['Data Concepts and Environments','Data Concepts and Environments'],
  ])('cleans %s', (title, expected) => {
    expect(searchTopic(title)).toBe(expected);
  });
  it('is used by the fallback phrase', () => {
    const m = { ...meta, objectives: [{ id: '1.1', domainId: '1', title: 'Identify artificial intelligence (AI) concepts.' }] } as unknown as ExamMeta;
    expect(searchPhrase(q({ acronyms: ['AI'] }), m)).toBe('AI artificial intelligence concepts');
  });
});

describe('sources', () => {
  it('encodes the phrase and adds no extra parameter', () => {
    const url = learnUrl(LEARN_SOURCES[0], 'C# & .NET');
    expect(url).toContain('C%23%20%26%20.NET');
    expect(url.split('?')[1].split('&')).toHaveLength(1);
  });
  it('gives an unknown exam only the web search', () => {
    expect(sourcesFor('NOPE').map((s) => s.id)).toEqual(['web']);
  });
  it('keeps programming sites off the security exam', () => {
    const ids = sourcesFor('CY0-001').map((s) => s.id);
    expect(ids).not.toContain('w3schools');
    expect(ids).toContain('messer');
  });
  it('builds an https search URL for every source', () => {
    for (const s of LEARN_SOURCES) {
      const url = s.url('x y');
      expect(url.startsWith('https://')).toBe(true);
      expect(url).toContain('x%20y');
    }
  });
});
