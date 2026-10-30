import { useEffect, useRef, useState } from 'react';
import type { ExamMeta } from '../../domain/types';
import type { AssembledExam } from '../../exam/assemble';
import type { ExamResult, ResultMode } from '../../exam/result';
import { MAX_SCORE, type ScoreReport } from '../../exam/scoring';
import { ItemReview } from './ItemReview';

export function ResultsScreen({
  meta,
  exam,
  result,
  report,
  saveError,
  onHome,
  mode = 'mock',
  onDrill,
  children,
}: {
  meta: ExamMeta;
  exam: AssembledExam;
  result: ExamResult;
  report: ScoreReport;
  saveError: string | null;
  onHome: () => void;
  mode?: ResultMode;
  onDrill?: (objectiveIds: string[]) => void;
  /** Extra summary lines, shown under the score. */
  children?: React.ReactNode;
}) {
  const missed = exam.items.filter((_, i) => report.items[i].fraction < 1);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);
  // The alert region is mounted empty and filled after mount, so screen readers announce it.
  const [alertText, setAlertText] = useState('');
  useEffect(() => setAlertText(saveError ?? ''), [saveError]);
  const mock = mode === 'mock';

  return (
    <section className="exam results" aria-labelledby="results-h">
      <h2 id="results-h" ref={headingRef} tabIndex={-1}>
        {mock ? `Your score: ${report.score} / 900` : `Practice complete: ${Math.round((report.score / MAX_SCORE) * 100)}% correct`}
      </h2>
      {mock && (
        <>
          <p className={report.passed ? 'result-pass' : 'result-fail'}>
            <strong>{report.passed ? 'PASS' : 'FAIL'}</strong>
          </p>
          <p>{`Passing score: ${meta.passingScore}.${result.autoSubmitted ? ' Time ran out, so the exam was submitted automatically.' : ''}`}</p>
          <p>CompTIA reports a scaled score; this is an approximation.</p>
        </>
      )}
      {!mock && result.autoSubmitted && <p>Time ran out, so the session ended.</p>}
      {children}
      <p role="alert">{alertText}</p>

      <table>
        <caption>Score by domain</caption>
        <thead>
          <tr>
            <th scope="col">Domain</th>
            <th scope="col">Score</th>
          </tr>
        </thead>
        <tbody>
          {report.byDomain
            .filter((d) => d.possible > 0)
            .map((d) => (
              <tr key={d.domainId}>
                <th scope="row">{`${d.domainId}. ${d.title}`}</th>
                <td>{`${Math.round((d.earned / d.possible) * 100)}%`}</td>
              </tr>
            ))}
        </tbody>
      </table>

      <h3>What to study</h3>
      {report.weakestObjectives.length === 0 ? (
        <p>Nothing missed. Well done.</p>
      ) : (
        <>
          <ul>
            {report.weakestObjectives.map((o) => (
              <li key={o.objectiveId}>{`${o.objectiveId} ${o.title} (${Math.round(o.fraction * 100)}%)`}</li>
            ))}
          </ul>
          {onDrill && (
            <button type="button" onClick={() => onDrill(report.weakestObjectives.map((o) => o.objectiveId))}>
              Drill these
            </button>
          )}
        </>
      )}

      {missed.length > 0 && (
        <>
          <h3>Review</h3>
          <ol>
            {missed.map(({ question: q }) => (
              <li key={q.id}>
                <ItemReview q={q} response={result.responses[q.id]} />
              </li>
            ))}
          </ol>
        </>
      )}
      <button type="button" className="primary" onClick={onHome}>
        Back to home
      </button>
    </section>
  );
}
