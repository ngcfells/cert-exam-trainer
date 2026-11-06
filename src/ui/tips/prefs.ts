import { useSyncExternalStore } from 'react';
import type { Repo } from '../../storage';
import { TIPS } from '../../tips/list';
import { freshProgress, GAP_MAX, GAP_MIN, pickTip, randomGap, reach } from '../../tips/picker';
import type { Tip, TipProgress } from '../../tips/types';

export const TIPS_SETTING = 'studyTips';
export const TIP_PROGRESS_SETTING = 'tipProgress';

export interface TipPrefs {
  on: boolean;
  progress: TipProgress;
}

// One app-wide value, like the marks: runners read and update it without a repo prop.
let current: TipPrefs = { on: true, progress: freshProgress(Math.random) };
let repo: Repo | undefined;
const listeners = new Set<() => void>();

export function getTips(): TipPrefs {
  return current;
}

function set(p: TipPrefs) {
  current = p;
  listeners.forEach((l) => l());
}

/** Sets the store; with a repo, later changes are written through to it. */
export function applyTips(p: TipPrefs, r?: Repo): void {
  if (r) repo = r;
  set(p);
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useTipsOn(): boolean {
  return useSyncExternalStore(subscribe, () => current.on);
}

const ids = new Set(TIPS.map((t) => t.id));

function whole(x: unknown): x is number {
  return typeof x === 'number' && Number.isInteger(x);
}

/** Broken or old values fall back to defaults; seen keeps only ids of tips that still exist. */
function cleanProgress(x: unknown): TipProgress {
  const o = x !== null && typeof x === 'object' ? (x as Record<string, unknown>) : {};
  const count = whole(o.count) && o.count >= 0 ? o.count : 0;
  const gap = whole(o.gap) && o.gap >= GAP_MIN && o.gap <= GAP_MAX ? o.gap : randomGap(Math.random);
  const seen = Array.isArray(o.seen) ? [...new Set(o.seen.filter((s): s is string => typeof s === 'string' && ids.has(s)))] : [];
  return { count, gap, seen };
}

export async function loadTips(r: Repo): Promise<TipPrefs> {
  const [on, progress] = await Promise.all([r.getSetting<unknown>(TIPS_SETTING), r.getSetting<unknown>(TIP_PROGRESS_SETTING)]);
  return { on: on !== false, progress: cleanProgress(progress) };
}

function saveProgress() {
  // Fire and forget: a failed write (private window, quota) leaves tips working in memory.
  repo?.setSetting(TIP_PROGRESS_SETTING, current.progress).catch(() => {});
}

/** One new question reached in a practice or cram run. True when a tip falls due. Always false when tips are off. */
export function reachQuestion(): boolean {
  if (!current.on) return false;
  const r = reach(current.progress, Math.random);
  set({ ...current, progress: r.progress });
  saveProgress();
  return r.due;
}

/** The next tip for this exam, saved as seen. */
export function nextTip(exam: string): Tip {
  const r = pickTip(TIPS, exam, current.progress, Math.random);
  set({ ...current, progress: r.progress });
  saveProgress();
  return r.tip;
}

export async function setTipsOn(on: boolean): Promise<void> {
  set({ ...current, on });
  await repo?.setSetting(TIPS_SETTING, on);
}

export async function resetTips(): Promise<void> {
  set({ ...current, progress: freshProgress(Math.random) });
  await repo?.setSetting(TIP_PROGRESS_SETTING, current.progress);
}

export function resetTipsForTests(): void {
  repo = undefined;
  set({ on: true, progress: freshProgress(Math.random) });
}
