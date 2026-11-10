import { useState } from 'react';
import type { Repo } from '../storage';
import { BackupControls } from './BackupControls';
import { applyDisplay, loadDisplay } from './display';
import { DisplaySettings } from './DisplaySettings';
import { InstallApp } from './InstallApp';
import { MarkSettings } from './marks/MarkSettings';
import { applyMarks, loadMarks } from './marks/prefs';
import { applyTips, loadTips } from './tips/prefs';
import { TipSettings } from './tips/TipSettings';

/** Every setting. `backup` adds import and export, which only the full Settings page shows. */
export function SettingsForm({ repo, backup }: { repo: Repo; backup: boolean }) {
  // A backup carries display settings: after an import, apply them and reload the form.
  const [imports, setImports] = useState(0);
  async function onImported() {
    const d = await loadDisplay(repo);
    applyDisplay(d.theme, d.reducedMotion, d.textSize);
    applyMarks(await loadMarks(repo));
    applyTips(await loadTips(repo), repo);
    setImports((n) => n + 1);
  }
  return (
    <>
      <DisplaySettings key={imports} repo={repo} />
      <MarkSettings key={`marks-${imports}`} repo={repo} />
      <TipSettings key={`tips-${imports}`} repo={repo} />
      <InstallApp />
      {backup &&<BackupControls repo={repo} onImported={() => void onImported()} />}
    </>
  );
}
