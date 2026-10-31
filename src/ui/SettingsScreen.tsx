import type { Repo } from '../storage';
import { BackupControls } from './BackupControls';
import { DisplaySettings } from './DisplaySettings';
import { useFocusHeading } from './kit';

/** App-wide settings: display and backups. */
export function SettingsScreen({ repo }: { repo: Repo }) {
  const headingRef = useFocusHeading();
  return (
    <section aria-labelledby="settings-h">
      <h2 id="settings-h" ref={headingRef} tabIndex={-1}>Settings</h2>
      <DisplaySettings repo={repo} />
      <BackupControls repo={repo} onImported={() => {}} />
    </section>
  );
}
