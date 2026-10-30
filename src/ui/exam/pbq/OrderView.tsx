import { useState, type DragEvent } from 'react';
import type { PartMap, OrderPayload } from '../../../domain/pbq';
import type { PbqProps } from './PbqView';
import { inOrder } from './parts';

const toMap = (ids: string[]): PartMap => Object.fromEntries(ids.map((id, i) => [String(i), id]));

export function OrderView({ item, value, onChange }: PbqProps) {
  const p = item.question.payload as OrderPayload;
  const saved = p.steps.map((_, i) => value[String(i)]);
  // An untouched list stays unanswered; any move writes the whole order.
  const ids = saved.every(Boolean) ? saved : inOrder(p.steps, item.elementOrder).map((s) => s.id);
  const steps = ids.map((id) => p.steps.find((s) => s.id === id)!);
  const [announce, setAnnounce] = useState('');
  const [dragFrom, setDragFrom] = useState<number | null>(null);

  function move(from: number, to: number) {
    if (to < 0 || to >= ids.length || from === to) return;
    const next = [...ids];
    const [id] = next.splice(from, 1);
    next.splice(to, 0, id);
    onChange(toMap(next));
    setAnnounce(`${steps[from].text} moved to position ${to + 1}`);
  }

  return (
    <>
      <p className="hint">Put the steps in order. Use Move up and Move down, or drag a step.</p>
      <ol className="order-list">
        {steps.map((s, i) => (
          <li
            key={s.id}
            draggable
            onDragStart={() => setDragFrom(i)}
            onDragOver={(e: DragEvent) => e.preventDefault()}
            onDrop={(e: DragEvent) => {
              e.preventDefault();
              if (dragFrom !== null) move(dragFrom, i);
              setDragFrom(null);
            }}
          >
            <span className="step-text">{s.text}</span>
            <button type="button" aria-label={`Move ${s.text} up`} disabled={i === 0} onClick={() => move(i, i - 1)}>
              ↑
            </button>
            <button type="button" aria-label={`Move ${s.text} down`} disabled={i === steps.length - 1} onClick={() => move(i, i + 1)}>
              ↓
            </button>
          </li>
        ))}
      </ol>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </>
  );
}
