import type { Question } from '../domain/types';
import type { OutboxReport } from '../report/outbox';

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
  /** Clears questions, settings and records. Waiting reports (the outbox) are kept: backup import calls this. */
  clearAll(): Promise<void>;
  listOutbox(): Promise<OutboxReport[]>;
  /** Drops any turnstileToken. Throws OutboxFullError when MAX_OUTBOX are waiting and r.id is new. */
  putOutbox(r: OutboxReport): Promise<void>;
  deleteOutbox(id: string): Promise<void>;
}

export function assertUserQuestion(q: Question): void {
  if (q.source !== 'user') {
    throw new Error(`only user questions can be stored (got source "${q.source}" for ${q.id})`);
  }
}
