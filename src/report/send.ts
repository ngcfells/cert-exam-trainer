import { reportReplySchema, type ReportReply, type ReportRequest } from './contract';

export type SendOutcome =
  | { kind: 'sent'; reply: ReportReply }
  | { kind: 'offline' }
  | { kind: 'failed'; status: number; message: string };

export const RATE_LIMIT_MESSAGE = 'Too many reports from this connection. Try again in an hour.';

/** Offline means the report should wait in the outbox: no connection, or the relay is down (5xx). */
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
  if (res.status >= 500) return { kind: 'offline' };

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (res.ok) {
    const reply = reportReplySchema.safeParse(body);
    if (reply.success) return { kind: 'sent', reply: reply.data };
    return { kind: 'failed', status: res.status, message: 'The report service sent an unexpected reply.' };
  }
  if (res.status === 429) return { kind: 'failed', status: 429, message: RATE_LIMIT_MESSAGE };
  const error = (body as { error?: unknown } | null)?.error;
  return {
    kind: 'failed',
    status: res.status,
    message: typeof error === 'string' && error ? error : `The report was refused (${res.status}).`,
  };
}
