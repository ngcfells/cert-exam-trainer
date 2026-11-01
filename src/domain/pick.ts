import type { McqAnswer, Question } from './types';

/** How many answers a multi-answer question asks for: a number, or any number ("all"). */
export type PickCount = number | 'all';

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

/** "two" for 2, up to ten; digits beyond. */
export const pickWord = (n: number): string => WORDS[n] ?? String(n);

/** For MCQs: 1 for single answer; a multi's `pick`, or else its number of correct answers. */
export function effectivePick(q: Question): PickCount {
  if (q.type !== 'mcq-multi') return 1;
  return q.pick ?? new Set((q.answer as McqAnswer).correct).size;
}

/** True when the stem already says how many to pick: the count as a word, or "select/choose/pick N". */
export function stemStatesPick(stem: string, pick: PickCount): boolean {
  if (pick === 'all') return /all that apply/i.test(stem);
  const word = new RegExp(`\\b${pickWord(pick)}\\b`, 'i');
  const digit = new RegExp(`\\b(select|choose|pick)\\s+${pick}\\b`, 'i');
  return word.test(stem) || digit.test(stem);
}

export const pickSuffix = (pick: PickCount): string =>
  pick === 'all' ? '(Select all that apply.)' : `(Choose ${pickWord(pick)}.)`;

/** The stem as shown: a multi-answer stem that doesn't state its count gets one added. */
export function displayStem(q: Question): string {
  if (q.type !== 'mcq-multi') return q.stem;
  const pick = effectivePick(q);
  return stemStatesPick(q.stem, pick) ? q.stem : `${q.stem} ${pickSuffix(pick)}`;
}

export const pickHint = (pick: PickCount): string => (pick === 'all' ? 'Select all that apply.' : `Select ${pick}.`);
