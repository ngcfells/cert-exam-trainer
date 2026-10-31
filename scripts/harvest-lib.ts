// Polite, sequential fetching for the acronym harvester. Logs and results carry ids, statuses and tokens only.
import { isAllowed, parseRobots, tallyTokens, type HarvestSource, type RobotsRules, type SourceNote } from '../src/acronyms/harvest';

export const HARVEST_UA = 'cert-exam-trainer-acronym-harvester (+https://github.com/ngcfells/cert-exam-trainer)';
const MAX_BYTES = 2 * 1024 * 1024;

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
    return opts.fetch(url, { headers: { 'user-agent': HARVEST_UA }, signal: AbortSignal.timeout(timeoutMs), redirect: 'follow' });
  };

  for (const src of opts.sources) {
    const u = new URL(src.url);
    if (!robots.has(u.origin)) {
      let rules: RobotsRules | null = null;
      try {
        const res = await get(u.origin, `${u.origin}/robots.txt`, delayMs);
        if (res.ok) rules = parseRobots(await readCapped(res));
        else if (res.status === 404 || res.status === 410) rules = { rules: [] };
        else log(`${u.origin}: robots.txt HTTP ${res.status}`);
      } catch (e) {
        log(`${u.origin}: robots.txt ${(e as Error).name}`);
      }
      robots.set(u.origin, rules);
    }
    const rules = robots.get(u.origin);
    if (!rules) {
      out.failed.push({ id: src.id, reason: 'robots unavailable' });
      continue;
    }
    if (!isAllowed(rules, u.pathname + u.search)) {
      out.skipped.push({ id: src.id, reason: 'robots' });
      log(`${src.id}: skipped by robots.txt`);
      continue;
    }
    const wait = Math.max(delayMs, (rules.delay ?? 0) * 1000);
    try {
      const res = await get(u.origin, src.url, wait);
      if (!res.ok) {
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
