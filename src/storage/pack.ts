import { z } from 'zod';
import type { Question } from '../domain/types';
import { BACKUP_FORMAT, describe, ImportError, validateUserQuestions, type ImportResult } from './backup';
import type { Repo } from './repo';

/** The interchange format for user questions: in-app import/export and the md-to-pack script. */
export const PACK_FORMAT = 'cert-exam-trainer-questions';

export interface QuestionPack {
  format: typeof PACK_FORMAT;
  version: 1;
  exportedAt: string;
  questions: Question[];
}

const fileSchema = z.object({
  format: z.literal(PACK_FORMAT),
  version: z.literal(1),
  exportedAt: z.string().optional(),
  questions: z.array(z.unknown()),
});

/** Fields a pack entry may leave out. */
function withDefaults(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
  return { source: 'user', acronyms: [], status: 'approved', explanation: '', ...raw };
}

export async function exportPack(repo: Repo, exam?: string, now: () => Date = () => new Date()): Promise<QuestionPack> {
  return { format: PACK_FORMAT, version: 1, exportedAt: now().toISOString(), questions: await repo.getUserQuestions(exam) };
}

/** Validates every question before writing any; always merges (same id replaces). */
export async function importPack(repo: Repo, json: string): Promise<ImportResult> {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new ImportError('This file is not valid JSON.');
  }
  if (raw && typeof raw === 'object' && (raw as { format?: unknown }).format === BACKUP_FORMAT) {
    throw new ImportError('This is a full backup file. Use "Import backup" on the home screen instead.');
  }
  const parsed = fileSchema.safeParse(raw);
  if (!parsed.success) {
    const formatIssue = parsed.error.issues.find((i) => i.path[0] === 'format' || i.path[0] === 'version');
    throw new ImportError(
      formatIssue
        ? 'This is not a Cert Exam Trainer question file (unrecognized format or version).'
        : `The question file is malformed: ${describe(parsed.error.issues[0])}`,
    );
  }
  const { toWrite, skipped } = validateUserQuestions(parsed.data.questions.map(withDefaults));
  for (const q of toWrite) await repo.upsertUserQuestion(q);
  return { imported: toWrite.length, skipped };
}
