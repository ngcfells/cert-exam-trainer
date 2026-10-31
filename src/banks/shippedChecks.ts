import { describe, it, expect } from 'vitest';
import { extractAcronyms, questionText } from '../acronyms/extract';
import { CONTENT_TARGETS, answerBalance, coverage, listPositionTokens, longestOptionTell, nearDuplicates, objectiveQuotas, pbqTypeCounts } from '../content';
import { isPbqTemplate } from '../domain/pbq';
import type { ExamMeta, Question } from '../domain/types';
import { itemIdPrefix } from './paths';
import { createRegistry } from './registry';

// Test-only helpers: the checks every exam's shipped bank must pass. Each exam's bank.test.ts calls them.

export interface ShippedBankOptions {
  /** More text whose acronym tokens need an expansion, such as lesson text. */
  extraText?: string[];
  /** Ids from before the id scheme, kept so saved history still matches. */
  legacyIds?: RegExp;
}

/** Share of config, data and terminal select parts whose key sits at the most common option index. */
function selectKeyClustering(items: Question[]): number | undefined {
  const at: number[] = [];
  for (const q of items) {
    const lists: [string, { id: string }[]][] =
      q.type === 'pbq-config' || q.type === 'pbq-data'
        ? (q.payload as { fields: { id: string; options: { id: string }[] }[] }).fields.map((f) => [f.id, f.options])
        : q.type === 'pbq-terminal'
          ? (q.payload as { steps: { id: string; options?: { id: string }[] }[] }).steps.filter((s) => s.options).map((s) => [s.id, s.options!])
          : [];
    if (!lists.length) continue;
    const key =
      q.type === 'pbq-terminal'
        ? Object.fromEntries(Object.entries((q.answer as { accept: Record<string, string[]> }).accept).map(([k, v]) => [k, v[0]]))
        : (q.answer as { values: Record<string, string> }).values;
    for (const [id, opts] of lists) at.push(opts.findIndex((o) => o.id === key[id]));
  }
  if (!at.length) return undefined;
  const counts = at.reduce<Record<number, number>>((m, i) => ({ ...m, [i]: (m[i] ?? 0) + 1 }), {});
  return Math.max(...Object.values(counts)) / at.length;
}

export function describeShippedBank(meta: ExamMeta, items: Question[], opts: ShippedBankOptions = {}): void {
  const singleCount = items.filter((q) => q.type === 'mcq-single').length;

  describe(`shipped ${meta.code} bank`, () => {
    it('registers: schema, ids, objectives and source all valid', () => {
      expect(() => createRegistry().registerExam(meta, items)).not.toThrow();
    });

    it('every acronym token and tag has an expansion', () => {
      const listed = new Set(meta.acronyms.map((a) => a.term));
      const tokens = new Set([
        ...items.flatMap((q) => [...extractAcronyms(questionText(q)), ...q.acronyms]),
        ...(opts.extraText ?? []).flatMap((t) => extractAcronyms(t)),
      ]);
      expect([...tokens].filter((t) => !listed.has(t)).sort()).toEqual([]);
    });

    it('every id follows <prefix>-<objective>-<type>-nnn', () => {
      const bad = items.filter((q) => {
        if (opts.legacyIds?.test(q.id)) return false;
        return !q.id.startsWith(itemIdPrefix(meta.code, q.objectiveIds[0], q.type)) || !/-\d{3}$/.test(q.id);
      });
      expect(bad.map((q) => q.id)).toEqual([]);
    });

    it('never keys on a numbered list position (LLM01, ML05, A03:)', () => {
      expect(items.flatMap((q) => listPositionTokens(q).map((t) => `${q.id}: ${t}`))).toEqual([]);
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
        (q) =>
          q.type === 'pbq-order' &&
          (q.payload as { steps: { id: string }[] }).steps.map((s) => s.id).join() === (q.answer as { order: string[] }).order.join(),
      );
      expect(solved.map((q) => q.id)).toEqual([]);
    });

    it('does not cluster select keys at one option index (config, data, terminal)', () => {
      expect(selectKeyClustering(items) ?? 0).toBeLessThanOrEqual(0.5);
    });
  });
}

/** The bank targets (spec: at least 500 MCQs, 80 PBQs, 10 per template, every objective quota), over approved items. */
export function describeBankTargets(meta: ExamMeta, items: Question[]): void {
  describe(`${meta.code} targets (approved items only)`, () => {
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
      const quotas = objectiveQuotas(meta, { mcq: CONTENT_TARGETS.mcq, pbq: CONTENT_TARGETS.pbq });
      const have = coverage(meta, approved);
      const short = Object.entries(quotas).filter(([id, q]) => have[id].mcq < q.mcq || have[id].pbq < q.pbq);
      expect(short.map(([id]) => id)).toEqual([]);
    });
  });
}
