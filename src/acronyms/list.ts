import type { SourceFilter } from '../banks/pool';
import type { ExamMeta } from '../domain/types';

export type AcronymSource = 'official' | 'community' | 'mine';

export interface AcronymEntry {
  term: string;
  expansion: string;
  source: AcronymSource;
}

const RANK: Record<AcronymSource, number> = { official: 0, community: 1, mine: 2 };

/** The bank list and the user's list after the source filter, sorted by term; on a repeated term, official beats community beats mine. */
export function mergeAcronyms(bank: ExamMeta['acronyms'], mine: AcronymEntry[], filter: SourceFilter): AcronymEntry[] {
  const all = [...(filter === 'mine' ? [] : bank), ...(filter === 'ours' ? [] : mine)];
  const byTerm = new Map<string, AcronymEntry>();
  for (const a of all) {
    const prev = byTerm.get(a.term);
    if (!prev || RANK[a.source] < RANK[prev.source]) byTerm.set(a.term, { term: a.term, expansion: a.expansion, source: a.source });
  }
  return [...byTerm.values()].sort((a, b) => a.term.localeCompare(b.term));
}
