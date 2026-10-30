import type { Question } from '../../domain/types';

// Original placeholder questions written for this project.
export const dataPlusQuestions: Question[] = [
  {
    id: 'da2-seed-001',
    exam: 'DA0-002',
    source: 'ours',
    type: 'mcq-single',
    objectiveIds: ['1.1'],
    difficulty: 1,
    stem: 'A table column uniquely identifies each row and can never be empty. What is this column called?',
    payload: {
      options: [
        { id: 'a', text: 'Primary key' },
        { id: 'b', text: 'Foreign key' },
        { id: 'c', text: 'Index' },
        { id: 'd', text: 'View' },
      ],
    },
    answer: { correct: ['a'] },
    explanation: 'A primary key uniquely identifies each row and cannot be null. A foreign key references another table.',
    acronyms: [],
    status: 'approved',
  },
  {
    id: 'da2-seed-002',
    exam: 'DA0-002',
    source: 'ours',
    type: 'mcq-multi',
    objectiveIds: ['3.1'],
    difficulty: 2,
    stem: 'Which TWO of the following are measures of central tendency?',
    payload: {
      options: [
        { id: 'a', text: 'Median' },
        { id: 'b', text: 'Variance' },
        { id: 'c', text: 'Mode' },
        { id: 'd', text: 'Range' },
      ],
    },
    answer: { correct: ['a', 'c'] },
    explanation: 'The median and the mode describe the center of a distribution. Variance and range describe spread.',
    acronyms: [],
    status: 'approved',
  },
  {
    id: 'da2-seed-003',
    exam: 'DA0-002',
    source: 'ours',
    type: 'mcq-single',
    objectiveIds: ['5.1'],
    difficulty: 1,
    stem: 'Which practice limits each user to only the data they need for their role?',
    payload: {
      options: [
        { id: 'a', text: 'Least privilege' },
        { id: 'b', text: 'Data mining' },
        { id: 'c', text: 'Normalization' },
      ],
    },
    answer: { correct: ['a'] },
    explanation: 'Under the principle of least privilege, each user gets only the access their role needs.',
    acronyms: [],
    status: 'draft',
  },
];
