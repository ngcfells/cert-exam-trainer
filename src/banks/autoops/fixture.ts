import type { Question } from '../../domain/types';

// Original questions written for this project. This fixed set backs the unit and e2e tests
// (VITE_BANK=fixture), so the shipped AT0-001 bank can grow without changing them.
export const autoOpsFixtureQuestions: Question[] = [
  {
    id: 'at1-fx-mcq-001',
    exam: 'AT0-001',
    source: 'ours',
    type: 'mcq-single',
    objectiveIds: ['1.2'],
    difficulty: 1,
    stem: 'A developer wants to undo a commit that is already pushed to a shared branch, without rewriting its history. Which Git command fits?',
    payload: {
      options: [
        { id: 'a', text: 'git reset --hard' },
        { id: 'b', text: 'git revert' },
        { id: 'c', text: 'git stash' },
        { id: 'd', text: 'git rebase' },
      ],
    },
    answer: { correct: ['b'] },
    explanation:
      'git revert adds a new commit that undoes the old one, so shared history stays intact. A hard reset and a rebase rewrite history that others already have, and stash only shelves uncommitted changes.',
    acronyms: [],
    status: 'approved',
  },
];
