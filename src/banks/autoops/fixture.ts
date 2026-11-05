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
        { id: 'a', text: '`git reset --hard`' },
        { id: 'b', text: '`git revert`' },
        { id: 'c', text: '`git stash`' },
        { id: 'd', text: '`git rebase`' },
      ],
    },
    answer: { correct: ['b'] },
    explanation:
      '`git revert` adds a new commit that undoes the old one, so shared history stays intact. `git reset --hard` and `git rebase` rewrite history that others already have, and `git stash` only shelves uncommitted changes.',
    acronyms: [],
    status: 'approved',
  },
  {
    // A code block in the stem: the e2e checks it fits a 360 px screen (plan Review Focus 1).
    id: 'at1-fx-mcq-002',
    exam: 'AT0-001',
    source: 'ours',
    type: 'mcq-single',
    objectiveIds: ['3.3'],
    difficulty: 2,
    stem: 'A pipeline file contains these jobs:\n```yaml\njobs:\n  unit-tests:\n    run: ./scripts/run-unit-tests.sh --report-dir build/reports/unit --fail-fast\n  package:\n    needs: [unit-tests]\n    run: ./scripts/package.sh\n```\nThe unit tests fail. What happens to the `package` job?',
    payload: {
      options: [
        { id: 'a', text: 'It runs, because jobs always run in parallel' },
        { id: 'b', text: 'It is skipped' },
        { id: 'c', text: 'It runs first, then the tests run again' },
        { id: 'd', text: 'It runs with the last good build' },
      ],
    },
    answer: { correct: ['b'] },
    explanation:
      '`needs` makes `package` depend on `unit-tests`, so a failed test job stops it from running. Jobs without a dependency may run in parallel, but this one waits, and the pipeline does not reuse an earlier build on its own.',
    acronyms: [],
    status: 'approved',
  },
  {
    id: 'at1-fx-mcq-003',
    exam: 'AT0-001',
    source: 'ours',
    type: 'mcq-multi',
    objectiveIds: ['2.3'],
    difficulty: 2,
    stem: 'Which two HTTP methods are idempotent by definition, so repeating the same request leaves the server in the same state?',
    payload: {
      options: [
        { id: 'a', text: '`PUT`' },
        { id: 'b', text: '`POST`' },
        { id: 'c', text: '`DELETE`' },
        { id: 'd', text: '`PATCH`' },
      ],
    },
    answer: { correct: ['a', 'c'] },
    explanation:
      '`PUT` replaces a resource with the same content each time, and `DELETE` leaves it deleted however often it is sent. `POST` usually creates a new resource per call, and `PATCH` is not idempotent by definition.',
    acronyms: ['HTTP'],
    status: 'approved',
  },
  {
    id: 'at1-fx-buckets-001',
    exam: 'AT0-001',
    source: 'ours',
    type: 'pbq-buckets',
    objectiveIds: ['2.2'],
    difficulty: 1,
    pbqWeight: 2,
    stem: 'Sort each configuration style into the approach it follows.',
    payload: {
      buckets: [
        { id: 'decl', text: 'Declarative (describe the end state)' },
        { id: 'imp', text: 'Imperative (list the steps)' },
      ],
      items: [
        { id: 'i1', text: 'A file stating that three web servers must exist' },
        { id: 'i2', text: 'A script that creates a server, then installs a package' },
        { id: 'i3', text: 'A manifest saying a service must be running' },
      ],
    },
    answer: { placements: { i1: 'decl', i2: 'imp', i3: 'decl' } },
    explanation:
      'Declarative configuration states the end state and lets the tool work out the steps; imperative configuration gives the steps in order.',
    acronyms: [],
    status: 'approved',
  },
];
