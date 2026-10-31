import type { ExamMeta } from '../../domain/types';

// Placeholder until Task 3 fills in the verified CY0-001 v4.0 values.
export const secAiMeta: ExamMeta = {
  code: 'CY0-001',
  version: '1',
  name: 'CompTIA SecAI+',
  maxQuestions: 60,
  timeLimitMinutes: 60,
  passingScore: 600,
  domains: [
    { id: '1', title: 'Domain 1', weight: 17 },
    { id: '2', title: 'Domain 2', weight: 40 },
    { id: '3', title: 'Domain 3', weight: 24 },
    { id: '4', title: 'Domain 4', weight: 19 },
  ],
  objectives: ['1.1', '1.2', '1.3', '2.1', '2.2', '2.3', '2.4', '2.5', '2.6', '3.1', '3.2', '3.3', '4.1', '4.2', '4.3'].map((id) => ({
    id,
    domainId: id[0],
    title: `Objective ${id}`,
  })),
  acronyms: [{ term: 'AI', expansion: 'Artificial Intelligence', source: 'official' }],
};
