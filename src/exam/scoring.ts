import { correctParts, partIds, type PartMap } from '../domain/pbq';
import type { ExamMeta, McqAnswer, Question } from '../domain/types';
import { domainOf, type AssembledExam } from './assemble';

/** MCQ: selected option ids. PBQ: partId -> value id. */
export type ItemResponse = string[] | PartMap;
export type Responses = Record<string, ItemResponse>;

export function isAnswered(r: ItemResponse | undefined): boolean {
  if (!r) return false;
  return Array.isArray(r) ? r.length > 0 : Object.values(r).some((v) => v !== '');
}

/** Matching parts / total parts. */
export function pbqFraction(q: Question, given: PartMap): number {
  const ids = partIds(q);
  if (ids.length === 0) return 0;
  const key = correctParts(q);
  return ids.filter((id) => given[id] === key[id]).length / ids.length;
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

/** Select-all: (correct picks − wrong picks) / correct count, floored at 0. */
export function mcqFraction(correct: readonly string[], picked: readonly string[], type: 'mcq-single' | 'mcq-multi'): number {
  const right = picked.filter((p) => correct.includes(p)).length;
  if (type === 'mcq-single') return picked.length === 1 && right === 1 ? 1 : 0;
  return Math.max(0, right - (picked.length - right)) / correct.length;
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
    if (q.type === 'mcq-single' || q.type === 'mcq-multi') {
      const picked = Array.isArray(r) ? r : [];
      const fraction = mcqFraction((q.answer as McqAnswer).correct, picked, q.type);
      return { questionId: q.id, earned: unit * fraction, possible: unit, fraction, answered: picked.length > 0 };
    }
    const given: PartMap = r && !Array.isArray(r) ? r : {};
    const key = correctParts(q);
    const parts = partIds(q).map((partId) => ({ partId, correct: given[partId] === key[partId] }));
    const fraction = pbqFraction(q, given);
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
