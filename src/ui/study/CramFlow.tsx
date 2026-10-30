import { useEffect, useState } from 'react';
import { loadAcronyms } from '../../acronyms/userList';
import { listExams } from '../../banks';
import type { AssembledExam } from '../../exam/assemble';
import { buildResult, type ExamResult } from '../../exam/result';
import { newSeed } from '../../exam/rng';
import { scoreExam, type ScoreReport } from '../../exam/scoring';
import type { Repo } from '../../storage';
import { computeMastery } from '../../study/mastery';
import { assembleCram, onlySeen, type CramSession } from '../../study/session';
import { ResultsScreen } from '../exam/ResultsScreen';
import { saveAttempt } from '../exam/saveAttempt';
import { LoadError } from './LoadError';
import { loadStudy } from './loadStudy';
import { StudyRunner, type StudyOutcome } from './StudyRunner';
import './study.css';

type Stage =
  | { stage: 'loading' }
  | { stage: 'error' }
  | { stage: 'setup'; session: CramSession }
  | { stage: 'running'; session: CramSession; startedAt: Date }
  | {
      stage: 'results';
      exam: AssembledExam;
      result: ExamResult;
      report: ScoreReport;
      saveError: string | null;
      acronyms: { known: number; total: number };
    };

export const DEFAULT_CRAM_MINUTES = 10;
const KNEW = 4;
const DID_NOT_KNOW = 1;

export function CramFlow({ repo, examCode, seed, onExit }: { repo: Repo; examCode: string; seed?: number; onExit: () => void }) {
  const meta = listExams().find((m) => m.code === examCode)!;
  const [s, setS] = useState<Stage>({ stage: 'loading' });
  const [timed, setTimed] = useState(false);
  const [minutes, setMinutes] = useState(DEFAULT_CRAM_MINUTES);

  useEffect(() => {
    let live = true;
    void Promise.all([loadStudy(repo, examCode), loadAcronyms(repo, examCode)]).then(
      ([{ pool, results, srs }, acronyms]) => {
        if (!live) return;
        const session = assembleCram({ meta, acronyms, pool, seed: seed ?? newSeed(), srs, mastery: computeMastery(meta, results, pool), now: new Date() });
        setS({ stage: 'setup', session });
      },
      () => live && setS({ stage: 'error' }),
    );
    return () => {
      live = false;
    };
  }, [repo, examCode, meta, seed]);

  async function finish(session: CramSession, startedAt: Date, o: StudyOutcome) {
    const exam = onlySeen(session.exam, o.seen);
    const report = scoreExam(exam, o.responses, meta);
    const result = buildResult({ exam, report, startedAt, responses: o.responses, flagged: [], finishedAt: o.finishedAt, autoSubmitted: o.timedOut, mode: 'cram' });
    const acronymReviews = o.acronymGrades.map((g) => ({ kind: 'acronym' as const, itemId: g.term, quality: g.knew ? KNEW : DID_NOT_KNOW }));
    const saveError = await saveAttempt(repo, result, report, o.checked, o.finishedAt, acronymReviews);
    const acronyms = { known: o.acronymGrades.filter((g) => g.knew).length, total: session.acronyms.length };
    setS({ stage: 'results', exam, result, report, saveError, acronyms });
  }

  switch (s.stage) {
    case 'loading':
      return <p>Loading…</p>;
    case 'error':
      return <LoadError onExit={onExit} />;
    case 'setup': {
      const empty = s.session.exam.items.length + s.session.acronyms.length === 0;
      return (
        <section className="study-setup" aria-labelledby="cram-h">
          <h2 id="cram-h">{`Cram: ${meta.name} (${meta.code})`}</h2>
          {empty ? (
            <p>Nothing to cram yet.</p>
          ) : (
            <>
              <p>
                {`A short session: questions due for review, your weakest objectives and acronyms (${s.session.exam.items.length} questions, ${s.session.acronyms.length} acronyms).`}
              </p>
              <label>
                <input type="checkbox" checked={timed} onChange={(e) => setTimed(e.target.checked)} />
                Use a countdown
              </label>
              {timed && (
                <label>
                  Minutes
                  <input type="number" min={1} value={minutes || ''} onChange={(e) => setMinutes(Math.max(0, Math.floor(Number(e.target.value) || 0)))} />
                </label>
              )}
              <p>
                <button
                  type="button"
                  className="primary"
                  disabled={timed && minutes < 1}
                  onClick={() => setS({ stage: 'running', session: s.session, startedAt: new Date() })}
                >
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
    case 'running':
      return (
        <StudyRunner
          items={[
            ...s.session.exam.items.map((item) => ({ kind: 'question' as const, item })),
            ...s.session.acronyms.map((card) => ({ kind: 'acronym' as const, card })),
          ]}
          feedback="instant"
          timeLimitMs={timed ? minutes * 60_000 : undefined}
          startedAt={s.startedAt}
          onFinish={(o) => void finish(s.session, s.startedAt, o)}
        />
      );
    case 'results':
      return (
        <ResultsScreen meta={meta} exam={s.exam} result={s.result} report={s.report} saveError={s.saveError} onHome={onExit} mode="cram">
          {s.acronyms.total > 0 && <p>{`Acronyms: ${s.acronyms.known} of ${s.acronyms.total} known`}</p>}
        </ResultsScreen>
      );
  }
}
