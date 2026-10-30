import { z } from 'zod';
import type { Repo } from '../storage';

export const srsRecordSchema = z.object({
  id: z.string().min(1),
  exam: z.string().min(1),
  kind: z.enum(['question', 'acronym']),
  itemId: z.string().min(1),
  ease: z.number().min(1.3),
  intervalDays: z.number().nonnegative(),
  reps: z.number().int().nonnegative(),
  lapses: z.number().int().nonnegative(),
  due: z.string(),
  lastReviewed: z.string(),
}).strict();

export type SrsRecord = z.infer<typeof srsRecordSchema>;
export type SrsKind = SrsRecord['kind'];

const DAY_MS = 86_400_000;
/** Missed items come back within the same study sitting. */
export const LAPSE_MS = 10 * 60_000;
const START_EASE = 2.5;
const MIN_EASE = 1.3;

export function srsId(exam: string, kind: SrsKind, itemId: string): string {
  return `${exam}:${kind === 'question' ? 'q' : 'a'}:${itemId}`;
}

/** SM-2 quality (0–5) from a scored fraction; below 3 counts as a miss. */
export function qualityFromFraction(fraction: number): number {
  if (fraction < 0.5) return 1;
  return fraction < 1 ? 3 : 5;
}

/** One SM-2 step. */
export function review(
  prev: SrsRecord | undefined,
  input: { exam: string; kind: SrsKind; itemId: string; quality: number },
  now: Date,
): SrsRecord {
  const { exam, kind, itemId, quality: q } = input;
  const base = prev ?? { ease: START_EASE, intervalDays: 0, reps: 0, lapses: 0 };
  const ease = Math.max(MIN_EASE, Math.round((base.ease + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)) * 1000) / 1000);
  const common = { id: srsId(exam, kind, itemId), exam, kind, itemId, ease, lastReviewed: now.toISOString() };
  if (q < 3) {
    return { ...common, intervalDays: 0, reps: 0, lapses: base.lapses + 1, due: new Date(now.getTime() + LAPSE_MS).toISOString() };
  }
  const reps = base.reps + 1;
  const intervalDays = reps === 1 ? 1 : reps === 2 ? 6 : Math.round(base.intervalDays * base.ease);
  return { ...common, intervalDays, reps, lapses: base.lapses, due: new Date(now.getTime() + intervalDays * DAY_MS).toISOString() };
}

export function parseSrsRecords(raw: unknown[]): SrsRecord[] {
  return raw.flatMap((r) => {
    const p = srsRecordSchema.safeParse(r);
    return p.success ? [p.data] : [];
  });
}

export function isDue(r: SrsRecord, now: Date): boolean {
  return Date.parse(r.due) <= now.getTime();
}

export async function applyReviews(
  repo: Repo,
  exam: string,
  reviews: { kind: SrsKind; itemId: string; quality: number }[],
  now: Date,
): Promise<void> {
  const byId = new Map(parseSrsRecords(await repo.listRecords('srs')).map((r) => [r.id, r]));
  for (const rv of reviews) {
    const next = review(byId.get(srsId(exam, rv.kind, rv.itemId)), { exam, ...rv }, now);
    byId.set(next.id, next);
    await repo.putRecord('srs', next);
  }
}
