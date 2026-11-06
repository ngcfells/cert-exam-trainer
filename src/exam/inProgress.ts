import { z } from 'zod';
import { questionSchema } from '../domain/schema';
import type { Question } from '../domain/types';
import type { Repo } from '../storage/repo';
import type { AssembledExam } from './assemble';
import type { Responses } from './scoring';

/** The setting that holds the running mock, so a refresh or close can still score it. Never in a backup. */
export const IN_PROGRESS_SETTING = 'mockInProgress';

export interface MockInProgress {
  exam: AssembledExam;
  startedAt: string;
  /** When this record was last written: the end time a recovered mock is scored at. */
  savedAt: string;
  responses: Responses;
  flagged: string[];
}

const isoDate = z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'not a date');
const order = z.array(z.string());
const schema = z.object({
  exam: z.object({
    exam: z.string().min(1),
    seed: z.number().int().nonnegative(),
    items: z.array(
      z.object({
        question: questionSchema,
        optionOrder: order.optional(),
        elementOrder: order.optional(),
        partOrders: z.record(order).optional(),
      }),
    ),
    mcqCount: z.number(),
    pbqWeightSum: z.number(),
  }),
  startedAt: isoDate,
  savedAt: isoDate,
  responses: z.record(z.union([z.array(z.string()), z.record(z.string())])),
  flagged: z.array(z.string()),
});

export function saveInProgress(repo: Repo, p: MockInProgress): Promise<void> {
  return repo.setSetting(IN_PROGRESS_SETTING, p);
}

/** The saved mock, or null when there is none or it does not parse. */
export async function loadInProgress(repo: Repo): Promise<MockInProgress | null> {
  try {
    const parsed = schema.safeParse(await repo.getSetting(IN_PROGRESS_SETTING));
    if (!parsed.success) return null;
    const { exam, ...rest } = parsed.data;
    return { ...rest, exam: { ...exam, items: exam.items.map((i) => ({ ...i, question: i.question as Question })) } };
  } catch {
    return null;
  }
}

export function clearInProgress(repo: Repo): Promise<void> {
  return repo.setSetting(IN_PROGRESS_SETTING, null);
}
