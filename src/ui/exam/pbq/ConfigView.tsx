import type { ConfigPayload } from '../../../domain/pbq';
import type { PbqProps } from './PbqView';
import { inOrder, PartSelects } from './parts';

/** Each field as a part, its options in the attempt's shuffled order (authored order when none). */
export const fieldParts = (p: ConfigPayload, orders?: Record<string, string[]>) =>
  p.fields.map((f) => ({ id: f.id, label: f.label, values: inOrder(f.options, orders?.[f.id]) }));

export function ConfigView({ item, value, onChange }: PbqProps) {
  return <PartSelects parts={fieldParts(item.question.payload as ConfigPayload, item.partOrders)} value={value} onChange={onChange} />;
}
