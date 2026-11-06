import { describe, expect, it } from 'vitest';
import { reportRequestSchema } from './contract';

const full = {
  id: '3b241101-e2bb-4255-8caf-4136c566a962',
  type: 'question',
  title: 'Wrong answer key',
  details: 'Option B is correct, not C.',
  contact: 'me@example.com',
  version: '0.1.0',
  questionId: 'da2-1-1-mcq-004',
  context: { exam: 'DA0-002', mode: 'practice', userAgent: 'Mozilla/5.0' },
  turnstileToken: 'tok',
};

describe('reportRequestSchema', () => {
  it('accepts a full question report', () => {
    expect(reportRequestSchema.safeParse(full).success).toBe(true);
  });
  it('rejects a question report with no questionId', () => {
    const rest: Partial<typeof full> = { ...full };
    delete rest.questionId;
    expect(reportRequestSchema.safeParse(rest).success).toBe(false);
  });
  it('rejects a 121-character title', () => {
    expect(reportRequestSchema.safeParse({ ...full, title: 'x'.repeat(121) }).success).toBe(false);
  });
  it('rejects a 5001-character body', () => {
    expect(reportRequestSchema.safeParse({ ...full, details: 'x'.repeat(5001) }).success).toBe(false);
  });
  it('rejects a 201-character contact', () => {
    expect(reportRequestSchema.safeParse({ ...full, contact: 'x'.repeat(201) }).success).toBe(false);
  });
  it('rejects unknown keys', () => {
    expect(reportRequestSchema.safeParse({ ...full, labels: ['wontfix'] }).success).toBe(false);
    expect(reportRequestSchema.safeParse({ ...full, context: { ...full.context, score: 3 } }).success).toBe(false);
  });
  it('rejects a version with a space', () => {
    expect(reportRequestSchema.safeParse({ ...full, version: '0.1 .0' }).success).toBe(false);
  });
  it('accepts a bug report with no question id or context', () => {
    const rest: Partial<typeof full> = { ...full, type: 'bug' };
    delete rest.questionId;
    delete rest.context;
    delete rest.contact;
    expect(reportRequestSchema.safeParse(rest).success).toBe(true);
  });
  it('rejects a blank title after trimming', () => {
    expect(reportRequestSchema.safeParse({ ...full, title: '   ' }).success).toBe(false);
  });

  it('rejects a title or details with no visible text', () => {
    expect(reportRequestSchema.safeParse({ ...full, title: '\u0007\u0001' }).success).toBe(false);
    expect(reportRequestSchema.safeParse({ ...full, details: '\u0000' }).success).toBe(false);
  });
});
