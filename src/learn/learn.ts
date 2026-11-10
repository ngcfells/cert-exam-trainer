import type { ExamMeta, Question } from '../domain/types';
import { isValidSearchTerm } from './phrase';
import { LEARN_SOURCES, type LearnSource } from './sources';

/** The question's own search term, else its acronyms plus objective title, else the exam name. Never empty. */
export function searchPhrase(q: Question, meta: ExamMeta | undefined): string {
  if (q.searchTerm && isValidSearchTerm(q.searchTerm)) return q.searchTerm;
  const title = meta?.objectives.find((o) => o.id === q.objectiveIds[0])?.title;
  const fallback = [...q.acronyms, ...(title ? [title] : [])].join(' ').trim();
  return fallback || meta?.name || q.exam;
}

/** The sources that suit an exam; an unknown exam gets only the general web search. */
export function sourcesFor(exam: string): LearnSource[] {
  return LEARN_SOURCES.filter((s) => s.exams === 'all' || s.exams.includes(exam));
}

export function learnUrl(source: LearnSource, phrase: string): string {
  return source.url(phrase);
}
