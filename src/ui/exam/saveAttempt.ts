import type { ExamResult } from '../../exam/result';
import type { ScoreReport } from '../../exam/scoring';
import type { Repo } from '../../storage';
import { applyReviews, qualityFromFraction, type SrsKind } from '../../study/srs';

/**
 * Saves the result to history and schedules a spaced-repetition review for
 * each id in `reviewIds` (plus any extra reviews, such as acronyms).
 * Returns a user-facing error message, or null when everything saved.
 */
export async function saveAttempt(
  repo: Repo,
  result: ExamResult,
  report: ScoreReport,
  reviewIds: readonly string[],
  now: Date,
  extra: { kind: SrsKind; itemId: string; quality: number }[] = [],
): Promise<string | null> {
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
