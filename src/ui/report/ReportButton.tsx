import { reportConfig } from '../../report/config';
import { usePanels, type ReportContext } from '../panels/PanelProvider';

export type { ReportContext };

/** Opens the report panel. Hidden when reports are off (no relay, or the single-file copy) and during a mock exam. */
export function ReportButton({ context, label = 'Report a problem' }: { context: ReportContext; label?: string }) {
  const { mockDeadline, openReport } = usePanels();
  if (!reportConfig() || mockDeadline !== null) return null;
  return (
    <button type="button" className="report-button" aria-haspopup="dialog" onClick={(e) => openReport(context, e.currentTarget)}>
      {label}
    </button>
  );
}
