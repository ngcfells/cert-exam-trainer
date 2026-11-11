import type { Lesson } from '../domain/lesson';
import type { ExamMeta, Question } from '../domain/types';
import { hashText } from './sha512_256';

/**
 * One fixed text for a value, so the same content always gives the same hash: JSON with object keys sorted at
 * every depth, arrays in their own order, no spaces, and `undefined` properties left out.
 */
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((v) => canonical(v)).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const o = value as Record<string, unknown>;
    const parts = Object.keys(o)
      .filter((k) => o[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`);
    return `{${parts.join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

/** What one exam ships: its details, its questions (drafts too) and its lessons. */
export interface ExamContent {
  meta: ExamMeta;
  questions: Question[];
  lessons: Lesson[];
}

export interface ExamHashes {
  /** Over `meta`, `questions` and `lessons` below. */
  hash: string;
  meta: string;
  questions: Record<string, string>;
  lessons: Record<string, string>;
}

const byId = (items: { id: string }[]): Record<string, string> =>
  Object.fromEntries(items.map((i) => [i.id, hashText(canonical(i))]));

/** Adds the exam hash to its parts. The published file is checked against this, so a file that disagrees with itself is refused. */
export function sealExam({ meta, questions, lessons }: Omit<ExamHashes, 'hash'>): ExamHashes {
  return { hash: hashText(canonical({ meta, questions, lessons })), meta, questions, lessons };
}

export function hashExam(c: ExamContent): ExamHashes {
  return sealExam({ meta: hashText(canonical(c.meta)), questions: byId(c.questions), lessons: byId(c.lessons) });
}

/** The release id: one hash over every exam's hash. */
export function hashRelease(exams: Record<string, ExamHashes>): string {
  return hashText(canonical(Object.fromEntries(Object.entries(exams).map(([code, e]) => [code, e.hash]))));
}
