import { describe, it, expect } from 'vitest';
import { getBundledQuestions, listExams } from '../banks';
import { extractAcronyms, questionText } from './extract';

// The content check (spec §8 item 2): runs in `npm run test`, so `npm run check` fails on a gap.
describe.each(listExams().map((m) => [m.code, m] as const))('acronyms for %s', (code, meta) => {
  const questions = getBundledQuestions(code, { includeDrafts: true });
  const listed = new Set(meta.acronyms.map((a) => a.term));

  it('every token in bundled questions has an expansion', () => {
    const tokens = new Set(questions.flatMap((q) => extractAcronyms(questionText(q))));
    expect([...tokens].filter((t) => !listed.has(t)).sort()).toEqual([]);
  });

  it('every tagged acronym is in the list', () => {
    const missing = questions.flatMap((q) => q.acronyms.filter((t) => !listed.has(t)).map((t) => `${q.id}: ${t}`));
    expect(missing).toEqual([]);
  });
});
