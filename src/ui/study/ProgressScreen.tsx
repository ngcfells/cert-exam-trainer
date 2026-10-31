import { loadAcronyms } from '../../acronyms/userList';
import { MAX_SCORE } from '../../exam/scoring';
import type { Repo } from '../../storage';
import { computeMastery, history, trendPoints, weakestObjectives } from '../../study/mastery';
import { isDue, parseSrsRecords } from '../../study/srs';
import { Loading, metaFor, pct, plural, Table, useFocusHeading, useLoad } from '../kit';
import { LoadError } from './LoadError';
import { loadStudy } from './loadStudy';
import './study.css';

const DRILL_OBJECTIVES = 5;
const MODE_NAMES = { mock: 'Mock exam', practice: 'Practice', cram: 'Cram', lesson: 'Lesson check' } as const;

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
  const [W, H, pad] = [400, 160, 10];
  const x = (i: number) => pad + (i * (W - 2 * pad)) / (points.length - 1);
  const y = (s: number) => H - pad - (s / MAX_SCORE) * (H - 2 * pad);
  return (
    <svg className="trend" viewBox={`0 0 ${W} ${H}`} aria-hidden="true" data-testid="trend">
      <rect x={0} y={0} width={W} height={H} fill="none" />
      <line x1={pad} x2={W - pad} y1={y(passingScore)} y2={y(passingScore)} strokeDasharray="6 4" />
      <polyline fill="none" strokeWidth={2} points={points.map((p, i) => `${x(i)},${y(p.score)}`).join(' ')} />
      {points.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.score)} r={3} />)}
    </svg>
  );
}

export function ProgressScreen({ repo, examCode, onExit, onDrill }: { repo: Repo; examCode: string; onExit: () => void; onDrill?: (objectiveIds: string[]) => void }) {
  const meta = metaFor(examCode);
  const headingRef = useFocusHeading();
  const [data] = useLoad(async () => {
    const [{ pool, results, srs }, acronyms] = await Promise.all([loadStudy(repo, examCode), loadAcronyms(repo, examCode)]);
    const now = new Date();
    // Count only items that still exist, so the number matches what cram can offer.
    const ids = { question: new Set(pool.map((q) => q.id)), acronym: new Set(acronyms.map((a) => a.term)) };
    const due = parseSrsRecords(srs).filter((r) => r.exam === examCode && isDue(r, now) && ids[r.kind].has(r.itemId));
    const count = (k: 'question' | 'acronym') => due.filter((r) => r.kind === k).length;
    return { mastery: computeMastery(meta, results, pool), entries: history(results, examCode), due: { questions: count('question'), acronyms: count('acronym') } };
  }, [repo, examCode]);

  if (data === null) return <LoadError onExit={onExit} />;
  const points = data ? trendPoints(data.entries) : [];

  return (
    <section className="study-setup progress" aria-labelledby="progress-h">
      <h2 id="progress-h" ref={headingRef} tabIndex={-1}>{`Progress: ${meta.name} (${meta.code})`}</h2>
      {!data ? (
        <Loading />
      ) : (
        <>
          <Table caption="Mastery by domain" head={['Domain', 'Score']} rows={data.mastery.domains.map((d) => [d.domainId, `${d.domainId}. ${d.title}`, <Bar fraction={d.fraction} />])} />
          {meta.domains.map((d) => (
            <Table
              key={d.id}
              caption={`${d.id}. ${d.title} objectives`}
              head={['Objective', 'Score', 'Questions answered']}
              rows={data.mastery.objectives.filter((o) => o.domainId === d.id).map((o) => [o.objectiveId, `${o.objectiveId} ${o.title}`, <Bar fraction={o.fraction} />, o.attempts])}
            />
          ))}
          <p>{`Review due now: ${plural(data.due.questions, 'question')}, ${plural(data.due.acronyms, 'acronym')}`}</p>
          <button
            type="button"
            disabled={!data.mastery.objectives.some((o) => o.fraction !== null) || !onDrill}
            onClick={() => onDrill?.(weakestObjectives(data.mastery, DRILL_OBJECTIVES))}
          >
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
              <Table
                caption="History"
                head={['Date', 'Mode', 'Score', 'Result']}
                rowHeader={false}
                rows={data.entries.map((e) => {
                  const mock = e.mode === 'mock';
                  return [e.id, new Date(e.finishedAt).toLocaleString(), MODE_NAMES[e.mode], mock ? `${e.score} / ${MAX_SCORE}` : pct(e.score / MAX_SCORE), mock ? (e.passed ? 'PASS' : 'FAIL') : 'Study session'];
                })}
              />
            </>
          )}
        </>
      )}
      <p>
        <button type="button" onClick={onExit}>
          Back to exam
        </button>
      </p>
    </section>
  );
}
