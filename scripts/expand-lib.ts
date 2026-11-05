// Drafts acronym expansions with a local Ollama model, then checks each one locally. Dev-only.
import { z } from 'zod';

export const expansionSchema = z.object({
  term: z.string(),
  expansion: z.string(),
  verdict: z.enum(['ok', 'flag']),
  reason: z.string(),
});
export type Expansion = z.infer<typeof expansionSchema>;

const STOP = new Set(['of', 'and', 'the', 'for', 'to', 'in', 'a', 'an', 'on', 'as', 'by', 'with', 'or']);

function words(expansion: string): string[] {
  return expansion
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
}

/**
 * Null when the expansion's words can spell the term in order, else a reason to flag.
 * Each significant word gives 1–3 letters (its first or second letter, then later letters of it);
 * stop words may give letters or none; one significant word may be skipped.
 */
export function checkExpansion(term: string, expansion: string): string | null {
  if (!expansion.trim()) return 'empty expansion';
  const t = term.toLowerCase().replace(/[^a-z0-9]+/g, ''); // CI/CD and SOC 2 spell cicd and soc2
  const w = words(expansion);
  if (t.length >= 3 && w.filter((x) => !STOP.has(x)).length < 2) return `"${expansion}" is one word, not an expansion of ${term}`;
  const memo = new Map<string, boolean>();

  const fits = (ti: number, wi: number, skips: number): boolean => {
    const key = `${ti},${wi},${skips}`;
    const hit = memo.get(key);
    if (hit !== undefined) return hit;
    let ok = false;
    if (ti === t.length) {
      ok = w.slice(wi).every((x) => STOP.has(x)); // no trailing extra words
    } else if (wi < w.length) {
      const word = w[wi];
      const stop = STOP.has(word);
      if (stop) ok = fits(ti, wi + 1, skips);
      else if (skips > 0 && ti > 0) ok = fits(ti, wi + 1, skips - 1); // only an inner word may be skipped
      for (let start = 0; !ok && start < Math.min(2, word.length); start++) {
        if (word[start] !== t[ti]) continue;
        // take this letter, then up to 2 more letters later in the same word
        const take = (pos: number, tj: number, extra: number): boolean => {
          if (fits(tj, wi + 1, skips)) return true;
          if (extra === 0 || tj >= t.length) return false;
          for (let p = pos + 1; p < word.length; p++) if (word[p] === t[tj] && take(p, tj + 1, extra - 1)) return true;
          return false;
        };
        ok = take(start, ti + 1, 2);
      }
    }
    memo.set(key, ok);
    return ok;
  };
  return fits(0, 0, 1) ? null : `initials of "${expansion}" do not spell ${term}`;
}

function prompt(terms: string[], exam: string, examTitle: string, topics: string[]): string {
  return [
    `You are checking acronyms for the ${examTitle} (${exam}) certification exam.`,
    ...(topics.length ? [`The exam covers: ${topics.join('; ')}.`] : []),
    'For each term, give its standard expansion as used in IT and in the field this exam covers, in Title Case.',
    'Use verdict "flag" with a short reason when the term is not really an acronym (a word in capitals, a product or site name, a code),',
    'when it is a certification, exam or course code, a vendor, product or website name, or a country, currency or company,',
    'when it is not used in IT or in this exam\'s field, when it has several common meanings in this field, or when you are not sure.',
    'Otherwise use verdict "ok" with reason "".',
    'Return JSON only: {"items": [{"term": "SQL", "expansion": "Structured Query Language", "verdict": "ok", "reason": ""}, ...]}, one item per term, same terms.',
    `Terms: ${terms.join(', ')}`,
  ].join('\n');
}

export async function expandTerms(opts: {
  terms: string[]; exam: string; examTitle: string; chat: (prompt: string) => Promise<string>; batch?: number;
  /** The exam's domain titles, so the model knows the field. */
  topics?: string[];
}): Promise<Expansion[]> {
  const size = opts.batch ?? 25;
  const out: Expansion[] = [];
  for (let i = 0; i < opts.terms.length; i += size) {
    const batch = opts.terms.slice(i, i + size);
    let items: unknown[] = [];
    try {
      const parsed = JSON.parse(await opts.chat(prompt(batch, opts.exam, opts.examTitle, opts.topics ?? []))) as { items?: unknown };
      if (Array.isArray(parsed.items)) items = parsed.items;
    } catch {
      items = [];
    }
    const byTerm = new Map<string, Expansion>();
    for (const it of items) {
      const r = expansionSchema.safeParse(it);
      if (r.success) byTerm.set(r.data.term.toUpperCase(), r.data);
    }
    for (const term of batch) {
      const got = byTerm.get(term.toUpperCase());
      if (!got) { out.push({ term, expansion: '', verdict: 'flag', reason: 'no answer' }); continue; }
      const row = { ...got, term, expansion: got.expansion.trim() };
      if (row.verdict === 'ok') {
        const why = checkExpansion(term, row.expansion);
        if (why) { row.verdict = 'flag'; row.reason = why; }
      }
      out.push(row);
    }
  }
  return out;
}

export interface AlternateRow {
  term: string;
  expansion: string;
  /** Passed the local checks; a person (or Claude) still reviews them before they go in meta.ts. */
  alternates: string[];
  rejected: { text: string; reason: string }[];
  reason?: string;
}

function alternatesPrompt(entries: { term: string; expansion: string }[], exam: string, examTitle: string, topics: string[]): string {
  return [
    `You are checking acronyms for the ${examTitle} (${exam}) certification exam.`,
    ...(topics.length ? [`The exam covers: ${topics.join('; ')}.`] : []),
    'Each acronym below is listed with the meaning this exam uses. For each one, list other expansions of the SAME letters',
    'that people in this field use for the same idea, so a learner who types one of them should be marked right.',
    'Examples: wording variants (MTTR: Mean Time to Repair, Mean Time to Restore) or the other reading of a shared term that the exam treats as one idea.',
    'Do not list unrelated meanings of the letters, spelling-only changes (case, hyphens) or the listed meaning itself. Use Title Case.',
    'Return [] for an acronym with no such variant; most have none.',
    'Return JSON only: {"items": [{"term": "MTTR", "alternates": ["Mean Time to Repair"]}, ...]}, one item per acronym, same terms.',
    'Acronyms:',
    ...entries.map((e) => `${e.term} = ${e.expansion}`),
  ].join('\n');
}

const fold = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');

/** Asks the model for same-idea alternate meanings of each listed acronym, then checks each one locally. */
export async function draftAlternates(opts: {
  entries: { term: string; expansion: string }[]; exam: string; examTitle: string; topics?: string[];
  chat: (prompt: string) => Promise<string>; batch?: number;
}): Promise<AlternateRow[]> {
  const size = opts.batch ?? 25;
  const out: AlternateRow[] = [];
  for (let i = 0; i < opts.entries.length; i += size) {
    const batch = opts.entries.slice(i, i + size);
    const byTerm = new Map<string, unknown[]>();
    try {
      const parsed = JSON.parse(await opts.chat(alternatesPrompt(batch, opts.exam, opts.examTitle, opts.topics ?? []))) as { items?: unknown };
      for (const it of Array.isArray(parsed.items) ? parsed.items : []) {
        const r = z.object({ term: z.string(), alternates: z.array(z.unknown()) }).safeParse(it);
        if (r.success) byTerm.set(r.data.term.toUpperCase(), r.data.alternates);
      }
    } catch {
      // A bad reply leaves every term in the batch as "no answer".
    }
    for (const { term, expansion } of batch) {
      const got = byTerm.get(term.toUpperCase());
      const row: AlternateRow = { term, expansion, alternates: [], rejected: [] };
      if (!got) { out.push({ ...row, reason: 'no answer' }); continue; }
      const seen = new Set([fold(expansion)]);
      for (const raw of got) {
        if (typeof raw !== 'string' || !raw.trim()) continue;
        const text = raw.trim();
        if (seen.has(fold(text))) {
          row.rejected.push({ text, reason: fold(text) === fold(expansion) ? 'repeats the expansion' : 'repeated' });
          continue;
        }
        const why = checkExpansion(term, text);
        if (why) row.rejected.push({ text, reason: why });
        else { row.alternates.push(text); seen.add(fold(text)); }
      }
      out.push(row);
    }
  }
  return out;
}

/** A chat function for a local Ollama model (streamed, as in draft-ollama.ts). */
export function ollamaChat(model = 'qwen3.6:27b', timeoutMs = 600_000, fetchFn: typeof fetch = fetch): (prompt: string) => Promise<string> {
  return async (content) => {
    const res = await fetchFn('http://localhost:11434/api/chat', {
      method: 'POST',
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model, stream: true, think: false, format: 'json', messages: [{ role: 'user', content }], options: { temperature: 0.2, num_ctx: 8192 } }),
    });
    if (!res.ok || !res.body) throw new Error(`Ollama ${res.status}`);
    let text = '';
    let pending = '';
    const take = (line: string) => {
      if (!line.trim()) return;
      const msg = JSON.parse(line) as { message?: { content?: string }; error?: string };
      if (msg.error) throw new Error(`Ollama: ${msg.error}`);
      text += msg.message?.content ?? '';
    };
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = (pending + value).split('\n');
      pending = lines.pop() ?? '';
      lines.forEach(take);
    }
    take(pending);
    return text;
  };
}

function judgePrompt(pairs: { term: string; expansion: string; alt: string }[], exam: string, examTitle: string, topics: string[]): string {
  return [
    `You are checking acronyms for the ${examTitle} (${exam}) certification exam.`,
    ...(topics.length ? [`The exam covers: ${topics.join('; ')}.`] : []),
    'Each line gives an acronym, the meaning this exam uses, and a suggested alternate expansion.',
    'Answer "same" when people in this field use the alternate for the same idea, so a learner who types it should be marked right.',
    'Answer "different" when it names another idea, is wrong, or you are not sure, with a short reason.',
    'Return JSON only: {"items": [{"term": "MTTR", "alternate": "Mean Time to Repair", "verdict": "same", "reason": ""}, ...]}, one item per line.',
    ...pairs.map((p) => `${p.term} = ${p.expansion}; suggested: ${p.alt}`),
  ].join('\n');
}

/**
 * Asks the model to judge alternates someone suggested (the model stays the judge). A suggestion is kept only when
 * it passes the local checks and the model calls it the same idea.
 */
export async function judgeAlternates(opts: {
  entries: { term: string; expansion: string }[]; suggestions: Record<string, string[]>; exam: string; examTitle: string;
  topics?: string[]; chat: (prompt: string) => Promise<string>; batch?: number;
}): Promise<AlternateRow[]> {
  const rows: AlternateRow[] = [];
  const pairs: { term: string; expansion: string; alt: string; row: AlternateRow }[] = [];
  for (const { term, expansion } of opts.entries) {
    const alts = opts.suggestions[term];
    if (!alts?.length) continue;
    const row: AlternateRow = { term, expansion, alternates: [], rejected: [] };
    rows.push(row);
    const seen = new Set([fold(expansion)]);
    for (const raw of alts) {
      const alt = raw.trim();
      const why = seen.has(fold(alt)) ? 'repeats a meaning' : checkExpansion(term, alt);
      if (why) row.rejected.push({ text: alt, reason: why });
      else { seen.add(fold(alt)); pairs.push({ term, expansion, alt, row }); }
    }
  }
  const size = opts.batch ?? 25;
  for (let i = 0; i < pairs.length; i += size) {
    const batch = pairs.slice(i, i + size);
    const verdicts = new Map<string, { verdict: string; reason: string }>();
    try {
      const parsed = JSON.parse(await opts.chat(judgePrompt(batch, opts.exam, opts.examTitle, opts.topics ?? []))) as { items?: unknown };
      for (const it of Array.isArray(parsed.items) ? parsed.items : []) {
        const r = z.object({ term: z.string(), alternate: z.string(), verdict: z.string(), reason: z.string().default('') }).safeParse(it);
        if (r.success) verdicts.set(`${r.data.term.toUpperCase()}|${fold(r.data.alternate)}`, r.data);
      }
    } catch {
      // A bad reply leaves the whole batch unjudged, so nothing in it is kept.
    }
    for (const p of batch) {
      const v = verdicts.get(`${p.term.toUpperCase()}|${fold(p.alt)}`);
      if (v?.verdict === 'same') p.row.alternates.push(p.alt);
      else p.row.rejected.push({ text: p.alt, reason: `model: ${v ? v.reason || v.verdict : 'no answer'}` });
    }
  }
  return rows;
}

export interface AlternateArgs { exam: string; out: string; model: string; terms: string[]; suggest: string }

export function parseAlternateArgs(argv: string[]): AlternateArgs {
  const a: AlternateArgs = { exam: '', out: '', model: 'qwen3.6:27b', terms: [], suggest: '' };
  const args = argv.filter((x) => x !== '--');
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (!['--exam', '--out', '--model', '--terms', '--suggest'].includes(flag)) throw new Error(`unknown argument ${flag}`);
    const value = args[++i];
    if (value === undefined || value.startsWith('--')) throw new Error(`${flag} needs a value`);
    if (flag === '--exam') a.exam = value;
    else if (flag === '--out') a.out = value;
    else if (flag === '--model') a.model = value;
    else if (flag === '--suggest') a.suggest = value;
    else {
      a.terms = [...new Set(value.split(',').map((t) => t.trim()).filter(Boolean))];
      if (!a.terms.length) throw new Error('--terms needs at least one term');
    }
  }
  if (!a.exam) throw new Error('--exam is required');
  return a;
}

/** `terms`: when set, expand only these (from `--terms A,B`), instead of the report's missing terms. */
export interface ExpandArgs { report: string; out: string; model: string; minCount: number; terms: string[] }

export function parseExpandArgs(argv: string[]): ExpandArgs {
  const a: ExpandArgs = { report: '', out: '', model: 'qwen3.6:27b', minCount: 1, terms: [] };
  const args = argv.filter((x) => x !== '--');
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (!['--report', '--out', '--model', '--min-count', '--terms'].includes(flag)) throw new Error(`unknown argument ${flag}`);
    const value = args[++i];
    if (value === undefined || value.startsWith('--')) throw new Error(`${flag} needs a value`);
    if (flag === '--report') a.report = value;
    else if (flag === '--out') a.out = value;
    else if (flag === '--model') a.model = value;
    else if (flag === '--terms') {
      a.terms = [...new Set(value.split(',').map((t) => t.trim()).filter(Boolean))];
      if (!a.terms.length) throw new Error('--terms needs at least one term');
    } else {
      const n = Number(value);
      if (!Number.isInteger(n) || n < 1) throw new Error('--min-count must be a whole number of at least 1');
      a.minCount = n;
    }
  }
  if (!a.report) throw new Error('--report is required');
  return a;
}
