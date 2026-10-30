import type { ConfigPayload } from '../../../domain/pbq';
import type { PbqProps } from './PbqView';
import { PartSelect } from './parts';

export function ConfigView({ item, value, onChange }: PbqProps) {
  const p = item.question.payload as ConfigPayload;
  return (
    <ul className="parts">
      {p.fields.map((f) => (
        <li key={f.id}>
          <PartSelect label={f.label} values={f.options} value={value[f.id] ?? ''} onChange={(id) => onChange({ ...value, [f.id]: id })} />
        </li>
      ))}
    </ul>
  );
}
