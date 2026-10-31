import { describe, it, expect } from 'vitest';
import { extractAcronyms, questionText } from '../../acronyms/extract';
import { CONTENT_TARGETS, answerBalance, coverage, longestOptionTell, nearDuplicates, objectiveQuotas, pbqTypeCounts } from '../../content';
import { isPbqTemplate } from '../../domain/pbq';
import type { NumericAnswer } from '../../domain/types';
import { lessonText } from '../../domain/lesson';
import { shippedLessons } from '../lessons';
import { createRegistry } from '../registry';
import { NUMERIC_CHECKS } from './numericChecks';
import { dataPlusItems } from './items';
import { dataPlusMeta } from './meta';

// Checks on the shipped bank. Unit tests otherwise run against the fixture bank (VITE_BANK=fixture).
const items = dataPlusItems;
const byIdType = (id: string) => items.find((q) => q.id === id)?.type;
const singleCount =items.filter((q) => q.type === 'mcq-single').length;

describe('shipped Data+ bank', () => {
  it('registers: schema, ids, objectives and source all valid', () => {
    expect(() => createRegistry().registerExam(dataPlusMeta, items)).not.toThrow();
  });

  it('every acronym token and tag has an expansion', () => {
    const listed = new Set(dataPlusMeta.acronyms.map((a) => a.term));
    const tokens = new Set([
      ...items.flatMap((q) => [...extractAcronyms(questionText(q)), ...q.acronyms]),
      ...shippedLessons.flatMap((l) => extractAcronyms(lessonText(l))),
    ]);
    expect([...tokens].filter((t) => !listed.has(t)).sort()).toEqual([]);
  });

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

  it('has no near-duplicate stems', () => {
    expect(nearDuplicates(items)).toEqual([]);
  });

  it.runIf(singleCount >= 40)('spreads the correct answer across positions', () => {
    for (const share of Object.values(answerBalance(items))) expect(share).toBeLessThanOrEqual(CONTENT_TARGETS.maxPositionShare);
  });

  it.runIf(singleCount >= 40)('does not make the correct answer the longest option too often', () => {
    expect(longestOptionTell(items)).toBeLessThanOrEqual(CONTENT_TARGETS.maxLongestShare);
  });

  it('never authors order PBQ steps in the answer order', () => {
    const solved = items.filter(
      (q) => q.type === 'pbq-order' &&
        (q.payload as { steps: { id: string }[] }).steps.map((s) => s.id).join() === (q.answer as { order: string[] }).order.join(),
    );
    expect(solved.map((q) => q.id)).toEqual([]);
  });

  describe('targets (approved items only)', () => {
    const approved = items.filter((q) => q.status === 'approved');
    const pbqs = approved.filter((q) => isPbqTemplate(q.type));

    it('has at least the target MCQ and PBQ totals', () => {
      expect(approved.length - pbqs.length).toBeGreaterThanOrEqual(CONTENT_TARGETS.mcq);
      expect(pbqs.length).toBeGreaterThanOrEqual(CONTENT_TARGETS.pbq);
    });

    it('has every PBQ template at or above the per-type target', () => {
      for (const n of Object.values(pbqTypeCounts(approved))) expect(n).toBeGreaterThanOrEqual(CONTENT_TARGETS.perPbqType);
    });

    it('meets every objective quota', () => {
      const quotas = objectiveQuotas(dataPlusMeta, { mcq: CONTENT_TARGETS.mcq, pbq: CONTENT_TARGETS.pbq });
      const have = coverage(dataPlusMeta, approved);
      const short = Object.entries(quotas).filter(([id, q]) => have[id].mcq < q.mcq || have[id].pbq < q.pbq);
      expect(short.map(([id]) => id)).toEqual([]);
    });

    it('meets the math module targets (spec §7)', () => {
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

  it('does not cluster select keys at one option index (config, data, terminal)', () => {
    const at: number[] = [];
    for (const q of items) {
      const lists: [string, { id: string }[]][] =
        q.type === 'pbq-config' || q.type === 'pbq-data'
          ? (q.payload as { fields: { id: string; options: { id: string }[] }[] }).fields.map((f) => [f.id, f.options])
          : q.type === 'pbq-terminal'
            ? (q.payload as { steps: { id: string; options?: { id: string }[] }[] }).steps.filter((s) => s.options).map((s) => [s.id, s.options!])
            : [];
      const key = q.type === 'pbq-terminal' ? Object.fromEntries(Object.entries((q.answer as { accept: Record<string, string[]> }).accept).map(([k, v]) => [k, v[0]])) : (q.answer as { values: Record<string, string> }).values;
      for (const [id, opts] of lists) at.push(opts.findIndex((o) => o.id === key[id]));
    }
    const counts = at.reduce<Record<number, number>>((m, i) => ({ ...m, [i]: (m[i] ?? 0) + 1 }), {});
    expect(Math.max(...Object.values(counts)) / at.length).toBeLessThanOrEqual(0.5);
  });
});
