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
  elementOrders: z.record(z.array(z.string())).optional(),
  responses: z.record(z.union([z.array(z.string()), z.record(z.string())])),
  flagged: z.array(z.string()),
  score: z.number(),
  passed: z.boolean(),
  /** Absent on mock exams (and on every result saved before chunk 5). */
  mode: z.enum(['mock', 'practice', 'cram']).optional(),
}).strict();

export type ExamResult = z.infer<typeof examResultSchema>;
export type ResultMode = NonNullable<ExamResult['mode']>;

export function resultMode(r: ExamResult): ResultMode {
  return r.mode ?? 'mock';
}

export function buildResult(args: {
  exam: AssembledExam;
  responses: Responses;
  flagged: string[];
  report: ScoreReport;
  startedAt: Date;
  finishedAt: Date;
  autoSubmitted: boolean;
  mode?: ResultMode;
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
    elementOrders: Object.fromEntries(exam.items.filter((i) => i.elementOrder).map((i) => [i.question.id, i.elementOrder!])),
    responses: args.responses,
    flagged: args.flagged,
    score: report.score,
    passed: report.passed,
    ...(args.mode && args.mode !== 'mock' ? { mode: args.mode } : {}),
  };
}

/** Valid results for `exam`, in storage order. */
export function parseResults(results: unknown[], exam: string): ExamResult[] {
  return results.flatMap((r) => {
    const p = examResultSchema.safeParse(r);
    return p.success && p.data.exam === exam ? [p.data] : [];
  });
}

/** Question ids from the newest `n` valid mock results for `exam`. */
export function recentQuestionIds(results: unknown[], exam: string, n = RECENT_ATTEMPTS): Set<string> {
  const valid = parseResults(results, exam).filter((r) => resultMode(r) === 'mock');
  valid.sort((a, b) => b.finishedAt.localeCompare(a.finishedAt));
  return new Set(valid.slice(0, n).flatMap((r) => r.questionIds));
}
