import { HOTSPOT_ON, normalizeCommand, partCorrect, partIds, type PartMap } from '../domain/pbq';
import { isUnitItem, numericCorrect, parseNumeric } from '../domain/numeric';
import { effectivePick } from '../domain/pick';
import type { ExamMeta, McqAnswer, McqPayload, NumericAnswer, Question } from '../domain/types';
import { domainOf, type AssembledExam } from './assemble';

/** MCQ: selected option ids. PBQ: partId -> value id. */
export type ItemResponse = string[] | PartMap;
export type Responses = Record<string, ItemResponse>;

export function isAnswered(r: ItemResponse | undefined): boolean {
  if (!r) return false;
  return Array.isArray(r) ? r.length > 0 : Object.values(r).some((v) => v.trim() !== '');
}

/** Answered at all: a numeric item needs a parseable number; others use `isAnswered`. */
export function hasAnswer(q: Question, r: ItemResponse | undefined): boolean {
  if (q.type === 'numeric') return Array.isArray(r) && r.length > 0 && parseNumeric(r[0]) !== null;
  return isAnswered(r);
}

/**
 * Fully answered: an MCQ with a pick, a number that parses, a hotspot with
 * any spot selected, or another PBQ with every part filled. Drives the review grid.
 */
export function isComplete(q: Question, r: ItemResponse | undefined): boolean {
  if (q.type === 'numeric') return hasAnswer(q, r);
  if (q.type === 'mcq-multi' && Array.isArray(r)) {
    const pick = effectivePick(q);
    return pick === 'all' ? r.length > 0 : r.length === pick;
  }
  if (!r || Array.isArray(r)) return isAnswered(r);
  if (q.type === 'pbq-hotspot') return Object.values(r).includes(HOTSPOT_ON);
  return partIds(q).every((id) => !!r[id] && normalizeCommand(r[id]) !== '');
}

/** Matching parts / total parts; hotspots use the select-all rule. */
export function pbqFraction(q: Question, given: PartMap): number {
  const ids = partIds(q);
  if (ids.length === 0) return 0;
  if (q.type === 'pbq-hotspot') {
    const on = ids.filter((id) => given[id] === HOTSPOT_ON);
    return selectAllFraction((q.answer as { selected: string[] }).selected, on);
  }
  return ids.filter((id) => partCorrect(q, id, given)).length / ids.length;
}

/** Fraction earned on one question, 0..1. */
export function itemFraction(q: Question, r: ItemResponse | undefined): number {
  if (q.type === 'numeric') return numericCorrect(q.answer as NumericAnswer, Array.isArray(r) ? r[0] : undefined) ? 1 : 0;
  if (q.type === 'mcq-single' || q.type === 'mcq-multi') return mcqFraction(q, Array.isArray(r) ? r : []);
  return pbqFraction(q, r && !Array.isArray(r) ? r : {});
}

export interface ItemScore {
  questionId: string;
  earned: number;
  possible: number;
  fraction: number;
  answered: boolean;
  /** PBQs only. */
  parts?: { partId: string; correct: boolean }[];
}

export interface ScoreReport {
  /** Rounded, 0..900. */
  score: number;
  passed: boolean;
  items: ItemScore[];
  byDomain: { domainId: string; title: string; earned: number; possible: number }[];
  /** Ascending by fraction, at most 5, only objectives below 100%. */
  weakestObjectives: { objectiveId: string; title: string; fraction: number }[];
}

export const MAX_SCORE = 900;

/** Select-all: (correct picks − wrong picks) / correct count, floored at 0. Hotspots use this as is. */
export function selectAllFraction(correct: readonly string[], picked: readonly string[]): number {
  const right = picked.filter((p) => correct.includes(p)).length;
  return Math.max(0, right - (picked.length - right)) / correct.length;
}

/**
 * Single: the one pick must be right. Select N: each right pick earns 1/N, and
 * more than N picks earns 0. Select all: `selectAllFraction`, but picking every
 * choice earns 0 unless every choice is correct.
 */
export function mcqFraction(q: Question, picked: readonly string[]): number {
  const correct = (q.answer as McqAnswer).correct;
  const right = picked.filter((p) => correct.includes(p)).length;
  if (q.type === 'mcq-single') return picked.length === 1 && right === 1 ? 1 : 0;
  const pick = effectivePick(q);
  if (pick !== 'all') return picked.length > pick ? 0 : right / pick;
  const options = (q.payload as McqPayload).options.length;
  if (picked.length >= options && correct.length < options) return 0;
  return selectAllFraction(correct, picked);
}

/**
 * Each MCQ is worth one unit and each PBQ `pbqWeight` units, with
 * unit = 900 / (mcqCount + Σw). When the bank fills the exam this is the
 * spec's 10 points per MCQ with the PBQ pool split by weight.
 */
export function scoreExam(exam: AssembledExam, responses: Responses, meta: ExamMeta): ScoreReport {
  const units = exam.mcqCount + exam.pbqWeightSum;
  const unit = units > 0 ? MAX_SCORE / units : 0;

  const items: ItemScore[] = exam.items.map(({ question: q }) => {
    const r = responses[q.id];
    if (isUnitItem(q)) {
      const fraction = itemFraction(q, r);
      return { questionId: q.id, earned: unit * fraction, possible: unit, fraction, answered: hasAnswer(q, r) };
    }
    const given: PartMap = r && !Array.isArray(r) ? r : {};
    const parts = partIds(q).map((partId) => ({ partId, correct: partCorrect(q, partId, given) }));
    const fraction = itemFraction(q, given);
    const possible = unit * (q.pbqWeight ?? 1);
    return { questionId: q.id, earned: possible * fraction, possible, fraction, answered: isAnswered(given), parts };
  });

  const total = items.reduce((s, i) => s + i.earned, 0);
  const score = Math.round(total);

  const byDomain = meta.domains.map((d) => ({ domainId: d.id, title: d.title, earned: 0, possible: 0 }));
  const byObjective = new Map<string, { earned: number; possible: number }>();
  exam.items.forEach(({ question: q }, i) => {
    const d = byDomain.find((x) => x.domainId === domainOf(meta, q));
    if (d) {
      d.earned += items[i].earned;
      d.possible += items[i].possible;
    }
    const o = byObjective.get(q.objectiveIds[0]) ?? { earned: 0, possible: 0 };
    o.earned += items[i].earned;
    o.possible += items[i].possible;
    byObjective.set(q.objectiveIds[0], o);
  });

  const weakestObjectives = [...byObjective]
    .map(([objectiveId, o]) => ({
      objectiveId,
      title: meta.objectives.find((x) => x.id === objectiveId)?.title ?? objectiveId,
      fraction: o.possible > 0 ? o.earned / o.possible : 0,
    }))
    .filter((o) => o.fraction < 1)
    .sort((a, b) => a.fraction - b.fraction)
    .slice(0, 5);

  // Pass on the raw total so rounding can never turn a fail into a pass.
  return { score, passed: total >= meta.passingScore, items, byDomain, weakestObjectives };
}
