import type { ExamMeta, McqPayload, Question, QuestionType } from '../domain/types';
import { mulberry32, shuffle, weightedPick, type Rng } from './rng';

export interface ExamItem {
  question: Question;
  /** Shuffled MCQ option ids. */
  optionOrder?: string[];
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
  recentIds: ReadonlySet<string>;
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

/** Shuffled fresh questions, then shuffled recent ones. */
function freshFirst(qs: Question[], recent: ReadonlySet<string>, rng: Rng): Question[] {
  return [...shuffle(qs.filter((q) => !recent.has(q.id)), rng), ...shuffle(qs.filter((q) => recent.has(q.id)), rng)];
}

export function assembleExam({ meta, pool, seed, recentIds, pbqTypes }: AssembleInput): AssembledExam {
  const rng = mulberry32(seed);

  const pbqPool = pool.filter((q) => pbqTypes.includes(q.type));
  const pbqs: Question[] = [];
  if (pbqPool.length > 0) {
    const want = Math.min(weightedPick(PBQ_COUNT_WEIGHTS, rng) + 1, pbqPool.length);
    pbqs.push(...freshFirst(pbqPool, recentIds, rng).slice(0, want));
    while (pbqs.length && pbqs.reduce((s, q) => s + (q.pbqWeight ?? 1), 0) > meta.maxQuestions - 1) pbqs.pop();
  }
  const pbqWeightSum = pbqs.reduce((s, q) => s + (q.pbqWeight ?? 1), 0);

  const byDomain = meta.domains.map((d) =>
    freshFirst(pool.filter((q) => (q.type === 'mcq-single' || q.type === 'mcq-multi') && domainOf(meta, q) === d.id), recentIds, rng),
  );
  const target = Math.min(meta.maxQuestions - pbqWeightSum, byDomain.reduce((s, qs) => s + qs.length, 0));
  const quota = allocateByWeight(target, meta.domains.map((d) => d.weight));
  // Move any shortfall to domains with spare questions, by weight.
  for (;;) {
    const short = quota.reduce((s, n, i) => s + Math.max(0, n - byDomain[i].length), 0);
    if (short === 0) break;
    quota.forEach((n, i) => (quota[i] = Math.min(n, byDomain[i].length)));
    const extra = allocateByWeight(short, meta.domains.map((d, i) => (quota[i] < byDomain[i].length ? d.weight : 0)));
    extra.forEach((n, i) => (quota[i] += n));
  }
  const mcqs = shuffle(byDomain.flatMap((qs, i) => qs.slice(0, quota[i])), rng);

  const items: ExamItem[] = [
    ...pbqs.map((question) => ({ question })),
    ...mcqs.map((question) => ({
      question,
      optionOrder: shuffle((question.payload as McqPayload).options.map((o) => o.id), rng),
    })),
  ];
  return { exam: meta.code, seed, items, mcqCount: mcqs.length, pbqWeightSum };
}
