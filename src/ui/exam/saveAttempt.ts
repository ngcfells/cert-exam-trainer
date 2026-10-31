import type { ExamMeta } from '../../domain/types';
import type { AssembledExam } from '../../exam/assemble';
import { buildResult, type ExamResult, type ResultMode } from '../../exam/result';
import { scoreExam, type Responses, type ScoreReport } from '../../exam/scoring';
import type { Repo } from '../../storage';
import { applyReviews, qualityFromFraction, type SrsKind } from '../../study/srs';

type Review = { kind: SrsKind; itemId: string; quality: number };

/** SM-2 quality for an acronym card: knew 4, didn't 1. */
export const acronymReview = (term: string, knew: boolean): Review => ({ kind: 'acronym', itemId: term, quality: knew ? 4 : 1 });

/**
 * Saves the result to history and schedules a spaced-repetition review for
 * each id in `reviewIds` (plus any extra reviews, such as acronyms).
 * Returns a user-facing error message, or null when everything saved.
 */
export async function saveAttempt(repo: Repo, result: ExamResult, report: ScoreReport, reviewIds: readonly string[], now: Date, extra: Review[] = []): Promise<string | null> {
  const errors: string[] = [];
  try {
    await repo.putRecord('results', result);
  } catch {
    errors.push('Your result could not be saved to history.');
  }
  const reviews = [
    ...report.items
      .filter((i) => reviewIds.includes(i.questionId))
      .map((i) => ({ kind: 'question' as const, itemId: i.questionId, quality: qualityFromFraction(i.fraction) })),
    ...extra,
  ];
  if (reviews.length) {
    try {
      await applyReviews(repo, result.exam, reviews, now);
    } catch {
      errors.push('Review scheduling could not be saved.');
    }
  }
  return errors.length ? errors.join(' ') : null;
}

export interface Finished {
  exam: AssembledExam;
  result: ExamResult;
  report: ScoreReport;
  saveError: string | null;
}

/** Scores an attempt, builds its result and saves it. `reviewIds` defaults to every answered question. */
export async function finishAttempt(
  repo: Repo,
  meta: ExamMeta,
  exam: AssembledExam,
  startedAt: Date,
  p: { responses: Responses; finishedAt: Date; autoSubmitted: boolean; flagged?: string[]; mode?: ResultMode },
  reviewIds?: readonly string[],
  extra: Review[] = [],
): Promise<Finished> {
  const report = scoreExam(exam, p.responses, meta);
  const result = buildResult({ exam, report, startedAt, flagged: [], ...p });
  const ids = reviewIds ?? report.items.filter((i) => i.answered).map((i) => i.questionId);
  return { exam, result, report, saveError: await saveAttempt(repo, result, report, ids, p.finishedAt, extra) };
}
