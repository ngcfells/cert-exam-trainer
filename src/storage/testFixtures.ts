import type { Question } from '../domain/types';
import type { ExamResult } from '../exam/result';
import type { SrsRecord } from '../study/srs';

export const srsRec = (id: string): SrsRecord => ({
  id,
  exam: 'DA0-002',
  kind: 'question',
  itemId: 'da2-seed-001',
  ease: 2.5,
  intervalDays: 1,
  reps: 1,
  lapses: 0,
  due: new Date(86_400_000).toISOString(),
  lastReviewed: new Date(0).toISOString(),
});

export const resultRec = (id: string): ExamResult => ({
  id,
  exam: 'DA0-002',
  seed: 1,
  startedAt: new Date(0).toISOString(),
  finishedAt: new Date(1000).toISOString(),
  autoSubmitted: false,
  questionIds: ['da2-seed-001'],
  optionOrders: { 'da2-seed-001': ['a', 'b', 'c', 'd'] },
  responses: { 'da2-seed-001': ['a'] },
  flagged: [],
  score: 900,
  passed: true,
});

export const userQ = (id: string, exam = 'DA0-002'): Question => ({
  id,
  exam,
  source: 'user',
  type: 'mcq-single',
  objectiveIds: ['1.1'],
  difficulty: 1,
  stem: `Stem ${id}`,
  payload: { options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }] },
  answer: { correct: ['a'] },
  explanation: '',
  acronyms: [],
  status: 'approved',
});
