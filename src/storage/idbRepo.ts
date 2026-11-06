import { openDB, type DBSchema } from 'idb';
import type { Question } from '../domain/types';
import { assertUserQuestion, type Repo } from './repo';
import { MAX_OUTBOX, OutboxFullError, toOutboxReport, type OutboxReport } from '../report/outbox';

export const DB_NAME = 'cert-exam-trainer';

interface TrainerDB extends DBSchema {
  userQuestions: { key: string; value: Question; indexes: { exam: string } };
  settings: { key: string; value: unknown };
  results: { key: string; value: { id: string } };
  srs: { key: string; value: { id: string } };
  outbox: { key: string; value: OutboxReport };
}

export async function openIdbRepo(name = DB_NAME): Promise<Repo> {
  const db = await openDB<TrainerDB>(name, 2, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        const qs = db.createObjectStore('userQuestions', { keyPath: 'id' });
        qs.createIndex('exam', 'exam');
        db.createObjectStore('settings');
        db.createObjectStore('results', { keyPath: 'id' });
        db.createObjectStore('srs', { keyPath: 'id' });
      }
      if (oldVersion < 2) db.createObjectStore('outbox', { keyPath: 'id' });
    },
  });

  return {
    async getUserQuestions(exam) {
      return exam ? db.getAllFromIndex('userQuestions', 'exam', exam) : db.getAll('userQuestions');
    },
    async upsertUserQuestion(q) {
      assertUserQuestion(q);
      await db.put('userQuestions', q);
    },
    async deleteUserQuestion(id) {
      await db.delete('userQuestions', id);
    },
    async getSetting<T>(key: string) {
      return (await db.get('settings', key)) as T | undefined;
    },
    async setSetting(key, v) {
      await db.put('settings', v, key);
    },
    async putRecord(store, rec) {
      await db.put(store, rec);
    },
    async listRecords(store) {
      return db.getAll(store);
    },
    async listSettings() {
      const tx = db.transaction('settings');
      const [keys, values] = await Promise.all([tx.store.getAllKeys(), tx.store.getAll()]);
      return Object.fromEntries(keys.map((k, i) => [k, values[i]]));
    },
    async clearAll() {
      const tx = db.transaction(['userQuestions', 'settings', 'results', 'srs'], 'readwrite');
      await Promise.all([
        tx.objectStore('userQuestions').clear(),
        tx.objectStore('settings').clear(),
        tx.objectStore('results').clear(),
        tx.objectStore('srs').clear(),
        tx.done,
      ]);
    },
    async listOutbox() {
      return db.getAll('outbox');
    },
    async putOutbox(r) {
      const tx = db.transaction('outbox', 'readwrite');
      const exists = (await tx.store.getKey(r.id)) !== undefined;
      if (!exists && (await tx.store.count()) >= MAX_OUTBOX) {
        tx.abort();
        await tx.done.catch(() => undefined);
        throw new OutboxFullError();
      }
      await tx.store.put(toOutboxReport(r, new Date(r.savedAt)));
      await tx.done;
    },
    async deleteOutbox(id) {
      await db.delete('outbox', id);
    },
  };
}
