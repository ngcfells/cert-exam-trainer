// Polite, sequential fetching for the acronym harvester. Logs and results carry ids, statuses and tokens only.
import { isAllowed, parseRobots, tallyTokens, type HarvestSource, type RobotsRules, type SourceNote } from '../src/acronyms/harvest';

export const HARVEST_UA = 'cert-exam-trainer-acronym-harvester (+https://github.com/ngcfells/cert-exam-trainer)';
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 5;
/** A site asking for more than this between requests is skipped rather than waited on. */
export const MAX_CRAWL_DELAY_S = 60;

export interface HarvestRun {
  perSource: { id: string; tokens: Map<string, number> }[];
  skipped: SourceNote[];
  failed: SourceNote[];
}

async function readCapped(res: Response): Promise<string> {
  if (!res.body) return '';
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.byteLength;
  }
  await reader.cancel().catch(() => undefined);
  const all = new Uint8Array(Math.min(size, MAX_BYTES));
  let at = 0;
  for (const c of chunks) {
    const part = c.subarray(0, all.length - at);
    all.set(part, at);
    at += part.length;
    if (at >= all.length) break;
  }
  return new TextDecoder().decode(all);
}

export async function runHarvest(opts: {
  sources: HarvestSource[];
  fetch: typeof fetch;
  sleep: (ms: number) => Promise<void>;
  delayMs?: number;
  timeoutMs?: number;
  log?: (msg: string) => void;
}): Promise<HarvestRun> {
  const { delayMs = 5000, timeoutMs = 20000, log = () => undefined } = opts;
  const robots = new Map<string, RobotsRules | null>();
  const used = new Set<string>();
  const out: HarvestRun = { perSource: [], skipped: [], failed: [] };

  const get = async (origin: string, url: string, wait: number) => {
    if (used.has(origin)) await opts.sleep(wait);
    used.add(origin);
    // Redirects are followed by hand so every hop goes through robots.txt and the per-site wait.
    return opts.fetch(url, { headers: { 'user-agent': HARVEST_UA }, signal: AbortSignal.timeout(timeoutMs), redirect: 'manual' });
  };

  const rulesFor = async (origin: string): Promise<RobotsRules | null> => {
    if (!robots.has(origin)) {
      let rules: RobotsRules | null = null;
      try {
        let res = await get(origin, `${origin}/robots.txt`, delayMs);
        // RFC 9309: follow up to 5 redirects for robots.txt (e.g. http → https).
        for (let hop = 0; hop < MAX_REDIRECTS && res.status >= 300 && res.status < 400 && res.headers.get('location'); hop++) {
          await res.body?.cancel().catch(() => undefined);
          const next = new URL(res.headers.get('location') ?? '', res.url || `${origin}/robots.txt`);
          res = await get(next.origin, next.href, delayMs);
        }
        if (res.ok) rules = parseRobots(await readCapped(res));
        // 404/410 means no rules. Other 4xx (401, 403) and 5xx skip the site: stricter than RFC 9309, on purpose.
        else if (res.status === 404 || res.status === 410) rules = { rules: [] };
        else log(`${origin}: robots.txt HTTP ${res.status}`);
      } catch (e) {
        log(`${origin}: robots.txt ${(e as Error).name}`);
      }
      robots.set(origin, rules);
    }
    return robots.get(origin) ?? null;
  };

  /** Fetches a page, checking robots.txt for the start URL and every redirect hop. A string is a skip or fail reason. */
  const page = async (start: string): Promise<Response | { skip: string } | { fail: string }> => {
    let url = new URL(start);
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const rules = await rulesFor(url.origin);
      if (!rules) return { fail: 'robots unavailable' };
      if ((rules.delay ?? 0) > MAX_CRAWL_DELAY_S) return { skip: 'crawl-delay' };
      if (!isAllowed(rules, url.pathname + url.search)) return { skip: 'robots' };
      const res = await get(url.origin, url.href, Math.max(delayMs, (rules.delay ?? 0) * 1000));
      const loc = res.headers.get('location');
      if (res.status < 300 || res.status >= 400 || !loc) return res;
      await res.body?.cancel().catch(() => undefined);
      url = new URL(loc, url);
      if (!/^https?:$/.test(url.protocol)) return { fail: 'bad redirect' };
    }
    return { fail: 'too many redirects' };
  };

  for (const src of opts.sources) {
    try {
      const res = await page(src.url);
      if ('skip' in res) {
        out.skipped.push({ id: src.id, reason: res.skip });
        log(`${src.id}: skipped (${res.skip})`);
        continue;
      }
      if ('fail' in res) {
        out.failed.push({ id: src.id, reason: res.fail });
      } else if (!res.ok) {
        out.failed.push({ id: src.id, reason: `HTTP ${res.status}` });
      } else if (!/text\/html|application\/xhtml/i.test(res.headers.get('content-type') ?? '')) {
        await res.body?.cancel().catch(() => undefined);
        out.failed.push({ id: src.id, reason: 'not html' });
      } else {
        const tokens = tallyTokens(await readCapped(res));
        out.perSource.push({ id: src.id, tokens });
        log(`${src.id}: ${tokens.size} tokens`);
        continue;
      }
    } catch (e) {
      out.failed.push({ id: src.id, reason: (e as Error).name || 'error' });
    }
    log(`${src.id}: failed (${out.failed[out.failed.length - 1].reason})`);
  }
  return out;
}

export interface HarvestArgs { sources: string; out: string; includeDumps: boolean; delayMs: number }

export function parseHarvestArgs(argv: string[]): HarvestArgs {
  const a: HarvestArgs = { sources: '', out: '', includeDumps: true, delayMs: 5000 };
  const args = argv.filter((x) => x !== '--');
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (flag === '--no-dumps') { a.includeDumps = false; continue; }
    if (!['--sources', '--out', '--delay-ms'].includes(flag)) throw new Error(`unknown argument ${flag}`);
    const value = args[++i];
    if (value === undefined || value.startsWith('--')) throw new Error(`${flag} needs a value`);
    if (flag === '--sources') a.sources = value;
    else if (flag === '--out') a.out = value;
    else {
      const n = Number(value);
      if (!Number.isFinite(n) || n < 2000) throw new Error('--delay-ms must be at least 2000');
      a.delayMs = n;
    }
  }
  if (!a.sources) throw new Error('--sources is required');
  return a;
}
