import { useState } from 'react';
import { loadAcronyms } from '../../acronyms/userList';
import { newSeed } from '../../exam/rng';
import type { Repo } from '../../storage';
import { computeMastery } from '../../study/mastery';
import { assembleCram, onlySeen } from '../../study/session';
import { ResultsScreen } from '../exam/ResultsScreen';
import { acronymReview, finishAttempt, type Finished } from '../exam/saveAttempt';
import { Loading, metaFor, toCount, useLoad } from '../kit';
import { LoadError } from './LoadError';
import { loadStudy } from './loadStudy';
import { StudyRunner, type StudyOutcome } from './StudyRunner';
import './study.css';

export const DEFAULT_CRAM_MINUTES = 10;

export function CramFlow({ repo, examCode, seed, onExit }: { repo: Repo; examCode: string; seed?: number; onExit: () => void }) {
  const meta = metaFor(examCode);
  const [session] = useLoad(async () => {
    const [{ pool, results, srs }, acronyms] = await Promise.all([loadStudy(repo, examCode), loadAcronyms(repo, examCode)]);
    return assembleCram({ meta, acronyms, pool, seed: seed ?? newSeed(), srs, mastery: computeMastery(meta, results, pool), now: new Date() });
  }, [repo, examCode, seed]);
  const [timed, setTimed] = useState(false);
  const [minutes, setMinutes] = useState(DEFAULT_CRAM_MINUTES);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [done, setDone] = useState<(Finished & { known: number }) | null>(null);

  if (session === undefined) return <Loading />;
  if (session === null) return <LoadError onExit={onExit} />;
  const acronymTotal = session.acronyms.length;
  if (done) {
    return (
      <ResultsScreen meta={meta} {...done} onHome={onExit} mode="cram">
        {acronymTotal > 0 && <p>{`Acronyms: ${done.known} of ${acronymTotal} known`}</p>}
      </ResultsScreen>
    );
  }

  async function finish(at: Date, o: StudyOutcome) {
    const exam = onlySeen(session!.exam, o.seen);
    const f = await finishAttempt(repo, meta, exam, at, { ...o, autoSubmitted: o.timedOut, mode: 'cram' }, o.checked, o.acronymGrades.map((g) => acronymReview(g.term, g.knew)));
    setDone({ ...f, known: o.acronymGrades.filter((g) => g.knew).length });
  }

  if (startedAt) {
    return (
      <StudyRunner
        items={[...session.exam.items.map((item) => ({ kind: 'question' as const, item })), ...session.acronyms.map((card) => ({ kind: 'acronym' as const, card }))]}
        feedback="instant"
        timeLimitMs={timed ? minutes * 60_000 : undefined}
        startedAt={startedAt}
        onFinish={(o) => void finish(startedAt, o)}
      />
    );
  }

  const empty = session.exam.items.length + acronymTotal === 0;
  return (
    <section className="study-setup" aria-labelledby="cram-h">
      <h2 id="cram-h">{`Cram: ${meta.name} (${meta.code})`}</h2>
      {empty ? (
        <p>Nothing to cram yet.</p>
      ) : (
        <>
          <p>{`A short session: questions due for review, your weakest objectives and acronyms (${session.exam.items.length} questions, ${acronymTotal} acronyms).`}</p>
          <label>
            <input type="checkbox" checked={timed} onChange={(e) => setTimed(e.target.checked)} />
            Use a countdown
          </label>
          {timed && (
            <label>
              Minutes
              <input type="number" min={1} value={minutes || ''} onChange={(e) => setMinutes(toCount(e.target.value))} />
            </label>
          )}
          <p>
            <button type="button" className="primary" disabled={timed && minutes < 1} onClick={() => setStartedAt(new Date())}>
              Start cram
            </button>
          </p>
        </>
      )}
      <button type="button" onClick={onExit}>
        {empty ? 'Back' : 'Cancel'}
      </button>
    </section>
  );
}
