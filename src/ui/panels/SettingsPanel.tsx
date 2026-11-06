import type { Repo } from '../../storage';
import { formatTime } from '../exam/formatTime';
import { useCountdown } from '../kit';
import { SettingsForm } from '../SettingsForm';
import { Panel } from './Panel';
import { usePanels } from './PanelProvider';

function MockClock({ deadline }: { deadline: number }) {
  const { remaining } = useCountdown(deadline, Date.now, () => {});
  return <p className="panel-clock">Time left: {formatTime(remaining)}</p>;
}

/** Settings over the current screen: everything but backup. During a mock, the time left shows first. */
export function SettingsPanel({ repo }: { repo: Repo }) {
  const { close, mockDeadline } = usePanels();
  return (
    <Panel kind="settings" title="Settings" onClose={() => close()}>
      {mockDeadline !== null && (
        <>
          <MockClock deadline={mockDeadline} />
          <p className="panel-note">Answer marks and tips apply in practice, cram and results.</p>
        </>
      )}
      <SettingsForm repo={repo} backup={false} />
    </Panel>
  );
}
