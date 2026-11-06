import { describe, expect, it } from 'vitest';
import type { ReportRequest } from './contract';
import { toOutboxReport } from './outbox';

const req: ReportRequest = {
  id: '3b241101-e2bb-4255-8caf-4136c566a962',
  type: 'bug',
  title: 'Timer stops',
  details: 'It froze.',
  version: '0.1.0',
  turnstileToken: 'tok',
};

describe('toOutboxReport', () => {
  it('drops the token and stamps savedAt', () => {
    const out = toOutboxReport(req, new Date('2026-11-06T12:00:00Z'));
    expect(out).not.toHaveProperty('turnstileToken');
    expect(out).toEqual({ ...req, turnstileToken: undefined, savedAt: '2026-11-06T12:00:00.000Z' });
    expect(out.id).toBe(req.id);
  });
});
