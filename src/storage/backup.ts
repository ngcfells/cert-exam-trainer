import { z } from 'zod';
import { parseQuestion } from '../domain/schema';
import type { Question } from '../domain/types';
import type { Repo } from './repo';

export const BACKUP_FORMAT = 'cert-exam-trainer-backup';

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: 1;
  exportedAt: string;
  userQuestions: Question[];
  settings: Record<string, unknown>;
  results: unknown[];
  srs: unknown[];
}

export interface ImportResult {
  imported: number;
  skipped: { id: string; reason: string }[];
}

export class ImportError extends Error {
  name = 'ImportError';
}

const recordSchema = z.object({ id: z.string().min(1) }).passthrough();

const fileSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.literal(1),
  exportedAt: z.string(),
  userQuestions: z.array(z.unknown()),
  settings: z.record(z.unknown()),
  results: z.array(recordSchema),
  srs: z.array(recordSchema),
});

export async function exportBackup(repo: Repo, now: () => Date = () => new Date()): Promise<BackupFile> {
  const [userQuestions, settings, results, srs] = await Promise.all([
    repo.getUserQuestions(),
    repo.listSettings(),
    repo.listRecords('results'),
    repo.listRecords('srs'),
  ]);
  return { format: BACKUP_FORMAT, version: 1, exportedAt: now().toISOString(), userQuestions, settings, results, srs };
}

/** Validates the whole file before writing anything; an invalid file throws ImportError and leaves the repo untouched. */
export async function importBackup(repo: Repo, json: string, mode: 'merge' | 'replace'): Promise<ImportResult> {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new ImportError('This file is not valid JSON.');
  }

  const parsed = fileSchema.safeParse(raw);
  if (!parsed.success) {
    const formatIssue = parsed.error.issues.find((i) => i.path[0] === 'format' || i.path[0] === 'version');
    throw new ImportError(
      formatIssue
        ? 'This is not a Cert Exam Trainer backup file (unrecognized format or version).'
        : `The backup file is malformed: ${describe(parsed.error.issues[0])}`,
    );
  }
  const file = parsed.data;

  const toWrite: Question[] = [];
  const skipped: ImportResult['skipped'] = [];
  file.userQuestions.forEach((rawQ, i) => {
    const r = rawQ as { id?: unknown; source?: unknown } | null;
    if (r && typeof r === 'object' && r.source !== undefined && r.source !== 'user') {
      skipped.push({ id: String(r.id ?? `#${i + 1}`), reason: 'bundled questions cannot be imported' });
      return;
    }
    try {
      toWrite.push(parseQuestion(rawQ));
    } catch (e) {
      const id = r && typeof r === 'object' && typeof r.id === 'string' ? ` (${r.id})` : '';
      const detail = e instanceof z.ZodError ? describe(e.issues[0]) : String(e);
      throw new ImportError(`Question ${i + 1}${id} is invalid: ${detail}`);
    }
  });

  if (mode === 'replace') await repo.clearAll();
  for (const q of toWrite) await repo.upsertUserQuestion(q);
  for (const [k, v] of Object.entries(file.settings)) await repo.setSetting(k, v);
  for (const rec of file.results) await repo.putRecord('results', rec);
  for (const rec of file.srs) await repo.putRecord('srs', rec);

  return { imported: toWrite.length, skipped };
}

function describe(issue: z.ZodIssue | undefined): string {
  if (!issue) return 'unknown error';
  return issue.path.length ? `${issue.path.join('.')}: ${issue.message}` : issue.message;
}
