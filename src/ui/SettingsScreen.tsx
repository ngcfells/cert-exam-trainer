import type { Repo } from '../storage';
import { useFocusHeading } from './kit';
import { SettingsForm } from './SettingsForm';

/** App-wide settings: display and backups. */
export function SettingsScreen({ repo }: { repo: Repo }) {
  const headingRef = useFocusHeading();
  return (
    <section aria-labelledby="settings-h">
      <h2 id="settings-h" ref={headingRef} tabIndex={-1}>Settings</h2>
      <SettingsForm repo={repo} backup />
    </section>
  );
}
