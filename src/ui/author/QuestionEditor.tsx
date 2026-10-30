import { useEffect, useId, useMemo, useState } from 'react';
import type { z } from 'zod';
import { listExams } from '../../banks';
import { isPbqTemplate, type PartMap } from '../../domain/pbq';
import { QUESTION_TYPES, questionSchema } from '../../domain/schema';
import type { McqAnswer, McqPayload, Question, QuestionType } from '../../domain/types';
import { PBQ_STARTERS } from '../../authoring/starters';
import type { Repo } from '../../storage';
import { McqView } from '../exam/McqView';
import { PbqView } from '../exam/pbq/PbqView';
import { LoadError } from '../study/LoadError';
import { TYPE_LABELS } from './typeLabels';
import '../exam/exam.css';
import './author.css';

type Option = { id: string; text: string };

interface Draft {
  type: QuestionType;
  objectiveIds: string[];
  difficulty: 1 | 2 | 3;
  stem: string;
  explanation: string;
  status: Question['status'];
  options: Option[];
  correct: string[];
  pbqWeight: number;
  payloadText: string;
  answerText: string;
  partExplanationsText: string;
}

const json = (v: unknown) => JSON.stringify(v, null, 2);
const blankOptions = (): Option[] => ['a', 'b', 'c', 'd'].map((id) => ({ id, text: '' }));

function newDraft(objectiveId: string): Draft {
  return {
    type: 'mcq-single', objectiveIds: [objectiveId], difficulty: 2, stem: '', explanation: '', status: 'approved',
    options: blankOptions(), correct: [], pbqWeight: 2, payloadText: '', answerText: '', partExplanationsText: '',
  };
}

function fromQuestion(q: Question): Draft {
  const mcq = !isPbqTemplate(q.type);
  return {
    type: q.type, objectiveIds: q.objectiveIds, difficulty: q.difficulty, stem: q.stem, explanation: q.explanation, status: q.status,
    options: mcq ? (q.payload as McqPayload).options : blankOptions(),
    correct: mcq ? (q.answer as McqAnswer).correct : [],
    pbqWeight: q.pbqWeight ?? 2,
    payloadText: mcq ? '' : json(q.payload),
    answerText: mcq ? '' : json(q.answer),
    partExplanationsText: q.partExplanations ? json(q.partExplanations) : '',
  };
}

/** The draft as a question, or the problems that stop it saving. */
export function buildQuestion(d: Draft, base: Pick<Question, 'id' | 'exam' | 'acronyms'>): { question?: Question; errors: string[] } {
  const errors: string[] = [];
  const parse = (text: string, what: string): unknown => {
    try {
      return JSON.parse(text);
    } catch (e) {
      errors.push(`${what} is not valid JSON: ${(e as Error).message}`);
      return undefined;
    }
  };
  const pbq = isPbqTemplate(d.type);
  const raw: Record<string, unknown> = {
    ...base, source: 'user', type: d.type, objectiveIds: d.objectiveIds, difficulty: d.difficulty,
    stem: d.stem.trim(), explanation: d.explanation.trim(), status: d.status,
  };
  if (pbq) {
    raw.pbqWeight = d.pbqWeight;
    raw.payload = parse(d.payloadText, 'Payload');
    raw.answer = parse(d.answerText, 'Answer');
    if (d.partExplanationsText.trim()) raw.partExplanations = parse(d.partExplanationsText, 'Part explanations');
  } else {
    raw.payload = { options: d.options.map((o) => ({ id: o.id, text: o.text.trim() })) };
    raw.answer = { correct: d.correct };
  }
  if (errors.length) return { errors };
  const r = questionSchema.safeParse(raw);
  if (!r.success) return { errors: [...new Set(r.error.issues.map((i) => describeIssue(i, d)))] };
  return { question: r.data as Question, errors: [] };
}

function describeIssue(i: z.ZodIssue, d: Draft): string {
  const [head, second, third, fourth] = i.path;
  if (head === 'stem') return 'Enter the question text.';
  if (head === 'objectiveIds') return 'Choose at least one objective.';
  if (head === 'payload' && second === 'options' && fourth === 'text') return `Option ${Number(third) + 1} needs text.`;
  if (head === 'payload' && second === 'options') return 'Add at least 2 options.';
  if (head === 'answer' && !isPbqTemplate(d.type)) {
    if (d.correct.length === 0) return 'Mark the correct answer.';
    return d.type === 'mcq-single' ? 'Mark exactly one correct answer.' : 'Mark at least 2 correct answers, or use "one answer".';
  }
  return `${i.path.join('.') || 'Question'}: ${i.message}`;
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
  const meta = listExams().find((m) => m.code === examCode)!;
  const [draft, setDraft] = useState<Draft | null>(id ? null : newDraft(meta.objectives[0].id));
  const [existing, setExisting] = useState<Question | null>(null);
  const [failed, setFailed] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [preview, setPreview] = useState<{ mcq: string[]; pbq: PartMap }>({ mcq: [], pbq: {} });
  const uid = useId();
  const [newId] = useState(() => `user-${crypto.randomUUID()}`);

  useEffect(() => {
    if (!id) return;
    void repo.getUserQuestions(examCode).then(
      (qs) => {
        const q = qs.find((x) => x.id === id);
        if (!q) return setFailed(true);
        setExisting(q);
        setDraft(fromQuestion(q));
      },
      () => setFailed(true),
    );
  }, [repo, examCode, id]);

  const built = useMemo(
    () => (draft ? buildQuestion(draft, { id: existing?.id ?? newId, exam: examCode, acronyms: existing?.acronyms ?? [] }) : null),
    [draft, existing, newId, examCode],
  );
  const previewKey = built?.question ? JSON.stringify(built.question) : '';
  useEffect(() => setPreview({ mcq: [], pbq: {} }), [previewKey]);

  if (failed) return <LoadError onExit={onDone} />;
  if (!draft || !built) return <p>Loading…</p>;

  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });
  const pbq = isPbqTemplate(draft.type);

  function changeType(type: QuestionType) {
    if (!draft) return;
    if (isPbqTemplate(type)) {
      const s = PBQ_STARTERS[type];
      setDraft({ ...draft, type, payloadText: json(s.payload), answerText: json(s.answer), partExplanationsText: '' });
    } else {
      setDraft({ ...draft, type, correct: type === 'mcq-single' ? draft.correct.slice(0, 1) : draft.correct });
    }
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
    if (!built?.question) return;
    try {
      await repo.upsertUserQuestion(built.question);
      onDone();
    } catch {
      setSaveError('Save failed. Please try again.');
    }
  }

  const errorsId = `${uid}-errors`;
  return (
    <section className="question-editor" aria-labelledby={`${uid}-h`}>
      <h2 id={`${uid}-h`}>{id ? 'Edit question' : 'Add question'}</h2>
      <div className="field">
        <label htmlFor={`${uid}-type`}>Question type</label>
        <select id={`${uid}-type`} value={draft.type} onChange={(e) => changeType(e.currentTarget.value as QuestionType)}>
          {QUESTION_TYPES.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>
      <fieldset>
        <legend>Objectives</legend>
        {meta.objectives.map((o) => (
          <label key={o.id} className="inline">
            <input
              type="checkbox"
              checked={draft.objectiveIds.includes(o.id)}
              onChange={(e) =>
                set({ objectiveIds: e.currentTarget.checked ? [...draft.objectiveIds, o.id] : draft.objectiveIds.filter((x) => x !== o.id) })
              }
            />
            {`${o.id} ${o.title}`}
          </label>
        ))}
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
        <textarea id={`${uid}-stem`} value={draft.stem} onChange={(e) => set({ stem: e.currentTarget.value })} />
      </div>

      {pbq ? (
        <>
          <div className="field">
            <label htmlFor={`${uid}-weight`}>PBQ weight (1–6)</label>
            <select id={`${uid}-weight`} value={draft.pbqWeight} onChange={(e) => set({ pbqWeight: Number(e.currentTarget.value) })}>
              {[1, 2, 3, 4, 5, 6].map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>
          <p className="hint" id={`${uid}-jsonhint`}>
            Edit the example data below. The rules for each template are in docs/pbq-authoring.md.
          </p>
          <div className="field">
            <label htmlFor={`${uid}-payload`}>Payload (JSON)</label>
            <textarea
              id={`${uid}-payload`}
              className="json"
              spellCheck={false}
              aria-describedby={`${uid}-jsonhint`}
              value={draft.payloadText}
              onChange={(e) => set({ payloadText: e.currentTarget.value })}
            />
          </div>
          <div className="field">
            <label htmlFor={`${uid}-answer`}>Answer (JSON)</label>
            <textarea id={`${uid}-answer`} className="json" spellCheck={false} value={draft.answerText} onChange={(e) => set({ answerText: e.currentTarget.value })} />
          </div>
          <div className="field">
            <label htmlFor={`${uid}-parts`}>Part explanations (JSON, optional)</label>
            <textarea
              id={`${uid}-parts`}
              className="json"
              spellCheck={false}
              value={draft.partExplanationsText}
              onChange={(e) => set({ partExplanationsText: e.currentTarget.value })}
            />
          </div>
        </>
      ) : (
        <fieldset>
          <legend>Options</legend>
          {draft.options.map((o, i) => (
            <div key={o.id} className="option-row">
              <input
                type="text"
                aria-label={`Option ${i + 1}`}
                value={o.text}
                onChange={(e) => setOption(i, e.currentTarget.value)}
              />
              <label className="inline">
                <input
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
            </div>
          ))}
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
        <select id={`${uid}-status`} value={draft.status} onChange={(e) => set({ status: e.currentTarget.value as Question['status'] })}>
          <option value="draft">Draft</option>
          <option value="reviewed">Reviewed</option>
          <option value="approved">Approved</option>
        </select>
      </div>

      <div id={errorsId} className="editor-errors">
        <p aria-live="polite">{built.errors.length ? `${built.errors.length} problem(s) to fix before saving:` : 'Ready to save.'}</p>
        {built.errors.length > 0 && (
          <ul>
            {built.errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        )}
      </div>
      <div className="author-actions">
        <button type="button" className="primary" disabled={!built.question} aria-describedby={errorsId} onClick={() => void save()}>
          Save question
        </button>
        <button type="button" onClick={onDone}>
          Cancel
        </button>
      </div>
      {saveError && <p role="alert">{saveError}</p>}

      {built.question && (
        <section className="editor-preview" aria-label="Preview">
          <h3>Preview</h3>
          {pbq ? (
            <PbqView item={{ question: built.question }} value={preview.pbq} onChange={(v) => setPreview({ ...preview, pbq: v })} />
          ) : (
            <McqView item={{ question: built.question }} selected={preview.mcq} onChange={(v) => setPreview({ ...preview, mcq: v })} />
          )}
        </section>
      )}
    </section>
  );
}
