import type { Question } from '../domain/types';
import { parseResults } from './result';
import type { Rng } from './rng';
import { itemFraction } from './scoring';

/**
 * How likely each question is to be picked, from every saved answer to it (owner's rule, issue #8).
 * Spec: docs/superpowers/specs/2026-11-04-question-selection-design.md
 */

/** One time a question was shown. `at` is its result's `finishedAt`. */
export interface View {
  right: boolean;
  at: string;
}

/** Chance per question id. A missing id has never been shown: chance 1. */
export type Chances = ReadonlyMap<string, number>;

export const RIGHT_FACTOR = 0.5;
export const MISS_FACTOR = 0.75;
/** A question ever missed never drops below this. */
export const MISSED_FLOOR = 0.15;
/** A question right on every view, this many times or more, is mastered. */
export const MASTERED_VIEWS = 5;
export const MASTERED_CHANCE = 0.01;
/** Days after the last view (when it was right) before time raises the chance. */
export const TIME_START_DAYS = 30;
export const TIME_START_CHANCE = 0.1;
export const TIME_PER_DAY = 0.005;

const DAY_MS = 86_400_000;

/** The chance for a question given its views, oldest first. */
export function chanceFromViews(views: readonly View[], now: Date): number {
  if (views.length === 0) return 1;
  let chance = 1;
  let missed = false;
  for (const v of views) {
    chance *= v.right ? RIGHT_FACTOR : MISS_FACTOR;
    if (!v.right) missed = true;
  }
  if (missed) chance = Math.max(chance, MISSED_FLOOR);
  else if (views.length >= MASTERED_VIEWS) chance = MASTERED_CHANCE;

  const last = views[views.length - 1];
  if (!last.right) return chance;
  const days = Math.floor((now.getTime() - Date.parse(last.at)) / DAY_MS);
  if (days < TIME_START_DAYS) return chance;
  return Math.max(chance, Math.min(1, TIME_START_CHANCE + TIME_PER_DAY * (days - TIME_START_DAYS)));
}

/**
 * Chances from every valid result for `exam`, of every mode. Each listed question is one view, rescored
 * against the current pool; full credit is right, anything less is a miss. A mock result lists every item,
 * so items never reached before time ran out count as misses (shown but unanswered).
 */
export function buildChances(results: unknown[], pool: readonly Question[], exam: string, now: Date): Chances {
  const byId = new Map(pool.map((q) => [q.id, q]));
  const views = new Map<string, View[]>();
  const sorted = parseResults(results, exam).sort((a, b) => a.finishedAt.localeCompare(b.finishedAt));
  for (const r of sorted) {
    for (const id of r.questionIds) {
      const q = byId.get(id);
      if (!q) continue;
      const right = itemFraction(q, r.responses[id]) >= 1 - 1e-9;
      const list = views.get(id) ?? [];
      list.push({ right, at: r.finishedAt });
      views.set(id, list);
    }
  }
  return new Map([...views].map(([id, vs]) => [id, chanceFromViews(vs, now)]));
}

export function chanceOf(chances: Chances, id: string): number {
  return chances.get(id) ?? 1;
}

/**
 * All of `xs`, in a weighted random order (Efraimidis–Spirakis): any first k are a draw of k without
 * replacement, each pick in proportion to its weight.
 */
export function weightedOrder<T>(xs: readonly T[], weight: (x: T) => number, rng: Rng): T[] {
  // log(u) / w is a monotone transform of u^(1/w); 1 - rng() keeps u in (0, 1].
  const keyed = xs.map((x) => ({ x, key: Math.log(1 - rng()) / Math.max(weight(x), Number.MIN_VALUE) }));
  return keyed.sort((a, b) => b.key - a.key).map((k) => k.x);
}
