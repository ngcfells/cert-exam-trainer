import { afterEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { createMemoryRepo } from '../../storage/memoryRepo';
import type { Repo } from '../../storage';
import { TIPS } from '../../tips/list';
import {
  applyTips,
  getTips,
  loadTips,
  nextTip,
  reachQuestion,
  resetTips,
  resetTipsForTests,
  setTipsOn,
  TIP_PROGRESS_SETTING,
  TIPS_SETTING,
  useTipsOn,
} from './prefs';

afterEach(() => resetTipsForTests());

/** Lets queued write-through promises settle. */
const flush = () => new Promise((r) => setTimeout(r, 0));

function inGap(g: number) {
  expect(Number.isInteger(g)).toBe(true);
  expect(g).toBeGreaterThanOrEqual(10);
  expect(g).toBeLessThanOrEqual(20);
}

describe('loadTips', () => {
  it('defaults to on, count 0, a gap of 10 to 20 and nothing seen', async () => {
    const p = await loadTips(createMemoryRepo());
    expect(p.on).toBe(true);
    expect(p.progress.count).toBe(0);
    expect(p.progress.seen).toEqual([]);
    inGap(p.progress.gap);
  });

  it.each([
    [{ count: -3, gap: NaN, seen: 'x' }, []],
    [{ count: 2.5, gap: 0, seen: [1, 'gone-id', 'key-word'] }, ['key-word']],
    ['junk', []],
    [null, []],
  ])('cleans a broken stored progress (%j)', async (bad, seen) => {
    const repo = createMemoryRepo();
    await repo.setSetting(TIP_PROGRESS_SETTING, bad);
    const p = await loadTips(repo);
    expect(p.progress.count).toBe(0);
    expect(p.progress.seen).toEqual(seen);
    inGap(p.progress.gap);
  });

  it('keeps a good stored progress', async () => {
    const repo = createMemoryRepo();
    await repo.setSetting(TIP_PROGRESS_SETTING, { count: 4, gap: 17, seen: ['key-word', 'silly-answers'] });
    expect((await loadTips(repo)).progress).toEqual({ count: 4, gap: 17, seen: ['key-word', 'silly-answers'] });
  });

  it('is off only when stored false', async () => {
    const repo = createMemoryRepo();
    await repo.setSetting(TIPS_SETTING, 'no');
    expect((await loadTips(repo)).on).toBe(true);
    await repo.setSetting(TIPS_SETTING, false);
    expect((await loadTips(repo)).on).toBe(false);
  });
});

describe('the tips store', () => {
  it('reachQuestion is due only at the gap, then saves count 0 and a new gap', async () => {
    const repo = createMemoryRepo();
    applyTips({ on: true, progress: { count: 0, gap: 12, seen: [] } }, repo);
    const dues: boolean[] = [];
    for (let i = 0; i < 12; i++) dues.push(reachQuestion());
    expect(dues.filter(Boolean)).toHaveLength(1);
    expect(dues[11]).toBe(true);
    await flush();
    const stored = (await repo.getSetting<{ count: number; gap: number }>(TIP_PROGRESS_SETTING))!;
    expect(stored.count).toBe(0);
    inGap(stored.gap);
  });

  it('saves the count as it goes', async () => {
    const repo = createMemoryRepo();
    applyTips({ on: true, progress: { count: 0, gap: 12, seen: [] } }, repo);
    reachQuestion();
    reachQuestion();
    await flush();
    expect(await repo.getSetting(TIP_PROGRESS_SETTING)).toEqual({ count: 2, gap: 12, seen: [] });
  });

  it('when off, reachQuestion is never due and leaves the count alone', () => {
    applyTips({ on: false, progress: { count: 9, gap: 10, seen: [] } });
    expect(reachQuestion()).toBe(false);
    expect(getTips().progress.count).toBe(9);
  });

  it('nextTip returns an eligible tip and saves it as seen', async () => {
    const repo = createMemoryRepo();
    applyTips({ on: true, progress: { count: 0, gap: 10, seen: [] } }, repo);
    const tip = nextTip('DA0-002');
    expect(TIPS).toContain(tip);
    expect(tip.exam === undefined || tip.exam === 'DA0-002').toBe(true);
    await flush();
    expect((await repo.getSetting<{ seen: string[] }>(TIP_PROGRESS_SETTING))!.seen).toEqual([tip.id]);
  });

  it('keeps working in memory when writes fail', async () => {
    const base = createMemoryRepo();
    const failing: Repo = { ...base, setSetting: () => Promise.reject(new Error('quota')) };
    applyTips({ on: true, progress: { count: 0, gap: 10, seen: [] } }, failing);
    for (let i = 0; i < 9; i++) expect(reachQuestion()).toBe(false);
    expect(reachQuestion()).toBe(true);
    const tip = nextTip('DA0-002');
    expect(getTips().progress.seen).toEqual([tip.id]);
    await flush();
  });

  it('setTipsOn and resetTips save, and reject when the write fails', async () => {
    const repo = createMemoryRepo();
    applyTips({ on: true, progress: { count: 5, gap: 10, seen: ['key-word'] } }, repo);
    await setTipsOn(false);
    expect(await repo.getSetting(TIPS_SETTING)).toBe(false);
    expect(getTips().on).toBe(false);
    await resetTips();
    const p = (await repo.getSetting<{ count: number; gap: number; seen: string[] }>(TIP_PROGRESS_SETTING))!;
    expect(p.count).toBe(0);
    expect(p.seen).toEqual([]);
    inGap(p.gap);

    applyTips(getTips(), { ...repo, setSetting: () => Promise.reject(new Error('x')) });
    await expect(setTipsOn(true)).rejects.toThrow();
    await expect(resetTips()).rejects.toThrow();
  });

  it('useTipsOn follows the store', () => {
    const { result } = renderHook(() => useTipsOn());
    expect(result.current).toBe(true);
    act(() => applyTips({ on: false, progress: { count: 0, gap: 10, seen: [] } }));
    expect(result.current).toBe(false);
  });
});
