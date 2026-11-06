import { describe, expect, it } from 'vitest';
import type { ReportRequest } from './contract';
import { NOT_ACCEPTED, NOT_SENT, RATE_LIMIT_DAY, RATE_LIMIT_HOUR, SPAM_REFUSED, sendReport } from './send';

const req: ReportRequest = {
  id: '3b241101-e2bb-4255-8caf-4136c566a962',
  type: 'bug',
  title: 'Timer stops',
  details: 'It froze.',
  version: '0.1.0',
  turnstileToken: 'tok',
};

const reply = (status: number, body: unknown) =>
  (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe('sendReport', () => {
  it('posts to url/report and returns sent on 201', async () => {
    let seen = '';
    let sentBody = '';
    const fetchFn = (async (u: RequestInfo | URL, init?: RequestInit) => {
      seen = String(u);
      sentBody = String(init?.body);
      return new Response(JSON.stringify({ number: 14, url: 'https://github.com/o/r/issues/14' }), { status: 201 });
    }) as typeof fetch;
    const out = await sendReport('https://relay.example', req, fetchFn);
    expect(seen).toBe('https://relay.example/report');
    expect(JSON.parse(sentBody)).toEqual(req);
    expect(out).toEqual({ kind: 'sent', reply: { number: 14, url: 'https://github.com/o/r/issues/14' } });
  });
  it('treats a 200 dedupe reply as sent', async () => {
    const out = await sendReport('https://relay.example', req, reply(200, { number: 14, url: 'https://github.com/o/r/issues/14' }));
    expect(out.kind).toBe('sent');
  });
  it('is offline when fetch throws', async () => {
    const fetchFn = (async () => {
      throw new TypeError('Failed to fetch');
    }) as typeof fetch;
    expect(await sendReport('https://relay.example', req, fetchFn)).toEqual({ kind: 'offline' });
  });
  it('is down on 503, not offline', async () => {
    expect(await sendReport('https://relay.example', req, reply(503, { error: 'down' }))).toEqual({ kind: 'down' });
  });
  it('uses plain copy on 400, never the relay message, and does not offer saving', async () => {
    expect(await sendReport('https://relay.example', req, reply(400, { error: 'Invalid uuid' }))).toEqual({
      kind: 'failed',
      status: 400,
      message: NOT_ACCEPTED,
      canSave: false,
    });
    expect(NOT_ACCEPTED).toBe('The report was not accepted. Check what you wrote and try again.');
  });
  it('tells the hourly and daily limits apart, and offers saving', async () => {
    expect(await sendReport('https://relay.example', req, reply(429, { error: 'Too many reports', retry: 'hour' }))).toEqual({
      kind: 'failed',
      status: 429,
      message: RATE_LIMIT_HOUR,
      canSave: true,
    });
    expect((await sendReport('https://relay.example', req, reply(429, { retry: 'day' }))) as { message: string }).toMatchObject({
      message: RATE_LIMIT_DAY,
      canSave: true,
    });
    expect(RATE_LIMIT_HOUR).toBe('Too many reports from this connection. Try again in an hour.');
    expect(RATE_LIMIT_DAY).toBe('Too many reports from this connection today. Try again tomorrow.');
  });
  it('a refused spam check on 403 offers saving', async () => {
    expect(await sendReport('https://relay.example', req, reply(403, { error: 'The spam check failed' }))).toEqual({
      kind: 'failed',
      status: 403,
      message: SPAM_REFUSED,
      canSave: true,
    });
  });
  it('any other refusal uses plain copy', async () => {
    expect(await sendReport('https://relay.example', req, reply(418, { error: 'Origin not allowed' }))).toMatchObject({
      message: NOT_SENT,
      canSave: true,
    });
  });
  it('fails when a success reply is malformed', async () => {
    const out = await sendReport('https://relay.example', req, reply(201, { nope: true }));
    expect(out.kind).toBe('failed');
  });
});
