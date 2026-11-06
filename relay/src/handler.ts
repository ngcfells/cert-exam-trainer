import { reportRequestSchema, type ReportReply } from '../../src/report/contract';
import { formatIssue } from './issue';

export interface KvLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
}

export interface Env {
  GITHUB_TOKEN: string;
  TURNSTILE_SECRET: string;
  RELAY_KV: KvLike;
  REPO?: string;
}

const DEFAULT_REPO = 'ngcfells/cert-exam-trainer';
const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const PER_HOUR = 5;
const PER_DAY = 20;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
const DEDUPE_TTL = 86_400;

function allowedOrigin(origin: string | null): origin is string {
  if (!origin) return false;
  if (origin === 'https://ngcfells.github.io') return true;
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/.test(origin);
}

function json(status: number, body: unknown, origin: string | null): Response {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (origin) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Vary', 'Origin');
  }
  return new Response(JSON.stringify(body), { status, headers });
}

/** Counts one request against a fixed window. Returns false when the window is already full. */
async function takeSlot(kv: KvLike, key: string, limit: number, ttl: number): Promise<boolean> {
  const used = Number((await kv.get(key)) ?? '0');
  if (used >= limit) return false;
  // Best effort: if the count cannot be stored (KV write limit), Turnstile still guards the repo.
  await kv.put(key, String(used + 1), { expirationTtl: ttl }).catch(() => undefined);
  return true;
}

async function createIssue(
  fetchFn: typeof fetch,
  env: Env,
  issue: { title: string; body: string; labels?: string[] },
): Promise<Response> {
  return fetchFn(`https://api.github.com/repos/${env.REPO ?? DEFAULT_REPO}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'cert-trainer-relay',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(issue),
  });
}

export async function handle(
  req: Request,
  env: Env,
  fetchFn: typeof fetch = fetch,
  now: () => number = Date.now,
): Promise<Response> {
  const origin = req.headers.get('Origin');
  if (!allowedOrigin(origin)) return json(403, { error: 'Origin not allowed' }, null);
  try {
    return await handleAllowed(req, origin, env, fetchFn, now);
  } catch (e) {
    // A reply with CORS headers lets the app tell "service down" from "offline". Never log the request or env.
    console.error('Relay error', e instanceof Error ? e.name : 'unknown');
    return json(503, { error: 'The report service is not working right now' }, origin);
  }
}

async function handleAllowed(
  req: Request,
  origin: string,
  env: Env,
  fetchFn: typeof fetch,
  now: () => number,
): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
        Vary: 'Origin',
      },
    });
  }

  const url = new URL(req.url);
  if (req.method !== 'POST' || url.pathname !== '/report') return json(404, { error: 'Not found' }, origin);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json(400, { error: 'The report is not valid JSON' }, origin);
  }
  const parsed = reportRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return json(400, { error: parsed.error.issues[0]?.message ?? 'Invalid report' }, origin);
  }
  const report = parsed.data;

  const seen = await env.RELAY_KV.get(`id:${report.id}`);
  if (seen) return json(200, JSON.parse(seen) as ReportReply, origin);

  const ip = req.headers.get('CF-Connecting-IP') ?? 'unknown';
  const form = new FormData();
  form.set('secret', env.TURNSTILE_SECRET);
  form.set('response', report.turnstileToken);
  if (ip !== 'unknown') form.set('remoteip', ip);
  let verified = false;
  try {
    const v = await fetchFn(VERIFY_URL, { method: 'POST', body: form });
    verified = v.ok && ((await v.json()) as { success?: boolean }).success === true;
  } catch {
    verified = false;
  }
  if (!verified) return json(403, { error: 'The spam check failed' }, origin);

  // Counted only after Turnstile passes, so bots with bad tokens cannot use up a learner's limit or KV writes.
  const t = now();
  if (!(await takeSlot(env.RELAY_KV, `rl:h:${ip}:${Math.floor(t / HOUR_MS)}`, PER_HOUR, 2 * 3600))) {
    return json(429, { error: 'Too many reports', retry: 'hour' }, origin);
  }
  if (!(await takeSlot(env.RELAY_KV, `rl:d:${ip}:${Math.floor(t / DAY_MS)}`, PER_DAY, 2 * 86400))) {
    return json(429, { error: 'Too many reports', retry: 'day' }, origin);
  }

  const issue = formatIssue(report);
  let gh: Response;
  try {
    gh = await createIssue(fetchFn, env, issue);
    if (gh.status === 422) gh = await createIssue(fetchFn, env, { title: issue.title, body: issue.body });
  } catch {
    return json(502, { error: 'GitHub could not be reached' }, origin);
  }
  if (gh.status !== 201) {
    // Shows in the Worker logs, so an expired token is easy to spot. The status only, never the token.
    console.error('GitHub refused the issue', gh.status);
    return json(502, { error: `GitHub refused the issue (${gh.status})` }, origin);
  }

  const created = (await gh.json()) as { number: number; html_url: string };
  const reply: ReportReply = { number: created.number, url: created.html_url };
  // Best effort: the issue exists, so a failed write must not turn into an error the app would retry.
  await env.RELAY_KV.put(`id:${report.id}`, JSON.stringify(reply), { expirationTtl: DEDUPE_TTL }).catch(() => undefined);
  return json(201, reply, origin);
}
