import { appendFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { questionSchema } from '../domain/schema';
import type { ExamMeta, Question } from '../domain/types';

// Node only: used by the dev server's review plugin (scripts/review-plugin.ts). Never import from app code.

export interface ReviewWriteOptions {
  itemsDir: string;
  rejectLog: string;
  meta: ExamMeta;
}

const fileFor = (dir: string, objective: string) => path.join(dir, `${objective}.json`);
const readItems = (file: string) => JSON.parse(readFileSync(file, 'utf8')) as Question[];
const writeItems = (file: string, qs: Question[]) => writeFileSync(file, JSON.stringify(qs, null, 2) + '\n');

/** True when a request may write: no Origin header (same-origin tools like curl), or the dev server's own origin. */
export function originAllowed(origin: string | undefined, host: string | undefined): boolean {
  if (origin === undefined) return true;
  try {
    return host !== undefined && new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Saves one reviewed bank item to its objective's JSON file; a note is logged as a rejection. */
export function applyReviewWrite(body: { question: unknown; note?: string }, opts: ReviewWriteOptions): { status: number; body: string } {
  const parsed = questionSchema.safeParse(body.question);
  if (!parsed.success) {
    return { status: 400, body: parsed.error.issues.map((i) => `${i.path.join('.') || 'item'}: ${i.message}`).join('; ') };
  }
  // Write what was sent, not Zod's output, which reorders keys and would churn the file's diff.
  const q = body.question as Question;
  const unknown = q.objectiveIds.find((o) => !opts.meta.objectives.some((m) => m.id === o));
  if (unknown) return { status: 400, body: `unknown objective ${unknown}` };

  const files = readdirSync(opts.itemsDir).filter((f) => f.endsWith('.json'));
  const home = files.map((f) => path.join(opts.itemsDir, f)).find((f) => readItems(f).some((x) => x.id === q.id));
  if (!home) return { status: 404, body: `no bank item ${q.id}` };

  const target = fileFor(opts.itemsDir, q.objectiveIds[0]);
  if (home === target) {
    writeItems(home, readItems(home).map((x) => (x.id === q.id ? q : x)));
  } else {
    // Write the new home first, so a failed write never loses the item.
    writeItems(target, [...(files.includes(path.basename(target)) ? readItems(target) : []), q]);
    const rest = readItems(home).filter((x) => x.id !== q.id);
    if (rest.length) writeItems(home, rest);
    else rmSync(home);
  }

  if (body.note) {
    mkdirSync(path.dirname(opts.rejectLog), { recursive: true });
    appendFileSync(opts.rejectLog, JSON.stringify({ id: q.id, note: body.note, at: new Date().toISOString() }) + '\n');
  }
  return { status: 200, body: 'ok' };
}
