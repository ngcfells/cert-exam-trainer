import { useCallback, useEffect, useRef, useState } from 'react';
import type { AssembledExam } from '../../exam/assemble';
import { isComplete, type Responses } from '../../exam/scoring';
import { QuestionView, useCountdown, useFocusHeading } from '../kit';
import { ReviewGrid } from './ReviewGrid';
import { LEAVE_MOCK, useLeaveGuard } from '../nav';
import { useLeaveDetect } from './useLeaveDetect';
import { TopBar } from './TopBar';
import { usePanels } from '../panels/PanelProvider';
import { RunToolsProvider, ToolButtons, ToolPanels } from '../tools/RunTools';
import './exam.css';

export interface SubmitPayload {
  responses: Responses;
  flagged: string[];
  autoSubmitted: boolean;
  /** Set when the exam ended because the user left the app. */
  endedBy?: 'left';
  finishedAt: Date;
}

export function ExamRunner({
  exam,
  timeLimitMs,
  startedAt,
  now = Date.now,
  onSubmit,
  onProgress,
}: {
  exam: AssembledExam;
  timeLimitMs: number;
  startedAt: Date;
  now?: () => number;
  onSubmit: (p: SubmitPayload) => void;
  /** Called after each answer or flag change, so the attempt can be saved as it goes. */
  onProgress?: (p: { responses: Responses; flagged: string[] }) => void;
}) {
  const deadline = startedAt.getTime() + timeLimitMs;
  const [index, setIndex] = useState(0);
  const [view, setView] = useState<'question' | 'review'>('question');
  const [responses, setResponses] = useState<Responses>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const submitted = useRef(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const state = useRef({ responses, flagged });
  state.current = { responses, flagged };
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  // Kept in a ref so a new callback from the parent doesn't restart the timer.
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;
  const changed = useRef(false);
  useEffect(() => {
    // Skip the first render: nothing has changed yet.
    if (!changed.current) {
      changed.current = true;
      return;
    }
    if (!submitted.current) onProgressRef.current?.({ responses, flagged: [...flagged] });
  }, [responses, flagged]);

  const { close: closePanel, setMockDeadline } = usePanels();
  // Panels show the time left while this mock runs; leaving the screen clears it.
  useEffect(() => {
    setMockDeadline(deadline);
    return () => setMockDeadline(null);
  }, [deadline, setMockDeadline]);

  const submit = useCallback(
    (reason: 'submit' | 'timeout' | 'left') => {
      if (submitted.current) return;
      submitted.current = true;
      setIsSubmitted(true);
      closePanel({ restoreFocus: false });
      setMockDeadline(null);
      dialogRef.current?.close();
      const { responses: r, flagged: f } = state.current;
      onSubmitRef.current({
        responses: r,
        flagged: [...f],
        autoSubmitted: reason === 'timeout',
        ...(reason === 'left' ? { endedBy: 'left' as const } : {}),
        finishedAt: new Date(now()),
      });
    },
    [now, closePanel, setMockDeadline],
  );

  // Leaving the app ends and scores the mock. Back asks first; OK scores it here and the results show.
  const leave = useCallback(() => submit('left'), [submit]);
  useLeaveDetect(!isSubmitted, leave);
  useLeaveGuard(!isSubmitted, LEAVE_MOCK, leave);

  /** True (and submits) once the deadline has passed, even between timer ticks. */
  function expired(): boolean {
    if (deadline - now() > 0) return false;
    submit('timeout');
    return true;
  }

  const { remaining } = useCountdown(deadline, now, () => submit('timeout'));
  const headingRef = useFocusHeading([index, view]);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (confirming && !d.open) {
      closePanel({ restoreFocus: false });
      d.showModal();
      cancelRef.current?.focus();
    }
    if (!confirming && d.open) d.close();
  }, [confirming, closePanel]);

  const item = exam.items[index];
  const total = exam.items.length;
  const byId = new Map(exam.items.map((i) => [i.question.id, i.question]));
  // A PBQ counts as answered only once every part is filled.
  const answered = (id: string) => isComplete(byId.get(id)!, responses[id]);

  // Both write the ref at once, so a leave in the same task (before React re-renders) still scores them.
  function toggleFlag() {
    const next = new Set(state.current.flagged);
    if (next.has(item.question.id)) next.delete(item.question.id);
    else next.add(item.question.id);
    state.current = { ...state.current, flagged: next };
    setFlagged(next);
  }
  function answer(id: string, v: Responses[string]) {
    if (expired()) return;
    const next = { ...state.current.responses, [id]: v };
    state.current = { ...state.current, responses: next };
    setResponses(next);
  }

  return (
    <RunToolsProvider>
    <div className="exam">
      <TopBar
        index={index}
        total={total}
        remainingMs={remaining}
        flagged={flagged.has(item.question.id)}
        onToggleFlag={toggleFlag}
        tools={<ToolButtons disabled={isSubmitted} />}
      />
      {view === 'question' ? (
        <>
          <section className="exam-body" aria-labelledby="exam-q-heading">
            <h2 id="exam-q-heading" ref={headingRef} tabIndex={-1}>{`Question ${index + 1}`}</h2>
            <QuestionView item={item} response={responses[item.question.id]} onChange={(v) => answer(item.question.id, v)} />

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
            <p>You can&apos;t change your answers after you submit.</p>
            <button type="button" onClick={() => submit('submit')}>
              Submit
            </button>
            <button type="button" ref={cancelRef} onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </>
        )}
      </dialog>
      <ToolPanels />
    </div>
    </RunToolsProvider>
  );
}
