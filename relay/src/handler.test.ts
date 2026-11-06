// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import type { ReportRequest } from '../../src/report/contract';
import { handle, type Env, type KvLike } from './handler';
import { formatIssue } from './issue';

const TOKEN = 'ghp_fake_token_for_tests';
const ISSUES_URL = 'https://api.github.com/repos/ngcfells/cert-exam-trainer/issues';
const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const DAY_START = Date.UTC(2026, 10, 6, 0, 0, 0);
const HOUR = 3_600_000;

function fakeKv(): KvLike {
  const m = new Map<string, string>();
  return {
    get: async (k) => m.get(k) ?? null,
    put: async (k, v) => {
      m.set(k, v);
    },
  };
}

interface Call {
  url: string;
  init?: RequestInit;
}

function stubFetch(opts: { turnstile?: boolean; github?: number[] } = {}) {
  const calls: Call[] = [];
  const githubStatuses = [...(opts.github ?? [201])];
  const fn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    if (url === VERIFY_URL) {
      return new Response(JSON.stringify({ success: opts.turnstile ?? true }), { status: 200 });
    }
    if (url === ISSUES_URL) {
      const status = githubStatuses.length > 1 ? githubStatuses.shift()! : githubStatuses[0];
      if (status === 201) {
        return new Response(JSON.stringify({ number: 14, html_url: 'https://github.com/ngcfells/cert-exam-trainer/issues/14' }), {
          status,
        });
      }
      return new Response(JSON.stringify({ message: 'nope' }), { status });
    }
    throw new Error(`unexpected fetch ${url}`);
  }) as typeof fetch;
  return { fn, calls, github: () => calls.filter((c) => c.url === ISSUES_URL) };
}

const env = (): Env => ({ GITHUB_TOKEN: TOKEN, TURNSTILE_SECRET: 'secret', RELAY_KV: fakeKv() });

let counter = 0;
function report(over: Partial<ReportRequest> = {}): ReportRequest {
  counter++;
  return {
    id: `3b241101-e2bb-4255-8caf-${String(counter).padStart(12, '0')}`,
    type: 'bug',
    title: 'Timer stops',
    details: 'The timer froze at 10:00.',
    version: '0.1.0',
    turnstileToken: 'tok',
    ...over,
  };
}

function post(body: unknown, origin: string | null = 'http://localhost:5173', path = '/report') {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.7' };
  if (origin !== null) headers.Origin = origin;
  return new Request(`https://relay.example${path}`, {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('relay handle', () => {
  it('refuses a null origin', async () => {
    const f = stubFetch();
    const res = await handle(post(report(), 'null'), env(), f.fn);
    expect(res.status).toBe(403);
    expect(f.calls).toHaveLength(0);
  });

  it('refuses an unknown origin', async () => {
    const f = stubFetch();
    expect((await handle(post(report(), 'https://evil.example'), env(), f.fn)).status).toBe(403);
    expect((await handle(post(report(), null), env(), f.fn)).status).toBe(403);
    expect(f.calls).toHaveLength(0);
  });

  it('answers preflight for localhost:5173', async () => {
    const req = new Request('https://relay.example/report', {
      method: 'OPTIONS',
      headers: { Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'POST' },
    });
    const res = await handle(req, env(), stubFetch().fn);
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
    expect(res.headers.get('Vary')).toBe('Origin');
  });

  it('allows the Pages origin and 127.0.0.1', async () => {
    for (const origin of ['https://ngcfells.github.io', 'http://127.0.0.1:4173']) {
      const res = await handle(post(report(), origin), env(), stubFetch().fn, () => DAY_START);
      expect(res.status).toBe(201);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe(origin);
    }
  });

  it('returns 404 for another path', async () => {
    const res = await handle(post(report(), 'http://localhost:5173', '/other'), env(), stubFetch().fn);
    expect(res.status).toBe(404);
  });

  it('rejects an invalid body with 400', async () => {
    const f = stubFetch();
    expect((await handle(post('not json'), env(), f.fn)).status).toBe(400);
    const res = await handle(post({ ...report(), title: '' }), env(), f.fn);
    expect(res.status).toBe(400);
    expect(await res.json()).toHaveProperty('error');
    expect(f.calls).toHaveLength(0);
  });

  it('creates the issue with labels and returns 201', async () => {
    const f = stubFetch();
    const r = report({ type: 'question', questionId: 'da2-1-1-mcq-004' });
    const res = await handle(post(r), env(), f.fn, () => DAY_START);
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ number: 14, url: 'https://github.com/ngcfells/cert-exam-trainer/issues/14' });
    const [gh] = f.github();
    expect(JSON.parse(String(gh.init?.body))).toEqual(formatIssue(r));
    const h = new Headers(gh.init?.headers);
    expect(h.get('Authorization')).toBe(`Bearer ${TOKEN}`);
    expect(h.get('Accept')).toBe('application/vnd.github+json');
    expect(h.get('X-GitHub-Api-Version')).toBe('2022-11-28');
    expect(h.get('User-Agent')).toBe('cert-trainer-relay');
    const verify = f.calls.find((c) => c.url === VERIFY_URL)!;
    const form = verify.init?.body as FormData;
    expect(form.get('secret')).toBe('secret');
    expect(form.get('response')).toBe('tok');
    expect(form.get('remoteip')).toBe('203.0.113.7');
  });

  it('returns the stored reply for a repeated id without a second issue', async () => {
    const f = stubFetch();
    const e = env();
    const r = report();
    const a = await handle(post(r), e, f.fn, () => DAY_START);
    const b = await handle(post(r), e, f.fn, () => DAY_START);
    expect(a.status).toBe(201);
    expect(b.status).toBe(200);
    expect((await b.json()).number).toBe(14);
    expect(f.github()).toHaveLength(1);
  });

  it('rate-limits the sixth report in an hour', async () => {
    const e = env();
    const f = stubFetch();
    for (let i = 0; i < 5; i++) expect((await handle(post(report()), e, f.fn, () => DAY_START)).status).toBe(201);
    expect((await handle(post(report()), e, f.fn, () => DAY_START)).status).toBe(429);
    expect(f.github()).toHaveLength(5);
  });

  it('and the 21st in a day', async () => {
    const e = env();
    const f = stubFetch();
    for (let h = 0; h < 4; h++) {
      for (let i = 0; i < 5; i++) {
        expect((await handle(post(report()), e, f.fn, () => DAY_START + h * HOUR)).status).toBe(201);
      }
    }
    expect((await handle(post(report()), e, f.fn, () => DAY_START + 4 * HOUR)).status).toBe(429);
  });

  it('refuses a failed Turnstile check', async () => {
    const f = stubFetch({ turnstile: false });
    const res = await handle(post(report()), env(), f.fn, () => DAY_START);
    expect(res.status).toBe(403);
    expect(f.github()).toHaveLength(0);
  });

  it('retries without labels on 422', async () => {
    const f = stubFetch({ github: [422, 201] });
    const res = await handle(post(report()), env(), f.fn, () => DAY_START);
    expect(res.status).toBe(201);
    const [first, second] = f.github();
    expect(JSON.parse(String(first.init?.body))).toHaveProperty('labels');
    expect(JSON.parse(String(second.init?.body))).not.toHaveProperty('labels');
  });

  it('returns 502 when GitHub fails, without the token in the reply', async () => {
    const f = stubFetch({ github: [500] });
    const res = await handle(post(report()), env(), f.fn, () => DAY_START);
    expect(res.status).toBe(502);
    expect(await res.text()).not.toContain(TOKEN);
  });

  it('logs the GitHub status for the owner, never the token', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await handle(post(report()), env(), stubFetch({ github: [401] }).fn, () => DAY_START);
    expect(log).toHaveBeenCalledWith('GitHub refused the issue', 401);
    expect(JSON.stringify(log.mock.calls)).not.toContain(TOKEN);
    log.mockRestore();
  });

  it('answers 503 with CORS when storage fails, so the app can save the report', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const e = env();
    e.RELAY_KV = { get: async () => { throw new Error('KV down'); }, put: async () => undefined };
    const res = await handle(post(report()), e, stubFetch().fn, () => DAY_START);
    expect(res.status).toBe(503);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
    log.mockRestore();
  });

  it('still returns the issue when storing the id or a rate-limit count fails', async () => {
    const e = env();
    e.RELAY_KV = { get: async () => null, put: async () => { throw new Error('daily write limit'); } };
    const f = stubFetch();
    const res = await handle(post(report()), e, f.fn, () => DAY_START);
    expect(res.status).toBe(201);
    expect(f.github()).toHaveLength(1);
  });

  it('checks Turnstile before counting, so failed checks do not use up the limit', async () => {
    const e = env();
    for (let i = 0; i < 8; i++) {
      expect((await handle(post(report()), e, stubFetch({ turnstile: false }).fn, () => DAY_START)).status).toBe(403);
    }
    expect((await handle(post(report()), e, stubFetch().fn, () => DAY_START)).status).toBe(201);
  });

  it('says which limit was hit', async () => {
    const e = env();
    const f = stubFetch();
    for (let i = 0; i < 5; i++) await handle(post(report()), e, f.fn, () => DAY_START);
    expect(await (await handle(post(report()), e, f.fn, () => DAY_START)).json()).toMatchObject({ retry: 'hour' });
    for (let h = 1; h < 4; h++) for (let i = 0; i < 5; i++) await handle(post(report()), e, f.fn, () => DAY_START + h * HOUR);
    expect(await (await handle(post(report()), e, f.fn, () => DAY_START + 4 * HOUR)).json()).toMatchObject({ retry: 'day' });
  });

  it('does not store the id when GitHub fails, so a retry can succeed', async () => {
    const e = env();
    const r = report();
    expect((await handle(post(r), e, stubFetch({ github: [500] }).fn, () => DAY_START)).status).toBe(502);
    expect((await handle(post(r), e, stubFetch().fn, () => DAY_START)).status).toBe(201);
  });
});
