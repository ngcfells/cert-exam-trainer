import type { Question } from '../domain/types';
import { assertUserQuestion, type RecordStore, type Repo } from './repo';

export function createMemoryRepo(): Repo {
  const questions = new Map<string, Question>();
  const settings = new Map<string, unknown>();
  const records: Record<RecordStore, Map<string, unknown>> = { results: new Map(), srs: new Map() };
  const clone = <T>(v: T): T => structuredClone(v);

  return {
    async getUserQuestions(exam) {
      return [...questions.values()].filter((q) => !exam || q.exam === exam).map(clone);
    },
    async upsertUserQuestion(q) {
      assertUserQuestion(q);
      questions.set(q.id, clone(q));
    },
    async deleteUserQuestion(id) {
      questions.delete(id);
    },
    async getSetting<T>(key: string) {
      return clone(settings.get(key)) as T | undefined;
    },
    async setSetting(key, v) {
      settings.set(key, clone(v));
    },
    async putRecord(store, rec) {
      records[store].set(rec.id, clone(rec));
    },
    async listRecords(store) {
      return [...records[store].values()].map(clone);
    },
    async listSettings() {
      return Object.fromEntries([...settings].map(([k, v]) => [k, clone(v)]));
    },
    async clearAll() {
      questions.clear();
      settings.clear();
      records.results.clear();
      records.srs.clear();
    },
  };
}
