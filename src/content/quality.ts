import type { McqAnswer, McqPayload, Question } from '../domain/types';

export const CONTENT_TARGETS = {
  mcq: 500,
  pbq: 80,
  perPbqType: 10,
  maxPositionShare: 0.35,
  maxLongestShare: 0.4,
  dupThreshold: 0.6,
} as const;

function trigrams(text: string): Set<string> {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i + 2 < words.length; i++) out.add(words.slice(i, i + 3).join(' '));
  return out;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let both = 0;
  for (const x of a) if (b.has(x)) both++;
  return both / (a.size + b.size - both);
}

/** Pairs of questions whose stems share most of their word trigrams: [idA, idB, similarity]. */
export function nearDuplicates(questions: Question[], threshold: number = CONTENT_TARGETS.dupThreshold): [string, string, number][] {
  const grams = questions.map((q) => trigrams(q.stem));
  const out: [string, string, number][] = [];
  for (let i = 0; i < questions.length; i++) {
    for (let j = i + 1; j < questions.length; j++) {
      const s = jaccard(grams[i], grams[j]);
      if (s >= threshold) out.push([questions[i].id, questions[j].id, s]);
    }
  }
  return out;
}

function singles(questions: Question[]): { options: McqPayload['options']; key: string }[] {
  return questions
    .filter((q) => q.type === 'mcq-single')
    .map((q) => ({ options: (q.payload as McqPayload).options, key: (q.answer as McqAnswer).correct[0] }));
}

/** Share of single-answer MCQs whose key sits at each option position '0'..'3'. */
export function answerBalance(questions: Question[]): Record<string, number> {
  const s = singles(questions);
  const out: Record<string, number> = { '0': 0, '1': 0, '2': 0, '3': 0 };
  for (const { options, key } of s) {
    const pos = String(options.findIndex((o) => o.id === key));
    out[pos] = (out[pos] ?? 0) + 1;
  }
  for (const k of Object.keys(out)) out[k] = s.length ? out[k] / s.length : 0;
  return out;
}

/** Share of single-answer MCQs whose key is strictly the longest option. */
export function longestOptionTell(questions: Question[]): number {
  const s = singles(questions);
  if (s.length === 0) return 0;
  const tells = s.filter(({ options, key }) => {
    const len = options.find((o) => o.id === key)?.text.length ?? 0;
    return options.every((o) => o.id === key || o.text.length < len);
  });
  return tells.length / s.length;
}
