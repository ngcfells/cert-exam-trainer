import type { Question } from '../domain/types';
import type { Repo } from '../storage/repo';
import { getBundledQuestions } from './index';

/** Which questions every mode draws from (spec §9). */
export type SourceFilter = 'ours' | 'mine' | 'both';
export const SOURCE_SETTING = 'sourceFilter';
export const SOURCE_FILTERS: SourceFilter[] = ['ours', 'mine', 'both'];

export async function getSourceFilter(repo: Repo): Promise<SourceFilter> {
  const v = await repo.getSetting<unknown>(SOURCE_SETTING);
  return SOURCE_FILTERS.includes(v as SourceFilter) ? (v as SourceFilter) : 'both';
}

/** The exam's question pool after the source filter. Like bundled drafts, user drafts stay out of every mode. */
export async function loadPool(repo: Repo, exam: string): Promise<Question[]> {
  const filter = await getSourceFilter(repo);
  const ours = filter === 'mine' ? [] : getBundledQuestions(exam);
  const mine = filter === 'ours' ? [] : await repo.getUserQuestions(exam);
  return [...ours, ...mine.filter((q) => q.status === 'approved')];
}
