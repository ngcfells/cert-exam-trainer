import { describe, it, expect } from 'vitest';
import { questionSchema } from './schema';
import { acceptedText, correctParts, elementIds, HOTSPOT_ON, hotspotLayout, optionLists, type HotspotPayload, matchesPattern, partCorrect, partIds, partLabel, PBQ_TEMPLATES, valueText } from './pbq';
import type { Question } from './types';
import { dataPlusQuestions } from '../banks/dataplus/questions';
import { fixtures, items } from './pbqFixtures';

const ok = (x: unknown) => questionSchema.safeParse(x).success;

describe('PBQ schemas', () => {
  it('accepts a valid question of each template', () => {
    for (const f of Object.values(fixtures)) expect(ok(f)).toBe(true);
  });

  it('rejects bad cross references', () => {
    const m = fixtures.match;
    expect(ok({ ...m, answer: { pairs: { p1: 'c2', p2: 'c1', px: 'c1' } } })).toBe(false);
    expect(ok({ ...m, answer: { pairs: { p1: 'c2' } } })).toBe(false);
    expect(ok({ ...m, answer: { pairs: { p1: 'c2', p2: 'zz' } } })).toBe(false);
    expect(ok({ ...fixtures.order, answer: { order: ['s1', 's1', 's3'] } })).toBe(false);
    expect(ok({ ...fixtures.order, answer: { order: ['s1', 's2'] } })).toBe(false);
    expect(ok({ ...fixtures.config, answer: { values: { f1: 'right' } } })).toBe(false);
    expect(ok({ ...fixtures.diagram, answer: { placements: { z1: 'l9' } } })).toBe(false);
    expect(ok({ ...m, payload: { ...m.payload, choices: items('c1', 'c1') } })).toBe(false);
    expect(ok({ ...m, payload: {} })).toBe(false);
    const d = fixtures.diagram;
    expect(ok({ ...d, payload: { ...d.payload, edges: [{ from: 'n1', to: 'nx' }] } })).toBe(false);
    expect(ok({ ...d, payload: { ...d.payload, zones: [{ id: 'z1', x: 900, y: 10, name: 'Off' }] } })).toBe(false);
    expect(ok({ ...d, payload: { ...d.payload, nodes: [...d.payload.nodes, { id: 'n3', x: 390, y: 0, w: 80, h: 40 }] } })).toBe(false);
  });

  it('flattens answers into parts', () => {
    const q = fixtures.order as unknown as Question;
    expect(correctParts(q)).toEqual({ '0': 's2', '1': 's1', '2': 's3' });
    expect(partLabel(q, '1')).toBe('Position 2');
    expect(valueText(q, '1', 's1')).toBe('T-s1');
    expect(correctParts(fixtures.match as unknown as Question)).toEqual({ p1: 'c2', p2: 'c1' });
  });

  it('lists the shuffleable elements', () => {
    expect(elementIds(fixtures.match as unknown as Question)).toEqual(['c1', 'c2', 'c3']);
    expect(elementIds(fixtures.order as unknown as Question)).toEqual(['s1', 's2', 's3']);
    expect(elementIds(fixtures.config as unknown as Question)).toEqual([]);
    expect(elementIds(fixtures.diagram as unknown as Question)).toEqual(['l1', 'l2']);
    expect(partLabel(fixtures.diagram as unknown as Question, 'z1')).toBe('Destination box');
    expect(elementIds(fixtures.hotspot as unknown as Question)).toEqual(['s1', 's2', 's3', 's4']);
  });

  it('lists the select options shuffled per part (config, data, terminal choice steps)', () => {
    expect(optionLists(fixtures.config as unknown as Question)).toEqual({ f1: ['inner', 'left'] });
    expect(optionLists(fixtures.data as unknown as Question)).toEqual({ f1: ['north', 'south'] });
    expect(optionLists(fixtures.terminal as unknown as Question)).toEqual({ t2: ['a1', 'a2'] });
    expect(optionLists(fixtures.match as unknown as Question)).toEqual({});
  });

  it('places hotspot spots in the authored slots, in attempt order', () => {
    const p = fixtures.hotspot.payload as HotspotPayload;
    const auth = hotspotLayout(p);
    expect(auth.map((x) => [x.spot.id, x.slot.x])).toEqual([['s1', 10], ['s2', 100], ['s3', 200], ['s4', 300]]);
    // The spot over node n1 takes its text; others use their name.
    expect(auth.map((x) => x.label)).toEqual(['Web', 'Cache', 'Database', 'Queue']);
    expect(auth[0].node).toBe('n1');
    const moved = hotspotLayout(p, ['s3', 's1', 's4', 's2']);
    expect(moved.map((x) => [x.spot.id, x.slot.x])).toEqual([['s3', 10], ['s1', 100], ['s4', 200], ['s2', 300]]);
    // An order missing a spot (an old or partial record) falls back to authored order.
    expect(hotspotLayout(p, ['s2']).map((x) => x.spot.id)).toEqual(['s1', 's2', 's3', 's4']);
  });
});

describe('templates 5-8', () => {
  const q = (k: keyof typeof fixtures) => fixtures[k] as unknown as Question;

  it('rejects bad terminal, data, hotspot and buckets questions', () => {
    const t = fixtures.terminal;
    expect(ok({ ...t, answer: { accept: { t1: ['ls'] } } })).toBe(false);
    expect(ok({ ...t, answer: { accept: { t1: ['ls'], t2: ['zz'] } } })).toBe(false);
    expect(ok({ ...t, answer: { accept: { t1: ['  '], t2: ['a2'] } } })).toBe(false);
    const d = fixtures.data;
    expect(ok({ ...d, payload: { ...d.payload, rows: [['North']] } })).toBe(false);
    expect(ok({ ...d, payload: { ...d.payload, chart: { kind: 'bar', labelColumn: 0, valueColumn: 5 } } })).toBe(false);
    expect(ok({ ...d, payload: { ...d.payload, rows: [['North', 'lots']] } })).toBe(false);
    const h = fixtures.hotspot;
    expect(ok({ ...h, answer: { selected: ['s9'] } })).toBe(false);
    expect(ok({ ...h, payload: { ...h.payload, spots: [...h.payload.spots, { id: 's5', x: 390, y: 0, w: 80, h: 40, name: 'Off' }] } })).toBe(false);
    // Spots swap slots per attempt, so they must share one size, and a node may only sit exactly under a spot or clear of all spots.
    expect(ok({ ...h, payload: { ...h.payload, spots: h.payload.spots.map((s, i) => (i ? s : { ...s, w: 60 })) } })).toBe(false);
    expect(ok({ ...h, payload: { ...h.payload, nodes: [{ id: 'n1', x: 20, y: 20, w: 80, h: 40, text: 'Web' }] } })).toBe(false);
    expect(ok({ ...h, payload: { ...h.payload, nodes: [...h.payload.nodes, { id: 'n2', x: 10, y: 100, w: 80, h: 40, text: 'Legend' }] } })).toBe(true);
    const b = fixtures.buckets;
    expect(ok({ ...b, answer: { placements: { i1: 'b9', i2: 'b1', i3: 'b1' } } })).toBe(false);
    expect(ok({ ...b, answer: { placements: { i1: 'b2', i2: 'b1' } } })).toBe(false);
  });

  it('matches commands against accepted patterns', () => {
    expect(matchesPattern('  ls   -l /var/log ', 'ls -l /var/log')).toBe(true);
    expect(matchesPattern('LS -l', 'ls -l')).toBe(false);
    expect(matchesPattern('grep ERROR app.log', 'grep ERROR *')).toBe(true);
    expect(matchesPattern('grep ERROR', 'grep ERROR *')).toBe(false);
    expect(matchesPattern('a.b', 'a+b')).toBe(false);
    expect(matchesPattern('a+b', 'a+b')).toBe(true);
  });

  it('decides each part', () => {
    expect(partCorrect(q('hotspot'), 's2', {})).toBe(true);
    expect(partCorrect(q('hotspot'), 's1', {})).toBe(false);
    expect(partCorrect(q('hotspot'), 's1', { s1: HOTSPOT_ON })).toBe(true);
    expect(partCorrect(q('terminal'), 't1', { t1: 'grep -i error  db.log' })).toBe(true);
    expect(partCorrect(q('terminal'), 't2', { t2: 'a1' })).toBe(false);
    expect(partCorrect(q('buckets'), 'i1', { i1: 'b2' })).toBe(true);
    expect(partCorrect(q('buckets'), 'i2', {})).toBe(false);
    expect(correctParts(q('hotspot'))).toEqual({ s1: 'on', s2: 'off', s3: 'on', s4: 'off' });
    expect(correctParts(q('terminal'))).toEqual({ t1: 'grep ERROR *', t2: 'a2' });
    expect(partIds(q('data'))).toEqual(['f1']);
    expect(elementIds(q('buckets'))).toEqual(['i1', 'i2', 'i3']);
    expect(elementIds(q('terminal'))).toEqual([]);
    expect(PBQ_TEMPLATES).toHaveLength(8);
  });

  it('treats a run of wildcards as one', () => {
    expect(matchesPattern('cat a', 'cat **')).toBe(true);
  });

  it('shows accepted command patterns readably', () => {
    expect(acceptedText(q('terminal'), 't1')).toBe('grep ERROR <any word>, or grep -i error <any word>');
    expect(acceptedText(q('terminal'), 't2')).toBe('T-a2');
  });

  it('rejects duplicate data column names', () => {
    const d = fixtures.data;
    expect(ok({ ...d, payload: { ...d.payload, columns: ['Sales', 'Sales'], chart: undefined } })).toBe(false);
  });

  it('rejects duplicate hotspot answers', () => {
    expect(ok({ ...fixtures.hotspot, answer: { selected: ['s1', 's1'] } })).toBe(false);
  });

  it('accepts common equivalent forms in the bundled terminal question', () => {
    const t = dataPlusQuestions.find((x) => x.id === 'da2-pbq-terminal-001')!;
    for (const cmd of ["grep 'ERROR' load_orders.log", 'grep ERROR ./load_orders.log', 'grep -n ERROR load_orders.log', 'cat load_orders.log | grep ERROR']) {
      expect(partCorrect(t, 'find', { find: cmd }), cmd).toBe(true);
    }
  });
});
