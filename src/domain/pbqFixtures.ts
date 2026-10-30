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
  terminal: {
    ...base,
    type: 'pbq-terminal',
    payload: {
      output: ['$ ls', 'app.log  db.log'],
      steps: [
        { id: 't1', label: 'Find errors' },
        { id: 't2', label: 'Next action', options: items('a1', 'a2') },
      ],
    },
    answer: { accept: { t1: ['grep ERROR *', 'grep -i error *'], t2: ['a2'] } },
  },
  data: {
    ...base,
    type: 'pbq-data',
    payload: {
      caption: 'Sales by region',
      columns: ['Region', 'Sales'],
      rows: [['North', '120'], ['South', '80']],
      chart: { kind: 'bar', labelColumn: 0, valueColumn: 1 },
      fields: [{ id: 'f1', label: 'Top region', options: items('north', 'south') }],
    },
    answer: { values: { f1: 'north' } },
  },
  hotspot: {
    ...base,
    type: 'pbq-hotspot',
    payload: {
      width: 400,
      height: 200,
      nodes: [{ id: 'n1', x: 10, y: 10, w: 80, h: 40, text: 'Web' }],
      spots: [
        { id: 's1', x: 10, y: 10, w: 80, h: 40, name: 'Web server' },
        { id: 's2', x: 100, y: 10, w: 80, h: 40, name: 'Cache' },
        { id: 's3', x: 200, y: 10, w: 80, h: 40, name: 'Database' },
        { id: 's4', x: 300, y: 10, w: 80, h: 40, name: 'Queue' },
      ],
    },
    answer: { selected: ['s1', 's3'] },
  },
  buckets: {
    ...base,
    type: 'pbq-buckets',
    payload: { buckets: items('b1', 'b2'), items: items('i1', 'i2', 'i3') },
    answer: { placements: { i1: 'b2', i2: 'b1', i3: 'b1' } },
  },
};


/** One valid question of each PBQ template. */
export const fixtures = raw;
export const pbqFixture = (k: keyof typeof raw): Question => raw[k] as unknown as Question;
