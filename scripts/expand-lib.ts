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
  const t = term.toLowerCase();
  const w = words(expansion);
  const memo = new Map<string, boolean>();

  const fits = (ti: number, wi: number, skips: number): boolean => {
    const key = `${ti},${wi},${skips}`;
    const hit = memo.get(key);
    if (hit !== undefined) return hit;
    let ok = false;
    if (ti === t.length) {
      ok = w.slice(wi).filter((x) => !STOP.has(x)).length <= skips;
    } else if (wi < w.length) {
      const word = w[wi];
      const stop = STOP.has(word);
      if (stop) ok = fits(ti, wi + 1, skips);
      else if (skips > 0) ok = fits(ti, wi + 1, skips - 1);
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

function prompt(terms: string[], exam: string, examTitle: string): string {
  return [
    `You are checking acronyms for the ${examTitle} (${exam}) certification exam.`,
    'For each term, give its standard expansion as used in data, IT and analytics, in Title Case.',
    'Use verdict "flag" with a short reason when the term is not really an acronym (a word in capitals, a product or site name, a code),',
    'when it has several common meanings in this field, or when you are not sure. Otherwise use verdict "ok" with reason "".',
    'Return JSON only: {"items": [{"term": "SQL", "expansion": "Structured Query Language", "verdict": "ok", "reason": ""}, ...]}, one item per term, same terms.',
    `Terms: ${terms.join(', ')}`,
  ].join('\n');
}

export async function expandTerms(opts: {
  terms: string[]; exam: string; examTitle: string; chat: (prompt: string) => Promise<string>; batch?: number;
}): Promise<Expansion[]> {
  const size = opts.batch ?? 25;
  const out: Expansion[] = [];
  for (let i = 0; i < opts.terms.length; i += size) {
    const batch = opts.terms.slice(i, i + size);
    let items: unknown[] = [];
    try {
      const parsed = JSON.parse(await opts.chat(prompt(batch, opts.exam, opts.examTitle))) as { items?: unknown };
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

/** A chat function for a local Ollama model (streamed, as in draft-ollama.ts). */
export function ollamaChat(model = 'qwen3.6:27b'): (prompt: string) => Promise<string> {
  return async (content) => {
    const res = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model, stream: true, think: false, format: 'json', messages: [{ role: 'user', content }], options: { temperature: 0.2, num_ctx: 8192 } }),
    });
    if (!res.ok || !res.body) throw new Error(`Ollama ${res.status}`);
    let text = '';
    let pending = '';
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = (pending + value).split('\n');
      pending = lines.pop() ?? '';
      for (const line of lines) if (line.trim()) text += (JSON.parse(line) as { message?: { content?: string } }).message?.content ?? '';
    }
    return text;
  };
}
