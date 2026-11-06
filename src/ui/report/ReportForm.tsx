import { useEffect, useId, useRef, useState } from 'react';
import { EXAM_RE, LIMITS, QUESTION_ID_RE, type ReportDraft, type ReportType } from '../../report/contract';
import { OutboxFullError, toOutboxReport } from '../../report/outbox';
import { sendReport } from '../../report/send';
import { SPAM_CHECK_MESSAGE } from '../../report/turnstile';
import type { Repo } from '../../storage';
import type { ReportContext } from '../panels/PanelProvider';
import { plural } from '../plural';

export const SAVED_MESSAGE = 'Saved on this device. You can send it when you are back online.';

const TYPE_LABELS: Record<ReportType, string> = {
  question: 'A problem with this question',
  bug: 'A bug in the app',
  feature: 'A feature request',
};

type Status =
  | { kind: 'idle' }
  | { kind: 'busy' }
  | { kind: 'error'; text: string }
  | { kind: 'sent'; number: number; url: string }
  | { kind: 'saved' };

type Field = 'title' | 'details';

function errorText(e: unknown): string {
  return e instanceof Error && e.message ? e.message : 'Something went wrong. Try again.';
}

/** The link to a filed issue. It opens GitHub in a new tab. */
export function IssueLink({ number, url }: { number: number; url: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`View issue #${number} (opens GitHub in a new tab)`}>
      {`View issue #${number}`}
    </a>
  );
}

interface Props {
  repo: Repo;
  context: ReportContext;
  url: string;
  getToken(): Promise<string>;
  /** Called after the outbox changes. */
  onChange(): void;
}

/** One report. The id is made once per draft, so a retry reaches the relay as the same report. */
export function ReportForm({ repo, context, url, getToken, onChange }: Props) {
  const uid = useId();
  const questionId = context.questionId && QUESTION_ID_RE.test(context.questionId) ? context.questionId : undefined;
  const types: ReportType[] = questionId ? ['question', 'bug', 'feature'] : ['bug', 'feature'];

  const [id, setId] = useState(() => crypto.randomUUID());
  const [type, setType] = useState<ReportType>(types[0]);
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [contact, setContact] = useState('');
  const [technical, setTechnical] = useState(true);
  const [showErrors, setShowErrors] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [focusAt, setFocusAt] = useState(0);
  const summaryRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);

  const exam = context.exam && EXAM_RE.test(context.exam) ? context.exam : undefined;
  const userAgent = navigator.userAgent.slice(0, 400);
  const errors: { field: Field; text: string }[] = [];
  if (!title.trim()) errors.push({ field: 'title', text: 'Enter a title' });
  if (!details.trim()) errors.push({ field: 'details', text: 'Enter the details' });
  const fieldId = (f: Field) => `${uid}-${f}`;
  const errorFor = (f: Field) => (showErrors ? errors.find((e) => e.field === f) : undefined);

  useEffect(() => {
    if (focusAt === 0) return;
    (summaryRef.current ?? doneRef.current)?.focus();
  }, [focusAt]);

  function draft(): ReportDraft {
    return {
      id,
      type,
      title: title.trim(),
      details: details.trim(),
      ...(contact.trim() ? { contact: contact.trim() } : {}),
      version: __APP_VERSION__,
      // A question report always names its question; for the other types it is a technical detail.
      ...(questionId && (type === 'question' || technical) ? { questionId } : {}),
      ...(technical ? { context: { ...(exam ? { exam } : {}), ...(context.mode ? { mode: context.mode } : {}), userAgent } } : {}),
    };
  }

  async function save(d: ReportDraft) {
    await repo.putOutbox(toOutboxReport(d));
    onChange();
    setStatus({ kind: 'saved' });
    setFocusAt((n) => n + 1);
  }

  async function send() {
    if (status.kind === 'busy') return;
    if (errors.length > 0) {
      setShowErrors(true);
      setFocusAt((n) => n + 1);
      return;
    }
    setShowErrors(false);
    const d = draft();
    setStatus({ kind: 'busy' });
    try {
      if (!navigator.onLine) {
        await save(d);
        return;
      }
      let token: string;
      try {
        token = await getToken();
      } catch {
        setStatus({ kind: 'error', text: SPAM_CHECK_MESSAGE });
        return;
      }
      const out = await sendReport(url, { ...d, turnstileToken: token });
      if (out.kind === 'sent') {
        await repo.deleteOutbox(d.id);
        onChange();
        setStatus({ kind: 'sent', number: out.reply.number, url: out.reply.url });
        setFocusAt((n) => n + 1);
      } else if (out.kind === 'offline') {
        await save(d);
      } else {
        setStatus({ kind: 'error', text: out.message });
      }
    } catch (e) {
      setStatus({ kind: 'error', text: e instanceof OutboxFullError ? e.message : errorText(e) });
    }
  }

  function startAnother() {
    setId(crypto.randomUUID());
    setType(types[0]);
    setTitle('');
    setDetails('');
    setContact('');
    setTechnical(true);
    setStatus({ kind: 'idle' });
  }

  if (status.kind === 'sent' || status.kind === 'saved') {
    return (
      <div ref={doneRef} tabIndex={-1} className="report-done">
        {status.kind === 'sent' ? (
          <>
            <p>Sent, thank you.</p>
            <p>
              <IssueLink number={status.number} url={status.url} />
            </p>
          </>
        ) : (
          <p>{SAVED_MESSAGE}</p>
        )}
        <button type="button" onClick={startAnother}>
          Start another report
        </button>
      </div>
    );
  }

  const invalid = (f: Field) => {
    const e = errorFor(f);
    return e ? { 'aria-invalid': true as const, 'aria-describedby': `${fieldId(f)}-err ${fieldId(f)}-hint` } : { 'aria-describedby': `${fieldId(f)}-hint` };
  };

  return (
    <form
      className="report-form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
    >
      {showErrors && errors.length > 0 && (
        <div ref={summaryRef} tabIndex={-1} className="editor-errors error-summary" role="group" aria-labelledby={`${uid}-sum`}>
          <h3 id={`${uid}-sum`}>{`${plural(errors.length, 'problem')} to fix before sending`}</h3>
          <ul>
            {errors.map((e) => (
              <li key={e.field}>
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

      <fieldset className="field">
        <legend>What are you reporting?</legend>
        {types.map((t) => (
          <label key={t} className="report-choice">
            <input type="radio" name={`${uid}-type`} value={t} checked={type === t} onChange={() => setType(t)} />
            {TYPE_LABELS[t]}
          </label>
        ))}
      </fieldset>

      <div className="field">
        <label htmlFor={fieldId('title')}>Title</label>
        <input
          id={fieldId('title')}
          type="text"
          value={title}
          maxLength={LIMITS.title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          {...invalid('title')}
        />
        <p id={`${fieldId('title')}-hint`} className="hint">{`${LIMITS.title - title.length} characters left`}</p>
        {errorFor('title') && <p id={`${fieldId('title')}-err`} className="report-field-error">{errorFor('title')!.text}</p>}
      </div>

      <div className="field">
        <label htmlFor={fieldId('details')}>Details</label>
        <textarea
          id={fieldId('details')}
          rows={6}
          value={details}
          maxLength={LIMITS.details}
          onChange={(e) => setDetails(e.currentTarget.value)}
          {...invalid('details')}
        />
        <p id={`${fieldId('details')}-hint`} className="hint">What happened, and what you expected.</p>
        {errorFor('details') && <p id={`${fieldId('details')}-err`} className="report-field-error">{errorFor('details')!.text}</p>}
      </div>

      <div className="field">
        <label htmlFor={`${uid}-contact`}>Contact (optional)</label>
        <input
          id={`${uid}-contact`}
          type="text"
          value={contact}
          maxLength={LIMITS.contact}
          aria-describedby={`${uid}-contact-hint`}
          onChange={(e) => setContact(e.currentTarget.value)}
        />
        <p id={`${uid}-contact-hint`} className="hint">Email or GitHub name. Issues are public, so this will be public too.</p>
      </div>

      <div className="field">
        <label className="report-choice">
          <input type="checkbox" checked={technical} aria-describedby={`${uid}-tech`} onChange={(e) => setTechnical(e.currentTarget.checked)} />
          Include technical details
        </label>
        <ul id={`${uid}-tech`} className="hint report-tech">
          <li>{`App version: ${__APP_VERSION__}`}</li>
          {exam && <li>{`Exam: ${exam}`}</li>}
          {context.mode && <li>{`Mode: ${context.mode}`}</li>}
          {questionId && <li>{`Question: ${questionId}`}</li>}
          <li>{`Browser: ${userAgent}`}</li>
        </ul>
      </div>

      <p>Your report becomes a public issue on GitHub.</p>
      {status.kind === 'error' && (
        <p role="alert" className="report-error">
          {status.text}
        </p>
      )}
      <button type="submit" disabled={status.kind === 'busy'}>
        {status.kind === 'busy' ? 'Sending…' : 'Send'}
      </button>
    </form>
  );
}
