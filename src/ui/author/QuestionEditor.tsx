import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { z } from 'zod';
import { isPbqTemplate } from '../../domain/pbq';
import type { ItemResponse } from '../../exam/scoring';
import { QUESTION_TYPES, questionSchema } from '../../domain/schema';
import type { McqAnswer, McqPayload, Question, QuestionType } from '../../domain/types';
import { JSON_STARTERS, usesJsonEditor, type JsonType } from '../../authoring/starters';
import type { Repo } from '../../storage';
import { Loading, metaFor, QuestionView } from '../kit';
import { useLeaveGuard } from '../nav';
import { LoadError } from '../study/LoadError';

const DISCARD = 'Discard your changes to this question?';
import { plural } from '../plural';
import { TYPE_LABELS } from './typeLabels';
import '../exam/exam.css';
import './author.css';

type Option = { id: string; text: string };
type PbqTexts = { payloadText: string; answerText: string; partExplanationsText: string };

interface Draft extends PbqTexts {
  type: QuestionType;
  objectiveIds: string[];
  difficulty: 1 | 2 | 3;
  stem: string;
  explanation: string;
  status: Question['status'];
  options: Option[];
  correct: string[];
  pbqWeight: number;
  /** JSON left behind by other JSON-edited types, restored when the author switches back. */
  parked: Partial<Record<JsonType, PbqTexts>>;
}

/** Which input an error belongs to; the summary links to it. */
export type ErrorField = 'stem' | 'objectives' | 'options' | 'correct' | 'payload' | 'answer' | 'parts' | `option-${number}` | 'other';
export interface EditorError {
  field: ErrorField;
  text: string;
}

const json = (v: unknown) => JSON.stringify(v, null, 2);
const blankOptions = (): Option[] => ['a', 'b', 'c', 'd'].map((id) => ({ id, text: '' }));
const starterTexts = (t: JsonType): PbqTexts => ({
  payloadText: json(JSON_STARTERS[t].payload),
  answerText: json(JSON_STARTERS[t].answer),
  partExplanationsText: '',
});

function newDraft(objectiveId: string): Draft {
  return {
    type: 'mcq-single', objectiveIds: [objectiveId], difficulty: 2, stem: '', explanation: '', status: 'approved',
    options: blankOptions(), correct: [], pbqWeight: 2, payloadText: '', answerText: '', partExplanationsText: '', parked: {},
  };
}

function fromQuestion(q: Question): Draft {
  const mcq = !usesJsonEditor(q.type);
  return {
    type: q.type, objectiveIds: q.objectiveIds, difficulty: q.difficulty, stem: q.stem, explanation: q.explanation, status: q.status,
    options: mcq ? (q.payload as McqPayload).options : blankOptions(),
    correct: mcq ? (q.answer as McqAnswer).correct : [],
    pbqWeight: q.pbqWeight ?? 2,
    payloadText: mcq ? '' : json(q.payload),
    answerText: mcq ? '' : json(q.answer),
    partExplanationsText: q.partExplanations ? json(q.partExplanations) : '',
    parked: {},
  };
}

/** The draft as a question, or the problems that stop it saving. */
export function buildQuestion(d: Draft, base: Pick<Question, 'id' | 'exam' | 'acronyms'>): { question?: Question; errors: EditorError[] } {
  const errors: EditorError[] = [];
  const parse = (text: string, what: string, field: ErrorField): unknown => {
    try {
      return JSON.parse(text);
    } catch (e) {
      errors.push({ field, text: `${what} is not valid JSON: ${(e as Error).message}` });
      return undefined;
    }
  };
  const raw: Record<string, unknown> = {
    ...base, source: 'user', type: d.type, objectiveIds: d.objectiveIds, difficulty: d.difficulty,
    stem: d.stem.trim(), explanation: d.explanation.trim(), status: d.status,
  };
  if (usesJsonEditor(d.type)) {
    if (isPbqTemplate(d.type)) raw.pbqWeight = d.pbqWeight;
    raw.payload = parse(d.payloadText, 'Payload', 'payload');
    raw.answer = parse(d.answerText, 'Answer', 'answer');
    if (isPbqTemplate(d.type) && d.partExplanationsText.trim()) raw.partExplanations = parse(d.partExplanationsText, 'Part explanations', 'parts');
  } else {
    raw.payload = { options: d.options.map((o) => ({ id: o.id, text: o.text.trim() })) };
    raw.answer = { correct: d.correct };
  }
  if (errors.length) return { errors };
  const r = questionSchema.safeParse(raw);
  if (r.success) return { question: r.data as Question, errors: [] };
  const seen = new Set<string>();
  for (const e of r.error.issues.map((i) => describeIssue(i, d))) {
    if (!seen.has(e.text)) errors.push(e);
    seen.add(e.text);
  }
  return { errors };
}

function describeIssue(i: z.ZodIssue, d: Draft): EditorError {
  const [head, second, third, fourth] = i.path;
  if (head === 'stem') return { field: 'stem', text: 'Enter the question text.' };
  if (head === 'objectiveIds') return { field: 'objectives', text: 'Choose at least one objective.' };
  if (head === 'payload' && second === 'options' && fourth === 'text') return { field: `option-${Number(third)}`, text: `Option ${Number(third) + 1} needs text.` };
  if (head === 'payload' && second === 'options') return { field: 'options', text: 'Add at least 2 options.' };
  if (head === 'answer' && !usesJsonEditor(d.type)) {
    if (d.correct.length === 0) return { field: 'correct', text: 'Mark the correct answer.' };
    return { field: 'correct', text: d.type === 'mcq-single' ? 'Mark exactly one correct answer.' : 'Mark at least 2 correct answers, or use "one answer".' };
  }
  const field: ErrorField = head === 'payload' ? 'payload' : head === 'answer' ? 'answer' : head === 'partExplanations' ? 'parts' : 'other';
  return { field, text: `${i.path.join('.') || 'Question'}: ${i.message}` };
}

export function QuestionEditor({
  repo,
  examCode,
  id,
  onDone,
}: {
  repo: Repo;
  examCode: string;
  /** Absent = new question. */
  id?: string;
  onDone: () => void;
}) {
  const meta = metaFor(examCode);
  const [initial, setInitial] = useState<Draft | null>(id ? null : newDraft(meta.objectives[0].id));
  const [draft, setDraft] = useState<Draft | null>(initial);
  const [existing, setExisting] = useState<Question | null>(null);
  const [failed, setFailed] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [preview, setPreview] = useState<ItemResponse>();
  const summaryRef = useRef<HTMLDivElement>(null);
  const uid = useId();
  const [newId] = useState(() => `user-${crypto.randomUUID()}`);

  useEffect(() => {
    if (!id) return;
    void repo.getUserQuestions(examCode).then(
      (qs) => {
        const q = qs.find((x) => x.id === id);
        if (!q) return setFailed(true);
        setExisting(q);
        setInitial(fromQuestion(q));
        setDraft(fromQuestion(q));
      },
      () => setFailed(true),
    );
  }, [repo, examCode, id]);

  const built = useMemo(
    () => (draft ? buildQuestion(draft, { id: existing?.id ?? newId, exam: examCode, acronyms: existing?.acronyms ?? [] }) : null),
    [draft, existing, newId, examCode],
  );
  // Reset preview answers only when what the learner answers changes, not on stem or explanation edits.
  const q = built?.question;
  const previewKey = q ? JSON.stringify([q.type, q.payload]) : '';
  useEffect(() => setPreview(undefined), [previewKey]);
  const comparable = (d: Draft) => JSON.stringify({ ...d, parked: undefined });
  const dirty = !!draft && !!initial && comparable(draft) !== comparable(initial);
  useLeaveGuard(dirty, DISCARD);

  if (failed) return <LoadError />;
  if (!draft || !built) return <Loading />;

  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });
  const jsonEdited = usesJsonEditor(draft.type);
  const pbq = isPbqTemplate(draft.type);
  const fieldId = (f: ErrorField) =>
    ({ stem: `${uid}-stem`, objectives: `${uid}-obj-0`, options: `${uid}-opt-0`, correct: `${uid}-correct-0`, payload: `${uid}-payload`,
      answer: `${uid}-answer`, parts: `${uid}-parts`, other: `${uid}-type` } as Record<string, string>)[f] ??
    `${uid}-opt-${f.slice('option-'.length)}`;
  const errorsFor = (f: ErrorField) => (showErrors ? built.errors.filter((e) => e.field === f) : []);
  const errorId = (f: ErrorField) => `${uid}-err-${f}`;
  /** aria props for an input whose errors are listed under it. */
  const invalid = (f: ErrorField) => (errorsFor(f).length ? { 'aria-invalid': true as const, 'aria-describedby': errorId(f) } : {});
  /** Groups take no aria-invalid; they only point at their message. */
  const groupInvalid = (...fs: ErrorField[]) => {
    const ids = fs.filter((f) => errorsFor(f).length).map(errorId);
    return ids.length ? { 'aria-describedby': ids.join(' ') } : {};
  };
  const inlineErrors = (f: ErrorField) =>
    errorsFor(f).length > 0 && (
      <p id={errorId(f)} className="editor-errors">
        {errorsFor(f).map((e) => e.text).join(' ')}
      </p>
    );

  function changeType(type: QuestionType) {
    if (!draft) return;
    const parked = usesJsonEditor(draft.type)
      ? { ...draft.parked, [draft.type]: { payloadText: draft.payloadText, answerText: draft.answerText, partExplanationsText: draft.partExplanationsText } }
      : draft.parked;
    if (usesJsonEditor(type)) setDraft({ ...draft, type, parked, ...(parked[type] ?? starterTexts(type)) });
    else setDraft({ ...draft, type, parked, correct: type === 'mcq-single' ? draft.correct.slice(0, 1) : draft.correct });
  }

  function setOption(i: number, text: string) {
    set({ options: draft!.options.map((o, k) => (k === i ? { ...o, text } : o)) });
  }

  function addOption() {
    const used = new Set(draft!.options.map((o) => o.id));
    let n = draft!.options.length;
    let nextId = String.fromCharCode(97 + n);
    while (used.has(nextId)) nextId = `o${++n}`;
    set({ options: [...draft!.options, { id: nextId, text: '' }] });
  }

  function removeOption(i: number) {
    const gone = draft!.options[i].id;
    set({ options: draft!.options.filter((_, k) => k !== i), correct: draft!.correct.filter((c) => c !== gone) });
  }

  function markCorrect(optionId: string, on: boolean) {
    if (draft!.type === 'mcq-single') set({ correct: [optionId] });
    else set({ correct: on ? [...draft!.correct, optionId] : draft!.correct.filter((c) => c !== optionId) });
  }

  async function save() {
    if (!built?.question) {
      setShowErrors(true);
      // Wait for the summary to render, then move focus to it.
      setTimeout(() => summaryRef.current?.focus(), 0);
      return;
    }
    try {
      await repo.upsertUserQuestion(built.question);
      onDone();
    } catch {
      setSaveError('Save failed. Please try again.');
    }
  }

  function cancel() {
    if (dirty && !window.confirm(DISCARD)) return;
    onDone();
  }

  return (
    <section className="question-editor" aria-labelledby={`${uid}-h`}>
      <h2 id={`${uid}-h`}>{id ? 'Edit question' : 'Add question'}</h2>
      {showErrors && built.errors.length > 0 && (
        <div ref={summaryRef} tabIndex={-1} className="editor-errors error-summary" aria-labelledby={`${uid}-sum`} role="group">
          <h3 id={`${uid}-sum`}>{`${plural(built.errors.length, 'problem')} to fix before saving`}</h3>
          <ul>
            {built.errors.map((e, i) => (
              <li key={i}>
                <a
                  href={`#${fieldId(e.field)}`}
                  onClick={(ev) => {
                    ev.preventDefault();
                    document.getElementById(fieldId(e.field))?.focus();
                  }}
                >
                  {e.text}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="field">
        <label htmlFor={`${uid}-type`}>Question type</label>
        <select id={`${uid}-type`} value={draft.type} onChange={(e) => changeType(e.currentTarget.value as QuestionType)} {...invalid('other')}>
          {QUESTION_TYPES.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        {inlineErrors('other')}
      </div>
      <fieldset {...groupInvalid('objectives')}>
        <legend>Objectives</legend>
        {meta.objectives.map((o, i) => (
          <label key={o.id} className="inline">
            <input
              id={`${uid}-obj-${i}`}
              type="checkbox"
              checked={draft.objectiveIds.includes(o.id)}
              onChange={(e) =>
                set({ objectiveIds: e.currentTarget.checked ? [...draft.objectiveIds, o.id] : draft.objectiveIds.filter((x) => x !== o.id) })
              }
            />
            {`${o.id} ${o.title}`}
          </label>
        ))}
        {inlineErrors('objectives')}
      </fieldset>
      <div className="field">
        <label htmlFor={`${uid}-diff`}>Difficulty</label>
        <select id={`${uid}-diff`} value={draft.difficulty} onChange={(e) => set({ difficulty: Number(e.currentTarget.value) as 1 | 2 | 3 })}>
          <option value={1}>1 (easy)</option>
          <option value={2}>2 (medium)</option>
          <option value={3}>3 (hard)</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor={`${uid}-stem`}>Question text</label>
        <textarea id={`${uid}-stem`} value={draft.stem} onChange={(e) => set({ stem: e.currentTarget.value })} {...invalid('stem')} />
        {inlineErrors('stem')}
      </div>

      {jsonEdited ? (
        <>
          {pbq && <div className="field">
            <label htmlFor={`${uid}-weight`}>PBQ weight (1–6)</label>
            <select id={`${uid}-weight`} value={draft.pbqWeight} onChange={(e) => set({ pbqWeight: Number(e.currentTarget.value) })}>
              {[1, 2, 3, 4, 5, 6].map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>}
          <p className="hint">
            {pbq
              ? 'Edit the example data below. The rules for each template are in docs/pbq-authoring.md.'
              : 'Answer: value is the correct number and tolerance how far off still counts (0 = exact). Payload: an optional prefix (such as $) or suffix (such as %) shown beside the input.'}
          </p>
          {(
            [
              ['payload', 'Payload (JSON)', 'payloadText'],
              ['answer', 'Answer (JSON)', 'answerText'],
              ...(pbq ? [['parts', 'Part explanations (JSON, optional)', 'partExplanationsText'] as const] : []),
            ] as const
          ).map(([f, label, key]) => (
            <div className="field" key={f}>
              <label htmlFor={fieldId(f)}>{label}</label>
              <textarea
                id={fieldId(f)}
                className="json"
                spellCheck={false}
                value={draft[key]}
                onChange={(e) => set({ [key]: e.currentTarget.value })}
                {...invalid(f)}
              />
              {inlineErrors(f)}
            </div>
          ))}
        </>
      ) : (
        <fieldset {...groupInvalid('options', 'correct')}>
          <legend>Options</legend>
          {draft.options.map((o, i) => (
            <div key={o.id} className="option-row">
              <input
                id={`${uid}-opt-${i}`}
                type="text"
                aria-label={`Option ${i + 1}`}
                value={o.text}
                onChange={(e) => setOption(i, e.currentTarget.value)}
                {...invalid(`option-${i}`)}
              />
              <label className="inline">
                <input
                  id={`${uid}-correct-${i}`}
                  type={draft.type === 'mcq-single' ? 'radio' : 'checkbox'}
                  name={`${uid}-correct`}
                  checked={draft.correct.includes(o.id)}
                  onChange={(e) => markCorrect(o.id, e.currentTarget.checked)}
                />
                {`Option ${i + 1} is correct`}
              </label>
              <button type="button" onClick={() => removeOption(i)} disabled={draft.options.length <= 2}>
                {`Remove option ${i + 1}`}
              </button>
              {inlineErrors(`option-${i}`)}
            </div>
          ))}
          {inlineErrors('options')}
          {inlineErrors('correct')}
          <button type="button" onClick={addOption}>
            Add option
          </button>
        </fieldset>
      )}

      <div className="field">
        <label htmlFor={`${uid}-expl`}>Explanation</label>
        <textarea id={`${uid}-expl`} value={draft.explanation} onChange={(e) => set({ explanation: e.currentTarget.value })} />
      </div>
      <div className="field">
        <label htmlFor={`${uid}-status`}>Status</label>
        <select
          id={`${uid}-status`}
          aria-describedby={`${uid}-status-hint`}
          value={draft.status}
          onChange={(e) => set({ status: e.currentTarget.value as Question['status'] })}
        >
          <option value="draft">Draft</option>
          <option value="reviewed">Reviewed</option>
          <option value="approved">Approved</option>
        </select>
        <p className="hint" id={`${uid}-status-hint`}>
          Only approved questions appear in mock exams, practice and cram.
        </p>
      </div>

      <div className="author-actions">
        <button type="button" className="primary" onClick={() => void save()}>
          Save question
        </button>
        <button type="button" onClick={cancel}>
          Cancel
        </button>
      </div>
      {saveError && <p role="alert">{saveError}</p>}

      {q && (
        <section className="editor-preview" aria-label="Preview">
          <h3>Preview</h3>
          <QuestionView item={{ question: q }} response={preview} onChange={setPreview} />
        </section>
      )}
    </section>
  );
}
