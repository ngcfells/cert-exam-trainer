import { useId } from 'react';
import { parseNumeric } from '../../domain/numeric';
import type { NumericPayload } from '../../domain/types';
import type { ExamItem } from '../../exam/assemble';

/** A typed number; the raw text is the response so the student's input survives re-renders. */
export function NumericView({ item, value, onChange }: { item: ExamItem; value: string; onChange: (v: string[]) => void }) {
  const id = useId();
  const q = item.question;
  const { prefix, suffix } = q.payload as NumericPayload;
  const unit = [prefix, suffix].filter(Boolean).join(' ');
  const invalid = value.trim() !== '' && parseNumeric(value) === null;
  const described = [unit && `${id}-unit`, invalid && `${id}-err`].filter(Boolean).join(' ') || undefined;
  return (
    <div className="numeric">
      <label htmlFor={id} className="stem">{q.stem}</label>
      <div className="numeric-field">
        {prefix && <span aria-hidden="true">{prefix}</span>}
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          aria-invalid={invalid || undefined}
          aria-describedby={described}
          onChange={(e) => onChange(e.target.value.trim() === '' ? [] : [e.target.value])}
        />
        {suffix && <span aria-hidden="true">{suffix}</span>}
      </div>
      {unit && <span id={`${id}-unit`} className="visually-hidden">{`Answer in ${unit}`}</span>}
      {invalid && <p id={`${id}-err`} className="hint">Enter a number, such as 12.5</p>}
    </div>
  );
}
