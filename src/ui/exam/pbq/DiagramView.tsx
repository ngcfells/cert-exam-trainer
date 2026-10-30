import type { DiagramPayload } from '../../../domain/pbq';
import type { PbqProps } from './PbqView';
import { ChipPool, DropTarget, PartSelect, inOrder } from './parts';

const pct = (n: number, of: number) => `${(n / of) * 100}%`;

export function DiagramView({ item, value, onChange }: PbqProps) {
  const p = item.question.payload as DiagramPayload;
  const labels = inOrder(p.labels, item.elementOrder);
  const center = (id: string) => {
    const n = p.nodes.find((x) => x.id === id);
    return n ? { x: n.x + n.w / 2, y: n.y + n.h / 2 } : null;
  };
  const set = (zone: string, id: string) => onChange({ ...value, [zone]: id });

  return (
    <>
      <p className="hint">Label the diagram. Drag a label onto a box, or pick from each box&apos;s list.</p>
      <ChipPool items={labels} />
      <div className="diagram" style={{ aspectRatio: `${p.width} / ${p.height}` }}>
        <svg viewBox={`0 0 ${p.width} ${p.height}`} role="img" aria-label={item.question.stem}>
          {p.edges.map((e, i) => {
            const a = center(e.from);
            const b = center(e.to);
            return a && b ? <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#333" strokeWidth={2} /> : null;
          })}
          {p.nodes.map((n) => (
            <g key={n.id}>
              <rect x={n.x} y={n.y} width={n.w} height={n.h} fill="#fff" stroke="#333" strokeWidth={2} />
              {n.text && (
                <text x={n.x + n.w / 2} y={n.y + n.h / 2} textAnchor="middle" dominantBaseline="middle" fontSize={14}>
                  {n.text}
                </text>
              )}
            </g>
          ))}
        </svg>
        {p.zones.map((z) => (
          <DropTarget key={z.id} className="zone" style={{ left: pct(z.x, p.width), top: pct(z.y, p.height) }} onDrop={(id) => set(z.id, id)}>
            <PartSelect label={z.name} values={labels} value={value[z.id] ?? ''} onChange={(id) => set(z.id, id)} />
          </DropTarget>
        ))}
      </div>
    </>
  );
}
