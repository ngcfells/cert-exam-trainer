import type { Repo } from '../storage';

export const THEME_SETTING = 'theme';
export const MOTION_SETTING = 'reducedMotion';
export const TEXT_SIZE_SETTING = 'textSize';

export type Theme = 'system' | 'light' | 'dark';
const THEMES: readonly Theme[] = ['system', 'light', 'dark'];

export type TextSize = 'small' | 'normal' | 'large' | 'larger';
export const TEXT_SIZES: readonly TextSize[] = ['small', 'normal', 'large', 'larger'];

export interface Display {
  theme: Theme;
  reducedMotion: boolean;
  textSize: TextSize;
}

/** Theme and motion live on <html> so the stylesheet can key off them. */
export function applyDisplay(theme: Theme, reducedMotion: boolean, textSize: TextSize = 'normal'): void {
  const ds = document.documentElement.dataset;
  if (theme === 'system') delete ds.theme;
  else ds.theme = theme;
  if (reducedMotion) ds.motion = 'reduce';
  else delete ds.motion;
  if (textSize === 'normal') delete ds.textSize;
  else ds.textSize = textSize;
}

export async function loadDisplay(repo: Repo): Promise<Display> {
  const [t, m, z] = await Promise.all([
    repo.getSetting<unknown>(THEME_SETTING),
    repo.getSetting<unknown>(MOTION_SETTING),
    repo.getSetting<unknown>(TEXT_SIZE_SETTING),
  ]);
  return {
    theme: THEMES.includes(t as Theme) ? (t as Theme) : 'system',
    reducedMotion: m === true,
    textSize: TEXT_SIZES.includes(z as TextSize) ? (z as TextSize) : 'normal',
  };
}
