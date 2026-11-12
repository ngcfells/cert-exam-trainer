import { describe, it, expect } from 'vitest';
import { isPbqTemplate } from '../../domain/pbq';
import type { NumericAnswer } from '../../domain/types';
import { lessonText } from '../../domain/lesson';
import { primerText } from '../../domain/primer';
import { shownTopics } from '../../primer/match';
import { shippedLessons as allLessons } from '../lessons';
import { describeBankTargets, describeShippedBank } from '../shippedChecks';
import { NUMERIC_CHECKS } from './numericChecks';
import { dataPlusItems } from './items';
import { dataPlusMeta } from './meta';

const shippedLessons = allLessons.filter((l) => l.exam === 'DA0-002');

// Checks on the shipped bank. Unit tests otherwise run against the fixture bank (VITE_BANK=fixture).
const items = dataPlusItems;
const byIdType = (id: string) => items.find((q) => q.id === id)?.type;

// Ids written before the <prefix>-<objective>-<type>-nnn scheme. Saved results and reviews refer to them, so they stay.
const legacyIds = /^da2-(seed|pbq-[a-z]+)-\d{3}$|^da2-\d-\d-(math|pct)-mcq-\d{3}$/;

describeShippedBank(dataPlusMeta, items, { extraText: [...shippedLessons.map(lessonText), ...shownTopics(items).map(primerText)], legacyIds });
describeBankTargets(dataPlusMeta, items);

describe('shipped Data+ bank', () => {
  describe('lessons', () => {
    const byId = new Map(items.map((q) => [q.id, q]));

    it('link only existing, approved questions', () => {
      const bad = shippedLessons.flatMap((l) => l.checkIds.filter((id) => byId.get(id)?.status !== 'approved').map((id) => `${l.id}: ${id}`));
      expect(bad).toEqual([]);
    });

    it('with a formula link at least one numeric item', () => {
      const none = shippedLessons.filter((l) => l.formula && !l.checkIds.some((id) => byId.get(id)?.type === 'numeric'));
      expect(none.map((l) => l.id)).toEqual([]);
    });

    it('keep formula markup out of symbol names, which render as plain text', () => {
      const bad = shippedLessons.flatMap((l) => (l.formula?.symbols ?? []).filter((s) => /[\^_]\{/.test(s.symbol)).map((s) => `${l.id}: ${s.symbol}`));
      expect(bad).toEqual([]);
    });

    it('never reuse the worked example in a numeric check (the check tests skill, not recall)', () => {
      const nums = (s: string) => new Set((s.replace(/(\d),(\d{3})/g, '$1$2').match(/\d+(\.\d+)?/g) ?? []).map(Number));
      const bad = shippedLessons.flatMap((l) => {
        const ex = nums(JSON.stringify(l.example));
        return l.checkIds.filter((id) => {
          const q = byId.get(id);
          if (q?.type !== 'numeric') return false;
          const stem = [...nums(q.stem)];
          return stem.length > 0 && stem.every((n) => ex.has(n)) && ex.has((q.answer as NumericAnswer).value);
        }).map((id) => `${l.id}: ${id}`);
      });
      expect(bad).toEqual([]);
    });

    it('have unique ids', () => {
      const ids = shippedLessons.map((l) => l.id);
      expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
    });
  });

  it('every numeric answer matches its recomputation within tolerance', () => {
    const wrong = items.flatMap((q) => {
      const check = NUMERIC_CHECKS[q.id];
      if (q.type !== 'numeric' || !check) return [];
      const a = q.answer as NumericAnswer;
      return Math.abs(check() - a.value) <= a.tolerance + 1e-9 ? [] : [`${q.id}: ${a.value} vs ${check()}`];
    });
    expect(wrong).toEqual([]);
    expect(Object.keys(NUMERIC_CHECKS).filter((id) => byIdType(id) !== 'numeric')).toEqual([]);
  });

  it('meets the math module targets (spec §7)', () => {
    const approved = items.filter((q) => q.status === 'approved');
    const pbqs = approved.filter((q) => isPbqTemplate(q.type));
    expect(shippedLessons.length).toBeGreaterThanOrEqual(30);
    for (const l of shippedLessons) {
      expect(l.checkIds.length).toBeGreaterThanOrEqual(3);
      expect(l.checkIds.length).toBeLessThanOrEqual(5);
    }
    expect(approved.filter((q) => q.type === 'numeric').length).toBeGreaterThanOrEqual(60);
    const joinPbqs = [
      'da2-1-1-buckets-002', 'da2-1-1-match-002', 'da2-1-1-hotspot-002', 'da2-2-3-config-002', 'da2-2-3-config-003', 'da2-2-3-data-002',
      'da2-2-3-data-003', 'da2-2-3-match-001', 'da2-2-3-order-002', 'da2-2-3-terminal-003', 'da2-2-3-diagram-001',
    ];
    expect(pbqs.filter((q) => joinPbqs.includes(q.id)).length).toBeGreaterThanOrEqual(10);
  });
});
