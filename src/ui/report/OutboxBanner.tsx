import { useEffect, useRef } from 'react';
import { reportConfig } from '../../report/config';
import type { Repo } from '../../storage';
import { useLoad } from '../kit';
import { usePanels } from '../panels/PanelProvider';
import { plural } from '../plural';
import './report.css';

/** Says how many reports are waiting. Its button shows them in the report panel; nothing sends by itself. */
export function OutboxBanner({ repo }: { repo: Repo }) {
  const { current, mockDeadline, openReport } = usePanels();
  const [waiting, reload] = useLoad(() => repo.listOutbox(), [repo]);

  useEffect(() => {
    const onOnline = () => void reload();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [reload]);

  // The report panel can send or discard; count again once it closes.
  useEffect(() => {
    if (current === null) void reload();
  }, [current, reload]);

  const n = waiting?.length ?? 0;
  // When the last report goes, the banner button goes with it; put focus on the page heading, not on nothing.
  const last = useRef(n);
  useEffect(() => {
    const had = last.current;
    last.current = n;
    if (had > 0 && n === 0 && (document.activeElement === document.body || document.activeElement === null)) {
      document.querySelector<HTMLElement>('main h2[tabindex="-1"]')?.focus();
    }
  }, [n]);

  if (!reportConfig()) return null;
  const show = n > 0 && mockDeadline === null;
  // The live region stays mounted so the count is announced when it appears.
  return (
    <div role="status" className={show ? 'outbox-banner' : undefined}>
      {show && (
        <>
          <span>{`${plural(n, 'report')} waiting to send`}</span>{' '}
          <button type="button" aria-haspopup="dialog" onClick={(e) => openReport({}, e.currentTarget)}>
            Send or discard
          </button>
        </>
      )}
    </div>
  );
}
