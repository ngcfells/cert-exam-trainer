import { z } from 'zod';
import { isPbqTemplate, pbqIssues } from './pbq';
import { isValidSearchTerm } from '../learn/phrase';
import type { ExamMeta, Question } from './types';

const PBQ_TYPES = [
  'pbq-match', 'pbq-order', 'pbq-config', 'pbq-diagram',
  'pbq-terminal', 'pbq-data', 'pbq-hotspot', 'pbq-buckets',
] as const;

export const QUESTION_TYPES = ['mcq-single', 'mcq-multi', 'numeric', ...PBQ_TYPES] as const;

const base = {
  id: z.string().min(1),
  exam: z.string().min(1),
  source: z.enum(['ours', 'user']),
  objectiveIds: z.array(z.string().min(1)).min(1),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  stem: z.string().min(1),
  explanation: z.string(),
  partExplanations: z.record(z.string()).optional(),
  searchTerm: z.string().refine(isValidSearchTerm, 'search term: 2 to 6 words, at most 50 characters, letters, digits, spaces, hyphens, periods').optional(),
  acronyms: z.array(z.string()),
  status: z.enum(['draft', 'reviewed', 'approved']),
};

const mcqPayload = z.object({
  options: z.array(z.object({ id: z.string().min(1), text: z.string().min(1) })).min(2),
});
const mcqAnswer = z.object({ correct: z.array(z.string().min(1)).min(1) });

const mcqFields = {
  ...base,
  pbqWeight: z.undefined({ invalid_type_error: 'pbqWeight is only allowed on pbq-* types' }),
  payload: mcqPayload,
  answer: mcqAnswer,
};

const questionUnion = z.discriminatedUnion('type', [
  z.object({ ...mcqFields, type: z.literal('mcq-single') }).strict(),
  z.object({ ...mcqFields, type: z.literal('mcq-multi'), pick: z.union([z.number().int().min(2), z.literal('all')]).optional() }).strict(),
  z.object({
    ...base,
    type: z.literal('numeric'),
    pbqWeight: z.undefined({ invalid_type_error: 'pbqWeight is only allowed on pbq-* types' }),
    payload: z.object({ prefix: z.string().min(1).max(4).optional(), suffix: z.string().min(1).max(8).optional() }).strict(),
    answer: z.object({ value: z.number().finite(), tolerance: z.number().finite().min(0) }).strict(),
  }).strict(),
  z.object({
    ...base,
    type: z.enum(PBQ_TYPES),
    pbqWeight: z.number().int().min(1).max(6),
    payload: z.unknown(),
    answer: z.unknown(),
  }).strict(),
]);

export const questionSchema = questionUnion.superRefine((q, ctx) => {
  if (isPbqTemplate(q.type)) {
    for (const i of pbqIssues(q.type, q.payload, q.answer)) ctx.addIssue({ code: 'custom', ...i });
    return;
  }
  if (q.type !== 'mcq-single' && q.type !== 'mcq-multi') return;
  const ids = q.payload.options.map((o) => o.id);
  if (new Set(ids).size !== ids.length) {
    ctx.addIssue({ code: 'custom', path: ['payload', 'options'], message: 'duplicate option id' });
  }
  for (const c of q.answer.correct) {
    if (!ids.includes(c)) {
      ctx.addIssue({ code: 'custom', path: ['answer', 'correct'], message: `correct id "${c}" is not an option` });
    }
  }
  const n = new Set(q.answer.correct).size;
  if (q.type === 'mcq-single' && n !== 1) {
    ctx.addIssue({ code: 'custom', path: ['answer', 'correct'], message: 'mcq-single needs exactly 1 correct answer' });
  }
  if (q.type === 'mcq-multi' && n < 2) {
    ctx.addIssue({ code: 'custom', path: ['answer', 'correct'], message: 'mcq-multi needs at least 2 correct answers' });
  }
  if (q.type === 'mcq-multi' && typeof q.pick === 'number' && q.pick !== n) {
    ctx.addIssue({ code: 'custom', path: ['pick'], message: `pick ${q.pick} needs exactly ${q.pick} correct answers` });
  }
});

export const examMetaSchema = z.object({
  code: z.string().min(1),
  version: z.string().min(1),
  name: z.string().min(1),
  maxQuestions: z.number().int().positive(),
  timeLimitMinutes: z.number().int().positive(),
  passingScore: z.number().int().positive(),
  domains: z.array(z.object({ id: z.string().min(1), title: z.string().min(1), weight: z.number().positive() })).min(1),
  objectives: z.array(z.object({ id: z.string().min(1), domainId: z.string().min(1), title: z.string().min(1) })),
  acronyms: z.array(z.object({
    term: z.string().min(1),
    expansion: z.string().min(1),
    /** Other meanings of the same concept that typed answers also accept (e.g. MTTR: Repair, Restore). */
    alternates: z.array(z.string().min(1)).min(1).optional(),
    source: z.enum(['official', 'community']),
  })),
}).strict().superRefine((m, ctx) => {
  const total = m.domains.reduce((s, d) => s + d.weight, 0);
  if (total !== 100) {
    ctx.addIssue({ code: 'custom', path: ['domains'], message: `domain weights sum to ${total}, expected 100` });
  }
  const terms = new Set<string>();
  m.acronyms.forEach((a, i) => {
    if (terms.has(a.term)) ctx.addIssue({ code: 'custom', path: ['acronyms', i, 'term'], message: `repeated acronym "${a.term}"` });
    terms.add(a.term);
    // Rough fold (case and punctuation), enough to catch an alternate that repeats a meaning.
    const fold = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
    const seen = new Set([fold(a.expansion)]);
    a.alternates?.forEach((alt, j) => {
      if (seen.has(fold(alt))) ctx.addIssue({ code: 'custom', path: ['acronyms', i, 'alternates', j], message: `alternate "${alt}" repeats a meaning of ${a.term}` });
      seen.add(fold(alt));
    });
  });
  const domainIds = new Set(m.domains.map((d) => d.id));
  m.objectives.forEach((o, i) => {
    if (!domainIds.has(o.domainId)) {
      ctx.addIssue({ code: 'custom', path: ['objectives', i, 'domainId'], message: `unknown domain "${o.domainId}"` });
    }
  });
});

export function parseQuestion(x: unknown): Question {
  return questionSchema.parse(x) as Question;
}

export function parseExamMeta(x: unknown): ExamMeta {
  return examMetaSchema.parse(x);
}
