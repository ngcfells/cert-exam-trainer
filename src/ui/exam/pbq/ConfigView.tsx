import type { ConfigPayload } from '../../../domain/pbq';
import type { PbqProps } from './PbqView';
import { PartSelects } from './parts';

export const fieldParts = (p: ConfigPayload) => p.fields.map((f) => ({ id: f.id, label: f.label, values: f.options }));

export function ConfigView({ item, value, onChange }: PbqProps) {
  return <PartSelects parts={fieldParts(item.question.payload as ConfigPayload)} value={value} onChange={onChange} />;
}
