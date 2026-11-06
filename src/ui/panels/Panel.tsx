import { useEffect, useId, useRef, type ReactNode } from 'react';
import { usePanels, type PanelKind } from './PanelProvider';
import { formatTime } from '../exam/formatTime';
import { useCountdown } from '../kit';
import './panels.css';

/** The mock exam's time left, so a panel never hides the clock. */
function MockClock({ deadline }: { deadline: number }) {
  const { remaining } = useCountdown(deadline, Date.now, () => {});
  return <p className="panel-clock">Time left: {formatTime(remaining)}</p>;
}

/** A modal panel over the current screen. Nothing underneath unmounts; the browser keeps focus inside. */
export function Panel({ kind, title, onClose, children }: { kind: PanelKind; title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const { mockDeadline } = usePanels();
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    // A panel can name where focus starts (the calculator display); otherwise the browser picks.
    d?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    return () => {
      if (d?.open) d.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`panel panel-${kind}`}
      aria-labelledby={headingId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return;
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }}
    >
      <div className="panel-head">
        <h2 id={headingId}>{title}</h2>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="panel-body">
        {mockDeadline !== null && <MockClock deadline={mockDeadline} />}
        {children}
      </div>
    </dialog>
  );
}
