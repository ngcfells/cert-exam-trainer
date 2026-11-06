import { reportReplySchema, type ReportReply, type ReportRequest } from './contract';

/**
 * offline: no connection, so the report waits in the outbox.
 * down: the relay answered with a 5xx, so the report service is not working.
 * failed: the relay refused the report. canSave is false only for a 400, where saving would just fail again later.
 */
export type SendOutcome =
  | { kind: 'sent'; reply: ReportReply }
  | { kind: 'offline' }
  | { kind: 'down' }
  | { kind: 'failed'; status: number; message: string; canSave: boolean };

export const NOT_ACCEPTED = 'The report was not accepted. Check what you wrote and try again.';
export const SPAM_REFUSED = 'The spam check did not pass. Try again.';
export const RATE_LIMIT_HOUR = 'Too many reports from this connection. Try again in an hour.';
export const RATE_LIMIT_DAY = 'Too many reports from this connection today. Try again tomorrow.';
export const NOT_SENT = 'The report could not be sent. Try again later.';

/** Plain copy for each refusal. The relay's own error text is for developers and is never shown. */
function refusal(status: number, body: unknown): SendOutcome {
  if (status === 400) return { kind: 'failed', status, message: NOT_ACCEPTED, canSave: false };
  if (status === 403) return { kind: 'failed', status, message: SPAM_REFUSED, canSave: true };
  if (status === 429) {
    const day = (body as { retry?: unknown } | null)?.retry === 'day';
    return { kind: 'failed', status, message: day ? RATE_LIMIT_DAY : RATE_LIMIT_HOUR, canSave: true };
  }
  return { kind: 'failed', status, message: NOT_SENT, canSave: true };
}

export async function sendReport(url: string, req: ReportRequest, fetchFn: typeof fetch = fetch): Promise<SendOutcome> {
  let res: Response;
  try {
    res = await fetchFn(`${url}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
  } catch {
    return { kind: 'offline' };
  }
  if (res.status >= 500) return { kind: 'down' };

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (res.ok) {
    const reply = reportReplySchema.safeParse(body);
    if (reply.success) return { kind: 'sent', reply: reply.data };
    return { kind: 'failed', status: res.status, message: NOT_SENT, canSave: true };
  }
  return refusal(res.status, body);
}
