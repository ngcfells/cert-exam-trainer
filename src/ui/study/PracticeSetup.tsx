import { PBQ_TEMPLATES } from '../../domain/pbq';
import type { ExamMeta, Question, QuestionType } from '../../domain/types';
import { matchingPool, type PracticeOptions } from '../../study/session';
import { toCount } from '../kit';
import { questions } from '../plural';
import './study.css';

export const MCQ_TYPES: QuestionType[] = ['mcq-single', 'mcq-multi'];

export const TYPE_NAMES: Record<(typeof PBQ_TEMPLATES)[number], string> = {
  'pbq-match': 'Drag-and-drop match',
  'pbq-order': 'Order the steps',
  'pbq-config': 'Configure fields',
  'pbq-diagram': 'Label a diagram',
  'pbq-terminal': 'Logs and terminal',
  'pbq-data': 'Data table or chart',
  'pbq-hotspot': 'Select-all hotspot',
  'pbq-buckets': 'Sort into buckets',
};

export interface PracticeChoices extends PracticeOptions {
  feedback: 'instant' | 'end';
}

/** Adds or removes every one of `xs` from `list`. */
const toggleAll = <T,>(list: T[], xs: T[], on: boolean) => (on ? [...new Set([...list, ...xs])] : list.filter((y) => !xs.includes(y)));

function Check({ checked, onChange, children }: { checked: boolean; onChange: (on: boolean) => void; children: React.ReactNode }) {
  return (
    <label>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {children}
    </label>
  );
}

export function PracticeSetup({
  meta,
  pool,
  value,
  onChange,
  onStart,
  onCancel,
}: {
  meta: ExamMeta;
  pool: Question[];
  value: PracticeChoices;
  onChange: (v: PracticeChoices) => void;
  onStart: () => void;
  onCancel: () => void;
}) {
  const matches = matchingPool(pool, value).length;
  const set = (patch: Partial<PracticeChoices>) => onChange({ ...value, ...patch });
  const objectives = (ids: string[], on: boolean) => set({ objectiveIds: toggleAll(value.objectiveIds, ids, on) });
  const types = (ts: QuestionType[], on: boolean) => set({ types: toggleAll(value.types, ts, on) });
  const match = `${questions(matches)} ${matches === 1 ? 'matches' : 'match'}`;
  let note = `${match}.`;
  if (matches === 0) note = 'No questions match these choices.';
  else if (value.count > matches) note = `Only ${match}; the session will use all of them.`;

  return (
    <section className="study-setup" aria-labelledby="practice-h">
      <h2 id="practice-h">{`Practice: ${meta.name} (${meta.code})`}</h2>
      <p>Untimed. Pick what to practise; PBQs come first when included.</p>
      {meta.domains.map((d) => {
        const ids = meta.objectives.filter((o) => o.domainId === d.id).map((o) => o.id);
        return (
          <fieldset key={d.id}>
            <legend>{`${d.id}. ${d.title}`}</legend>
            <Check checked={ids.length > 0 && ids.every((id) => value.objectiveIds.includes(id))} onChange={(on) => objectives(ids, on)}>
              {`All of domain ${d.id}`}
            </Check>
            {meta.objectives
              .filter((o) => o.domainId === d.id)
              .map((o) => (
                <Check key={o.id} checked={value.objectiveIds.includes(o.id)} onChange={(on) => objectives([o.id], on)}>
                  {`${o.id} ${o.title}`}
                </Check>
              ))}
          </fieldset>
        );
      })}
      <fieldset>
        <legend>Question types</legend>
        <Check checked={MCQ_TYPES.every((t) => value.types.includes(t))} onChange={(on) => types(MCQ_TYPES, on)}>
          Multiple choice
        </Check>
        {PBQ_TEMPLATES.map((t) => (
          <Check key={t} checked={value.types.includes(t)} onChange={(on) => types([t], on)}>
            {TYPE_NAMES[t]}
          </Check>
        ))}
      </fieldset>
      <fieldset>
        <legend>Session</legend>
        <label>
          Number of questions
          <input type="number" min={1} value={value.count || ''} onChange={(e) => set({ count: toCount(e.target.value) })} />
        </label>
      </fieldset>
      <fieldset>
        <legend>Feedback</legend>
        {(['instant', 'end'] as const).map((f) => (
          <label key={f}>
            <input type="radio" name="feedback" checked={value.feedback === f} onChange={() => set({ feedback: f })} />
            {f === 'instant' ? 'Instant' : 'At the end'}
          </label>
        ))}
      </fieldset>
      <p role="status">{note}</p>
      <button type="button" className="primary" disabled={matches === 0 || value.count < 1} onClick={onStart}>
        Start practice
      </button>{' '}
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
    </section>
  );
}
