import { useEffect, useId, useState } from 'react';
import type { Repo } from '../storage';
import { applyDisplay, loadDisplay, MOTION_SETTING, THEME_SETTING, type Theme } from './display';

const LABELS: Record<Theme, string> = { system: 'Match system', light: 'Light', dark: 'Dark' };

export function DisplaySettings({ repo }: { repo: Repo }) {
  const [state, setState] = useState<{ theme: Theme; reducedMotion: boolean } | null>(null);
  const [error, setError] = useState('');
  const name = useId();

  useEffect(() => {
    void loadDisplay(repo).then(setState);
  }, [repo]);

  async function save(next: { theme: Theme; reducedMotion: boolean }) {
    setState(next);
    applyDisplay(next.theme, next.reducedMotion);
    try {
      await repo.setSetting(THEME_SETTING, next.theme);
      await repo.setSetting(MOTION_SETTING, next.reducedMotion);
      setError('');
    } catch {
      setError('Could not save this choice.');
    }
  }

  if (!state) return null;
  return (
    <div className="display-settings">
      <fieldset>
        <legend>Theme</legend>
        {(Object.keys(LABELS) as Theme[]).map((t) => (
          <label key={t}>
            <input type="radio" name={name} checked={state.theme === t} onChange={() => void save({ ...state, theme: t })} />
            {LABELS[t]}
          </label>
        ))}
      </fieldset>
      <label className="check">
        <input type="checkbox" checked={state.reducedMotion} onChange={(e) => void save({ ...state, reducedMotion: e.target.checked })} />
        Reduce motion
      </label>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
