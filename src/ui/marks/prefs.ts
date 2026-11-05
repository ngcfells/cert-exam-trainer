import { useSyncExternalStore } from 'react';
import type { Repo } from '../../storage';

/** Answer mark styles (issue #10), in Settings order. */
export type MarkStyle = 'banner' | 'smiley' | 'thumbs' | 'stamp' | 'shapes' | 'edge' | 'plain';
export const MARK_STYLES: readonly MarkStyle[] = ['banner', 'smiley', 'thumbs', 'stamp', 'shapes', 'edge', 'plain'];
export const MARK_NAMES: Record<MarkStyle, string> = {
  banner: 'Check and X banner',
  smiley: 'Smiley and frowny',
  thumbs: 'Thumbs up and down',
  stamp: "Grader's stamp",
  shapes: 'Circle, triangle, cross',
  edge: 'Quiet edge',
  plain: 'Plain text',
};

export const MARKS_SETTING = 'answerMarks';
export const SOUND_SETTING = 'answerSound';

export interface MarkPrefs {
  style: MarkStyle;
  sound: boolean;
}
export const DEFAULT_MARKS: MarkPrefs = { style: 'banner', sound: false };

// One app-wide value, like the theme on <html>: runners read it without props.
let current = DEFAULT_MARKS;
const listeners = new Set<() => void>();

export function getMarks(): MarkPrefs {
  return current;
}

export function applyMarks(p: MarkPrefs): void {
  current = p;
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useMarks(): MarkPrefs {
  return useSyncExternalStore(subscribe, getMarks);
}

export async function loadMarks(repo: Repo): Promise<MarkPrefs> {
  const [s, sound] = await Promise.all([repo.getSetting<unknown>(MARKS_SETTING), repo.getSetting<unknown>(SOUND_SETTING)]);
  return {
    style: MARK_STYLES.includes(s as MarkStyle) ? (s as MarkStyle) : 'banner',
    sound: sound === true,
  };
}
