import type { Question } from '../domain/types';
import type { Repo } from '../storage/repo';
import { getBundledQuestions } from './index';

/** Which questions every mode draws from (spec §9). */
export type SourceFilter = 'ours' | 'mine' | 'both';
export const SOURCE_SETTING = 'sourceFilter';
export const SOURCE_FILTERS: SourceFilter[] = ['ours', 'mine', 'both'];

const isFilter = (v: unknown): v is SourceFilter => SOURCE_FILTERS.includes(v as SourceFilter);

/** Each exam keeps its own choice; the old global setting is only a fallback. */
export const sourceSettingKey = (exam: string) => `${SOURCE_SETTING}:${exam}`;

export async function getSourceFilter(repo: Repo, exam: string): Promise<SourceFilter> {
  const own = await repo.getSetting<unknown>(sourceSettingKey(exam));
  if (isFilter(own)) return own;
  const global = await repo.getSetting<unknown>(SOURCE_SETTING);
  return isFilter(global) ? global : 'both';
}

export async function setSourceFilter(repo: Repo, exam: string, v: SourceFilter): Promise<void> {
  await repo.setSetting(sourceSettingKey(exam), v);
}

/** The exam's question pool after the source filter. Like bundled drafts, user drafts stay out of every mode. */
export async function loadPool(repo: Repo, exam: string): Promise<Question[]> {
  const filter = await getSourceFilter(repo, exam);
  const ours = filter === 'mine' ? [] : getBundledQuestions(exam);
  const mine = filter === 'ours' ? [] : await repo.getUserQuestions(exam);
  return [...ours, ...mine.filter((q) => q.status === 'approved')];
}
