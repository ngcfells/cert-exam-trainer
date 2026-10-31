import { z } from 'zod';
import type { ScoreReport } from '../exam/scoring';
import type { Repo } from '../storage';

export type LessonState = 'not-started' | 'in-progress' | 'done';
/** Best check score that marks a lesson done. */
export const DONE_THRESHOLD = 0.8;

/** Per lesson: the best check score so far (0..1), or null once opened but never checked. */
const statusSchema = z.record(z.object({ best: z.number().min(0).max(1).nullable() }).strict());
export type LessonStatus = z.infer<typeof statusSchema>;

const key = (exam: string) => `lessonStatus:${exam}`;

/** Stored in settings, which backups already carry. A malformed value reads as empty. */
export async function loadLessonStatus(repo: Repo, exam: string): Promise<LessonStatus> {
  const r = statusSchema.safeParse(await repo.getSetting(key(exam)));
  return r.success ? r.data : {};
}

export async function markOpened(repo: Repo, exam: string, lessonId: string): Promise<void> {
  const s = await loadLessonStatus(repo, exam);
  if (s[lessonId]) return;
  await repo.setSetting(key(exam), { ...s, [lessonId]: { best: null } });
}

/** Keeps the best score. */
export async function recordCheck(repo: Repo, exam: string, lessonId: string, fraction: number): Promise<void> {
  const s = await loadLessonStatus(repo, exam);
  const best = Math.max(s[lessonId]?.best ?? 0, Math.min(1, Math.max(0, fraction)));
  await repo.setSetting(key(exam), { ...s, [lessonId]: { best } });
}

export function lessonState(entry: LessonStatus[string] | undefined): LessonState {
  if (!entry) return 'not-started';
  return entry.best !== null && entry.best >= DONE_THRESHOLD - 1e-9 ? 'done' : 'in-progress';
}

/** Earned over every check item, so stopping early can never mark a lesson done; unseen items count 0. */
export function checkFraction(report: ScoreReport, checkIds: readonly string[]): number {
  if (checkIds.length === 0) return 0;
  return checkIds.reduce((s, id) => s + (report.items.find((i) => i.questionId === id)?.fraction ?? 0), 0) / checkIds.length;
}
