import type { NumericAnswer, NumericPayload, Question } from './types';

/** Digits, one `.`, a leading `-`; `,`, `$`, `%` and spaces are ignored. Anything else is null (unanswered). */
export function parseNumeric(text: string): number | null {
  const s = text.replace(/[,$%\s]/g, '');
  return /^-?(\d+\.?\d*|\.\d+)$/.test(s) ? Number(s) : null;
}

/** Within tolerance, inclusive; the slack absorbs float error at the edge. */
export function numericCorrect(answer: NumericAnswer, text: string | undefined): boolean {
  const n = text === undefined ? null : parseNumeric(text);
  return n !== null && Math.abs(n - answer.value) <= answer.tolerance + 1e-9;
}

/** One scoring unit (MCQs and typed numbers), never a PBQ. */
export const isUnitItem = (q: Pick<Question, 'type'>) => q.type === 'mcq-single' || q.type === 'mcq-multi' || q.type === 'numeric';

export function formatNumericAnswer(q: Question): string {
  const p = q.payload as NumericPayload;
  const a = q.answer as NumericAnswer;
  return `${p.prefix ?? ''}${a.value}${p.suffix ?? ''}${a.tolerance > 0 ? ` (± ${a.tolerance})` : ''}`;
}
