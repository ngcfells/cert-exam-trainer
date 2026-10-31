// The overlap check: bundled items must not share a run of words with reference material (such as
// instructor deck notes) that we may read but never copy.

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function runs(ws: string[], n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i + n <= ws.length; i++) out.push(ws.slice(i, i + n).join(' '));
  return out;
}

/** Each distinct n-word run that appears in both texts, in the order first seen in `text`. Case and punctuation are ignored. */
export function sharedRuns(text: string, reference: string, n = 8): string[] {
  const ref = new Set(runs(words(reference), n));
  return [...new Set(runs(words(text), n).filter((r) => ref.has(r)))];
}
