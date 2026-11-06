import { useEffect } from 'react';
import { reportConfig } from '../../report/config';
import type { Repo } from '../../storage';
import { useLoad } from '../kit';
import { usePanels } from '../panels/PanelProvider';
import { plural } from '../plural';
import './report.css';

/** Says how many reports are waiting. Open shows them in the report panel; nothing sends by itself. */
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

  if (!reportConfig()) return null;
  const n = waiting?.length ?? 0;
  const show = n > 0 && mockDeadline === null;
  // The live region stays mounted so the count is announced when it appears.
  return (
    <div role="status" className={show ? 'outbox-banner' : undefined}>
      {show && (
        <>
          <span>{`${plural(n, 'report')} waiting to send`}</span>{' '}
          <button type="button" aria-haspopup="dialog" onClick={(e) => openReport({}, e.currentTarget)}>
            Open
          </button>
        </>
      )}
    </div>
  );
}
