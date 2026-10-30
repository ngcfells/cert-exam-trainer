import type { ExamMeta } from '../../domain/types';
import { questions } from '../plural';

export function ExamSetup({
  meta,
  availableCount,
  plannedCount,
  onStart,
  onCancel,
}: {
  meta: ExamMeta;
  availableCount: number;
  plannedCount: number;
  onStart: () => void;
  onCancel: () => void;
}) {
  return (
    <section aria-labelledby="setup-h">
      <h2 id="setup-h">{`Mock exam: ${meta.name} (${meta.code})`}</h2>
      <ul>
        <li>{questions(plannedCount)}</li>
        <li>{`Time limit: ${meta.timeLimitMinutes} minutes`}</li>
        <li>{`Passing score: ${meta.passingScore} / 900`}</li>
      </ul>
      {availableCount > 0 && plannedCount < meta.maxQuestions && (
        <p>{`The bank has only ${questions(plannedCount)}, so this exam is shorter than the real one (${meta.maxQuestions}).`}</p>
      )}
      {availableCount === 0 && <p>No questions available for this exam yet.</p>}
      <p>The timer starts when you press Start exam. The exam submits automatically when time runs out.</p>
      <button type="button" className="primary" disabled={availableCount === 0} onClick={onStart}>
        Start exam
      </button>{' '}
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
    </section>
  );
}
