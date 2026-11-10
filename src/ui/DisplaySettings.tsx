import { useEffect, useId, useState } from 'react';
import type { Repo } from '../storage';
import { applyDisplay, loadDisplay, MOTION_SETTING, TEXT_SIZE_SETTING, TEXT_SIZES, THEME_SETTING, type Display, type TextSize, type Theme } from './display';

const LABELS: Record<Theme, string> = { system: 'Match system', light: 'Light', dark: 'Dark' };

const SIZE_LABELS: Record<TextSize, string> = { small: 'Small', normal: 'Normal', large: 'Large', larger: 'Extra large' };

export function DisplaySettings({ repo }: { repo: Repo }) {
  const [state, setState] = useState<Display | null>(null);
  const [error, setError] = useState('');
  const name = useId();
  const sizeName = useId();

  useEffect(() => {
    void loadDisplay(repo).then(setState);
  }, [repo]);

  async function save(next: Display) {
    setState(next);
    applyDisplay(next.theme, next.reducedMotion, next.textSize);
    try {
      await repo.setSetting(THEME_SETTING, next.theme);
      await repo.setSetting(MOTION_SETTING, next.reducedMotion);
      await repo.setSetting(TEXT_SIZE_SETTING, next.textSize);
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
      <fieldset>
        <legend>Text size</legend>
        {TEXT_SIZES.map((z) => (
          <label key={z}>
            <input type="radio" name={sizeName} checked={state.textSize === z} onChange={() => void save({ ...state, textSize: z })} />
            {SIZE_LABELS[z]}
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
