import { useEffect, useId, useRef, useState } from 'react';
import { reportConfig } from '../../report/config';
import type { ReportDraft } from '../../report/contract';
import type { OutboxReport } from '../../report/outbox';
import { sendReport } from '../../report/send';
import { SPAM_CHECK_MESSAGE, useTurnstile } from '../../report/turnstile';
import type { Repo } from '../../storage';
import { useLoad } from '../kit';
import { Panel } from '../panels/Panel';
import { usePanels } from '../panels/PanelProvider';
import { IssueLink, ReportForm } from './ReportForm';
import './report.css';

export const STILL_OFFLINE = 'You are offline. Try again when you are back online.';
export const RELAY_DOWN = 'The report service could not be reached. Try again later.';

type ItemStatus = { kind: 'idle' } | { kind: 'busy' } | { kind: 'error'; text: string } | { kind: 'sent'; number: number; url: string };

interface ItemProps {
  report: OutboxReport;
  repo: Repo;
  url: string;
  getToken(): Promise<string>;
  onChange(): void;
  sending: string | null;
  setSending(key: string | null): void;
}

/** A saved report, sent with a fresh token. Its id is unchanged, so the relay drops a repeat. */
function WaitingItem({ report, repo, url, getToken, onChange, sending, setSending }: ItemProps) {
  const [status, setStatus] = useState<ItemStatus>({ kind: 'idle' });
  const resultRef = useRef<HTMLParagraphElement>(null);
  const busy = status.kind === 'busy';
  const blocked = busy || (sending !== null && sending !== report.id);

  // Move focus to the result, so the learner hears it and is not left on a button that has gone.
  useEffect(() => {
    if (status.kind === 'sent' || status.kind === 'error') resultRef.current?.focus();
  }, [status]);

  async function send() {
    if (blocked) return;
    if (!navigator.onLine) {
      setStatus({ kind: 'error', text: STILL_OFFLINE });
      return;
    }
    setStatus({ kind: 'busy' });
    setSending(report.id);
    try {
      let token: string;
      try {
        token = await getToken();
      } catch {
        setStatus({ kind: 'error', text: SPAM_CHECK_MESSAGE });
        return;
      }
      const draft: Partial<OutboxReport> & ReportDraft = { ...report };
      delete draft.savedAt;
      const out = await sendReport(url, { ...draft, turnstileToken: token });
      if (out.kind === 'sent') {
        await repo.deleteOutbox(report.id);
        setStatus({ kind: 'sent', number: out.reply.number, url: out.reply.url });
      } else {
        setStatus({ kind: 'error', text: out.kind === 'failed' ? out.message : RELAY_DOWN });
      }
    } catch {
      setStatus({ kind: 'error', text: RELAY_DOWN });
    } finally {
      setSending(null);
    }
  }

  async function discard() {
    if (blocked) return;
    if (!window.confirm(`Discard the report "${report.title}"? This cannot be undone.`)) return;
    await repo.deleteOutbox(report.id);
    onChange();
  }

  return (
    <li className="report-waiting-item">
      <span className="report-waiting-title">{report.title}</span>{' '}
      <span className="hint">{`saved ${new Date(report.savedAt).toLocaleString()}`}</span>
      {status.kind === 'sent' ? (
        <p ref={resultRef} tabIndex={-1} role="status">
          Sent, thank you. <IssueLink number={status.number} url={status.url} />
        </p>
      ) : (
        <span className="report-waiting-actions">
          <button type="button" aria-disabled={blocked} aria-label={`Send ${report.title}`} onClick={() => void send()}>
            {busy ? 'Sending…' : 'Send'}
          </button>
          <button type="button" aria-disabled={blocked} aria-label={`Discard ${report.title}`} onClick={() => void discard()}>
            Discard
          </button>
        </span>
      )}
      {status.kind === 'error' && (
        <p ref={resultRef} tabIndex={-1} role="alert" className="report-error">
          {status.text}
        </p>
      )}
    </li>
  );
}

/** The report form over the current screen, with any reports saved while offline. */
export function ReportPanel({ repo }: { repo: Repo }) {
  const { close, reportContext } = usePanels();
  const config = reportConfig();
  const { boxRef, getToken, needsAction } = useTurnstile(config?.siteKey ?? '');
  const [waiting, reload] = useLoad(() => repo.listOutbox(), [repo]);
  // One send at a time: Turnstile has one widget, and a second token request would cancel the first.
  const [sending, setSending] = useState<string | null>(null);
  const headingId = useId();
  return (
    <Panel kind="report" title="Report a problem or request a feature" onClose={() => close()}>
      {config ? (
        <ReportForm
          repo={repo}
          context={reportContext}
          url={config.url}
          getToken={getToken}
          onChange={() => void reload()}
          sending={sending}
          setSending={setSending}
        />
      ) : (
        <p>Reports are not available in this copy of the app.</p>
      )}
      {/* Mounted before it is needed, so screen readers announce the text when it appears. */}
      <p role="status" className="report-check-hint">
        {needsAction ? 'Complete the check below to send.' : ''}
      </p>
      <div ref={boxRef} className="report-turnstile" />
      {config && waiting && waiting.length > 0 && (
        <section className="report-waiting" aria-labelledby={headingId}>
          <h3 id={headingId}>Waiting to send</h3>
          <ul>
            {waiting.map((r) => (
              <WaitingItem
                key={r.id}
                report={r}
                repo={repo}
                url={config.url}
                getToken={getToken}
                onChange={() => void reload()}
                sending={sending}
                setSending={setSending}
              />
            ))}
          </ul>
        </section>
      )}
    </Panel>
  );
}
