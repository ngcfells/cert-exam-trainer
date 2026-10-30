import { z } from 'zod';
import type { AssembledExam } from './assemble';
import type { Responses, ScoreReport } from './scoring';

export const RECENT_ATTEMPTS = 3;

export const examResultSchema = z.object({
  id: z.string().min(1),
  exam: z.string().min(1),
  seed: z.number().int().nonnegative(),
  startedAt: z.string(),
  finishedAt: z.string(),
  autoSubmitted: z.boolean(),
  questionIds: z.array(z.string()),
  optionOrders: z.record(z.array(z.string())),
  responses: z.record(z.array(z.string())),
  flagged: z.array(z.string()),
  score: z.number(),
  passed: z.boolean(),
}).strict();

export type ExamResult = z.infer<typeof examResultSchema>;

export function buildResult(args: {
  exam: AssembledExam;
  responses: Responses;
  flagged: string[];
  report: ScoreReport;
  startedAt: Date;
  finishedAt: Date;
  autoSubmitted: boolean;
}): ExamResult {
  const { exam, report } = args;
  return {
    id: `${exam.exam}-${args.finishedAt.getTime()}-${exam.seed}`,
    exam: exam.exam,
    seed: exam.seed,
    startedAt: args.startedAt.toISOString(),
    finishedAt: args.finishedAt.toISOString(),
    autoSubmitted: args.autoSubmitted,
    questionIds: exam.items.map((i) => i.question.id),
    optionOrders: Object.fromEntries(exam.items.filter((i) => i.optionOrder).map((i) => [i.question.id, i.optionOrder!])),
    responses: args.responses,
    flagged: args.flagged,
    score: report.score,
    passed: report.passed,
  };
}

/** Question ids from the newest `n` valid results for `exam`. */
export function recentQuestionIds(results: unknown[], exam: string, n = RECENT_ATTEMPTS): Set<string> {
  const valid = results.flatMap((r) => {
    const p = examResultSchema.safeParse(r);
    return p.success && p.data.exam === exam ? [p.data] : [];
  });
  valid.sort((a, b) => b.finishedAt.localeCompare(a.finishedAt));
  return new Set(valid.slice(0, n).flatMap((r) => r.questionIds));
}
