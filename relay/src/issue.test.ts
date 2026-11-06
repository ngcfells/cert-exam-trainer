// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { ReportRequest } from '../../src/report/contract';
import { escapeText, formatIssue } from './issue';

const Z = '\u200B';

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
    // GitHub decodes HTML entities before it looks for mentions, so a zero-width space is what breaks them.
    expect(body).toContain(`cc @${Z}octocat about #${Z}12\n#${Z} Heading`);
    expect(body).toContain(`@${Z}me #${Z}1`);
    expect(body).not.toContain('&#');
    const fixed = body.replace(/^### (Context|Contact)$/gm, '').replace(/<!-- report-id: [^>]+ -->/, '');
    expect(fixed).not.toMatch(/[@#](?!\u200B)/);
  });

  it('stops text from faking a heading with a line of - or =', () => {
    const { body } = formatIssue({ ...base, details: 'Context\n---\nAlso\n  ===  \nok - fine' });
    expect(body).toContain(`Context\n${Z}---\nAlso\n${Z}  ===  \nok - fine`);
  });

  it('breaks links that would mention another GitHub issue', () => {
    const { body } = formatIssue({ ...base, details: 'see https://github.com/x/y/issues/3 and GH-12 and gh-4' });
    expect(body).toContain(`https://github${Z}.com/x/y/issues/3 and GH${Z}-12 and gh${Z}-4`);
  });

  it('puts the report id in a hidden comment so duplicates can be spotted', () => {
    expect(formatIssue(base).body).toContain(`<!-- report-id: ${base.id} -->`);
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
        `me@${Z}example.com`,
        '',
        '---',
        'Sent from the app, version 0.1.0',
        `<!-- report-id: ${base.id} -->`,
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
        `<!-- report-id: ${base.id} -->`,
      ].join('\n'),
    );
    expect(body).not.toContain('### Contact');
  });
});

describe('escapeText', () => {
  it('puts a zero-width space after every @ and #', () => {
    expect(escapeText('a@b#c@@')).toBe(`a@${Z}b#${Z}c@${Z}@${Z}`);
  });
});
