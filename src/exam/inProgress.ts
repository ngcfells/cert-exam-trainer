import { z } from 'zod';
import { questionSchema } from '../domain/schema';
import type { Question } from '../domain/types';
import type { Repo } from '../storage/repo';
import type { AssembledExam } from './assemble';
import type { Responses } from './scoring';

/** The setting that holds the running mock, so a refresh or close can still score it. Never in a backup. */
export const IN_PROGRESS_SETTING = 'mockInProgress';
/** The running mock's latest answers, written on each change so a save never rewrites the whole exam. Never in a backup. */
export const IN_PROGRESS_ANSWERS_SETTING = 'mockInProgressAnswers';
/** Both settings above: what a backup leaves out. */
export const IN_PROGRESS_SETTINGS: readonly string[] = [IN_PROGRESS_SETTING, IN_PROGRESS_ANSWERS_SETTING];

export interface MockInProgress {
  exam: AssembledExam;
  startedAt: string;
  /** When this record was last written: the end time a recovered mock is scored at. */
  savedAt: string;
  responses: Responses;
  flagged: string[];
}

/** The part of a running mock that changes as it goes. */
export type MockAnswers = Pick<MockInProgress, 'startedAt' | 'savedAt' | 'responses' | 'flagged'>;

const isoDate = z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'not a date');
const order = z.array(z.string());
const responsesSchema = z.record(z.union([z.array(z.string()), z.record(z.string())]));
const answersSchema = z.object({ startedAt: isoDate, savedAt: isoDate, responses: responsesSchema, flagged: z.array(z.string()) });
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
  responses: responsesSchema,
  flagged: z.array(z.string()),
});

/** Saves the whole attempt: once, when the mock starts. */
export function saveInProgress(repo: Repo, p: MockInProgress): Promise<void> {
  return repo.setSetting(IN_PROGRESS_SETTING, p);
}

/** Saves only the answers and flags, after each change. */
export function saveProgress(repo: Repo, a: MockAnswers): Promise<void> {
  return repo.setSetting(IN_PROGRESS_ANSWERS_SETTING, a);
}

/**
 * The saved mock with its latest answers, or null when there is none or it does not parse.
 * A record that does not parse is cleared, so it is not read again on every start.
 */
export async function loadInProgress(repo: Repo): Promise<MockInProgress | null> {
  let raw: unknown;
  let rawAnswers: unknown;
  try {
    [raw, rawAnswers] = await Promise.all([repo.getSetting(IN_PROGRESS_SETTING), repo.getSetting(IN_PROGRESS_ANSWERS_SETTING)]);
  } catch {
    return null;
  }
  if (raw === null || raw === undefined) return null;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    await clearInProgress(repo).catch(() => {});
    return null;
  }
  const { exam, ...rest } = parsed.data;
  // Answers count only when they belong to this attempt; a late write from an older one is ignored.
  const answers = answersSchema.safeParse(rawAnswers);
  const latest = answers.success && answers.data.startedAt === rest.startedAt ? answers.data : {};
  return { ...rest, ...latest, exam: { ...exam, items: exam.items.map((i) => ({ ...i, question: i.question as Question })) } };
}

export async function clearInProgress(repo: Repo): Promise<void> {
  await Promise.all(IN_PROGRESS_SETTINGS.map((k) => repo.setSetting(k, null)));
}
