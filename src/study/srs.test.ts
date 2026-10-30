import { describe, it, expect } from 'vitest';
import { applyReviews, isDue, parseSrsRecords, qualityFromFraction, review, srsId, type SrsRecord } from './srs';
import { createMemoryRepo } from '../storage/memoryRepo';

const now = new Date('2026-01-01T00:00:00Z');
const DAY = 86_400_000;
const item = { exam: 'T-001', kind: 'question' as const, itemId: 'q1' };
const at = (ms: number) => new Date(now.getTime() + ms).toISOString();

describe('srs', () => {
  it('a new item answered fully is due in a day with ease 2.6', () => {
    const r = review(undefined, { ...item, quality: 5 }, now);
    expect(r).toEqual({
      id: srsId('T-001', 'question', 'q1'),
      ...item,
      ease: 2.6,
      intervalDays: 1,
      reps: 1,
      lapses: 0,
      due: at(DAY),
      lastReviewed: now.toISOString(),
    });
    expect(r.id).toBe('T-001:q:q1');
  });

  it('the third success uses interval × the previous ease', () => {
    const prev: SrsRecord = { ...review(undefined, { ...item, quality: 5 }, now), reps: 2, intervalDays: 6, ease: 2.5 };
    const r = review(prev, { ...item, quality: 5 }, now);
    expect(r).toMatchObject({ reps: 3, intervalDays: 15, ease: 2.6, due: at(15 * DAY) });
  });

  it('a miss resets reps, adds a lapse, lowers ease and is due in 10 minutes', () => {
    const prev: SrsRecord = { ...review(undefined, { ...item, quality: 5 }, now), reps: 3, intervalDays: 15, ease: 2.5 };
    const r = review(prev, { ...item, quality: 1 }, now);
    expect(r.reps).toBe(0);
    expect(r.lapses).toBe(1);
    expect(r.intervalDays).toBe(0);
    expect(r.ease).toBeCloseTo(1.96);
    expect(r.due).toBe(at(10 * 60_000));
  });

  it('ease never drops below 1.3', () => {
    let r: SrsRecord | undefined;
    for (let i = 0; i < 10; i++) r = review(r, { ...item, quality: 1 }, now);
    expect(r!.ease).toBe(1.3);
  });

  it('maps fractions to quality', () => {
    expect(qualityFromFraction(0.4)).toBe(1);
    expect(qualityFromFraction(0.5)).toBe(3);
    expect(qualityFromFraction(1)).toBe(5);
  });

  it('parseSrsRecords drops malformed records; isDue is true at exactly due', () => {
    const good = review(undefined, { ...item, quality: 5 }, now);
    const bad: Record<string, unknown> = { ...good };
    delete bad.ease;
    expect(parseSrsRecords([good, bad, null, { ...good, due: 'tomorrow' }])).toEqual([good]);
    expect(isDue(good, new Date(good.due))).toBe(true);
    expect(isDue(good, now)).toBe(false);
  });

  it('applyReviews writes new records and updates existing ones', async () => {
    const repo = createMemoryRepo();
    await applyReviews(repo, 'T-001', [{ kind: 'question', itemId: 'q1', quality: 5 }], now);
    await applyReviews(repo, 'T-001', [{ kind: 'question', itemId: 'q1', quality: 5 }, { kind: 'acronym', itemId: 'SQL', quality: 1 }], now);
    const recs = parseSrsRecords(await repo.listRecords('srs'));
    expect(recs).toHaveLength(2);
    expect(recs.find((r) => r.itemId === 'q1')!.reps).toBe(2);
    expect(recs.find((r) => r.itemId === 'SQL')!.id).toBe('T-001:a:SQL');
  });
});
