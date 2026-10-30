import type { Question } from './types';

const base = {
  id: 'p1',
  exam: 'T-001',
  source: 'ours',
  objectiveIds: ['A.1'],
  difficulty: 2,
  pbqWeight: 3,
  stem: 'Stem',
  explanation: '',
  acronyms: [],
  status: 'approved',
} as const;

export const items = (...ids: string[]) => ids.map((id) => ({ id, text: `T-${id}` }));

const raw = {
  match: {
    ...base,
    type: 'pbq-match',
    payload: { prompts: items('p1', 'p2'), choices: items('c1', 'c2', 'c3') },
    answer: { pairs: { p1: 'c2', p2: 'c1' } },
  },
  order: {
    ...base,
    type: 'pbq-order',
    payload: { steps: items('s1', 's2', 's3') },
    answer: { order: ['s2', 's1', 's3'] },
  },
  config: {
    ...base,
    type: 'pbq-config',
    payload: { fields: [{ id: 'f1', label: 'Join', options: items('inner', 'left') }] },
    answer: { values: { f1: 'left' } },
  },
  diagram: {
    ...base,
    type: 'pbq-diagram',
    payload: {
      width: 400,
      height: 200,
      nodes: [{ id: 'n1', x: 10, y: 10, w: 80, h: 40, text: 'Source' }, { id: 'n2', x: 300, y: 10, w: 80, h: 40 }],
      edges: [{ from: 'n1', to: 'n2' }],
      zones: [{ id: 'z1', x: 300, y: 10, name: 'Destination box' }],
      labels: items('l1', 'l2'),
    },
    answer: { placements: { z1: 'l2' } },
  },
};


/** One valid question of each template 1–4. */
export const fixtures = raw;
export const pbqFixture = (k: keyof typeof raw): Question => raw[k] as unknown as Question;
