import type { Question } from '../src/domain/types';

// JSON with object keys sorted, so a schema-parsed copy compares equal to the file it came from.
function canonical(value: unknown): string {
  return JSON.stringify(value, (_k, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, (v as Record<string, unknown>)[k]]))
      : v,
  );
}

// A draft file that already sits in items/ is also loaded as part of the bank. Drop those bank
// copies so an item is not reported as a repeat or near duplicate of itself. A bank item that
// shares an id but differs from the draft stays, so a real id clash is still reported.
export function bankWithoutDrafts(bank: Question[], drafts: Question[]): Question[] {
  const draftJson = new Map(drafts.map((d) => [d.id, canonical(d)]));
  return bank.filter((b) => draftJson.get(b.id) !== canonical(b));
}
