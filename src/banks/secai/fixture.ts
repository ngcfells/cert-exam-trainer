import type { Question } from '../../domain/types';

// Original questions written for this project. This fixed set backs the unit and e2e tests
// (VITE_BANK=fixture), so the shipped CY0-001 bank can grow without changing them.
export const secAiFixtureQuestions: Question[] = [
  {
    id: 'cy1-fx-mcq-001',
    exam: 'CY0-001',
    source: 'ours',
    type: 'mcq-single',
    objectiveIds: ['1.1'],
    difficulty: 1,
    stem: 'A model learns to sort support tickets into categories from thousands of tickets that staff have already labelled. Which kind of learning is this?',
    payload: {
      options: [
        { id: 'a', text: 'Unsupervised learning' },
        { id: 'b', text: 'Supervised learning' },
        { id: 'c', text: 'Reinforcement learning' },
        { id: 'd', text: 'Transfer learning' },
      ],
    },
    answer: { correct: ['b'] },
    explanation:
      'Training on examples that already carry the right label is supervised learning. Unsupervised learning finds structure in unlabelled data, reinforcement learning learns from rewards, and transfer learning reuses a model trained on another task.',
    acronyms: [],
    status: 'approved',
  },
  {
    id: 'cy1-fx-mcq-002',
    exam: 'CY0-001',
    source: 'ours',
    type: 'mcq-single',
    objectiveIds: ['2.6'],
    difficulty: 2,
    stem: 'A chatbot starts revealing its hidden instructions after users paste text that tells it to ignore them. What is the first step in responding?',
    payload: {
      options: [
        { id: 'a', text: 'Retrain the model from scratch' },
        { id: 'b', text: 'Publish the hidden instructions' },
        { id: 'c', text: 'Preserve the chat logs as evidence' },
        { id: 'd', text: 'Delete the affected conversations' },
      ],
    },
    answer: { correct: ['c'] },
    explanation:
      'Preserving the logs keeps the evidence needed to scope and fix the prompt injection. Deleting conversations destroys evidence, publishing the instructions widens the leak, and retraining is slow and does not address the cause.',
    acronyms: [],
    status: 'approved',
  },
  {
    id: 'cy1-fx-mcq-003',
    exam: 'CY0-001',
    source: 'ours',
    type: 'mcq-single',
    objectiveIds: ['4.2'],
    difficulty: 2,
    stem: 'Staff at a firm paste client contracts into a public chatbot that the firm has not approved. Which risk does this describe?',
    payload: {
      options: [
        { id: 'a', text: 'Model drift' },
        { id: 'b', text: 'Data poisoning' },
        { id: 'c', text: 'Overfitting' },
        { id: 'd', text: 'Shadow AI' },
      ],
    },
    answer: { correct: ['d'] },
    explanation:
      'Using unapproved AI tools outside the governance process is shadow AI, and here it leaks client data. Drift is a model losing accuracy over time, poisoning corrupts training data, and overfitting is a model memorising its training set.',
    acronyms: ['AI'],
    status: 'approved',
  },
];
