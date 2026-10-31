import type { MatchPayload } from '../../../domain/pbq';
import type { PbqProps } from './PbqView';
import { ChipPool, PartSelects, inOrder } from './parts';

export function MatchView({ item, value, onChange }: PbqProps) {
  const p = item.question.payload as MatchPayload;
  const choices = inOrder(p.choices, item.elementOrder);
  return (
    <>
      <p className="hint">Match each item to a choice. Drag a choice onto an item, or pick from its list.</p>
      <ChipPool items={choices} />
      <PartSelects drop parts={p.prompts.map((pr) => ({ id: pr.id, label: pr.text, values: choices }))} value={value} onChange={onChange} />
    </>
  );
}
