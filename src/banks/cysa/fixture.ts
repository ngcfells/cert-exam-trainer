import type { Question } from '../../domain/types';

// Original questions written for this project. This fixed set backs the unit and e2e tests
// (VITE_BANK=fixture), so the shipped CS0-004 bank can grow without changing them.
export const cysaFixtureQuestions: Question[] = [
  {
    id: 'cs4-fx-mcq-001',
    exam: 'CS0-004',
    source: 'ours',
    type: 'mcq-single',
    objectiveIds: ['1.2'],
    difficulty: 1,
    stem: 'A workstation contacts the same outside address every 60 seconds, day and night, sending a few bytes each time. Which activity does this pattern suggest?',
    payload: {
      options: [
        { id: 'a', text: 'A port scan of the internal network' },
        { id: 'b', text: 'Beaconing to a command-and-control server' },
        { id: 'c', text: 'A denial-of-service attack on the workstation' },
        { id: 'd', text: 'A scheduled full backup' },
      ],
    },
    answer: { correct: ['b'] },
    explanation:
      'Small outbound connections at a fixed interval are the mark of beaconing: malware checking in for instructions. A port scan touches many ports or hosts, a denial-of-service attack floods a target, and a backup moves large amounts of data on a schedule, not a few bytes each minute.',
    acronyms: [],
    status: 'approved',
  },
  {
    id: 'cs4-fx-mcq-002',
    exam: 'CS0-004',
    source: 'ours',
    type: 'mcq-multi',
    objectiveIds: ['2.3'],
    difficulty: 2,
    stem: 'An analyst must decide which of 40 open findings to fix first. Which two inputs say the most about how urgent a finding is?',
    payload: {
      options: [
        { id: 'a', text: 'Whether an exploit is being used in real attacks' },
        { id: 'b', text: 'The date the scanner was installed' },
        { id: 'c', text: 'How critical the affected asset is to the business' },
        { id: 'd', text: 'The number of pages in the scan report' },
        { id: 'e', text: 'The name of the analyst who ran the scan' },
      ],
    },
    answer: { correct: ['a', 'c'] },
    explanation:
      'Active exploitation raises the chance of an attack, and asset criticality raises the damage one would do; together they set the priority. When the scanner was installed, how long the report is and who ran the scan say nothing about risk.',
    acronyms: [],
    status: 'approved',
  },
  {
    id: 'cs4-fx-order-001',
    exam: 'CS0-004',
    source: 'ours',
    type: 'pbq-order',
    objectiveIds: ['3.2'],
    difficulty: 1,
    pbqWeight: 4,
    stem: 'Put these incident response activities in the order they happen.',
    payload: {
      steps: [
        { id: 's1', text: 'Remove the malware and close the hole it used' },
        { id: 's2', text: 'Write the incident response plan and train the team' },
        { id: 's3', text: 'Hold a lessons-learned meeting' },
        { id: 's4', text: 'Isolate the affected hosts from the network' },
      ],
    },
    answer: { order: ['s2', 's4', 's1', 's3'] },
    explanation:
      'Preparation comes before any incident. During one, the team contains the damage, then eradicates the cause, and afterward reviews what happened to improve the plan.',
    partExplanations: {
      s1: 'Eradication follows containment.',
      s2: 'Preparation happens before an incident.',
      s3: 'The review comes after recovery.',
      s4: 'Containment comes first once an incident is confirmed.',
    },
    acronyms: [],
    status: 'approved',
  },
];
