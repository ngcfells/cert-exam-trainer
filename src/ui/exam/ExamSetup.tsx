import type { ExamMeta } from '../../domain/types';
import { useFocusHeading } from '../kit';
import { questions } from '../plural';

export function ExamSetup({
  meta,
  plannedCount,
  onStart,
}: {
  meta: ExamMeta;
  plannedCount: number;
  onStart: () => void;
}) {
  const headingRef = useFocusHeading();
  return (
    <section aria-labelledby="setup-h">
      <h2 id="setup-h" ref={headingRef} tabIndex={-1}>{`Mock exam: ${meta.name} (${meta.code})`}</h2>
      <ul>
        <li>{questions(plannedCount)}</li>
        <li>{`Time limit: ${meta.timeLimitMinutes} minutes`}</li>
        <li>{`Passing score: ${meta.passingScore} / 900`}</li>
      </ul>
      {plannedCount > 0 && plannedCount < meta.maxQuestions && (
        <p>{`The bank has only ${questions(plannedCount)}, so this exam is shorter than the real one (${meta.maxQuestions}).`}</p>
      )}
      {plannedCount === 0 && <p>No questions available for this exam yet.</p>}
      <p>The timer starts when you press Start exam. The exam submits automatically when time runs out.</p>
      <button type="button" className="primary" disabled={plannedCount === 0} onClick={onStart}>
        Start exam
      </button>
    </section>
  );
}
