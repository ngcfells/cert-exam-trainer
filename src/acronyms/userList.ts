import { z } from 'zod';
import { listExams } from '../banks';
import { getSourceFilter } from '../banks/pool';
import type { Question } from '../domain/types';
import type { Repo } from '../storage';
import { extractAcronyms, questionText } from './extract';
import { mergeAcronyms, type AcronymEntry } from './list';

/** The user's own list (spec §8 item 3), one setting per exam; backups carry it with the other settings. */
export const userAcronymSetting = (exam: string) => `userAcronyms:${exam}`;

const entrySchema = z.object({ term: z.string().min(1), expansion: z.string().min(1), source: z.literal('mine') }).strict();

export async function loadUserAcronyms(repo: Repo, exam: string): Promise<AcronymEntry[]> {
  const raw = await repo.getSetting<unknown>(userAcronymSetting(exam));
  if (!Array.isArray(raw)) return [];
  // Normalized and de-duplicated (last wins), as a hand-edited backup may hold either.
  const byTerm = new Map<string, AcronymEntry>();
  for (const r of raw) {
    const p = entrySchema.safeParse(r);
    if (!p.success) continue;
    const term = p.data.term.trim().toUpperCase();
    const expansion = p.data.expansion.trim();
    if (term && expansion) byTerm.set(term, { term, expansion, source: 'mine' });
  }
  return [...byTerm.values()].sort((a, b) => a.term.localeCompare(b.term));
}

const bankTerms = (exam: string) => new Set(listExams().find((m) => m.code === exam)?.acronyms.map((a) => a.term) ?? []);

/** Adds or replaces one of the user's acronyms. The term is trimmed and upper-cased; a term the bank has is refused. */
export async function saveUserAcronym(repo: Repo, exam: string, term: string, expansion: string): Promise<{ error?: string }> {
  const t = term.trim().toUpperCase();
  const x = expansion.trim();
  if (!t) return { error: 'Enter the acronym.' };
  if (!x) return { error: 'Enter what it stands for.' };
  if (bankTerms(exam).has(t)) return { error: `${t} is already in the built-in list (shown when questions come from Ours or Both).` };
  const rest = (await loadUserAcronyms(repo, exam)).filter((a) => a.term !== t);
  await repo.setSetting(userAcronymSetting(exam), [...rest, { term: t, expansion: x, source: 'mine' }].sort((a, b) => a.term.localeCompare(b.term)));
  return {};
}

export async function deleteUserAcronym(repo: Repo, exam: string, term: string): Promise<void> {
  await repo.setSetting(userAcronymSetting(exam), (await loadUserAcronyms(repo, exam)).filter((a) => a.term !== term));
}

/** The exam's list for every mode: bank plus mine, after the source filter. */
export async function loadAcronyms(repo: Repo, exam: string): Promise<AcronymEntry[]> {
  const [mine, filter] = await Promise.all([loadUserAcronyms(repo, exam), getSourceFilter(repo)]);
  return mergeAcronyms(listExams().find((m) => m.code === exam)?.acronyms ?? [], mine, filter);
}

/** Acronyms in the user's questions that `list` does not cover yet. */
export function unexpandedUserTerms(userQuestions: Question[], list: AcronymEntry[]): string[] {
  const known = new Set(list.map((a) => a.term));
  const found = new Set(userQuestions.flatMap((q) => [...extractAcronyms(questionText(q)), ...q.acronyms]));
  return [...found].filter((t) => !known.has(t)).sort();
}
