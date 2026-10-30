import { useId } from 'react';
import type { TerminalPayload } from '../../../domain/pbq';
import type { PbqProps } from './PbqView';
import { PartSelect } from './parts';

function CommandInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <span className="part-select command">
      <label htmlFor={id}>{label}</label>
      <span className="prompt-line">
        <span aria-hidden="true">$</span>
        <input id={id} type="text" autoComplete="off" autoCapitalize="off" spellCheck={false} value={value} onChange={(e) => onChange(e.target.value)} />
      </span>
    </span>
  );
}

export function TerminalView({ item, value, onChange }: PbqProps) {
  const p = item.question.payload as TerminalPayload;
  const set = (step: string, v: string) => onChange({ ...value, [step]: v });
  return (
    <>
      <p className="hint">Read the output, then type a command or choose an action for each step. Nothing is run.</p>
      {/* Long output scrolls, so it must be focusable to scroll by keyboard. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <pre className="terminal" role="region" aria-label="Terminal output" tabIndex={0}>
        {p.output.join('\n')}
      </pre>
      <ul className="parts">
        {p.steps.map((s) => (
          <li key={s.id}>
            {s.options ? (
              <PartSelect label={s.label} values={s.options} value={value[s.id] ?? ''} onChange={(id) => set(s.id, id)} />
            ) : (
              <CommandInput label={s.label} value={value[s.id] ?? ''} onChange={(v) => set(s.id, v)} />
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
