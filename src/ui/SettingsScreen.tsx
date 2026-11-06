import { useState } from 'react';
import type { Repo } from '../storage';
import { BackupControls } from './BackupControls';
import { applyDisplay, loadDisplay } from './display';
import { DisplaySettings } from './DisplaySettings';
import { useFocusHeading } from './kit';
import { MarkSettings } from './marks/MarkSettings';
import { applyMarks, loadMarks } from './marks/prefs';
import { applyTips, loadTips } from './tips/prefs';
import { TipSettings } from './tips/TipSettings';

/** App-wide settings: display and backups. */
export function SettingsScreen({ repo }: { repo: Repo }) {
  const headingRef = useFocusHeading();
  // A backup carries display settings: after an import, apply them and reload the form.
  const [imports, setImports] = useState(0);
  async function onImported() {
    const d = await loadDisplay(repo);
    applyDisplay(d.theme, d.reducedMotion);
    applyMarks(await loadMarks(repo));
    applyTips(await loadTips(repo), repo);
    setImports((n) => n + 1);
  }
  return (
    <section aria-labelledby="settings-h">
      <h2 id="settings-h" ref={headingRef} tabIndex={-1}>Settings</h2>
      <DisplaySettings key={imports} repo={repo} />
      <MarkSettings key={`marks-${imports}`} repo={repo} />
      <TipSettings key={`tips-${imports}`} repo={repo} />
      <BackupControls repo={repo} onImported={() => void onImported()} />
    </section>
  );
}
