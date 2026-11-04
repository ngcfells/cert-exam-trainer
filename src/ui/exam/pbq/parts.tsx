import { useId, type DragEvent, type ReactNode } from 'react';
import type { PartMap } from '../../../domain/pbq';

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

/** One select per part, each optionally a drop target; writes the part's value into `value`. */
export function PartSelects({ parts, value, onChange, drop = false }: { parts: { id: string; label: string; values: Item[] }[]; value: PartMap; onChange: (v: PartMap) => void; drop?: boolean }) {
  const set = (part: string, id: string) => onChange({ ...value, [part]: id });
  return (
    <ul className="parts">
      {parts.map((p) => {
        const select = <PartSelect label={p.label} values={p.values} value={value[p.id] ?? ''} onChange={(id) => set(p.id, id)} />;
        return <li key={p.id}>{drop ? <DropTarget onDrop={(id) => set(p.id, id)}>{select}</DropTarget> : select}</li>;
      })}
    </ul>
  );
}

/**
 * Labelled boxes drawn behind a diagram or hotspot image. Labels are HTML inside the SVG so they
 * wrap within the box (issue #7); the font is in image units, so it scales with the box.
 */
export function Boxes({ nodes }: { nodes: { id: string; x: number; y: number; w: number; h: number; text?: string }[] }) {
  return nodes.map((n) => (
    <g key={n.id}>
      <rect x={n.x} y={n.y} width={n.w} height={n.h} strokeWidth={2} />
      {n.text && (
        <foreignObject x={n.x} y={n.y} width={n.w} height={n.h}>
          <div className="box-label">{n.text}</div>
        </foreignObject>
      )}
    </g>
  ));
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
