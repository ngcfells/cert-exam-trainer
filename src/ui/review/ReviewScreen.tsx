import { useId, useMemo, useState } from 'react';
import { getBundledQuestions } from '../../banks';
import {
  CONTENT_TARGETS,
  answerBalance,
  coverage,
  longestOptionTell,
  nearDuplicates,
  objectiveQuotas,
  pbqTypeCounts,
} from '../../content';
import { PBQ_TEMPLATES, isPbqTemplate } from '../../domain/pbq';
import { QUESTION_TYPES, questionSchema } from '../../domain/schema';
import type { Question } from '../../domain/types';
import type { ItemResponse } from '../../exam/scoring';
import { ItemReview } from '../exam/ItemReview';
import { metaFor, pct, QuestionView, Table } from '../kit';

const STATUSES = ['approved', 'reviewed', 'draft', 'all'] as const;

/** Saves one bank item through the dev server's review plugin; returns an error message or ''. */
async function postItem(question: Question, note?: string): Promise<string> {
  try {
    const res = await fetch('/__review/item', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(note ? { question, note } : { question }),
    });
    return res.ok ? '' : (await res.text()) || `Save failed (${res.status}).`;
  } catch {
    return 'Save failed: is the dev server running?';
  }
}

function BankChecks({ examCode, questions }: { examCode: string; questions: Question[] }) {
  const meta = metaFor(examCode);
  const approved = questions.filter((q) => q.status === 'approved');
  const quotas = objectiveQuotas(meta, { mcq: CONTENT_TARGETS.mcq, pbq: CONTENT_TARGETS.pbq });
  const cov = coverage(meta, approved);
  const types = pbqTypeCounts(approved);
  const mcq = approved.filter((q) => !isPbqTemplate(q.type)).length;
  const balance = answerBalance(approved);
  return (
    <section aria-label="Bank checks">
      <h3>Bank checks (approved items)</h3>
      <ul>
        <li>MCQs: {mcq} of {CONTENT_TARGETS.mcq}</li>
        <li>PBQs: {approved.length - mcq} of {CONTENT_TARGETS.pbq}</li>
        <li>
          PBQ types (need {CONTENT_TARGETS.perPbqType} each): {PBQ_TEMPLATES.map((t) => `${t.slice(4)} ${types[t]}`).join(', ')}
        </li>
        <li>Near duplicates: {nearDuplicates(questions).length}</li>
        <li>
          Key position: {Object.values(balance).map(pct).join(' / ')}; key is longest option: {pct(longestOptionTell(approved))}
        </li>
      </ul>
      <Table
        caption="Objective coverage"
        head={['Objective', 'MCQs', 'PBQs']}
        rows={meta.objectives.map((o) => [o.id, o.id, `${cov[o.id].mcq} / ${quotas[o.id].mcq}`, `${cov[o.id].pbq} / ${quotas[o.id].pbq}`])}
      />
    </section>
  );
}

/** Dev-only: approve, edit or reject bundled items. Writes go to the bank JSON files via the review plugin. */
export function ReviewScreen({
  examCode,
  questions: initial,
  onExit,
}: {
  examCode: string;
  /** Defaults to every bundled item, drafts included. */
  questions?: Question[];
  onExit: () => void;
}) {
  const meta = metaFor(examCode);
  const [questions, setQuestions] = useState<Question[]>(() => initial ?? getBundledQuestions(examCode, { includeDrafts: true }));
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('approved');
  const [objective, setObjective] = useState('all');
  const [type, setType] = useState('all');
  const [index, setIndex] = useState(0);
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<ItemResponse>();
  const uid = useId();

  const shown = useMemo(
    () =>
      questions.filter(
        (q) =>
          (status === 'all' || q.status === status) &&
          (objective === 'all' || q.objectiveIds[0] === objective) &&
          (type === 'all' || q.type === type),
      ),
    [questions, status, objective, type],
  );
  const at = Math.min(index, Math.max(shown.length - 1, 0));
  const q = shown[at];

  function moveTo(i: number) {
    setIndex(i);
    setNote('');
    setEditing(null);
    setError('');
    setPreview(undefined);
  }

  async function save(next: Question, opts: { note?: string; advance: boolean }) {
    setBusy(true);
    const failure = await postItem(next, opts.note);
    setBusy(false);
    if (failure) return setError(failure);
    const stillShown = status === 'all' || next.status === status;
    setQuestions((qs) => qs.map((x) => (x.id === q.id ? next : x)));
    moveTo(opts.advance && stillShown ? at + 1 : at);
  }

  function reject() {
    if (!note.trim()) return setError('Say why you are rejecting it.');
    void save({ ...q, status: 'draft' }, { note: note.trim(), advance: true });
  }

  function saveEdit() {
    let parsed: unknown;
    try {
      parsed = JSON.parse(editing ?? '');
    } catch {
      return setError('The JSON does not parse.');
    }
    const result = questionSchema.safeParse(parsed);
    if (!result.success) return setError(result.error.issues.map((i) => `${i.path.join('.') || 'Item'}: ${i.message}`).join('; '));
    void save(result.data as Question, { advance: false });
  }

  const filter = (label: string, value: string, set: (v: string) => void, options: [string, string][]) => (
    <label>
      {label}{' '}
      <select
        value={value}
        onChange={(e) => {
          set(e.target.value);
          moveTo(0);
        }}
      >
        {options.map(([v, text]) => (
          <option key={v} value={v}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <section aria-labelledby={`${uid}-h`}>
      <h2 id={`${uid}-h`}>Review bank: {meta.code} (dev only)</h2>
      <p>
        <button type="button" onClick={onExit}>
          Back
        </button>
      </p>
      <div className="review-filters">
        {filter('Status', status, (v) => setStatus(v as (typeof STATUSES)[number]), STATUSES.map((s) => [s, s]))}
        {filter('Objective', objective, setObjective, [['all', 'all'], ...meta.objectives.map((o): [string, string] => [o.id, o.id])])}
        {filter('Type', type, setType, [['all', 'all'], ...QUESTION_TYPES.map((t): [string, string] => [t, t])])}
      </div>
      {error && <p role="alert">{error}</p>}
      {!q ? (
        <p>No items match.</p>
      ) : (
        <article aria-label="Item">
          <p>
            <span>{`Item ${at + 1} of ${shown.length}`}</span> · <code>{q.id}</code> · {q.type} · objective {q.objectiveIds.join(', ')} · difficulty {q.difficulty} ·{' '}
            {q.status}
          </p>
          <p>
            <button type="button" disabled={at === 0} onClick={() => moveTo(at - 1)}>
              Previous
            </button>{' '}
            <button type="button" disabled={at >= shown.length - 1} onClick={() => moveTo(at + 1)}>
              Next
            </button>
          </p>
          {editing !== null ? (
            <>
              <label htmlFor={`${uid}-json`}>Item JSON</label>
              <textarea id={`${uid}-json`} rows={24} value={editing} onChange={(e) => setEditing(e.target.value)} />
              <p>
                <button type="button" className="primary" disabled={busy} onClick={saveEdit}>
                  Save
                </button>{' '}
                <button type="button" onClick={() => moveTo(at)}>
                  Cancel
                </button>
              </p>
            </>
          ) : (
            <>
              <QuestionView item={{ question: q }} response={preview} onChange={setPreview} />
              <section aria-label="Answer key">
                <h3>Answer key</h3>
                <ItemReview q={q} response={undefined} showStem={false} />
              </section>
              <p>
                <button type="button" className="primary" disabled={busy} onClick={() => void save({ ...q, status: 'approved' }, { advance: true })}>
                  Approve
                </button>{' '}
                <button type="button" disabled={busy} onClick={() => setEditing(JSON.stringify(q, null, 2))}>
                  Edit
                </button>
              </p>
              <label htmlFor={`${uid}-note`}>Reject note</label>
              <textarea id={`${uid}-note`} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
              <p>
                <button type="button" disabled={busy} onClick={reject}>
                  Reject
                </button>
              </p>
            </>
          )}
        </article>
      )}
      <BankChecks examCode={examCode} questions={questions} />
    </section>
  );
}
