import type { ReactNode } from 'react';

/** Turns `^{...}` into superscript and `_{...}` into subscript; everything else is plain text. */
export function formulaParts(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /([\^_])\{([^}]*)\}/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(m[1] === '^' ? <sup key={m.index}>{m[2]}</sup> : <sub key={m.index}>{m[2]}</sub>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** A formula read aloud by its `spoken` label. */
export function Formula({ text, spoken }: { text: string; spoken: string }) {
  return (
    <p className="formula" role="math" aria-label={spoken}>
      {formulaParts(text)}
    </p>
  );
}
