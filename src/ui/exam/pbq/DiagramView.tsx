import { plainText } from '../../../domain/richText';
import type { DiagramPayload } from '../../../domain/pbq';
import type { PbqProps } from './PbqView';
import { Boxes, ChipPool, DropTarget, PartSelect, inOrder } from './parts';

const pct = (n: number, of: number) => `${(n / of) * 100}%`;

export function DiagramView({ item, value, onChange }: PbqProps) {
  const p = item.question.payload as DiagramPayload;
  const labels = inOrder(p.labels, item.elementOrder);
  const center = (id: string) => {
    const n = p.nodes.find((x) => x.id === id);
    return n ? { x: n.x + n.w / 2, y: n.y + n.h / 2 } : null;
  };
  /** The zone whose anchor sits inside a node's box, if any. */
  const zoneNear = (nodeId: string) => {
    const n = p.nodes.find((x) => x.id === nodeId)!;
    return p.zones.find((z) => z.x >= n.x && z.x <= n.x + n.w && z.y >= n.y && z.y <= n.y + n.h + 80)?.name;
  };
  const nodeName = (id: string) => {
    const n = p.nodes.find((x) => x.id === id);
    return n?.text ?? zoneNear(id) ?? 'an unlabelled box';
  };
  const set = (zone: string, id: string) => onChange({ ...value, [zone]: id });

  return (
    <>
      <p className="hint">Label the diagram. Drag a label onto a box, or pick from each box&apos;s list.</p>
      <ChipPool items={labels} />
      <div className="sr-only">
        <p>Diagram contents:</p>
        <ul>
          {p.nodes.map((n) => (
            <li key={n.id}>{`Box ${n.text ?? '(unlabelled)'}${zoneNear(n.id) ? `, labelled by ${zoneNear(n.id)}` : ''}`}</li>
          ))}
          {p.edges.map((e, i) => (
            <li key={`e${i}`}>{`${nodeName(e.from)} connects to ${nodeName(e.to)}`}</li>
          ))}
        </ul>
      </div>
      <div className="diagram" style={{ aspectRatio: `${p.width} / ${p.height}` }}>
        <svg viewBox={`0 0 ${p.width} ${p.height}`} role="img" aria-label={plainText(item.question.stem)}>
          {p.edges.map((e, i) => {
            const a = center(e.from);
            const b = center(e.to);
            return a && b ? <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeWidth={2} /> : null;
          })}
          <Boxes nodes={p.nodes} />
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
