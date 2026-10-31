import { useCallback, useRef, useState } from 'react';
import type { ExamItem } from '../../exam/assemble';
import { hasAnswer, itemFraction, type ItemResponse, type Responses } from '../../exam/scoring';
import type { AcronymCard } from '../../study/session';
import { ItemReview } from '../exam/ItemReview';
import { AcronymFlip, knownStatus, QuestionView, RunnerFrame, useCountdown, useFocusLater } from '../kit';
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
const verdict = (f: number) => (f >= 1 ? 'Correct' : f > 0 ? 'Partly correct' : 'Incorrect');

export function StudyRunner({
  items,
  feedback,
  timeLimitMs,
  startedAt,
  now = Date.now,
  onFinish,
}: {
  items: StudyItem[];
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
  const [done, setDone] = useState(false);
  const finished = useRef(false);
  const furthest = useRef(0);
  furthest.current = Math.max(furthest.current, index);
  const state = useRef({ responses, checked, grades });
  state.current = { responses, checked, grades };
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;
  const [statusRef, focusStatus] = useFocusLater<HTMLParagraphElement>();

  const finish = useCallback(
    (timedOut: boolean) => {
      if (finished.current) return;
      finished.current = true;
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
    [feedback, now, items],
  );
  const deadline = timeLimitMs === undefined ? undefined : startedAt.getTime() + timeLimitMs;
  const { remaining, announcement } = useCountdown(deadline, now, () => finish(true), true);

  const current = items[index];
  const key = keyOf(current);
  const isChecked = checked.includes(key);
  const status =
    current.kind === 'question'
      ? isChecked ? verdict(itemFraction(current.item.question, responses[key])) : ''
      : knownStatus(grades[current.card.term]);

  return (
    <RunnerFrame
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
      onFinish={() => finish(false)}
    >
      {current.kind === 'question' ? (
        <>
          <fieldset className="study-lock" disabled={isChecked}>
            {/* A checked item is locked; drag-and-drop is not covered by the disabled fieldset. */}
            <QuestionView item={current.item} response={responses[key]} onChange={(v: ItemResponse) => !isChecked && setResponses((r) => ({ ...r, [key]: v }))} />
          </fieldset>
          {feedback === 'instant' && !isChecked && (
            <button type="button" className="primary" disabled={!hasAnswer(current.item.question, responses[key])} onClick={() => { setChecked((c) => [...c, key]); focusStatus(); }}>
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
      <p role="status" className="study-status" ref={statusRef} tabIndex={-1}>
        {status}
      </p>
      {current.kind === 'question' && isChecked && <ItemReview q={current.item.question} response={responses[key]} showStem={false} />}
    </RunnerFrame>
  );
}
