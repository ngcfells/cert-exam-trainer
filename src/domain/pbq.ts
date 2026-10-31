import { z } from 'zod';
import type { Question } from './types';

/** partId -> chosen value id (or typed text, for terminal steps). */
export type PartMap = Record<string, string>;

const item = z.object({ id: z.string().min(1), text: z.string().min(1) });
const partMap = z.record(z.string().min(1));

const coord = z.number().finite();
const node = z.object({ id: z.string().min(1), x: coord, y: coord, w: z.number().positive(), h: z.number().positive(), text: z.string().optional() });
const diagramPayload = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
  nodes: z.array(node),
  edges: z.array(z.object({ from: z.string().min(1), to: z.string().min(1) })),
  zones: z.array(z.object({ id: z.string().min(1), x: coord, y: coord, name: z.string().min(1) })).min(1),
  labels: z.array(item).min(2),
});
const configFields = z.array(z.object({ id: z.string().min(1), label: z.string().min(1), options: z.array(item).min(2) })).min(1);
const columnIndex = z.number().int().min(0);

export const pbqSchemas = {
  'pbq-match': {
    payload: z.object({ prompts: z.array(item).min(1), choices: z.array(item).min(2) }),
    answer: z.object({ pairs: partMap }),
  },
  'pbq-order': {
    payload: z.object({ steps: z.array(item).min(2) }),
    answer: z.object({ order: z.array(z.string().min(1)) }),
  },
  'pbq-config': {
    payload: z.object({ fields: configFields }),
    answer: z.object({ values: partMap }),
  },
  'pbq-diagram': { payload: diagramPayload, answer: z.object({ placements: partMap }) },
  'pbq-terminal': {
    payload: z.object({
      output: z.array(z.string()).min(1),
      steps: z.array(z.object({ id: z.string().min(1), label: z.string().min(1), options: z.array(item).min(2).optional() })).min(1),
    }),
    answer: z.object({ accept: z.record(z.array(z.string().trim().min(1)).min(1)) }),
  },
  'pbq-data': {
    payload: z.object({
      caption: z.string().min(1),
      columns: z.array(z.string().min(1)).min(1),
      rows: z.array(z.array(z.string())).min(1),
      chart: z.object({ kind: z.literal('bar'), labelColumn: columnIndex, valueColumn: columnIndex }).optional(),
      fields: configFields,
    }),
    answer: z.object({ values: partMap }),
  },
  'pbq-hotspot': {
    payload: z.object({
      width: z.number().positive(),
      height: z.number().positive(),
      nodes: z.array(node),
      spots: z.array(z.object({ id: z.string().min(1), x: coord, y: coord, w: z.number().positive(), h: z.number().positive(), name: z.string().min(1) })).min(2),
    }),
    answer: z.object({ selected: z.array(z.string().min(1)).min(1) }),
  },
  'pbq-buckets': {
    payload: z.object({ buckets: z.array(item).min(2), items: z.array(item).min(2) }),
    answer: z.object({ placements: partMap }),
  },
} as const;

export type PbqTemplate = keyof typeof pbqSchemas;
export const PBQ_TEMPLATES = Object.keys(pbqSchemas) as PbqTemplate[];

export type MatchPayload = z.infer<(typeof pbqSchemas)['pbq-match']['payload']>;
export type OrderPayload = z.infer<(typeof pbqSchemas)['pbq-order']['payload']>;
export type ConfigPayload = z.infer<(typeof pbqSchemas)['pbq-config']['payload']>;
export type DiagramPayload = z.infer<typeof diagramPayload>;
export type TerminalPayload = z.infer<(typeof pbqSchemas)['pbq-terminal']['payload']>;
export type DataPayload = z.infer<(typeof pbqSchemas)['pbq-data']['payload']>;
export type HotspotPayload = z.infer<(typeof pbqSchemas)['pbq-hotspot']['payload']>;
export type BucketsPayload = z.infer<(typeof pbqSchemas)['pbq-buckets']['payload']>;
type Item = z.infer<typeof item>;

/** A hotspot part's value when the spot is selected; unselected spots have no key. */
export const HOTSPOT_ON = 'on';
const HOTSPOT_VALUES: Item[] = [{ id: HOTSPOT_ON, text: 'Selected' }, { id: 'off', text: 'Not selected' }];

export function isPbqTemplate(type: string): type is PbqTemplate {
  return type in pbqSchemas;
}

type Part = { id: string; label: string; values: Item[] };
const part = (id: string, label: string, values: Item[]): Part => ({ id, label, values });
const fieldParts = (p: ConfigPayload) => p.fields.map((f) => part(f.id, f.label, f.options));
const ids = (xs: Item[]) => xs.map((x) => x.id);

/**
 * Per template: each part with the values it may take (typed terminal steps have none),
 * the answer key as parts (terminal: the first accepted entry), and the pool shuffled per attempt (spec §7 4a).
 */
const TEMPLATES: Record<PbqTemplate, { parts: (p: never) => Part[]; key: (a: never, parts: Part[]) => PartMap; pool?: (p: never) => string[] }> = {
  'pbq-match': {
    parts: (p: MatchPayload) => p.prompts.map((x) => part(x.id, x.text, p.choices)),
    key: (a: { pairs: PartMap }) => a.pairs,
    pool: (p: MatchPayload) => ids(p.choices),
  },
  'pbq-order': {
    parts: (p: OrderPayload) => p.steps.map((_, i) => part(String(i), `Position ${i + 1}`, p.steps)),
    key: (a: { order: string[] }) => Object.fromEntries(a.order.map((id, i) => [String(i), id])),
    pool: (p: OrderPayload) => ids(p.steps),
  },
  'pbq-config': { parts: fieldParts, key: (a: { values: PartMap }) => a.values },
  'pbq-data': { parts: fieldParts, key: (a: { values: PartMap }) => a.values },
  'pbq-diagram': {
    parts: (p: DiagramPayload) => p.zones.map((z) => part(z.id, z.name, p.labels)),
    key: (a: { placements: PartMap }) => a.placements,
    pool: (p: DiagramPayload) => ids(p.labels),
  },
  'pbq-terminal': {
    parts: (p: TerminalPayload) => p.steps.map((s) => part(s.id, s.label, s.options ?? [])),
    key: (a: { accept: Record<string, string[]> }) => Object.fromEntries(Object.entries(a.accept).map(([k, v]) => [k, v[0]])),
  },
  'pbq-hotspot': {
    parts: (p: HotspotPayload) => p.spots.map((s) => part(s.id, s.name, HOTSPOT_VALUES)),
    key: (a: { selected: string[] }, parts) => Object.fromEntries(parts.map(({ id }) => [id, a.selected.includes(id) ? HOTSPOT_ON : 'off'])),
    pool: (p: HotspotPayload) => p.spots.map((s) => s.id),
  },
  'pbq-buckets': {
    parts: (p: BucketsPayload) => p.items.map((x) => part(x.id, x.text, p.buckets)),
    key: (a: { placements: PartMap }) => a.placements,
    pool: (p: BucketsPayload) => ids(p.items),
  },
};

function partsOf(q: Question): Part[] {
  return isPbqTemplate(q.type) ? TEMPLATES[q.type].parts(q.payload as never) : [];
}

export function correctParts(q: Question): PartMap {
  return isPbqTemplate(q.type) ? TEMPLATES[q.type].key(q.answer as never, partsOf(q)) : {};
}

/** Trim and collapse whitespace. Case is kept: shell commands are case-sensitive. */
export function normalizeCommand(s: string): string {
  return s.trim().replace(/\s+/g, ' ');
}

/**
 * `*` matches one word: one or more non-space characters (a run of `*` counts as one).
 * Everything else is literal.
 */
export function matchesPattern(typed: string, pattern: string): boolean {
  const re = normalizeCommand(pattern)
    .replace(/\*+/g, '*')
    .split('*')
    .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('\\S+');
  return new RegExp(`^${re}$`).test(normalizeCommand(typed));
}

/** The correct answer as review text; typed terminal steps list every accepted pattern. */
export function acceptedText(q: Question, partId: string): string {
  const step = q.type === 'pbq-terminal' ? (q.payload as TerminalPayload).steps.find((s) => s.id === partId) : undefined;
  if (!step || step.options) return valueText(q, partId, correctParts(q)[partId]);
  const accept = (q.answer as { accept: Record<string, string[]> }).accept[partId] ?? [];
  return accept.map((p) => normalizeCommand(p).replace(/\*+/g, '<any word>')).join(', or ');
}

export function partCorrect(q: Question, partId: string, given: PartMap): boolean {
  const v = given[partId];
  if (q.type === 'pbq-hotspot') return (v === HOTSPOT_ON) === (q.answer as { selected: string[] }).selected.includes(partId);
  if (!v) return false;
  if (q.type === 'pbq-terminal') {
    const accept = (q.answer as { accept: Record<string, string[]> }).accept[partId] ?? [];
    const step = (q.payload as TerminalPayload).steps.find((s) => s.id === partId);
    return step?.options ? accept.includes(v) : accept.some((pat) => matchesPattern(v, pat));
  }
  return v === correctParts(q)[partId];
}

export function partIds(q: Question): string[] {
  return partsOf(q).map((p) => p.id);
}

export function partLabel(q: Question, partId: string): string {
  return partsOf(q).find((p) => p.id === partId)?.label ?? partId;
}

export function valueText(q: Question, partId: string, valueId: string): string {
  return partsOf(q).find((p) => p.id === partId)?.values.find((v) => v.id === valueId)?.text ?? valueId;
}

/** The pool shuffled per attempt (spec §7 4a). */
export function elementIds(q: Question): string[] {
  return (isPbqTemplate(q.type) && TEMPLATES[q.type].pool?.(q.payload as never)) || [];
}

type Issue = { path: (string | number)[]; message: string };

function dupes(path: (string | number)[], ids: string[], out: Issue[]) {
  if (new Set(ids).size !== ids.length) out.push({ path, message: 'duplicate id' });
}

/**
 * Select option lists shuffled per attempt, by part: config and data fields, and terminal steps
 * that choose an action. Authored option order would otherwise let the key's position give it away.
 */
export function optionLists(q: Question): Record<string, string[]> {
  if (q.type === 'pbq-config' || q.type === 'pbq-data') return Object.fromEntries((q.payload as ConfigPayload).fields.map((f) => [f.id, ids(f.options)]));
  if (q.type === 'pbq-terminal') return Object.fromEntries((q.payload as TerminalPayload).steps.flatMap((s) => (s.options ? [[s.id, ids(s.options)]] : [])));
  return {};
}

type Box = { x: number; y: number; w: number; h: number };
type Spot = HotspotPayload['spots'][number];
const sameBox = (a: Box, b: Box) => a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;

/**
 * Where each hotspot spot is drawn this attempt. The authored spot boxes are fixed slots;
 * spot `order[i]` takes slot `i`, so the layout gives no tell (issue #2). A node drawn exactly
 * under a spot moves with it and supplies its label. An order that is not a full permutation
 * of the spot ids falls back to authored order.
 */
export function hotspotLayout(p: HotspotPayload, order?: string[]): { spot: Spot; slot: Box; label: string; node?: string }[] {
  const ids = p.spots.map((s) => s.id);
  const full = order && order.length === ids.length && ids.every((id) => order.includes(id));
  const spots = full ? order.map((id) => p.spots.find((s) => s.id === id)!) : p.spots;
  return spots.map((spot, i) => {
    const s = p.spots[i];
    const node = p.nodes.find((n) => sameBox(n, spot));
    return { spot, slot: { x: s.x, y: s.y, w: s.w, h: s.h }, label: node?.text ?? spot.name, node: node?.id };
  });
}
function boxIssues(width: number, height: number, boxes: Box[], path: string, what: string, out: Issue[]) {
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x <= width && y <= height;
  boxes.forEach((b, i) => {
    if (!inside(b.x, b.y) || !inside(b.x + b.w, b.y + b.h)) out.push({ path: ['payload', path, i], message: `${what} lies outside the image` });
  });
}

/** Template-specific checks beyond the shared part/answer cross-references. */
function extraIssues(type: PbqTemplate, payload: unknown, out: Issue[]) {
  if (type === 'pbq-diagram') {
    const d = payload as DiagramPayload;
    const nodeIds = d.nodes.map((n) => n.id);
    dupes(['payload', 'nodes'], nodeIds, out);
    d.edges.forEach((e, i) => {
      if (!nodeIds.includes(e.from) || !nodeIds.includes(e.to)) out.push({ path: ['payload', 'edges', i], message: 'edge references an unknown node' });
    });
    boxIssues(d.width, d.height, d.nodes, 'nodes', 'node', out);
    boxIssues(d.width, d.height, d.zones.map((z) => ({ ...z, w: 0, h: 0 })), 'zones', 'zone', out);
  }
  if (type === 'pbq-hotspot') {
    const h = payload as HotspotPayload;
    dupes(['payload', 'nodes'], h.nodes.map((n) => n.id), out);
    boxIssues(h.width, h.height, h.nodes, 'nodes', 'node', out);
    boxIssues(h.width, h.height, h.spots, 'spots', 'spot', out);
    // Spots are shuffled into each other's boxes per attempt (hotspotLayout), so every box must fit every spot,
    // and a node must sit exactly under one spot (it moves with it) or clear of all of them (it stays put).
    const first = h.spots[0];
    h.spots.forEach((s, i) => {
      if (s.w !== first.w || s.h !== first.h) out.push({ path: ['payload', 'spots', i], message: 'every spot must have the same width and height' });
    });
    const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    h.nodes.forEach((n, i) => {
      if (h.spots.some((s) => overlaps(n, s)) && !h.spots.some((s) => sameBox(n, s))) {
        out.push({ path: ['payload', 'nodes', i], message: 'a node must match a spot box exactly or not overlap any spot' });
      }
    });
  }
  if (type === 'pbq-data') {
    const d = payload as DataPayload;
    dupes(['payload', 'columns'], d.columns, out);
    d.rows.forEach((r, i) => {
      if (r.length !== d.columns.length) out.push({ path: ['payload', 'rows', i], message: 'row length must match the columns' });
    });
    if (d.chart) {
      const { labelColumn, valueColumn } = d.chart;
      if (labelColumn >= d.columns.length || valueColumn >= d.columns.length) out.push({ path: ['payload', 'chart'], message: 'chart column out of range' });
      else if (d.rows.some((r) => r[valueColumn] === undefined || r[valueColumn].trim() === '' || !Number.isFinite(Number(r[valueColumn])))) {
        out.push({ path: ['payload', 'chart'], message: 'charted column must be numeric' });
      }
    }
  }
}

/** Structural and cross-reference checks for a PBQ. */
export function pbqIssues(type: PbqTemplate, payload: unknown, answer: unknown): Issue[] {
  const s = pbqSchemas[type];
  const out: Issue[] = [];
  for (const [key, schema, value] of [['payload', s.payload, payload], ['answer', s.answer, answer]] as const) {
    const r = schema.safeParse(value);
    if (!r.success) r.error.issues.forEach((i) => out.push({ path: [key, ...i.path], message: i.message }));
  }
  if (out.length) return out;

  const q = { type, payload, answer } as Question;
  const parts = partsOf(q);
  dupes(['payload'], parts.map((p) => p.id), out);
  parts.forEach((p) => dupes(['payload', p.id], p.values.map((v) => v.id), out));
  extraIssues(type, payload, out);

  if (type === 'pbq-order') {
    const order = (answer as { order: string[] }).order;
    const steps = (payload as OrderPayload).steps.map((x) => x.id);
    if (order.length !== steps.length || new Set(order).size !== order.length || order.some((id) => !steps.includes(id))) {
      out.push({ path: ['answer', 'order'], message: 'order must be a permutation of the step ids' });
    }
    return out;
  }
  if (type === 'pbq-hotspot') {
    const ids = parts.map((p) => p.id);
    dupes(['answer', 'selected'], (answer as { selected: string[] }).selected, out);
    (answer as { selected: string[] }).selected.forEach((id, i) => {
      if (!ids.includes(id)) out.push({ path: ['answer', 'selected', i], message: `unknown spot "${id}"` });
    });
    return out;
  }
  // Terminal keys hold lists of accepted entries; typed steps take any non-empty pattern.
  const key: Record<string, string[]> =
    type === 'pbq-terminal'
      ? (answer as { accept: Record<string, string[]> }).accept
      : Object.fromEntries(Object.entries(correctParts(q)).map(([k, v]) => [k, [v]]));
  for (const p of parts) {
    if (!(p.id in key)) out.push({ path: ['answer', p.id], message: `part "${p.id}" has no answer` });
    else if (p.values.length) {
      for (const v of key[p.id]) {
        if (!p.values.some((x) => x.id === v)) out.push({ path: ['answer', p.id], message: `"${v}" is not a value for part "${p.id}"` });
      }
    }
  }
  for (const k of Object.keys(key)) {
    if (!parts.some((p) => p.id === k)) out.push({ path: ['answer', k], message: `unknown part "${k}"` });
  }
  return out;
}
