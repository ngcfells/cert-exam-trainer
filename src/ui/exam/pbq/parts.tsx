import { useId, type DragEvent, type ReactNode } from 'react';

export interface Item {
  id: string;
  text: string;
}

export const MIME = 'text/plain';

/** Items in the attempt's shuffled order, falling back to authored order. */
export function inOrder<T extends Item>(items: T[], order?: string[]): T[] {
  if (!order) return items;
  return order.map((id) => items.find((i) => i.id === id)).filter((i): i is T => !!i);
}

/** A labelled native select: the keyboard and tap path for every part. */
export function PartSelect({ label, values, value, onChange }: { label: string; values: Item[]; value: string; onChange: (id: string) => void }) {
  const id = useId();
  return (
    <span className="part-select">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Choose…</option>
        {values.map((v) => (
          <option key={v.id} value={v.id}>
            {v.text}
          </option>
        ))}
      </select>
    </span>
  );
}

/** Draggable chips; a pointer enhancement only, so hidden from assistive tech. */
export function ChipPool({ items }: { items: Item[] }) {
  return (
    <ul className="chip-pool" aria-hidden="true">
      {items.map((i) => (
        <li key={i.id} className="chip" draggable onDragStart={(e) => e.dataTransfer.setData(MIME, i.id)}>
          {i.text}
        </li>
      ))}
    </ul>
  );
}

export function DropTarget({ onDrop, className, children, style }: { onDrop: (id: string) => void; className?: string; children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      className={`drop-target${className ? ` ${className}` : ''}`}
      style={style}
      onDragOver={(e: DragEvent) => e.preventDefault()}
      onDrop={(e: DragEvent) => {
        e.preventDefault();
        const id = e.dataTransfer.getData(MIME);
        if (id) onDrop(id);
      }}
    >
      {children}
    </div>
  );
}
