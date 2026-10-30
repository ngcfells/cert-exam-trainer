import type { ExamMeta, Question, QuestionType } from '../domain/types';
import { freshFirst, itemFor, type AssembledExam } from '../exam/assemble';
import { mulberry32, shuffle, type Rng } from '../exam/rng';
import { weakestObjectives, type Mastery } from './mastery';
import { isDue, parseSrsRecords } from './srs';

const isMcq = (q: Question) => q.type === 'mcq-single' || q.type === 'mcq-multi';

function toExam(meta: ExamMeta, seed: number, chosen: Question[], rng: Rng): AssembledExam {
  const pbqs = chosen.filter((q) => !isMcq(q));
  return {
    exam: meta.code,
    seed,
    items: chosen.map((q) => itemFor(q, rng)),
    mcqCount: chosen.length - pbqs.length,
    pbqWeightSum: pbqs.reduce((s, q) => s + (q.pbqWeight ?? 1), 0),
  };
}

export interface PracticeOptions {
  objectiveIds: string[];
  types: QuestionType[];
  count: number;
}

export function matchingPool(pool: Question[], o: Omit<PracticeOptions, 'count'>): Question[] {
  return pool.filter((q) => o.objectiveIds.includes(q.objectiveIds[0]) && o.types.includes(q.type));
}

/** Up to `count` matching questions, fresh ones first, PBQs before MCQs. */
export function assemblePractice({
  meta,
  pool,
  seed,
  recentIds,
  options,
}: {
  meta: ExamMeta;
  pool: Question[];
  seed: number;
  recentIds: ReadonlySet<string>;
  options: PracticeOptions;
}): AssembledExam {
  const rng = mulberry32(seed);
  const picked = freshFirst(matchingPool(pool, options), recentIds, rng).slice(0, Math.max(0, options.count));
  return toExam(meta, seed, [...picked.filter((q) => !isMcq(q)), ...picked.filter(isMcq)], rng);
}

/** The session cut down to the questions the user reached, so unreached ones are neither scored nor recorded. */
export function onlySeen(exam: AssembledExam, seen: readonly string[]): AssembledExam {
  const items = exam.items.filter((i) => seen.includes(i.question.id));
  const pbqs = items.filter((i) => !isMcq(i.question));
  return { ...exam, items, mcqCount: items.length - pbqs.length, pbqWeightSum: pbqs.reduce((s, i) => s + (i.question.pbqWeight ?? 1), 0) };
}

export interface AcronymCard {
  term: string;
  expansion: string;
}

export interface CramSession {
  exam: AssembledExam;
  acronyms: AcronymCard[];
}

export const CRAM_SIZE = 15;
export const CRAM_ACRONYMS = 5;
/** How many weak objectives cram draws from. */
const CRAM_WEAK_OBJECTIVES = 3;

/**
 * A short MCQ-only session: due questions (most overdue first), then the
 * weakest objectives in order, then anything else; plus due or new acronyms.
 */
export function assembleCram({
  meta,
  pool,
  seed,
  srs,
  mastery,
  now,
}: {
  meta: ExamMeta;
  pool: Question[];
  seed: number;
  srs: unknown[];
  mastery: Mastery;
  now: Date;
}): CramSession {
  const rng = mulberry32(seed);
  const records = parseSrsRecords(srs).filter((r) => r.exam === meta.code);
  const dueFirst = records.filter((r) => isDue(r, now)).sort((a, b) => a.due.localeCompare(b.due));

  const reviewed = new Set(records.filter((r) => r.kind === 'acronym').map((r) => r.itemId));
  const dueTerms = dueFirst.filter((r) => r.kind === 'acronym').map((r) => r.itemId);
  // First entry per term wins, so a duplicated term never yields two cards.
  const byTerm = new Map<string, AcronymCard>();
  for (const { term, expansion } of meta.acronyms) if (!byTerm.has(term)) byTerm.set(term, { term, expansion });
  const acronyms = [
    ...dueTerms.flatMap((t) => byTerm.get(t) ?? []),
    ...shuffle([...byTerm.values()].filter((a) => !reviewed.has(a.term)), rng),
  ].slice(0, CRAM_ACRONYMS);

  const mcqs = pool.filter(isMcq);
  const byId = new Map(mcqs.map((q) => [q.id, q]));
  const ordered = [
    ...dueFirst.filter((r) => r.kind === 'question').flatMap((r) => byId.get(r.itemId) ?? []),
    ...weakestObjectives(mastery, CRAM_WEAK_OBJECTIVES).flatMap((o) => shuffle(mcqs.filter((q) => q.objectiveIds[0] === o), rng)),
    ...shuffle(mcqs, rng),
  ];
  const chosen = [...new Set(ordered)].slice(0, CRAM_SIZE - acronyms.length);
  return { exam: toExam(meta, seed, chosen, rng), acronyms };
}
