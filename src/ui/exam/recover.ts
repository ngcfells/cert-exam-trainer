import { metaFor } from '../../banks/metas';
import { clearInProgress, loadInProgress } from '../../exam/inProgress';
import { parseResults } from '../../exam/result';
import type { Repo } from '../../storage';
import { finishAttempt, type Finished } from './saveAttempt';

/**
 * Scores a mock that a refresh or close cut off, as if the user left at the last save, and clears the record.
 * Null when there is nothing to recover, the exam is not in this build, or the attempt is already in history.
 */
export async function recoverMock(repo: Repo): Promise<{ examCode: string; finished: Finished } | null> {
  const p = await loadInProgress(repo);
  if (!p) return null;
  const meta = metaFor(p.exam.exam);
  const history = meta ? parseResults(await repo.listRecords('results'), meta.code) : [];
  if (!meta || history.some((r) => r.seed === p.exam.seed && r.startedAt === p.startedAt)) {
    await clearInProgress(repo);
    return null;
  }
  const finished = await finishAttempt(repo, meta, p.exam, new Date(p.startedAt), {
    responses: p.responses,
    flagged: p.flagged,
    finishedAt: new Date(p.savedAt),
    autoSubmitted: false,
    endedBy: 'left',
  });
  await clearInProgress(repo);
  return { examCode: meta.code, finished };
}
