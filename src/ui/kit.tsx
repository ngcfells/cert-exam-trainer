import { useCallback, useEffect, useRef, useState, type DependencyList, type ReactNode } from 'react';
import { listExams } from '../banks';
import { isPbqTemplate, type PartMap } from '../domain/pbq';
import type { ExamMeta } from '../domain/types';
import type { ExamItem } from '../exam/assemble';
import type { ItemResponse } from '../exam/scoring';
import { formatTime } from './exam/formatTime';
import { McqView } from './exam/McqView';
import { PbqView } from './exam/pbq/PbqView';

export const metaFor = (code: string): ExamMeta => listExams().find((m) => m.code === code)!;
export { plural } from './plural';
export const pct = (f: number) => `${Math.round(f * 100)}%`;
/** A whole, non-negative number from a number input (blank = 0). */
export const toCount = (v: string, max = Infinity) => Math.min(max, Math.max(0, Math.floor(Number(v) || 0)));

export { Table } from './Table';

/** An MCQ or a PBQ, whichever the item is. */
export function QuestionView({ item, response, onChange }: { item: ExamItem; response: ItemResponse | undefined; onChange: (v: ItemResponse) => void }) {
  const key = item.question.id;
  return isPbqTemplate(item.question.type) ? (
    <PbqView key={key} item={item} value={response && !Array.isArray(response) ? response : ({} as PartMap)} onChange={onChange} />
  ) : (
    <McqView key={key} item={item} selected={Array.isArray(response) ? response : []} onChange={onChange} />
  );
}

/** Loads data once (and again on `reload`, optionally showing loading); `undefined` while loading, `null` on failure. */
export function useLoad<T>(load: () => Promise<T>, deps: DependencyList): [T | null | undefined, (showLoading?: boolean) => Promise<void>] {
  const [data, setData] = useState<T | null | undefined>(undefined);
  const live = useRef(true);
  const run = useCallback(
    (showLoading = false) => {
      if (showLoading) setData(undefined);
      return load().then((d) => void (live.current && setData(d)), () => void (live.current && setData(null)));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
  );
  useEffect(() => {
    live.current = true;
    void run();
    return () => {
      live.current = false;
    };
  }, [run]);
  return [data, run];
}

/** Ticks once a second towards `deadline`, calling `onExpire` at zero and announcing the last minute when asked. */
export function useCountdown(deadline: number | undefined, now: () => number, onExpire: () => void, announceLastMinute = false) {
  const [remaining, setRemaining] = useState(() => (deadline === undefined ? 0 : deadline - now()));
  const [announcement, setAnnouncement] = useState('');
  const announced = useRef(false);
  const expire = useRef(onExpire);
  expire.current = onExpire;
  useEffect(() => {
    if (deadline === undefined) return;
    const id = setInterval(() => {
      const left = deadline - now();
      setRemaining(left);
      if (left <= 0) {
        if (announceLastMinute) setAnnouncement('Time is up');
        expire.current();
      } else if (announceLastMinute && left <= 60_000 && !announced.current) {
        announced.current = true;
        setAnnouncement('1 minute remaining');
      }
    }, 1000);
    return () => clearInterval(id);
  }, [deadline, now, announceLastMinute]);
  return { remaining, announcement };
}

/** A ref plus a request to focus it after the next render (for buttons that replace themselves). */
export function useFocusLater<T extends HTMLElement>(): [React.RefObject<T>, () => void] {
  const ref = useRef<T>(null);
  const [want, setWant] = useState(false);
  useEffect(() => {
    if (want) ref.current?.focus();
    setWant(false);
  }, [want]);
  return [ref, () => setWant(true)];
}

/** Focuses a heading on mount and whenever `deps` change. */
export function useFocusHeading(deps: DependencyList = []) {
  const ref = useRef<HTMLHeadingElement>(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => ref.current?.focus(), deps);
  return ref;
}

export function Loading() {
  return <p>Loading…</p>;
}

/** Shared frame for study, quiz and flashcard runners: top bar with optional timer, focused heading, and Previous / Next / Finish. */
export function RunnerFrame({
  label,
  index,
  total,
  remaining,
  announcer,
  navLabel,
  onIndex,
  onFinish,
  previous = true,
  nextPrimary = false,
  replaced,
  children,
}: {
  /** Shown instead of the frame (e.g. "Saving…"), keeping the same announcer node. */
  replaced?: ReactNode;
  label: 'Item' | 'Card';
  index: number;
  total: number;
  /** Shown as a timer when set. */
  remaining?: number;
  announcer?: ReactNode;
  navLabel: string;
  onIndex: (i: number) => void;
  onFinish: () => void;
  previous?: boolean;
  nextPrimary?: boolean;
  children: ReactNode;
}) {
  const headingRef = useFocusHeading([index]);
  const title = `${label} ${index + 1} of ${total}`;
  const last = index === total - 1;
  if (replaced) {
    return (
      <div className="exam study">
        {announcer}
        {replaced}
      </div>
    );
  }
  return (
    <div className="exam study">
      {announcer}
      {(announcer !== undefined || remaining !== undefined) && (
        <header className="exam-topbar">
          <span>{title}</span>
          {remaining !== undefined && (
            <span className="timer">
              <span aria-label="Time left" role="timer">{formatTime(remaining)}</span>
            </span>
          )}
        </header>
      )}
      <section className="exam-body" aria-labelledby="runner-h">
        <h2 id="runner-h" ref={headingRef} tabIndex={-1}>{title}</h2>
        {children}
      </section>
      <nav className="exam-nav" aria-label={navLabel}>
        {previous && <button type="button" disabled={index === 0} onClick={() => onIndex(index - 1)}>Previous</button>}
        {!last && <button type="button" className={nextPrimary ? 'primary' : undefined} onClick={() => onIndex(index + 1)}>Next</button>}
        <button type="button" className={last ? 'primary' : undefined} onClick={onFinish}>{last ? 'Finish' : 'Finish now'}</button>
      </nav>
    </div>
  );
}

/** Front of a card, then "Show answer", then the back with "I knew it" / "I didn't know it". */
export function AcronymFlip({ front, back, revealed, onReveal, onGrade, backClass }: { front: string; back: string; revealed: boolean; onReveal: () => void; onGrade: (knew: boolean) => void; backClass?: string }) {
  const [knewRef, focusKnew] = useFocusLater<HTMLButtonElement>();
  return (
    <div className="acronym-card">
      <p className="acronym-term">{front}</p>
      {revealed ? (
        <>
          <p className={backClass}>{back}</p>
          <button type="button" ref={knewRef} onClick={() => onGrade(true)}>I knew it</button>{' '}
          <button type="button" onClick={() => onGrade(false)}>I didn&apos;t know it</button>
        </>
      ) : (
        <button type="button" onClick={() => { onReveal(); focusKnew(); }}>Show answer</button>
      )}
    </div>
  );
}

export const knownStatus = (knew: boolean | undefined) => (knew === undefined ? '' : knew ? 'Marked as known' : 'Marked as not known');
