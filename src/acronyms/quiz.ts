import { mulberry32, shuffle, type Rng } from '../exam/rng';
import { isDue, parseSrsRecords } from '../study/srs';
import type { AcronymEntry } from './list';

/** Which side of the card is shown: the acronym, or its meaning. */
export type Direction = 'term' | 'expansion';
export type DeckScope = 'all' | 'due';

/** Fewer entries than this leaves no distractors, so choice quizzes are off. */
export const MIN_CHOICE_ENTRIES = 2;
const CHOICES = 4;

/** `due`: due cards (most overdue first), then never-reviewed ones shuffled. `all`: every card shuffled. */
export function assembleDeck({
  entries,
  srs,
  exam,
  now,
  seed,
  scope,
  count,
}: {
  entries: AcronymEntry[];
  srs: unknown[];
  exam: string;
  now: Date;
  seed: number;
  scope: DeckScope;
  count: number;
}): AcronymEntry[] {
  const rng = mulberry32(seed);
  const n = Math.max(0, count);
  if (scope === 'all') return shuffle(entries, rng).slice(0, n);
  const records = parseSrsRecords(srs).filter((r) => r.exam === exam && r.kind === 'acronym');
  const byTerm = new Map(entries.map((a) => [a.term, a]));
  const reviewed = new Set(records.map((r) => r.itemId));
  const due = records
    .filter((r) => isDue(r, now))
    .sort((a, b) => a.due.localeCompare(b.due))
    .flatMap((r) => byTerm.get(r.itemId) ?? []);
  return [...due, ...shuffle(entries.filter((a) => !reviewed.has(a.term)), rng)].slice(0, n);
}

export function normalizeAnswer(s: string): string {
  return s
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Whether `input` answers the card shown on `direction`. */
export function isCorrect(entry: AcronymEntry, direction: Direction, input: string): boolean {
  if (direction === 'expansion') {
    const t = input.replace(/[^a-z0-9]+/gi, '').toUpperCase();
    return t !== '' && t === entry.term.toUpperCase();
  }
  const a = normalizeAnswer(input);
  return a !== '' && a === normalizeAnswer(entry.expansion);
}

const answerOf = (a: AcronymEntry, direction: Direction) => (direction === 'term' ? a.expansion : a.term);

/** The answer plus up to 3 distractors from other entries, with no repeated text, shuffled. */
export function buildChoices(entry: AcronymEntry, entries: AcronymEntry[], direction: Direction, rng: Rng): string[] {
  const answer = answerOf(entry, direction);
  const others = [...new Set(entries.filter((a) => a.term !== entry.term).map((a) => answerOf(a, direction)))].filter((t) => t !== answer);
  return shuffle([answer, ...shuffle(others, rng).slice(0, CHOICES - 1)], rng);
}
