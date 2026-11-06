import { useCallback, useEffect, useRef, useState } from 'react';
import type { ExamItem } from '../../exam/assemble';
import { hasAnswer, isComplete, itemFraction, type ItemResponse, type Responses } from '../../exam/scoring';
import { plural } from '../plural';
import type { AcronymCard } from '../../study/session';
import { ItemReview } from '../exam/ItemReview';
import { AcronymFlip, knownStatus, QuestionView, RunnerFrame, useCountdown, useFocusLater } from '../kit';
import { useLeaveGuard } from '../nav';
import { AnswerMark, levelOf } from '../marks/AnswerMark';
import { playMark } from '../marks/sound';
import type { ExamMeta } from '../../domain/types';
import type { Tip } from '../../tips/types';
import { nextTip, reachQuestion } from '../tips/prefs';
import { tipAnnouncement, TipBox } from '../tips/TipBox';
import { usePanels } from '../panels/PanelProvider';
import { RunToolsProvider, ToolButtons, ToolPanels } from '../tools/RunTools';
import { ReportButton } from '../report/ReportButton';
import '../exam/exam.css';
import './study.css';

export type StudyItem = { kind: 'question'; item: ExamItem } | { kind: 'acronym'; card: AcronymCard };

export interface StudyOutcome {
  responses: Responses;
  /** Question ids whose answer was checked (instant) or given (end feedback). */
  checked: string[];
  /** Question ids the user reached, in session order; unreached ones are left out of the result. */
  seen: string[];
  acronymGrades: { term: string; knew: boolean }[];
  timedOut: boolean;
  finishedAt: Date;
}

const keyOf = (s: StudyItem) => (s.kind === 'question' ? s.item.question.id : `acronym:${s.card.term}`);

export function StudyRunner({
  items,
  feedback,
  timeLimitMs,
  startedAt,
  now = Date.now,
  onFinish,
  warnIncomplete = false,
  tipsFor,
  tools = false,
  mode,
}: {
  /** Sent with a report from this run. */
  mode?: 'practice' | 'cram' | 'lesson';
  /** Practice and cram: Calculator and Whiteboard in the header. Lesson checks leave it out. */
  tools?: boolean;
  /** Practice and cram: the exam whose study tips show every 10 to 20 new questions. Lesson checks leave it out. */
  tipsFor?: ExamMeta;
  items: StudyItem[];
  /** Practice and cram: Finish asks first when questions are unanswered or partly answered. */
  warnIncomplete?: boolean;
  feedback: 'instant' | 'end';
  timeLimitMs?: number;
  startedAt: Date;
  now?: () => number;
  onFinish: (o: StudyOutcome) => void;
}) {
  const [index, setIndex] = useState(0);
  const [responses, setResponses] = useState<Responses>({});
  const [checked, setChecked] = useState<string[]>([]);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [grades, setGrades] = useState<Record<string, boolean>>({});
  const [confirming, setConfirming] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);
  const { close: closePanel } = usePanels();
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (confirming && !d.open) {
      closePanel({ restoreFocus: false });
      d.showModal();
      keepRef.current?.focus();
    }
    if (!confirming && d.open) d.close();
  }, [confirming, closePanel]);
  const [done, setDone] = useState(false);
  const finished = useRef(false);
  // A timed run asks from the start; an untimed one once something is answered.
  useLeaveGuard(!done && (timeLimitMs !== undefined || Object.keys(responses).length > 0 || Object.keys(grades).length > 0));
  const furthest = useRef(0);
  furthest.current = Math.max(furthest.current, index);
  const state = useRef({ responses, checked, grades });
  state.current = { responses, checked, grades };
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;
  const [statusRef, focusStatus] = useFocusLater<HTMLDivElement>();

  // Study tips: count each new question reached (never on going back; a ref, so StrictMode's second effect run is a no-op).
  const [tip, setTip] = useState<Tip | null>(null);
  // Mounted for the whole run, so a screen reader reliably announces a tip's arrival.
  const [tipNote, setTipNote] = useState('');
  const tipOpen = useRef(false);
  tipOpen.current = tip !== null;
  const reached = useRef(-1);
  useEffect(() => {
    if (!tipsFor || index <= reached.current) return;
    reached.current = index;
    if (items[index].kind !== 'question') return;
    // A tip due while one is open leaves the open tip alone; the count has already started again.
    if (reachQuestion() && !tipOpen.current) {
      const t = nextTip(tipsFor.code);
      setTip(t);
      setTipNote(tipAnnouncement(t, tipsFor));
    }
  }, [index, items, tipsFor]);

  const finish = useCallback(
    (timedOut: boolean) => {
      if (finished.current) return;
      finished.current = true;
      closePanel({ restoreFocus: false });
      const { responses: r, checked: c, grades: g } = state.current;
      setDone(true);
      onFinishRef.current({
        responses: r,
        checked: feedback === 'instant' ? c : items.flatMap((s) => (s.kind === 'question' && hasAnswer(s.item.question, r[s.item.question.id]) ? [s.item.question.id] : [])),
        seen: items.slice(0, furthest.current + 1).flatMap((s) => (s.kind === 'question' ? [s.item.question.id] : [])),
        acronymGrades: Object.entries(g).map(([term, knew]) => ({ term, knew })),
        timedOut,
        finishedAt: new Date(now()),
      });
    },
    [feedback, now, items, closePanel],
  );
  const deadline = timeLimitMs === undefined ? undefined : startedAt.getTime() + timeLimitMs;
  const { remaining, announcement } = useCountdown(deadline, now, () => finish(true), true);

  const current = items[index];
  const key = keyOf(current);
  const unfinished = items.filter((s) => s.kind === 'question' && !isComplete(s.item.question, responses[s.item.question.id])).length;
  const isChecked = checked.includes(key);
  const level = current.kind === 'question' ? levelOf(itemFraction(current.item.question, responses[key])) : undefined;
  const status =
    current.kind === 'question'
      ? isChecked && level ? <AnswerMark key={key} level={level} /> : ''
      : knownStatus(grades[current.card.term]);

  return (
    <RunToolsProvider>
    <RunnerFrame
      tools={
        tools || current.kind === 'question' ? (
          <>
            {tools && <ToolButtons />}
            {current.kind === 'question' && (
              <ReportButton context={{ questionId: current.item.question.id, exam: current.item.question.exam, ...(mode ? { mode } : {}) }} />
            )}
          </>
        ) : undefined
      }
      replaced={done && <p role="status">Saving…</p>}
      label="Item"
      index={index}
      total={items.length}
      remaining={deadline === undefined ? undefined : remaining}
      announcer={
        <span className="visually-hidden" aria-live="polite" data-testid="study-announcer">
          {announcement}
        </span>
      }
      navLabel="Study navigation"
      onIndex={setIndex}
      onFinish={() => (warnIncomplete && unfinished > 0 ? setConfirming(true) : finish(false))}
    >
      {tipsFor && (
        <span className="visually-hidden" aria-live="polite" data-testid="tip-announcer">
          {tipNote}
        </span>
      )}
      {tip && tipsFor && (
        <TipBox
          key={tip.id}
          first={tip}
          meta={tipsFor}
          onClose={() => {
            setTip(null);
            setTipNote('');
            document.getElementById('runner-h')?.focus();
          }}
        />
      )}
      {current.kind === 'question' ? (
        <>
          <fieldset className="study-lock" disabled={isChecked}>
            {/* A checked item is locked; drag-and-drop is not covered by the disabled fieldset. */}
            <QuestionView item={current.item} response={responses[key]} onChange={(v: ItemResponse) => !isChecked && setResponses((r) => ({ ...r, [key]: v }))} />
          </fieldset>
          {feedback === 'instant' && !isChecked && (
            <button type="button" className="primary" disabled={!hasAnswer(current.item.question, responses[key])} onClick={() => { setChecked((c) => [...c, key]); if (level) playMark(level); focusStatus(); }}>
              Check answer
            </button>
          )}
        </>
      ) : (
        <AcronymFlip
          front={current.card.term}
          back={current.card.expansion}
          revealed={revealed.has(key)}
          onReveal={() => setRevealed((r) => new Set(r).add(key))}
          onGrade={(knew) => setGrades((g) => ({ ...g, [current.card.term]: knew }))}
        />
      )}
      <div role="status" className="study-status" ref={statusRef} tabIndex={-1}>
        {status}
      </div>
      {current.kind === 'question' && isChecked && <ItemReview q={current.item.question} response={responses[key]} showStem={false} />}
      <dialog ref={dialogRef} aria-labelledby="study-confirm-heading" onClose={() => setConfirming(false)}>
        {confirming && (
          <>
            <h2 id="study-confirm-heading">Finish now?</h2>
            <p>{`You have ${plural(unfinished, 'unanswered or partly answered question')}. Finish anyway?`}</p>
            <button type="button" onClick={() => { setConfirming(false); finish(false); }}>
              Finish
            </button>
            <button type="button" ref={keepRef} onClick={() => setConfirming(false)}>
              Keep going
            </button>
          </>
        )}
      </dialog>
      {tools && <ToolPanels />}
    </RunnerFrame>
    </RunToolsProvider>
  );
}
