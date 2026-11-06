import { useId, useState } from 'react';
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

/** A saved report, sent with a fresh token. Its id is unchanged, so the relay drops a repeat. */
function WaitingItem({ report, repo, url, getToken, onChange }: { report: OutboxReport; repo: Repo; url: string; getToken(): Promise<string>; onChange(): void }) {
  const [status, setStatus] = useState<ItemStatus>({ kind: 'idle' });

  async function send() {
    if (!navigator.onLine) {
      setStatus({ kind: 'error', text: STILL_OFFLINE });
      return;
    }
    setStatus({ kind: 'busy' });
    let token: string;
    try {
      token = await getToken();
    } catch {
      setStatus({ kind: 'error', text: SPAM_CHECK_MESSAGE });
      return;
    }
    const draft: Partial<OutboxReport> & ReportDraft = { ...report };
    delete draft.savedAt;
    try {
      const out = await sendReport(url, { ...draft, turnstileToken: token });
      if (out.kind === 'sent') {
        await repo.deleteOutbox(report.id);
        setStatus({ kind: 'sent', number: out.reply.number, url: out.reply.url });
      } else {
        setStatus({ kind: 'error', text: out.kind === 'offline' ? RELAY_DOWN : out.message });
      }
    } catch {
      setStatus({ kind: 'error', text: RELAY_DOWN });
    }
  }

  async function discard() {
    if (!window.confirm(`Discard the report "${report.title}"? This cannot be undone.`)) return;
    await repo.deleteOutbox(report.id);
    onChange();
  }

  return (
    <li className="report-waiting-item">
      <span className="report-waiting-title">{report.title}</span>{' '}
      <span className="hint">{`saved ${new Date(report.savedAt).toLocaleString()}`}</span>
      {status.kind === 'sent' ? (
        <p>
          Sent, thank you. <IssueLink number={status.number} url={status.url} />
        </p>
      ) : (
        <span className="report-waiting-actions">
          <button type="button" disabled={status.kind === 'busy'} aria-label={`Send ${report.title}`} onClick={() => void send()}>
            {status.kind === 'busy' ? 'Sending…' : 'Send'}
          </button>
          <button type="button" disabled={status.kind === 'busy'} aria-label={`Discard ${report.title}`} onClick={() => void discard()}>
            Discard
          </button>
        </span>
      )}
      {status.kind === 'error' && (
        <p role="alert" className="report-error">
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
  const { boxRef, getToken } = useTurnstile(config?.siteKey ?? '');
  const [waiting, reload] = useLoad(() => repo.listOutbox(), [repo]);
  const headingId = useId();
  return (
    <Panel kind="report" title="Report a problem or request a feature" onClose={() => close()}>
      {config ? (
        <ReportForm repo={repo} context={reportContext} url={config.url} getToken={getToken} onChange={() => void reload()} />
      ) : (
        <p>Reports are not available in this copy of the app.</p>
      )}
      <div ref={boxRef} className="report-turnstile" />
      {config && waiting && waiting.length > 0 && (
        <section className="report-waiting" aria-labelledby={headingId}>
          <h3 id={headingId}>Waiting to send</h3>
          <ul>
            {waiting.map((r) => (
              <WaitingItem key={r.id} report={r} repo={repo} url={config.url} getToken={getToken} onChange={() => void reload()} />
            ))}
          </ul>
        </section>
      )}
    </Panel>
  );
}
