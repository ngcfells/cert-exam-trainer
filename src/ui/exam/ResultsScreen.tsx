import { useEffect, useRef } from 'react';
import type { ExamMeta, McqAnswer, McqPayload, Question } from '../../domain/types';
import type { AssembledExam } from '../../exam/assemble';
import type { ExamResult } from '../../exam/result';
import type { ScoreReport } from '../../exam/scoring';

function optionTexts(q: Question, ids: string[]): string {
  const opts = (q.payload as McqPayload).options;
  return ids.map((id) => opts.find((o) => o.id === id)?.text ?? id).join('; ');
}

export function ResultsScreen({
  meta,
  exam,
  result,
  report,
  saveError,
  onHome,
}: {
  meta: ExamMeta;
  exam: AssembledExam;
  result: ExamResult;
  report: ScoreReport;
  saveError: string | null;
  onHome: () => void;
}) {
  const missed = exam.items.filter((_, i) => report.items[i].fraction < 1);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);

  return (
    <section className="exam results" aria-labelledby="results-h">
      <h2 id="results-h" ref={headingRef} tabIndex={-1}>{`Your score: ${report.score} / 900`}</h2>
      <p className={report.passed ? 'result-pass' : 'result-fail'}>
        <strong>{report.passed ? 'PASS' : 'FAIL'}</strong>
      </p>
      <p>{`Passing score: ${meta.passingScore}.${result.autoSubmitted ? ' Time ran out, so the exam was submitted automatically.' : ''}`}</p>
      <p>CompTIA reports a scaled score; this is an approximation.</p>
      {saveError && <p role="alert">{saveError}</p>}

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
        <ul>
          {report.weakestObjectives.map((o) => (
            <li key={o.objectiveId}>{`${o.objectiveId} ${o.title} (${Math.round(o.fraction * 100)}%)`}</li>
          ))}
        </ul>
      )}
      <button type="button" disabled>
        Drill these (available in a later update)
      </button>

      {missed.length > 0 && (
        <>
          <h3>Review</h3>
          <ol>
            {missed.map(({ question: q }) => {
              const picked = result.responses[q.id] ?? [];
              const mcqType = q.type === 'mcq-single' || q.type === 'mcq-multi';
              return (
                <li key={q.id}>
                  <p>
                    <strong>{q.stem}</strong>
                  </p>
                  {mcqType && (
                    <dl>
                      <dt>Your answer</dt>
                      <dd>{picked.length ? optionTexts(q, picked) : 'Not answered'}</dd>
                      <dt>Correct answer</dt>
                      <dd>{optionTexts(q, (q.answer as McqAnswer).correct)}</dd>
                    </dl>
                  )}
                  <p>{q.explanation}</p>
                </li>
              );
            })}
          </ol>
        </>
      )}
      <button type="button" className="primary" onClick={onHome}>
        Back to home
      </button>
    </section>
  );
}
