import type { Question } from '../domain/types';

export type RecordStore = 'results' | 'srs';

export interface Repo {
  getUserQuestions(exam?: string): Promise<Question[]>;
  /** Throws if q.source !== 'user'. */
  upsertUserQuestion(q: Question): Promise<void>;
  deleteUserQuestion(id: string): Promise<void>;
  getSetting<T>(key: string): Promise<T | undefined>;
  setSetting<T>(key: string, v: T): Promise<void>;
  putRecord(store: RecordStore, rec: { id: string } & Record<string, unknown>): Promise<void>;
  listRecords(store: RecordStore): Promise<unknown[]>;
  /** Lists every setting; used by backup export. */
  listSettings(): Promise<Record<string, unknown>>;
  clearAll(): Promise<void>;
}

export function assertUserQuestion(q: Question): void {
  if (q.source !== 'user') {
    throw new Error(`only user questions can be stored (got source "${q.source}" for ${q.id})`);
  }
}
