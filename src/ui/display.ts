import type { Repo } from '../storage';

export const THEME_SETTING = 'theme';
export const MOTION_SETTING = 'reducedMotion';

export type Theme = 'system' | 'light' | 'dark';
const THEMES: readonly Theme[] = ['system', 'light', 'dark'];

/** Theme and motion live on <html> so the stylesheet can key off them. */
export function applyDisplay(theme: Theme, reducedMotion: boolean): void {
  const ds = document.documentElement.dataset;
  if (theme === 'system') delete ds.theme;
  else ds.theme = theme;
  if (reducedMotion) ds.motion = 'reduce';
  else delete ds.motion;
}

export async function loadDisplay(repo: Repo): Promise<{ theme: Theme; reducedMotion: boolean }> {
  const [t, m] = await Promise.all([repo.getSetting<unknown>(THEME_SETTING), repo.getSetting<unknown>(MOTION_SETTING)]);
  return {
    theme: THEMES.includes(t as Theme) ? (t as Theme) : 'system',
    reducedMotion: m === true,
  };
}
