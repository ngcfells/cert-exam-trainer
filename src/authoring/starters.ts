import { isPbqTemplate, type PbqTemplate } from '../domain/pbq';
import type { QuestionType } from '../domain/types';

export type JsonType = PbqTemplate | 'numeric';

/** Types written as payload and answer JSON in the editor (PBQs and typed numbers). */
export const usesJsonEditor = (t: QuestionType): t is JsonType => t === 'numeric' || isPbqTemplate(t);

/** A valid example payload and answer per JSON-edited type, loaded when an author picks the type. */
export const JSON_STARTERS: Record<JsonType, { payload: unknown; answer: unknown }> = {
  numeric: { payload: { suffix: '%' }, answer: { value: 25, tolerance: 0.5 } },
  'pbq-match': {
    payload: {
      prompts: [{ id: 'p1', text: 'Prompt one' }, { id: 'p2', text: 'Prompt two' }],
      choices: [{ id: 'c1', text: 'Choice A' }, { id: 'c2', text: 'Choice B' }, { id: 'c3', text: 'Distractor' }],
    },
    answer: { pairs: { p1: 'c1', p2: 'c2' } },
  },
  'pbq-order': {
    payload: { steps: [{ id: 's1', text: 'First step' }, { id: 's2', text: 'Second step' }, { id: 's3', text: 'Third step' }] },
    answer: { order: ['s1', 's2', 's3'] },
  },
  'pbq-config': {
    payload: {
      fields: [
        { id: 'f1', label: 'Setting one', options: [{ id: 'o1', text: 'Value A' }, { id: 'o2', text: 'Value B' }] },
      ],
    },
    answer: { values: { f1: 'o1' } },
  },
  'pbq-diagram': {
    payload: {
      width: 400,
      height: 160,
      nodes: [
        { id: 'n1', x: 20, y: 60, w: 100, h: 40, text: 'Source' },
        { id: 'n2', x: 280, y: 60, w: 100, h: 40 },
      ],
      edges: [{ from: 'n1', to: 'n2' }],
      zones: [{ id: 'z1', x: 330, y: 80, name: 'Right box' }],
      labels: [{ id: 'l1', text: 'Destination' }, { id: 'l2', text: 'Distractor' }],
    },
    answer: { placements: { z1: 'l1' } },
  },
  'pbq-terminal': {
    payload: {
      output: ['$ ls', 'app.log  data.csv'],
      steps: [
        { id: 't1', label: 'Show the lines of app.log that contain ERROR' },
        { id: 't2', label: 'Next action', options: [{ id: 'a1', text: 'Open a ticket' }, { id: 'a2', text: 'Delete the log' }] },
      ],
    },
    answer: { accept: { t1: ['grep ERROR app.log', 'grep "ERROR" app.log'], t2: ['a1'] } },
  },
  'pbq-data': {
    payload: {
      caption: 'Example table',
      columns: ['Item', 'Count'],
      rows: [['Alpha', '4'], ['Beta', '9']],
      chart: { kind: 'bar', labelColumn: 0, valueColumn: 1 },
      fields: [
        { id: 'f1', label: 'Item with the highest count', options: [{ id: 'o1', text: 'Alpha' }, { id: 'o2', text: 'Beta' }] },
      ],
    },
    answer: { values: { f1: 'o2' } },
  },
  'pbq-hotspot': {
    payload: {
      width: 400,
      height: 160,
      nodes: [
        { id: 'n1', x: 20, y: 60, w: 100, h: 40, text: 'Box one' },
        { id: 'n2', x: 280, y: 60, w: 100, h: 40, text: 'Box two' },
      ],
      spots: [
        { id: 's1', x: 20, y: 60, w: 100, h: 40, name: 'Box one' },
        { id: 's2', x: 280, y: 60, w: 100, h: 40, name: 'Box two' },
      ],
    },
    answer: { selected: ['s2'] },
  },
  'pbq-buckets': {
    payload: {
      buckets: [{ id: 'b1', text: 'Group A' }, { id: 'b2', text: 'Group B' }],
      items: [{ id: 'i1', text: 'Item one' }, { id: 'i2', text: 'Item two' }, { id: 'i3', text: 'Item three' }],
    },
    answer: { placements: { i1: 'b1', i2: 'b2', i3: 'b1' } },
  },
};
