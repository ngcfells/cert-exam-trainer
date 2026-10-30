import { useId } from 'react';
import type { BucketsPayload } from '../../../domain/pbq';
import type { PbqProps } from './PbqView';
import { ChipPool, DropTarget, MIME, PartSelect, inOrder, type Item } from './parts';

function Bucket({ bucket, placed, onDrop }: { bucket: Item; placed: Item[]; onDrop: (id: string) => void }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} className="bucket">
      <DropTarget onDrop={onDrop}>
        <h3 id={id}>{bucket.text}</h3>
        {placed.length ? (
          <ul>
            {placed.map((i) => (
              <li key={i.id} className="chip" draggable onDragStart={(e) => e.dataTransfer.setData(MIME, i.id)}>
                {i.text}
              </li>
            ))}
          </ul>
        ) : (
          <p className="hint">Empty</p>
        )}
      </DropTarget>
    </div>
  );
}

export function BucketsView({ item, value, onChange }: PbqProps) {
  const p = item.question.payload as BucketsPayload;
  const items = inOrder(p.items, item.elementOrder);
  const set = (itemId: string, bucketId: string) => onChange({ ...value, [itemId]: bucketId });
  return (
    <>
      <p className="hint">Sort each item into a bucket. Drag an item onto a bucket, or pick a bucket from its list.</p>
      <ChipPool items={items.filter((i) => !value[i.id])} />
      <div className="buckets">
        {p.buckets.map((b) => (
          <Bucket key={b.id} bucket={b} placed={items.filter((i) => value[i.id] === b.id)} onDrop={(id) => set(id, b.id)} />
        ))}
      </div>
      <ul className="parts">
        {items.map((i) => (
          <li key={i.id}>
            <PartSelect label={i.text} values={p.buckets} value={value[i.id] ?? ''} onChange={(id) => set(i.id, id)} />
          </li>
        ))}
      </ul>
    </>
  );
}
