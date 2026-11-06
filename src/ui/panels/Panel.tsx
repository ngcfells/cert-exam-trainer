import { useEffect, useId, useRef, type ReactNode } from 'react';
import type { PanelKind } from './PanelProvider';
import './panels.css';

/** A modal panel over the current screen. Nothing underneath unmounts; the browser keeps focus inside. */
export function Panel({ kind, title, onClose, children }: { kind: PanelKind; title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
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
      <div className="panel-body">{children}</div>
    </dialog>
  );
}
