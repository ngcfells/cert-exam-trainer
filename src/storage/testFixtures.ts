import type { Question } from '../domain/types';

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
