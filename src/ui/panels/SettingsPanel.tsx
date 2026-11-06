import type { Repo } from '../../storage';
import { SettingsForm } from '../SettingsForm';
import { ReportButton } from '../report/ReportButton';
import { Panel } from './Panel';
import { usePanels } from './PanelProvider';

/** Settings over the current screen: everything but backup. During a mock, a note says where marks and tips apply. */
export function SettingsPanel({ repo }: { repo: Repo }) {
  const { close, mockDeadline } = usePanels();
  return (
    <Panel kind="settings" title="Settings" onClose={() => close()}>
      {mockDeadline !== null && <p className="panel-note">Answer marks and tips apply in practice, cram and results.</p>}
      <SettingsForm repo={repo} backup={false} />
      <p>
        <ReportButton context={{}} label="Report a bug or request a feature" />
      </p>
    </Panel>
  );
}
