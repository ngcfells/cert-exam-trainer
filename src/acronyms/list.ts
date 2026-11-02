import type { SourceFilter } from '../banks/pool';
import type { ExamMeta } from '../domain/types';

export type AcronymSource = 'official' | 'community' | 'mine';

export interface AcronymEntry {
  term: string;
  expansion: string;
  /** Other meanings of the same concept that typed answers also accept. Built-in entries only. */
  alternates?: string[];
  source: AcronymSource;
}

/** The meaning as shown to people: the expansion, plus any alternates in a parenthetical. */
export function meaningText(a: AcronymEntry): string {
  return a.alternates?.length ? `${a.expansion} (also: ${a.alternates.join('; ')})` : a.expansion;
}

const RANK: Record<AcronymSource, number> = { official: 0, community: 1, mine: 2 };

/** The bank list and the user's list after the source filter, sorted by term; on a repeated term, official beats community beats mine. */
export function mergeAcronyms(bank: ExamMeta['acronyms'], mine: AcronymEntry[], filter: SourceFilter): AcronymEntry[] {
  const all = [...(filter === 'mine' ? [] : bank), ...(filter === 'ours' ? [] : mine)];
  const byTerm = new Map<string, AcronymEntry>();
  for (const a of all) {
    const prev = byTerm.get(a.term);
    if (!prev || RANK[a.source] < RANK[prev.source]) {
      byTerm.set(a.term, { term: a.term, expansion: a.expansion, ...(a.alternates ? { alternates: a.alternates } : {}), source: a.source });
    }
  }
  return [...byTerm.values()].sort((a, b) => a.term.localeCompare(b.term));
}
