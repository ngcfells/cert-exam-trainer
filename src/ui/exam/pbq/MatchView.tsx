import type { MatchPayload } from '../../../domain/pbq';
import type { PbqProps } from './PbqView';
import { ChipPool, DropTarget, PartSelect, inOrder } from './parts';

export function MatchView({ item, value, onChange }: PbqProps) {
  const p = item.question.payload as MatchPayload;
  const choices = inOrder(p.choices, item.elementOrder);
  const set = (part: string, id: string) => onChange({ ...value, [part]: id });
  return (
    <>
      <p className="hint">Match each item to a choice. Drag a choice onto an item, or pick from its list.</p>
      <ChipPool items={choices} />
      <ul className="parts">
        {p.prompts.map((pr) => (
          <li key={pr.id}>
            <DropTarget onDrop={(id) => set(pr.id, id)}>
              <PartSelect label={pr.text} values={choices} value={value[pr.id] ?? ''} onChange={(id) => set(pr.id, id)} />
            </DropTarget>
          </li>
        ))}
      </ul>
    </>
  );
}
