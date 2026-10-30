import type { ExamMeta, Question, QuestionType } from '../domain/types';

export const meta3: ExamMeta = {
  code: 'T-001',
  version: '1',
  name: 'Test exam',
  maxQuestions: 10,
  timeLimitMinutes: 10,
  passingScore: 675,
  domains: [
    { id: 'A', title: 'Domain A', weight: 50 },
    { id: 'B', title: 'Domain B', weight: 30 },
    { id: 'C', title: 'Domain C', weight: 20 },
  ],
  objectives: [
    { id: 'A.1', domainId: 'A', title: 'Objective A1' },
    { id: 'B.1', domainId: 'B', title: 'Objective B1' },
    { id: 'C.1', domainId: 'C', title: 'Objective C1' },
  ],
  acronyms: [],
};

export function mcq(id: string, domain: string, type: 'mcq-single' | 'mcq-multi' = 'mcq-single'): Question {
  return {
    id,
    exam: 'T-001',
    source: 'ours',
    type,
    objectiveIds: [`${domain}.1`],
    difficulty: 1,
    stem: `Stem ${id}`,
    payload: { options: ['a', 'b', 'c', 'd'].map((o) => ({ id: o, text: `${id}-${o}` })) },
    answer: { correct: type === 'mcq-single' ? ['a'] : ['a', 'c'] },
    explanation: `Explanation ${id}`,
    acronyms: [],
    status: 'approved',
  };
}

export function pbq(id: string, w: number, type: QuestionType = 'pbq-match'): Question {
  return {
    id,
    exam: 'T-001',
    source: 'ours',
    type,
    objectiveIds: ['A.1'],
    difficulty: 2,
    pbqWeight: w,
    stem: `PBQ ${id}`,
    payload: {
      prompts: [{ id: 'p1', text: 'Prompt 1' }, { id: 'p2', text: 'Prompt 2' }],
      choices: ['c1', 'c2', 'c3'].map((c) => ({ id: c, text: `Choice ${c}` })),
    },
    answer: { pairs: { p1: 'c1', p2: 'c2' } },
    explanation: '',
    acronyms: [],
    status: 'approved',
  };
}

export function bank(perDomain: Record<string, number>): Question[] {
  return Object.entries(perDomain).flatMap(([d, n]) => Array.from({ length: n }, (_, i) => mcq(`${d}${i}`, d)));
}
