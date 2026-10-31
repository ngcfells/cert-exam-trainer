import { useEffect, useRef, useState } from 'react';
import { loadAcronyms } from '../../acronyms/userList';
import { listExams } from '../../banks';
import type { ExamMeta } from '../../domain/types';
import { MAX_SCORE } from '../../exam/scoring';
import type { Repo } from '../../storage';
import { computeMastery, history, trendPoints, weakestObjectives, type HistoryEntry, type Mastery } from '../../study/mastery';
import { isDue, parseSrsRecords } from '../../study/srs';
import { LoadError } from './LoadError';
import { loadStudy } from './loadStudy';
import './study.css';

const DRILL_OBJECTIVES = 5;
const MODE_NAMES = { mock: 'Mock exam', practice: 'Practice', cram: 'Cram' } as const;

const pct = (f: number) => `${Math.round(f * 100)}%`;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function Bar({ fraction }: { fraction: number | null }) {
  if (fraction === null) return 'Not attempted';
  return (
    <>
      {pct(fraction)}
      <span className="mastery-bar" aria-hidden="true">
        <span style={{ width: pct(fraction) }} />
      </span>
    </>
  );
}

/** Mock scores over time; the History table is its text equivalent. */
function Trend({ points, passingScore }: { points: { score: number }[]; passingScore: number }) {
  const W = 400;
  const H = 160;
  const pad = 10;
  const x = (i: number) => pad + (i * (W - 2 * pad)) / (points.length - 1);
  const y = (s: number) => H - pad - (s / MAX_SCORE) * (H - 2 * pad);
  return (
    <svg className="trend" viewBox={`0 0 ${W} ${H}`} aria-hidden="true" data-testid="trend">
      <rect x={0} y={0} width={W} height={H} fill="none" />
      <line x1={pad} x2={W - pad} y1={y(passingScore)} y2={y(passingScore)} strokeDasharray="6 4" />
      <polyline fill="none" strokeWidth={2} points={points.map((p, i) => `${x(i)},${y(p.score)}`).join(' ')} />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.score)} r={3} />
      ))}
    </svg>
  );
}

interface Loaded {
  mastery: Mastery;
  entries: HistoryEntry[];
  due: { questions: number; acronyms: number };
}

export function ProgressScreen({
  repo,
  examCode,
  onExit,
  onDrill,
}: {
  repo: Repo;
  examCode: string;
  onExit: () => void;
  onDrill?: (objectiveIds: string[]) => void;
}) {
  const meta: ExamMeta = listExams().find((m) => m.code === examCode)!;
  const [data, setData] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let live = true;
    void Promise.all([loadStudy(repo, examCode), loadAcronyms(repo, examCode)]).then(
      ([{ pool, results, srs }, acronyms]) => {
        if (!live) return;
        const now = new Date();
        // Count only items that still exist, so the number matches what cram can offer.
        const questionIds = new Set(pool.map((q) => q.id));
        const terms = new Set(acronyms.map((a) => a.term));
        const due = parseSrsRecords(srs).filter(
          (r) => r.exam === examCode && isDue(r, now) && (r.kind === 'question' ? questionIds : terms).has(r.itemId),
        );
        setData({
          mastery: computeMastery(meta, results, pool),
          entries: history(results, examCode),
          due: { questions: due.filter((r) => r.kind === 'question').length, acronyms: due.filter((r) => r.kind === 'acronym').length },
        });
      },
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [repo, examCode, meta]);

  useEffect(() => headingRef.current?.focus(), []);

  if (failed) return <LoadError onExit={onExit} />;

  const attempted = !!data && data.mastery.objectives.some((o) => o.fraction !== null);
  const points = data ? trendPoints(data.entries) : [];

  return (
    <section className="study-setup progress" aria-labelledby="progress-h">
      <h2 id="progress-h" ref={headingRef} tabIndex={-1}>{`Progress: ${meta.name} (${meta.code})`}</h2>
      {!data ? (
        <p>Loading…</p>
      ) : (
        <>
          <table>
            <caption>Mastery by domain</caption>
            <thead>
              <tr>
                <th scope="col">Domain</th>
                <th scope="col">Score</th>
              </tr>
            </thead>
            <tbody>
              {data.mastery.domains.map((d) => (
                <tr key={d.domainId}>
                  <th scope="row">{`${d.domainId}. ${d.title}`}</th>
                  <td>
                    <Bar fraction={d.fraction} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {meta.domains.map((d) => (
            <table key={d.id}>
              <caption>{`${d.id}. ${d.title} objectives`}</caption>
              <thead>
                <tr>
                  <th scope="col">Objective</th>
                  <th scope="col">Score</th>
                  <th scope="col">Questions answered</th>
                </tr>
              </thead>
              <tbody>
                {data.mastery.objectives
                  .filter((o) => o.domainId === d.id)
                  .map((o) => (
                    <tr key={o.objectiveId}>
                      <th scope="row">{`${o.objectiveId} ${o.title}`}</th>
                      <td>
                        <Bar fraction={o.fraction} />
                      </td>
                      <td>{o.attempts}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          ))}
          <p>{`Review due now: ${plural(data.due.questions, 'question')}, ${plural(data.due.acronyms, 'acronym')}`}</p>
          <button type="button" disabled={!attempted || !onDrill} onClick={() => onDrill?.(weakestObjectives(data.mastery, DRILL_OBJECTIVES))}>
            Drill weakest objectives
          </button>

          <h3>History</h3>
          {data.entries.length === 0 ? (
            <p>No attempts yet.</p>
          ) : (
            <>
              {points.length >= 2 && (
                <figure>
                  <Trend points={points} passingScore={meta.passingScore} />
                  <figcaption>Mock exam scores over time (dashed line: passing score). The table below lists every attempt.</figcaption>
                </figure>
              )}
              <table>
                <caption>History</caption>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Mode</th>
                    <th scope="col">Score</th>
                    <th scope="col">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {data.entries.map((e) => (
                    <tr key={e.id}>
                      <td>{new Date(e.finishedAt).toLocaleString()}</td>
                      <td>{MODE_NAMES[e.mode]}</td>
                      <td>{e.mode === 'mock' ? `${e.score} / ${MAX_SCORE}` : pct(e.score / MAX_SCORE)}</td>
                      <td>{e.mode === 'mock' ? (e.passed ? 'PASS' : 'FAIL') : 'Study session'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </>
      )}
      <p>
        <button type="button" onClick={onExit}>
          Back to home
        </button>
      </p>
    </section>
  );
}
