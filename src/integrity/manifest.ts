import { z } from 'zod';
import { hashRelease, type ExamHashes } from './hashes';

/** The branch that holds the official hashes, the file on it, and where the app reads it. */
export const HASHES_BRANCH = 'Security';
export const HASHES_FILE = 'content-hashes.json';
export const HASHES_URL = `https://raw.githubusercontent.com/ngcfells/cert-exam-trainer/${HASHES_BRANCH}/${HASHES_FILE}`;

const hash = z.string().regex(/^[0-9a-f]{64}$/);
const hashes = z.record(hash);
const releaseInfo = { id: hash, date: z.string().min(1), commit: z.string().min(1), appVersion: z.string().min(1) };

export const manifestSchema = z.object({
  format: z.literal(1),
  algorithm: z.literal('SHA-512/256'),
  /** The newest release, with a hash for every item. */
  current: z.object({ ...releaseInfo, exams: z.record(z.object({ hash, meta: hash, questions: hashes, lessons: hashes })) }),
  /** Earlier releases, newest first, with exam hashes only. */
  history: z.array(z.object({ ...releaseInfo, exams: hashes })),
});

export type Manifest = z.infer<typeof manifestSchema>;
export type Release = Manifest['current'];

/** How one exam's local content differs from the published release. */
export interface ExamDiff {
  exam: string;
  /** Question ids. `missing`: published but not here. `extra`: here but not published. */
  changed: string[];
  missing: string[];
  extra: string[];
  /** The exam details (name, passing score, objectives, acronym list) differ. */
  metaDiffers: boolean;
  lessonsChanged: string[];
  lessonsMissing: string[];
  lessonsExtra: string[];
}

function diffIds(local: Record<string, string>, published: Record<string, string>) {
  const ids = Object.keys(local);
  return {
    changed: ids.filter((id) => id in published && published[id] !== local[id]).sort(),
    missing: Object.keys(published).filter((id) => !(id in local)).sort(),
    extra: ids.filter((id) => !(id in published)).sort(),
  };
}

const NONE: ExamHashes = { hash: '', meta: '', questions: {}, lessons: {} };

/** The exams that differ, in code order. An exam on one side only lists every one of its items. */
export function diffExams(local: Record<string, ExamHashes>, published: Record<string, ExamHashes>): ExamDiff[] {
  const codes = [...new Set([...Object.keys(local), ...Object.keys(published)])].sort();
  return codes.flatMap((exam) => {
    const l = local[exam] ?? NONE;
    const p = published[exam] ?? NONE;
    if (l.hash === p.hash) return [];
    const q = diffIds(l.questions, p.questions);
    const s = diffIds(l.lessons, p.lessons);
    return [{ exam, ...q, metaDiffers: l.meta !== p.meta, lessonsChanged: s.changed, lessonsMissing: s.missing, lessonsExtra: s.extra }];
  });
}

export type Verdict =
  | { kind: 'verified'; release: Release }
  | { kind: 'outdated'; current: Release }
  | { kind: 'mismatch'; diffs: ExamDiff[] };

/** Is the local content the current release, an earlier one, or neither? */
export function verdict(local: Record<string, ExamHashes>, manifest: Manifest): Verdict {
  const id = hashRelease(local);
  if (id === manifest.current.id) return { kind: 'verified', release: manifest.current };
  if (manifest.history.some((r) => r.id === id)) return { kind: 'outdated', current: manifest.current };
  return { kind: 'mismatch', diffs: diffExams(local, manifest.current.exams) };
}

/**
 * The file to publish for this content, or null when the published file already names it as current.
 * The release it replaces moves to the head of `history`, cut down to its exam hashes.
 */
export function nextManifest(
  prev: Manifest | null,
  local: Record<string, ExamHashes>,
  info: { date: string; commit: string; appVersion: string },
): Manifest | null {
  const id = hashRelease(local);
  if (prev?.current.id === id) return null;
  const old = prev
    ? [{ ...prev.current, exams: Object.fromEntries(Object.entries(prev.current.exams).map(([code, e]) => [code, e.hash])) }]
    : [];
  return {
    format: 1,
    algorithm: 'SHA-512/256',
    current: { id, ...info, exams: local },
    history: [...old, ...(prev?.history ?? [])],
  };
}
