import { PBQ_TEMPLATES } from '../../domain/pbq';
import type { ExamMeta, Question, QuestionType } from '../../domain/types';
import { matchingPool, type PracticeOptions } from '../../study/session';
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

const toggle = <T,>(xs: T[], x: T, on: boolean) => (on ? [...new Set([...xs, x])] : xs.filter((y) => y !== x));

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
  const mcqOn = MCQ_TYPES.every((t) => value.types.includes(t));
  let note = `${questions(matches)} ${matches === 1 ? 'matches' : 'match'}.`;
  if (matches === 0) note = 'No questions match these choices.';
  else if (value.count > matches) note = `Only ${questions(matches)} ${matches === 1 ? 'matches' : 'match'}; the session will use all of them.`;

  return (
    <section className="study-setup" aria-labelledby="practice-h">
      <h2 id="practice-h">{`Practice: ${meta.name} (${meta.code})`}</h2>
      <p>Untimed. Pick what to practise; PBQs come first when included.</p>
      {meta.domains.map((d) => {
        const objs = meta.objectives.filter((o) => o.domainId === d.id);
        const all = objs.length > 0 && objs.every((o) => value.objectiveIds.includes(o.id));
        return (
          <fieldset key={d.id}>
            <legend>{`${d.id}. ${d.title}`}</legend>
            <label>
              <input
                type="checkbox"
                checked={all}
                onChange={(e) =>
                  onChange({ ...value, objectiveIds: objs.reduce((ids, o) => toggle(ids, o.id, e.target.checked), value.objectiveIds) })
                }
              />
              {`All of domain ${d.id}`}
            </label>
            {objs.map((o) => (
              <label key={o.id}>
                <input
                  type="checkbox"
                  checked={value.objectiveIds.includes(o.id)}
                  onChange={(e) => onChange({ ...value, objectiveIds: toggle(value.objectiveIds, o.id, e.target.checked) })}
                />
                {`${o.id} ${o.title}`}
              </label>
            ))}
          </fieldset>
        );
      })}
      <fieldset>
        <legend>Question types</legend>
        <label>
          <input
            type="checkbox"
            checked={mcqOn}
            onChange={(e) => onChange({ ...value, types: MCQ_TYPES.reduce((ts, t) => toggle(ts, t, e.target.checked), value.types) })}
          />
          Multiple choice
        </label>
        {PBQ_TEMPLATES.map((t) => (
          <label key={t}>
            <input type="checkbox" checked={value.types.includes(t)} onChange={(e) => onChange({ ...value, types: toggle(value.types, t, e.target.checked) })} />
            {TYPE_NAMES[t]}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>Session</legend>
        <label>
          Number of questions
          <input
            type="number"
            min={1}
            value={value.count || ''}
            onChange={(e) => onChange({ ...value, count: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
          />
        </label>
      </fieldset>
      <fieldset>
        <legend>Feedback</legend>
        <label>
          <input type="radio" name="feedback" checked={value.feedback === 'instant'} onChange={() => onChange({ ...value, feedback: 'instant' })} />
          Instant
        </label>
        <label>
          <input type="radio" name="feedback" checked={value.feedback === 'end'} onChange={() => onChange({ ...value, feedback: 'end' })} />
          At the end
        </label>
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
