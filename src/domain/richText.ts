// Code in question text: `inline code` and ``` fenced blocks (a language tag after the opening fence is ignored).
// Anything unclosed stays plain text, so a stray backtick never hides words.

export type RichSegment = { kind: 'text' | 'code' | 'block'; value: string };

type Chunk = { block: boolean; value: string };

const isFence = (line: string) => line.trim().startsWith('```');

/** Splits text into plain runs and fenced blocks. Plain runs keep their own line breaks. */
function chunks(text: string): Chunk[] {
  const lines = text.split('\n');
  const out: Chunk[] = [];
  let plain: string[] = [];
  const flush = () => {
    if (plain.length) out.push({ block: false, value: plain.join('\n') });
    plain = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const close = isFence(lines[i]) ? lines.findIndex((l, j) => j > i && isFence(l)) : -1;
    if (close < 0) {
      plain.push(lines[i]);
      continue;
    }
    flush();
    out.push({ block: true, value: lines.slice(i + 1, close).join('\n') });
    const after = lines[close].trim().slice(3).trim();
    if (after) plain.push(after);
    i = close;
  }
  flush();
  return out.filter((c) => c.block || c.value !== '');
}

const INLINE = /`([^`\n]+)`/g;

function inline(text: string): RichSegment[] {
  const out: RichSegment[] = [];
  let at = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > at) out.push({ kind: 'text', value: text.slice(at, m.index) });
    out.push({ kind: 'code', value: m[1] });
    at = m.index + m[0].length;
  }
  if (at < text.length) out.push({ kind: 'text', value: text.slice(at) });
  return out;
}

export function parseRich(text: string): RichSegment[] {
  return chunks(text).flatMap((c) => (c.block ? [{ kind: 'block' as const, value: c.value }] : inline(c.value)));
}

/** The text with backticks removed and code kept, for labels read by screen readers. */
export function plainText(text: string): string {
  return chunks(text)
    .map((c) => (c.block ? c.value : c.value.replace(INLINE, '$1')))
    .join('\n');
}

/** The text with all code removed: code identifiers such as PATH are not acronyms. */
export function stripCode(text: string): string {
  return chunks(text)
    .map((c) => (c.block ? '' : c.value.replace(INLINE, '')))
    .join('\n');
}
