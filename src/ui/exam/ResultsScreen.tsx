import { useEffect, useState } from 'react';
import { pct, Table, useFocusHeading } from '../kit';
import type { ExamMeta } from '../../domain/types';
import type { AssembledExam } from '../../exam/assemble';
import type { ExamResult, ResultMode } from '../../exam/result';
import { hasAnswer, MAX_SCORE, type ScoreReport } from '../../exam/scoring';
import { ItemReview } from './ItemReview';
import { AnswerMark, levelOf } from '../marks/AnswerMark';
import { ReportButton } from '../report/ReportButton';
import { CommandHelpButton } from '../primer/CommandHelpButton';
import { plural } from '../plural';

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
  const missed = exam.items.flatMap((item, i) => (report.items[i].fraction < 1 ? [{ item, n: i + 1, fraction: report.items[i].fraction }] : []));
  const reportOn = (questionId: string, n: number) => (
    <ReportButton context={{ questionId, exam: meta.code, mode: 'results' }} ariaLabel={`Report a problem with question ${n}`} />
  );
  const headingRef = useFocusHeading();
  // The alert region is mounted empty and filled after mount, so screen readers announce it.
  const [alertText, setAlertText] = useState('');
  useEffect(() => setAlertText(saveError ?? ''), [saveError]);
  const mock = mode === 'mock';
  const flagged = mock ? exam.items.flatMap((item, i) => (result.flagged.includes(item.question.id) ? [{ id: item.question.id, n: i + 1 }] : [])) : [];

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
          {result.endedBy === 'left' && <p>Ended because you left the exam.</p>}
          <p>CompTIA reports a scaled score; this is an approximation.</p>
        </>
      )}
      {!mock && result.autoSubmitted && <p>Time ran out, so the session ended.</p>}
      {flagged.length > 0 && (
        <section className="results-flagged" aria-labelledby="results-flagged-h">
          <h3 id="results-flagged-h">Questions you flagged</h3>
          <p>{`You flagged ${plural(flagged.length, 'question')} for your review. Is anything wrong with ${flagged.length === 1 ? 'it' : 'them'}?`}</p>
          <ul>
            {flagged.map(({ id, n }) => (
              <li key={id}>
                {`Question ${n}`} {reportOn(id, n)}
              </li>
            ))}
          </ul>
        </section>
      )}
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
            {missed.map(({ item: { question: q }, n, fraction }) => (
              <li key={q.id}>
                <AnswerMark level={levelOf(fraction)} unanswered={!hasAnswer(q, result.responses[q.id])} />
                <ItemReview q={q} response={result.responses[q.id]} />
                <CommandHelpButton question={q} />
                {reportOn(q.id, n)}
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
