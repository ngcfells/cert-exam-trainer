import { useEffect, useId, useState } from 'react';
import type { ExamMeta } from '../../domain/types';
import { fillTip } from '../../tips/picker';
import type { Tip } from '../../tips/types';
import { nextTip } from './prefs';
import './tips.css';

const HEADINGS = { 'test-room': 'Test-room tip', study: 'Study tip' } as const;

/** A tip above the question (issue #3). It never takes focus; Previous/Next walk its own history before asking for a new tip. */
export function TipBox({ first, meta, onClose }: { first: Tip; meta: ExamMeta; onClose: () => void }) {
  const headingId = useId();
  const [history, setHistory] = useState<Tip[]>([first]);
  const [at, setAt] = useState(0);
  // The live text fills in after mount, so a screen reader announces the tip's arrival.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const tip = history[at];

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
        {ready ? fillTip(tip.text, meta) : ''}
      </p>
      <div className="tip-nav">
        <button type="button" disabled={at === 0} onClick={() => setAt(at - 1)}>
          Previous tip
        </button>
        <button type="button" onClick={next}>
          Next tip
        </button>
      </div>
    </section>
  );
}
