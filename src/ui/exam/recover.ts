import { metaFor } from '../../banks/metas';
import { clearInProgress, loadInProgress } from '../../exam/inProgress';
import { parseResults } from '../../exam/result';
import type { Repo } from '../../storage';
import { finishAttempt, type Finished } from './saveAttempt';

/**
 * Scores a mock that a refresh or close cut off, as if the user left at the last save, and clears the record.
 * Null when there is nothing to recover, the exam is not in this build, or the attempt is already in history.
 */
type Recovered = { examCode: string; finished: Finished } | null;

// Calls that overlap (StrictMode runs the startup effect twice) share one run, so the attempt scores once.
const running = new WeakMap<Repo, Promise<Recovered>>();

export function recoverMock(repo: Repo): Promise<Recovered> {
  const inFlight = running.get(repo);
  if (inFlight) return inFlight;
  const run = recover(repo).finally(() => running.delete(repo));
  running.set(repo, run);
  return run;
}

async function recover(repo: Repo): Promise<Recovered> {
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
