import { useCallback, useEffect, useRef, useState } from 'react';
import type { AssembledExam } from '../../exam/assemble';
import { isComplete, type Responses } from '../../exam/scoring';
import { QuestionView, useCountdown, useFocusHeading } from '../kit';
import { ReviewGrid } from './ReviewGrid';
import { useLeaveGuard } from '../nav';
import { TopBar } from './TopBar';
import './exam.css';

export interface SubmitPayload {
  responses: Responses;
  flagged: string[];
  autoSubmitted: boolean;
  finishedAt: Date;
}

export function ExamRunner({
  exam,
  timeLimitMs,
  startedAt,
  now = Date.now,
  onSubmit,
}: {
  exam: AssembledExam;
  timeLimitMs: number;
  startedAt: Date;
  now?: () => number;
  onSubmit: (p: SubmitPayload) => void;
}) {
  const deadline = startedAt.getTime() + timeLimitMs;
  const [index, setIndex] = useState(0);
  const [view, setView] = useState<'question' | 'review'>('question');
  const [responses, setResponses] = useState<Responses>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const submitted = useRef(false);
  useLeaveGuard(Object.keys(responses).length > 0);
  const state = useRef({ responses, flagged });
  state.current = { responses, flagged };
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  // Kept in a ref so a new callback from the parent doesn't restart the timer.
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  const submit = useCallback(
    (autoSubmitted: boolean) => {
      if (submitted.current) return;
      submitted.current = true;
      dialogRef.current?.close();
      const { responses: r, flagged: f } = state.current;
      onSubmitRef.current({ responses: r, flagged: [...f], autoSubmitted, finishedAt: new Date(now()) });
    },
    [now],
  );

  /** True (and submits) once the deadline has passed, even between timer ticks. */
  function expired(): boolean {
    if (deadline - now() > 0) return false;
    submit(true);
    return true;
  }

  const { remaining } = useCountdown(deadline, now, () => submit(true));
  const headingRef = useFocusHeading([index, view]);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (confirming && !d.open) {
      d.showModal();
      cancelRef.current?.focus();
    }
    if (!confirming && d.open) d.close();
  }, [confirming]);

  const item = exam.items[index];
  const total = exam.items.length;
  const byId = new Map(exam.items.map((i) => [i.question.id, i.question]));
  // A PBQ counts as answered only once every part is filled.
  const answered = (id: string) => isComplete(byId.get(id)!, responses[id]);
  const unanswered = exam.items.filter((i) => !answered(i.question.id)).length;

  function toggleFlag() {
    setFlagged((f) => {
      const next = new Set(f);
      if (next.has(item.question.id)) next.delete(item.question.id);
      else next.add(item.question.id);
      return next;
    });
  }

  return (
    <div className="exam">
      <TopBar
        index={index}
        total={total}
        remainingMs={remaining}
        flagged={flagged.has(item.question.id)}
        onToggleFlag={toggleFlag}
      />
      {view === 'question' ? (
        <>
          <section className="exam-body" aria-labelledby="exam-q-heading">
            <h2 id="exam-q-heading" ref={headingRef} tabIndex={-1}>{`Question ${index + 1}`}</h2>
            <QuestionView item={item} response={responses[item.question.id]} onChange={(v) => !expired() && setResponses((r) => ({ ...r, [item.question.id]: v }))} />

          </section>
          <nav className="exam-nav" aria-label="Exam navigation">
            <button type="button" disabled={index === 0} onClick={() => setIndex(index - 1)}>
              Previous
            </button>
            {index < total - 1 ? (
              <button type="button" onClick={() => setIndex(index + 1)}>
                Next
              </button>
            ) : (
              <button type="button" onClick={() => setView('review')}>
                Review
              </button>
            )}
          </nav>
        </>
      ) : (
        <section className="exam-body" aria-labelledby="exam-review-heading">
          <h2 id="exam-review-heading" ref={headingRef} tabIndex={-1}>
            Review your answers
          </h2>
          <ReviewGrid
            items={exam.items.map((it, i) => ({ index: i, answered: answered(it.question.id), flagged: flagged.has(it.question.id) }))}
            onJump={(i) => {
              setIndex(i);
              setView('question');
            }}
          />
          <div className="exam-nav">
            <button type="button" onClick={() => setView('question')}>
              Return to exam
            </button>
            <button type="button" className="primary" onClick={() => setConfirming(true)}>
              Submit exam
            </button>
          </div>
        </section>
      )}
      <dialog ref={dialogRef} aria-labelledby="exam-confirm-heading" onClose={() => setConfirming(false)}>
        {confirming && (
          <>
            <h2 id="exam-confirm-heading">Submit exam?</h2>
            <p>
              {unanswered === 0
                ? 'All questions answered.'
                : `You have ${unanswered} unanswered ${unanswered === 1 ? 'question' : 'questions'}.`}
            </p>
            <button type="button" onClick={() => submit(false)}>
              Submit
            </button>
            <button type="button" ref={cancelRef} onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </>
        )}
      </dialog>
    </div>
  );
}
