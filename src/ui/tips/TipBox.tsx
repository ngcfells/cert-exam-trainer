import { useId, useRef, useState } from 'react';
import type { ExamMeta } from '../../domain/types';
import { fillTip } from '../../tips/picker';
import type { Tip } from '../../tips/types';
import { nextTip } from './prefs';
import './tips.css';

export const HEADINGS = { 'test-room': 'Test-room tip', study: 'Study tip' } as const;

/** What the runner's always-present live region says when a tip opens. */
export function tipAnnouncement(tip: Tip, meta: ExamMeta): string {
  return `${HEADINGS[tip.group]}: ${fillTip(tip.text, meta)}`;
}

/**
 * A tip above the question (issue #3). It never takes focus; Previous/Next walk its own history before asking for a new tip.
 * Its arrival is announced by the runner's live region; the box's own live text announces Previous/Next changes.
 */
export function TipBox({ first, meta, onClose }: { first: Tip; meta: ExamMeta; onClose: () => void }) {
  const headingId = useId();
  const nextRef = useRef<HTMLButtonElement>(null);
  const [history, setHistory] = useState<Tip[]>([first]);
  const [at, setAt] = useState(0);
  const tip = history[at];

  function previous() {
    // Previous tip disables itself on the first tip; move focus on so it is not lost.
    if (at - 1 === 0) nextRef.current?.focus();
    setAt(at - 1);
  }

  function next() {
    if (at < history.length - 1) {
      setAt(at + 1);
      return;
    }
    setHistory([...history, nextTip(meta.code)]);
    setAt(at + 1);
  }

  return (
    <section className="tip-box" aria-labelledby={headingId}>
      <div className="tip-head">
        <h3 id={headingId}>{HEADINGS[tip.group]}</h3>
        <button type="button" className="tip-close" aria-label="Close tip" onClick={onClose}>
          <span aria-hidden="true">✕</span>
        </button>
      </div>
      <p className="tip-text" aria-live="polite">
        {fillTip(tip.text, meta)}
      </p>
      <div className="tip-nav">
        <button type="button" disabled={at === 0} onClick={previous}>
          Previous tip
        </button>
        <button type="button" ref={nextRef} onClick={next}>
          Next tip
        </button>
      </div>
    </section>
  );
}
