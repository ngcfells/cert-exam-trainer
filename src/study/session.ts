import { meaningText, type AcronymEntry } from '../acronyms/list';
import { isUnitItem } from '../domain/numeric';
import type { ExamMeta, Question, QuestionType } from '../domain/types';
import { drawByDomain, itemFor, type AssembledExam } from '../exam/assemble';
import { chanceOf, weightedOrder, type Chances } from '../exam/chance';
import { mulberry32, shuffle, type Rng } from '../exam/rng';
import { weakestObjectives, type Mastery } from './mastery';
import { isDue, parseSrsRecords } from './srs';

/** One-unit items (MCQs and typed numbers); everything else is a PBQ. */
const isMcq = isUnitItem;

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

/**
 * Up to `count` matching questions, split across the chosen domains by exam weight, drawn by chance
 * within each domain, then shuffled together so no domain or question type is bunched.
 */
export function assemblePractice({
  meta,
  pool,
  seed,
  chances,
  options,
}: {
  meta: ExamMeta;
  pool: Question[];
  seed: number;
  chances: Chances;
  options: PracticeOptions;
}): AssembledExam {
  const rng = mulberry32(seed);
  const picked = drawByDomain(meta, matchingPool(pool, options), Math.max(0, options.count), chances, rng);
  return toExam(meta, seed, shuffle(picked, rng), rng);
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

/** One from each list in turn (the first list leads), so no single list fills the session. */
function interleave<T>(lists: T[][]): T[] {
  const out: T[] = [];
  for (let i = 0; lists.some((l) => i < l.length); i++) for (const l of lists) if (i < l.length) out.push(l[i]);
  return out;
}

/**
 * A short MCQ-only session: due questions (most overdue first), then the
 * weakest objectives (taken in turn, weakest first, so one objective never fills the session and a small one
 * does not repeat the same questions every time), then anything else, each list drawn by chance;
 * plus due or new acronyms.
 */
export function assembleCram({
  meta,
  acronyms: list,
  pool,
  seed,
  srs,
  mastery,
  now,
  chances,
}: {
  meta: ExamMeta;
  /** The merged list from `loadAcronyms`. */
  acronyms: AcronymEntry[];
  pool: Question[];
  seed: number;
  srs: unknown[];
  mastery: Mastery;
  now: Date;
  chances: Chances;
}): CramSession {
  const rng = mulberry32(seed);
  const records = parseSrsRecords(srs).filter((r) => r.exam === meta.code);
  const dueFirst = records.filter((r) => isDue(r, now)).sort((a, b) => a.due.localeCompare(b.due));

  const reviewed = new Set(records.filter((r) => r.kind === 'acronym').map((r) => r.itemId));
  const dueTerms = dueFirst.filter((r) => r.kind === 'acronym').map((r) => r.itemId);
  // First entry per term wins, so a duplicated term never yields two cards.
  const byTerm = new Map<string, AcronymCard>();
  for (const a of list) if (!byTerm.has(a.term)) byTerm.set(a.term, { term: a.term, expansion: meaningText(a) });
  const acronyms = [
    ...dueTerms.flatMap((t) => byTerm.get(t) ?? []),
    ...shuffle([...byTerm.values()].filter((a) => !reviewed.has(a.term)), rng),
  ].slice(0, CRAM_ACRONYMS);

  const mcqs = pool.filter(isMcq);
  const byId = new Map(mcqs.map((q) => [q.id, q]));
  const byChance = (qs: Question[]) => weightedOrder(qs, (q) => chanceOf(chances, q.id), rng);
  const ordered = [
    ...dueFirst.filter((r) => r.kind === 'question').flatMap((r) => byId.get(r.itemId) ?? []),
    ...interleave(weakestObjectives(mastery, CRAM_WEAK_OBJECTIVES).map((o) => byChance(mcqs.filter((q) => q.objectiveIds[0] === o)))),
    ...byChance(mcqs),
  ];
  const chosen = [...new Set(ordered)].slice(0, CRAM_SIZE - acronyms.length);
  return { exam: toExam(meta, seed, chosen, rng), acronyms };
}
