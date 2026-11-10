import type { ExamMeta, Question } from '../domain/types';
import { isValidSearchTerm } from './phrase';
import { LEARN_SOURCES, type LearnSource } from './sources';

const LEAD_IN = /^(?:(?:given [^,]+|explain|identify|compare and contrast|summarize|describe|use|analyze|apply|implement|determine)[,\s]+)+/i;
const TRAILING_FILLER = /\s+(?:to|in|a|an|the|and|of|for|used|using|with)$/i;

/** An objective sentence cut down to its topic: no lead-in verb, brackets or full stop, about 6 words. */
export function searchTopic(title: string): string {
  let t = title.replace(/\([^)]*\)/g, ' ').replace(/[.;:]+$/g, '').replace(/\s+/g, ' ').trim().replace(LEAD_IN, '');
  const cut = t.search(/\s+to\s/i);
  if (cut > 0 && t.slice(0, cut).split(' ').length >= 2) t = t.slice(0, cut);
  t = t.replace(/[,;:]/g, '').split(' ').slice(0, 6).join(' ');
  while (TRAILING_FILLER.test(t) && t.includes(' ')) t = t.replace(TRAILING_FILLER, '');
  return t.trim() || title.trim();
}

/** The question's own search term, else its acronyms plus objective title, else the exam name. Never empty. */
export function searchPhrase(q: Question, meta: ExamMeta | undefined): string {
  if (q.searchTerm && isValidSearchTerm(q.searchTerm)) return q.searchTerm;
  const title = meta?.objectives.find((o) => o.id === q.objectiveIds[0])?.title;
  const fallback = [...q.acronyms, ...(title ? [searchTopic(title)] : [])].join(' ').trim();
  return fallback || meta?.name || q.exam;
}

/** The sources that suit an exam; an unknown exam gets only the general web search. */
export function sourcesFor(exam: string): LearnSource[] {
  return LEARN_SOURCES.filter((s) => s.exams === 'all' || s.exams.includes(exam));
}

export function learnUrl(source: LearnSource, phrase: string): string {
  return source.url(phrase);
}
