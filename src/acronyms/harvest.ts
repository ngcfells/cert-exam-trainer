// Acronym harvest core (spec §8 items 4–5). Dev tooling only: page text never leaves tallyTokens.
import { z } from 'zod';
import { extractAcronyms } from './extract';

export const HARVEST_AGENT = 'cert-exam-trainer';

export const sourceSchema = z.object({
  id: z.string().min(1),
  url: z.string().url().refine((u) => /^https?:\/\//i.test(u), 'url must be http or https'),
  kind: z.enum(['study', 'discussion', 'dump']),
});
export type HarvestSource = z.infer<typeof sourceSchema>;

export const sourcesFileSchema = z.object({
  exam: z.string().min(1),
  sources: z.array(sourceSchema).refine((s) => new Set(s.map((x) => x.id)).size === s.length, 'source ids must be unique'),
});

export interface SourceNote { id: string; reason: string }

export function selectSources(sources: HarvestSource[], includeDumps: boolean): { use: HarvestSource[]; skipped: SourceNote[] } {
  const use: HarvestSource[] = [];
  const skipped: SourceNote[] = [];
  for (const s of sources) {
    if (s.kind === 'dump' && !includeDumps) skipped.push({ id: s.id, reason: 'dump-off' });
    else use.push(s);
  }
  return { use, skipped };
}

interface Rule { allow: boolean; pattern: string }
interface Group { agents: string[]; rules: Rule[]; delay?: number }
export interface RobotsRules { rules: Rule[]; delay?: number }

/** The rules that apply to us: our own group if there is one, else the `*` group. */
export function parseRobots(txt: string): RobotsRules {
  const groups: Group[] = [];
  let current: Group | undefined;
  let lastWasAgent = false;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const value = m[2].trim();
    if (key === 'user-agent') {
      if (!current || !lastWasAgent) groups.push((current = { agents: [], rules: [] }));
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    // Only group-member lines end a run of User-agent lines; Sitemap and unknown keys do not.
    if (key !== 'allow' && key !== 'disallow' && key !== 'crawl-delay') continue;
    lastWasAgent = false;
    if (!current) continue;
    if (key === 'crawl-delay') {
      const n = Number(value);
      if (Number.isFinite(n) && n >= 0) current.delay = n;
    } else if (value) current.rules.push({ allow: key === 'allow', pattern: value });
  }
  // RFC 9309: match our product token case-insensitively by prefix ("cert-exam-trainer/1.0", "...-acronym-harvester"),
  // merge every matching group, and fall back to "*".
  const ours = groups.filter((g) => g.agents.some((a) => a.startsWith(HARVEST_AGENT)));
  const picked = ours.length ? ours : groups.filter((g) => g.agents.includes('*'));
  const delays = picked.map((g) => g.delay).filter((d): d is number => d !== undefined);
  return { rules: picked.flatMap((g) => g.rules), delay: delays.length ? Math.max(...delays) : undefined };
}

/** Percent-encode a robots pattern the way URL.pathname is encoded, keeping existing %XX escapes. */
function encodePattern(p: string): string {
  return p.replace(/%[0-9A-Fa-f]{2}|[^%]+|%/g, (s) => (/^%[0-9A-Fa-f]{2}$/.test(s) ? s.toUpperCase() : encodeURI(s).replace(/%25/g, '%')));
}

function matchLength(pattern: string, path: string): number {
  const anchored = pattern.endsWith('$');
  const body = encodePattern(anchored ? pattern.slice(0, -1) : pattern);
  const re = new RegExp('^' + body.split('*').map((p) => p.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + (anchored ? '$' : ''));
  return re.test(path) ? body.length : -1;
}

/** Longest matching rule wins; Allow wins a tie; no match means allowed. */
export function isAllowed(rules: RobotsRules, path: string): boolean {
  let best = -1;
  let allow = true;
  for (const r of rules.rules) {
    const len = matchLength(r.pattern, path);
    if (len > best || (len === best && len >= 0 && r.allow)) {
      best = len;
      allow = r.allow;
    }
  }
  return allow;
}

export function crawlDelay(rules: RobotsRules): number | undefined {
  return rules.delay;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", nbsp: ' ' };

export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr)\b[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+|#39);/gi, (all, n: string) => ENTITIES[n.toLowerCase()] ?? all);
}

/** Acronym → number of text lines it appears on. The page text is discarded on return. */
export function tallyTokens(html: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const line of htmlToText(html).split('\n')) {
    for (const t of extractAcronyms(line)) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return counts;
}

export interface TermRow { term: string; count: number; sources: string[] }
export interface HarvestReport {
  format: 'cert-exam-trainer-acronym-harvest';
  version: 1;
  exam: string;
  harvestedAt: string;
  missing: TermRow[];
  known: TermRow[];
  skipped: SourceNote[];
  failed: SourceNote[];
}

export function buildReport(input: {
  exam: string; known: ReadonlySet<string>; at: string;
  perSource: { id: string; tokens: Map<string, number> }[];
  skipped: SourceNote[]; failed: SourceNote[];
}): HarvestReport {
  const rows = new Map<string, TermRow>();
  for (const { id, tokens } of input.perSource) {
    for (const [term, count] of tokens) {
      const row = rows.get(term) ?? { term, count: 0, sources: [] };
      row.count += count;
      if (!row.sources.includes(id)) row.sources.push(id);
      rows.set(term, row);
    }
  }
  const sorted = [...rows.values()].sort((a, b) => b.count - a.count || a.term.localeCompare(b.term));
  return {
    format: 'cert-exam-trainer-acronym-harvest', version: 1, exam: input.exam, harvestedAt: input.at,
    missing: sorted.filter((r) => !input.known.has(r.term)),
    known: sorted.filter((r) => input.known.has(r.term)),
    skipped: input.skipped, failed: input.failed,
  };
}
