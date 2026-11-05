import { isUnitItem } from '../domain/numeric';
import { correctParts, elementIds, optionLists, partIds } from '../domain/pbq';
import type { ExamMeta, McqPayload, Question, QuestionType } from '../domain/types';
import { chanceOf, weightedOrder, type Chances } from './chance';
import { mulberry32, shuffle, weightedPick, type Rng } from './rng';

export interface ExamItem {
  question: Question;
  /** Shuffled MCQ option ids. */
  optionOrder?: string[];
  /** Shuffled PBQ element ids (choices, steps, labels). */
  elementOrder?: string[];
  /** Shuffled select option ids per part (config and data fields, terminal choice steps). */
  partOrders?: Record<string, string[]>;
}

export interface AssembledExam {
  exam: string;
  seed: number;
  /** PBQs first, then MCQs. */
  items: ExamItem[];
  mcqCount: number;
  pbqWeightSum: number;
}

export interface AssembleInput {
  meta: ExamMeta;
  pool: Question[];
  seed: number;
  chances: Chances;
  pbqTypes: readonly QuestionType[];
}

/** Relative weights for drawing 1..6 PBQs, favouring 2–4 (spec §7). */
export const PBQ_COUNT_WEIGHTS = [1, 3, 3, 3, 1, 1] as const;

/** Largest-remainder apportionment of `total` across `weights`. */
export function allocateByWeight(total: number, weights: readonly number[]): number[] {
  const sum = weights.reduce((s, w) => s + w, 0);
  if (sum <= 0 || total <= 0) return weights.map(() => 0);
  const exact = weights.map((w) => (total * w) / sum);
  const out = exact.map(Math.floor);
  let left = total - out.reduce((s, n) => s + n, 0);
  const order = exact.map((x, i) => ({ i, r: x - Math.floor(x) })).sort((a, b) => b.r - a.r || a.i - b.i);
  for (const { i } of order) {
    if (left-- <= 0) break;
    out[i]++;
  }
  return out;
}

export function domainOf(meta: ExamMeta, q: Question): string | undefined {
  return meta.objectives.find((o) => o.id === q.objectiveIds[0])?.domainId;
}

/** Templates where each keyed chip answers one part, so the chips can show up in answer order. */
const ONE_CHIP_PER_PART = new Set(['pbq-match', 'pbq-order', 'pbq-diagram']);
const RESHUFFLES = 3;

/**
 * A fair shuffle often shows few keyed chips in answer order (3 keys: 1 time in 6), which gives the answer away.
 * Reshuffle up to RESHUFFLES times when that happens: it becomes rare, but never impossible, so it is no tell either.
 */
function chipOrder(question: Question, ids: string[], rng: Rng): string[] {
  let order = shuffle(ids, rng);
  if (!ONE_CHIP_PER_PART.has(question.type)) return order;
  const key = correctParts(question);
  const keys = partIds(question).map((p) => key[p]);
  const inAnswerOrder = (o: string[]) => keys.map((k) => o.indexOf(k)).every((p, i, pos) => i === 0 || p > pos[i - 1]);
  for (let t = 0; t < RESHUFFLES && inAnswerOrder(order); t++) order = shuffle(ids, rng);
  return order;
}

/** Wraps a question with its per-attempt shuffle of options or PBQ elements. */
export function itemFor(question: Question, rng: Rng): ExamItem {
  if (question.type === 'mcq-single' || question.type === 'mcq-multi') {
    return { question, optionOrder: shuffle((question.payload as McqPayload).options.map((o) => o.id), rng) };
  }
  const ids = elementIds(question);
  const item: ExamItem = ids.length ? { question, elementOrder: chipOrder(question, ids, rng) } : { question };
  const lists = Object.entries(optionLists(question));
  if (lists.length) item.partOrders = Object.fromEntries(lists.map(([part, opts]) => [part, shuffle(opts, rng)]));
  return item;
}

/**
 * Splits `total` across domains by weight, never giving a domain more than it has. Domains with none get none,
 * and any shortfall moves to the domains with spares, by weight.
 */
export function splitByDomain(total: number, weights: readonly number[], available: readonly number[]): number[] {
  const live = weights.map((w, i) => (available[i] > 0 ? w : 0));
  const quota = allocateByWeight(Math.min(total, available.reduce((s, n) => s + n, 0)), live);
  for (;;) {
    const short = quota.reduce((s, n, i) => s + Math.max(0, n - available[i]), 0);
    if (short === 0) return quota;
    quota.forEach((n, i) => (quota[i] = Math.min(n, available[i])));
    const extra = allocateByWeight(short, live.map((w, i) => (quota[i] < available[i] ? w : 0)));
    extra.forEach((n, i) => (quota[i] += n));
  }
}

/** Up to `total` of `qs`, split across the exam's domains by weight and drawn by chance within each domain. */
export function drawByDomain(meta: ExamMeta, qs: readonly Question[], total: number, chances: Chances, rng: Rng): Question[] {
  const byDomain = meta.domains.map((d) => qs.filter((q) => domainOf(meta, q) === d.id));
  const quota = splitByDomain(total, meta.domains.map((d) => d.weight), byDomain.map((g) => g.length));
  return byDomain.flatMap((g, i) => weightedOrder(g, (q) => chanceOf(chances, q.id), rng).slice(0, quota[i]));
}

export function assembleExam({ meta, pool, seed, chances, pbqTypes }: AssembleInput): AssembledExam {
  const rng = mulberry32(seed);

  const pbqPool = pool.filter((q) => pbqTypes.includes(q.type));
  const pbqs: Question[] = [];
  if (pbqPool.length > 0) {
    const want = weightedPick(PBQ_COUNT_WEIGHTS, rng) + 1;
    pbqs.push(...shuffle(drawByDomain(meta, pbqPool, want, chances, rng), rng));
    while (pbqs.length && pbqs.reduce((s, q) => s + (q.pbqWeight ?? 1), 0) > meta.maxQuestions - 1) pbqs.pop();
  }
  const pbqWeightSum = pbqs.reduce((s, q) => s + (q.pbqWeight ?? 1), 0);
  const pbqItems = pbqs.map((q) => itemFor(q, rng));

  const mcqs = shuffle(drawByDomain(meta, pool.filter(isUnitItem), meta.maxQuestions - pbqWeightSum, chances, rng), rng);

  const items: ExamItem[] = [...pbqItems, ...mcqs.map((q) => itemFor(q, rng))];
  return { exam: meta.code, seed, items, mcqCount: mcqs.length, pbqWeightSum };
}

