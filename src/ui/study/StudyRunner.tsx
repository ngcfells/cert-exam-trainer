import { useCallback, useEffect, useRef, useState } from 'react';
import type { PartMap } from '../../domain/pbq';
import type { ExamItem } from '../../exam/assemble';
import { isAnswered, itemFraction, type ItemResponse, type Responses } from '../../exam/scoring';
import type { AcronymCard } from '../../study/session';
import { formatTime } from '../exam/formatTime';
import { ItemReview } from '../exam/ItemReview';
import { McqView } from '../exam/McqView';
import { PbqView } from '../exam/pbq/PbqView';
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

const asArray = (r: ItemResponse | undefined): string[] => (Array.isArray(r) ? r : []);
const asMap = (r: ItemResponse | undefined): PartMap => (r && !Array.isArray(r) ? r : {});
const keyOf = (s: StudyItem) => (s.kind === 'question' ? s.item.question.id : `acronym:${s.card.term}`);

function verdict(fraction: number): string {
  if (fraction >= 1) return 'Correct';
  return fraction > 0 ? 'Partly correct' : 'Incorrect';
}

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
  const deadline = timeLimitMs === undefined ? undefined : startedAt.getTime() + timeLimitMs;
  const [remaining, setRemaining] = useState(() => (deadline === undefined ? 0 : deadline - now()));
  const [announcement, setAnnouncement] = useState('');
  const [done, setDone] = useState(false);
  const [furthest, setFurthest] = useState(0);
  const finished = useRef(false);
  const announcedMinute = useRef(false);
  const state = useRef({ responses, checked, grades, furthest });
  state.current = { responses, checked, grades, furthest };
  const statusRef = useRef<HTMLParagraphElement>(null);
  const knewRef = useRef<HTMLButtonElement>(null);
  const [focusTarget, setFocusTarget] = useState<'status' | 'knew' | null>(null);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;
  const headingRef = useRef<HTMLHeadingElement>(null);

  const finish = useCallback(
    (timedOut: boolean) => {
      if (finished.current) return;
      finished.current = true;
      setDone(true);
      const { responses: r, checked: c, grades: g, furthest: f } = state.current;
      const answered = Object.keys(r).filter((id) => isAnswered(r[id]));
      onFinishRef.current({
        responses: r,
        checked: feedback === 'instant' ? c : answered,
        seen: items.slice(0, f + 1).flatMap((s) => (s.kind === 'question' ? [s.item.question.id] : [])),
        acronymGrades: Object.entries(g).map(([term, knew]) => ({ term, knew })),
        timedOut,
        finishedAt: new Date(now()),
      });
    },
    [feedback, now, items],
  );

  useEffect(() => {
    if (deadline === undefined) return;
    const id = setInterval(() => {
      const left = deadline - now();
      setRemaining(left);
      if (left <= 0) {
        setAnnouncement('Time is up');
        finish(true);
      } else if (left <= 60_000 && !announcedMinute.current) {
        announcedMinute.current = true;
        setAnnouncement('1 minute remaining');
      }
    }, 1000);
    return () => clearInterval(id);
  }, [deadline, now, finish]);

  useEffect(() => {
    headingRef.current?.focus();
    setFurthest((f) => Math.max(f, index));
  }, [index]);

  // Check answer and Show answer remove themselves, so focus moves to what replaced them.
  useEffect(() => {
    if (focusTarget === 'status') statusRef.current?.focus();
    if (focusTarget === 'knew') knewRef.current?.focus();
    if (focusTarget) setFocusTarget(null);
  }, [focusTarget]);

  const current = items[index];
  const key = keyOf(current);
  const last = index === items.length - 1;
  let status = '';
  if (current.kind === 'question' && checked.includes(key)) status = verdict(itemFraction(current.item.question, responses[key]));
  if (current.kind === 'acronym' && current.card.term in grades) {
    status = grades[current.card.term] ? 'Marked as known' : 'Marked as not known';
  }

  function setResponse(v: ItemResponse) {
    // A checked item is locked; drag-and-drop is not covered by the disabled fieldset.
    if (checked.includes(key)) return;
    setResponses((r) => ({ ...r, [key]: v }));
  }

  // First child in both views, so React keeps the same live-region node.
  const announcer = (
    <span className="visually-hidden" aria-live="polite" data-testid="study-announcer">
      {announcement}
    </span>
  );

  if (done) {
    return (
      <div className="exam study">
        {announcer}
        <p role="status">Saving…</p>
      </div>
    );
  }

  return (
    <div className="exam study">
      {announcer}
      <header className="exam-topbar">
        <span>{`Item ${index + 1} of ${items.length}`}</span>
        {deadline !== undefined && (
          <span className="timer">
            <span aria-label="Time left" role="timer">
              {formatTime(remaining)}
            </span>
          </span>
        )}
      </header>
      <section className="exam-body" aria-labelledby="study-heading">
        <h2 id="study-heading" ref={headingRef} tabIndex={-1}>{`Item ${index + 1} of ${items.length}`}</h2>
        {current.kind === 'question' ? (
          <>
            <fieldset className="study-lock" disabled={checked.includes(key)}>
              {current.item.question.type === 'mcq-single' || current.item.question.type === 'mcq-multi' ? (
                <McqView key={key} item={current.item} selected={asArray(responses[key])} onChange={setResponse} />
              ) : (
                <PbqView key={key} item={current.item} value={asMap(responses[key])} onChange={setResponse} />
              )}
            </fieldset>
            {feedback === 'instant' && !checked.includes(key) && (
              <button type="button" className="primary" disabled={!isAnswered(responses[key])} onClick={() => {
                  setChecked((c) => [...c, key]);
                  setFocusTarget('status');
                }}
              >
                Check answer
              </button>
            )}
          </>
        ) : (
          <div className="acronym-card">
            <p className="acronym-term">{current.card.term}</p>
            {revealed.has(key) ? (
              <>
                <p>{current.card.expansion}</p>
                <button type="button" ref={knewRef} onClick={() => setGrades((g) => ({ ...g, [current.card.term]: true }))}>
                  I knew it
                </button>{' '}
                <button type="button" onClick={() => setGrades((g) => ({ ...g, [current.card.term]: false }))}>
                  I didn&apos;t know it
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setRevealed((r) => new Set(r).add(key));
                  setFocusTarget('knew');
                }}
              >
                Show answer
              </button>
            )}
          </div>
        )}
        <p role="status" className="study-status" ref={statusRef} tabIndex={-1}>
          {status}
        </p>
        {current.kind === 'question' && checked.includes(key) && <ItemReview q={current.item.question} response={responses[key]} showStem={false} />}
      </section>
      <nav className="exam-nav" aria-label="Study navigation">
        <button type="button" disabled={index === 0} onClick={() => setIndex(index - 1)}>
          Previous
        </button>
        {last ? (
          <button type="button" className="primary" onClick={() => finish(false)}>
            Finish
          </button>
        ) : (
          <>
            <button type="button" onClick={() => setIndex(index + 1)}>
              Next
            </button>
            <button type="button" onClick={() => finish(false)}>
              Finish now
            </button>
          </>
        )}
      </nav>
    </div>
  );
}
