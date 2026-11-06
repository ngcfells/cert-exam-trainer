import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../exam/rng';
import { dataPlusMeta } from '../banks/dataplus/meta';
import type { Tip, TipProgress } from './types';
import { eligible, fillTip, freshProgress, pickTip, randomGap, reach } from './picker';

const g1: Tip = { id: 'g1', group: 'study', text: 'General one.' };
const g2: Tip = { id: 'g2', group: 'test-room', text: 'General two.' };
const d1: Tip = { id: 'd1', group: 'study', text: 'Data one.', exam: 'DA0-002' };
const c1: Tip = { id: 'c1', group: 'study', text: 'SecAI one.', exam: 'CY0-001' };
const TIPS = [g1, g2, d1, c1];

describe('randomGap', () => {
  it('runs from 10 to 20 inclusive', () => {
    expect(randomGap(() => 0)).toBe(10);
    expect(randomGap(() => 0.999999)).toBe(20);
    for (let i = 0; i < 1000; i++) {
      const g = randomGap(Math.random);
      expect(Number.isInteger(g)).toBe(true);
      expect(g).toBeGreaterThanOrEqual(10);
      expect(g).toBeLessThanOrEqual(20);
    }
  });
});

describe('freshProgress', () => {
  it('starts at zero with a new gap and nothing seen', () => {
    expect(freshProgress(() => 0)).toEqual({ count: 0, gap: 10, seen: [] });
  });
});

describe('reach', () => {
  it('counts up until the gap', () => {
    const p: TipProgress = { count: 8, gap: 10, seen: ['g1'] };
    expect(reach(p, () => 0.5)).toEqual({ progress: { count: 9, gap: 10, seen: ['g1'] }, due: false });
  });

  it('is due at the gap, then resets with a new gap', () => {
    const p: TipProgress = { count: 9, gap: 10, seen: ['g1'] };
    const rand = () => 0.5;
    const r = reach(p, rand);
    expect(r.due).toBe(true);
    expect(r.progress).toEqual({ count: 0, gap: randomGap(rand), seen: ['g1'] });
  });
});

describe('eligible', () => {
  it('keeps general tips and the exam tips', () => {
    expect(eligible(TIPS, 'DA0-002')).toEqual([g1, g2, d1]);
  });
});

describe('pickTip', () => {
  it('shows each eligible tip once before any repeats', () => {
    const rand = mulberry32(7);
    let p = freshProgress(rand);
    const got: string[] = [];
    for (let i = 0; i < 3; i++) {
      const r = pickTip(TIPS, 'DA0-002', p, rand);
      expect(p.seen).not.toContain(r.tip.id);
      expect(r.progress.seen).toContain(r.tip.id);
      got.push(r.tip.id);
      p = r.progress;
    }
    expect(got.sort()).toEqual(['d1', 'g1', 'g2']);
  });

  it('starts a new pass when every eligible tip is seen, keeping other exams ids', () => {
    const p: TipProgress = { count: 3, gap: 12, seen: ['g1', 'g2', 'd1', 'c1'] };
    const r = pickTip(TIPS, 'DA0-002', p, mulberry32(1));
    expect(['g1', 'g2', 'd1']).toContain(r.tip.id);
    expect(r.progress.seen).toEqual(expect.arrayContaining(['c1', r.tip.id]));
    expect(r.progress.seen).toHaveLength(2);
    expect(r.progress.count).toBe(3);
    expect(r.progress.gap).toBe(12);
  });

  it('gives a general tip to an exam with no exam tips', () => {
    const r = pickTip(TIPS, 'AT0-001', freshProgress(Math.random), Math.random);
    expect(['g1', 'g2']).toContain(r.tip.id);
  });
});

describe('fillTip', () => {
  it('fills placeholders from the exam metadata', () => {
    expect(fillTip('You have {minutes} minutes for {maxQuestions} questions; pass at {passingScore}.', dataPlusMeta)).toBe(
      `You have ${dataPlusMeta.timeLimitMinutes} minutes for ${dataPlusMeta.maxQuestions} questions; pass at ${dataPlusMeta.passingScore}.`,
    );
  });

  it('leaves an unknown placeholder as it is', () => {
    expect(fillTip('Keep {foo} here.', dataPlusMeta)).toBe('Keep {foo} here.');
  });
});
