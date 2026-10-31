// A fixed lesson for unit and e2e tests; it links fixture questions only.
export const dataPlusLessonFixture: unknown[] = [
  {
    id: 'fx-percent-change',
    exam: 'DA0-002',
    area: 'A',
    title: 'Fixture: percent change',
    objectiveIds: ['3.2'],
    meaning: ['Percent change compares the change with the starting value.'],
    formula: {
      text: 'percent change = ((new − old) ÷ old) × 100',
      spoken: 'percent change equals new value minus old value, divided by old value, times 100',
      symbols: [
        { symbol: 'old', meaning: 'the starting value' },
        { symbol: 'new', meaning: 'the ending value' },
      ],
    },
    example: {
      intro: 'From 80 to 100.',
      table: { caption: 'Fixture steps', head: ['Step', 'Result'], rows: [['Change', '20'], ['Divide by 80', '0.25']] },
      steps: ['0.25 × 100 = 25%.'],
    },
    trap: { wrong: 'Dividing by the new value gives 20%.', why: 'Always divide by the old value.' },
    checkIds: ['da2-fx-num-001', 'da2-seed-001', 'da2-seed-002'],
  },
];
