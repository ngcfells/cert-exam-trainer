import { useId } from 'react';
import type { McqPayload } from '../../domain/types';
import type { ExamItem } from '../../exam/assemble';

export function McqView({ item, selected, onChange }: { item: ExamItem; selected: string[]; onChange: (ids: string[]) => void }) {
  const name = useId();
  const q = item.question;
  const multi = q.type === 'mcq-multi';
  const options = (q.payload as McqPayload).options;
  const ordered = (item.optionOrder ?? options.map((o) => o.id)).map((id) => options.find((o) => o.id === id)!);

  function toggle(id: string) {
    if (!multi) return onChange([id]);
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }

  return (
    <fieldset className="mcq">
      <legend className="stem">{q.stem}</legend>
      {multi && <p className="hint">Select all that apply.</p>}
      {ordered.map((o) => (
        <label key={o.id} className="option">
          <input
            type={multi ? 'checkbox' : 'radio'}
            name={name}
            value={o.id}
            checked={selected.includes(o.id)}
            onChange={() => toggle(o.id)}
          />
          {o.text}
        </label>
      ))}
    </fieldset>
  );
}
