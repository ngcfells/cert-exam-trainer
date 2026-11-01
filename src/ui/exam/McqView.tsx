import { useId } from 'react';
import { displayStem, effectivePick, pickHint } from '../../domain/pick';
import type { McqPayload } from '../../domain/types';
import type { ExamItem } from '../../exam/assemble';

export function McqView({ item, selected, onChange }: { item: ExamItem; selected: string[]; onChange: (ids: string[]) => void }) {
  const name = useId();
  const q = item.question;
  const multi = q.type === 'mcq-multi';
  const pick = effectivePick(q);
  // Select N: once N are picked, the rest wait until one is unpicked.
  const full = multi && pick !== 'all' && selected.length >= pick;
  const options = (q.payload as McqPayload).options;
  const ordered = (item.optionOrder ?? options.map((o) => o.id)).map((id) => options.find((o) => o.id === id)!);

  function toggle(id: string) {
    if (!multi) return onChange([id]);
    if (selected.includes(id)) return onChange(selected.filter((s) => s !== id));
    if (!full) onChange([...selected, id]);
  }

  return (
    <fieldset className="mcq">
      <legend className="stem">{displayStem(q)}</legend>
      {multi && <p className="hint">{pickHint(pick)}</p>}
      {ordered.map((o) => {
        const checked = selected.includes(o.id);
        return (
          <label key={o.id} className="option">
            <input
              type={multi ? 'checkbox' : 'radio'}
              name={name}
              value={o.id}
              checked={checked}
              disabled={full && !checked}
              onChange={() => toggle(o.id)}
            />
            {o.text}
          </label>
        );
      })}
    </fieldset>
  );
}
