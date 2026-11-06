import { z } from 'zod';
import { getBundledQuestions, listExams } from '../banks';
import { parseQuestion } from '../domain/schema';
import type { Question } from '../domain/types';
import type { Repo } from './repo';
import { examResultSchema } from '../exam/result';
import { srsRecordSchema } from '../study/srs';
import { IN_PROGRESS_SETTINGS } from '../exam/inProgress';

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

const fileSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.literal(1),
  exportedAt: z.string(),
  userQuestions: z.array(z.unknown()),
  settings: z.record(z.unknown()),
  results: z.array(examResultSchema),
  srs: z.array(srsRecordSchema),
});

export async function exportBackup(repo: Repo, now: () => Date = () => new Date()): Promise<BackupFile> {
  const [userQuestions, settings, results, srs] = await Promise.all([
    repo.getUserQuestions(),
    repo.listSettings(),
    repo.listRecords('results'),
    repo.listRecords('srs'),
  ]);
  // A running mock stays on this device: restoring it elsewhere would score a stale exam.
  for (const k of IN_PROGRESS_SETTINGS) delete settings[k];
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

  const { toWrite, skipped } = validateUserQuestions(file.userQuestions);

  const previous = await exportBackup(repo);
  try {
    await write(repo, mode, toWrite, file);
  } catch (e) {
    await repo.clearAll();
    await write(repo, 'merge', previous.userQuestions, previous);
    throw new ImportError(`Import failed while saving; your previous data was restored. (${String(e)})`);
  }

  return { imported: toWrite.length, skipped };
}

async function write(
  repo: Repo,
  mode: 'merge' | 'replace',
  questions: Question[],
  data: Pick<BackupFile, 'settings' | 'results' | 'srs'>,
): Promise<void> {
  if (mode === 'replace') await repo.clearAll();
  for (const q of questions) await repo.upsertUserQuestion(q);
  for (const [k, v] of Object.entries(data.settings)) if (!IN_PROGRESS_SETTINGS.includes(k)) await repo.setSetting(k, v);
  for (const rec of data.results) await repo.putRecord('results', rec as { id: string });
  for (const rec of data.srs) await repo.putRecord('srs', rec as { id: string });
}

/**
 * Checks incoming user questions; throws ImportError on the first invalid one.
 * Non-user questions and ids taken by bundled questions are skipped.
 */
export function validateUserQuestions(raw: unknown[]): { toWrite: Question[]; skipped: ImportResult['skipped'] } {
  const toWrite: Question[] = [];
  const skipped: ImportResult['skipped'] = [];
  const seen = new Set<string>();
  raw.forEach((rawQ, i) => {
    const r = rawQ as { id?: unknown; source?: unknown } | null;
    if (r && typeof r === 'object' && r.source !== undefined && r.source !== 'user') {
      skipped.push({ id: String(r.id ?? `#${i + 1}`), reason: 'bundled questions cannot be imported' });
      return;
    }
    const label = `Question ${i + 1}${r && typeof r === 'object' && typeof r.id === 'string' ? ` (${r.id})` : ''}`;
    let q: Question;
    try {
      q = parseQuestion(rawQ);
    } catch (e) {
      const detail = e instanceof z.ZodError ? describe(e.issues[0]) : String(e);
      throw new ImportError(`${label} is invalid: ${detail}`);
    }
    const meta = listExams().find((m) => m.code === q.exam);
    if (!meta) throw new ImportError(`${label} is for unknown exam "${q.exam}".`);
    const objectives = new Set(meta.objectives.map((o) => o.id));
    const unknown = q.objectiveIds.find((o) => !objectives.has(o));
    if (unknown) throw new ImportError(`${label} references unknown objective "${unknown}" for ${q.exam}.`);
    if (seen.has(q.id)) throw new ImportError(`${label} repeats an id used earlier in the file.`);
    seen.add(q.id);
    if (getBundledQuestions(q.exam, { includeDrafts: true }).some((b) => b.id === q.id)) {
      skipped.push({ id: q.id, reason: 'id is already used by a bundled question' });
      return;
    }
    toWrite.push(q);
  });
  return { toWrite, skipped };
}

export function describe(issue: z.ZodIssue | undefined): string {
  if (!issue) return 'unknown error';
  return issue.path.length ? `${issue.path.join('.')}: ${issue.message}` : issue.message;
}
