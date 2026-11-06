import type { ExamMeta } from '../domain/types';
import type { Tip, TipProgress } from './types';

export const GAP_MIN = 10;
export const GAP_MAX = 20;

/** Placeholders a tip may use, filled from the exam's metadata. */
export const PLACEHOLDERS = ['minutes', 'maxQuestions', 'passingScore'] as const;
export type Placeholder = (typeof PLACEHOLDERS)[number];

/** A whole number from 10 to 20, inclusive. */
export function randomGap(rand: () => number): number {
  return GAP_MIN + Math.floor(rand() * (GAP_MAX - GAP_MIN + 1));
}

export function freshProgress(rand: () => number): TipProgress {
  return { count: 0, gap: randomGap(rand), seen: [] };
}

/** One new question reached. When the count meets the gap a tip is due, and the count starts again with a new gap. */
export function reach(p: TipProgress, rand: () => number): { progress: TipProgress; due: boolean } {
  const count = p.count + 1;
  if (count < p.gap) return { progress: { ...p, count }, due: false };
  return { progress: { ...p, count: 0, gap: randomGap(rand) }, due: true };
}

/** General tips plus the tips for this exam. */
export function eligible(tips: readonly Tip[], exam: string): Tip[] {
  return tips.filter((t) => t.exam === undefined || t.exam === exam);
}

/** A tip not yet seen this pass, at random. When all are seen, this exam's ids leave the seen list and a new pass starts. */
export function pickTip(tips: readonly Tip[], exam: string, p: TipProgress, rand: () => number): { tip: Tip; progress: TipProgress } {
  const pool = eligible(tips, exam);
  if (pool.length === 0) throw new Error('No tips to show');
  let seen = p.seen;
  let unseen = pool.filter((t) => !seen.includes(t.id));
  if (unseen.length === 0) {
    const ids = new Set(pool.map((t) => t.id));
    seen = seen.filter((id) => !ids.has(id));
    unseen = pool;
  }
  const tip = unseen[Math.min(unseen.length - 1, Math.floor(rand() * unseen.length))];
  return { tip, progress: { ...p, seen: [...seen, tip.id] } };
}

/** Fills {minutes}, {maxQuestions} and {passingScore}; any other {name} is left as it is. */
export function fillTip(text: string, meta: ExamMeta): string {
  const values: Record<Placeholder, number> = {
    minutes: meta.timeLimitMinutes,
    maxQuestions: meta.maxQuestions,
    passingScore: meta.passingScore,
  };
  return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
    (PLACEHOLDERS as readonly string[]).includes(name) ? String(values[name as Placeholder]) : whole,
  );
}
