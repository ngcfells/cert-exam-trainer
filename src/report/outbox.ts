import type { ReportDraft, ReportRequest } from './contract';

/** A report saved to send later. It never holds a Turnstile token: a fresh one is fetched at send time. */
export type OutboxReport = ReportDraft & { savedAt: string };

export const MAX_OUTBOX = 10;

export class OutboxFullError extends Error {
  constructor() {
    super(`${MAX_OUTBOX} reports are already waiting. Send or discard one first.`);
    this.name = 'OutboxFullError';
  }
}

export function toOutboxReport(r: ReportDraft | ReportRequest, now: Date = new Date()): OutboxReport {
  const copy: Partial<ReportRequest> & ReportDraft = { ...r };
  delete copy.turnstileToken;
  return { ...copy, savedAt: now.toISOString() };
}
