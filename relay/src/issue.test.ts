// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { ReportRequest } from '../../src/report/contract';
import { escapeText, formatIssue } from './issue';

const base: ReportRequest = {
  id: '3b241101-e2bb-4255-8caf-4136c566a962',
  type: 'question',
  title: 'Wrong answer key',
  details: 'Option B is correct.',
  version: '0.1.0',
  questionId: 'da2-1-1-mcq-004',
  context: { exam: 'DA0-002', mode: 'practice', userAgent: 'Mozilla/5.0' },
  turnstileToken: 'tok',
};

describe('formatIssue', () => {
  it('labels by type', () => {
    expect(formatIssue({ ...base, type: 'bug' }).labels).toEqual(['bug', 'from-app']);
    expect(formatIssue(base).labels).toEqual(['bug', 'content', 'from-app']);
    expect(formatIssue({ ...base, type: 'feature' }).labels).toEqual(['enhancement', 'from-app']);
  });

  it('prefixes question titles', () => {
    expect(formatIssue(base).title).toBe('Question da2-1-1-mcq-004: Wrong answer key');
    expect(formatIssue({ ...base, type: 'bug' }).title).toBe('Wrong answer key');
  });

  it('escapes mentions and references', () => {
    const { body } = formatIssue({ ...base, details: 'cc @octocat about #12\n# Heading', contact: '@me #1' });
    expect(body).toContain('cc &#64;octocat about &#35;12\n&#35; Heading');
    expect(body).toContain('&#64;me &#35;1');
    const withoutHeadings = body.replace(/&#(64|35);/g, '').replace(/^### (Context|Contact)$/gm, '');
    expect(withoutHeadings).not.toMatch(/[@#]/);
  });

  it('strips control characters and newlines from the title', () => {
    expect(formatIssue({ ...base, type: 'bug', title: 'Bad\nthing\u0007 here\r' }).title).toBe('Bad thing here');
  });

  it('body layout', () => {
    const body = formatIssue({ ...base, contact: 'me@example.com' }).body;
    expect(body).toBe(
      [
        'Option B is correct.',
        '',
        '### Context',
        '',
        '- Type: Problem with a question',
        '- Question: `da2-1-1-mcq-004`',
        '- Exam: DA0-002',
        '- Mode: practice',
        '- Browser: Mozilla/5.0',
        '',
        '### Contact',
        '',
        'me&#64;example.com',
        '',
        '---',
        'Sent from the app, version 0.1.0',
      ].join('\n'),
    );
  });

  it('body layout without optional parts', () => {
    const rest: ReportRequest = { ...base, type: 'feature' };
    delete rest.questionId;
    delete rest.context;
    const body = formatIssue(rest).body;
    expect(body).toBe(
      [
        'Option B is correct.',
        '',
        '### Context',
        '',
        '- Type: Feature request',
        '',
        '---',
        'Sent from the app, version 0.1.0',
      ].join('\n'),
    );
    expect(body).not.toContain('### Contact');
  });
});

describe('escapeText', () => {
  it('replaces every @ and #', () => {
    expect(escapeText('a@b#c@@')).toBe('a&#64;b&#35;c&#64;&#64;');
  });
});
