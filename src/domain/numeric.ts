import type { NumericAnswer, NumericPayload, Question } from './types';

const NUMBER = /^-?(\d{1,3}(,\d{3})+|\d+)(\.\d*)?$|^-?\.\d+$/;

/**
 * Digits, one `.`, a leading minus (typed or typographic); commas or single spaces only between thousands groups;
 * `$`, `%` and outer spaces are ignored. Anything else ("5 3", "1 25") is null (unanswered).
 */
export function parseNumeric(text: string): number | null {
  const s = text.replace(/[−‒–]/g, '-').replace(/[$%]/g, '').trim();
  const t = /^-?\d{1,3}( \d{3})+(\.\d*)?$/.test(s) ? s.replace(/ /g, '') : s;
  return NUMBER.test(t) ? Number(t.replace(/,/g, '')) : null;
}

/** Within tolerance, inclusive; the slack, relative to the value, absorbs float error at the edge. */
export function numericCorrect(answer: NumericAnswer, text: string | undefined): boolean {
  const n = text === undefined ? null : parseNumeric(text);
  return n !== null && Math.abs(n - answer.value) <= answer.tolerance + 1e-9 * Math.max(1, Math.abs(answer.value));
}

/** One scoring unit (MCQs and typed numbers), never a PBQ. */
export const isUnitItem = (q: Pick<Question, 'type'>) => q.type === 'mcq-single' || q.type === 'mcq-multi' || q.type === 'numeric';

export function formatNumericAnswer(q: Question): string {
  const p = q.payload as NumericPayload;
  const a = q.answer as NumericAnswer;
  return `${p.prefix ?? ''}${a.value}${p.suffix ?? ''}${a.tolerance > 0 ? ` (± ${a.tolerance})` : ''}`;
}
