import { useEffect, useState } from 'react';
import { pct, Table, useFocusHeading } from '../kit';
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
  mode = 'mock',
  onDrill,
  lessonFraction,
  children,
}: {
  /** Lesson checks: the score over every check item, shown in the heading. */
  lessonFraction?: number;
  meta: ExamMeta;
  exam: AssembledExam;
  result: ExamResult;
  report: ScoreReport;
  saveError: string | null;
  mode?: ResultMode;
  onDrill?: (objectiveIds: string[]) => void;
  /** Extra summary lines, shown under the score. */
  children?: React.ReactNode;
}) {
  const missed = exam.items.filter((_, i) => report.items[i].fraction < 1);
  const headingRef = useFocusHeading();
  // The alert region is mounted empty and filled after mount, so screen readers announce it.
  const [alertText, setAlertText] = useState('');
  useEffect(() => setAlertText(saveError ?? ''), [saveError]);
  const mock = mode === 'mock';

  return (
    <section className="exam results" aria-labelledby="results-h">
      <h2 id="results-h" ref={headingRef} tabIndex={-1}>
        {mock
          ? `Your score: ${report.score} / 900`
          : mode === 'lesson'
            ? `Lesson check complete: ${pct(lessonFraction ?? report.score / MAX_SCORE)}`
            : `${mode === 'cram' ? 'Cram' : 'Practice'} complete${exam.items.length ? `: ${pct(report.score / MAX_SCORE)} correct` : ''}`}
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

      <Table
        caption="Score by domain"
        head={['Domain', 'Score']}
        rows={report.byDomain.filter((d) => d.possible > 0).map((d) => [d.domainId, `${d.domainId}. ${d.title}`, pct(d.earned / d.possible)])}
      />

      <h3>What to study</h3>
      {report.weakestObjectives.length === 0 ? (
        <p>Nothing missed. Well done.</p>
      ) : (
        <>
          <ul>
            {report.weakestObjectives.map((o) => (
              <li key={o.objectiveId}>{`${o.objectiveId} ${o.title} (${pct(o.fraction)})`}</li>
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
    </section>
  );
}
