import { z } from 'zod';
import type { Question } from './types';

/** partId -> chosen value id. */
export type PartMap = Record<string, string>;

const item = z.object({ id: z.string().min(1), text: z.string().min(1) });
const partMap = z.record(z.string().min(1));

const coord = z.number().finite();
const diagramPayload = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
  nodes: z.array(z.object({ id: z.string().min(1), x: coord, y: coord, w: z.number().positive(), h: z.number().positive(), text: z.string().optional() })),
  edges: z.array(z.object({ from: z.string().min(1), to: z.string().min(1) })),
  zones: z.array(z.object({ id: z.string().min(1), x: coord, y: coord, name: z.string().min(1) })).min(1),
  labels: z.array(item).min(2),
});

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
    payload: z.object({ fields: z.array(z.object({ id: z.string().min(1), label: z.string().min(1), options: z.array(item).min(2) })).min(1) }),
    answer: z.object({ values: partMap }),
  },
  'pbq-diagram': { payload: diagramPayload, answer: z.object({ placements: partMap }) },
} as const;

export type Template14 = keyof typeof pbqSchemas;
export const TEMPLATE_1_4 = Object.keys(pbqSchemas) as Template14[];

export type MatchPayload = z.infer<(typeof pbqSchemas)['pbq-match']['payload']>;
export type OrderPayload = z.infer<(typeof pbqSchemas)['pbq-order']['payload']>;
export type ConfigPayload = z.infer<(typeof pbqSchemas)['pbq-config']['payload']>;
export type DiagramPayload = z.infer<typeof diagramPayload>;
type Item = z.infer<typeof item>;

export function isTemplate14(type: string): type is Template14 {
  return type in pbqSchemas;
}

/** Each part with the values it may take. */
function partsOf(q: Question): { id: string; label: string; values: Item[] }[] {
  const p = q.payload as never;
  switch (q.type) {
    case 'pbq-match': {
      const m = p as MatchPayload;
      return m.prompts.map((x) => ({ id: x.id, label: x.text, values: m.choices }));
    }
    case 'pbq-order': {
      const o = p as OrderPayload;
      return o.steps.map((_, i) => ({ id: String(i), label: `Position ${i + 1}`, values: o.steps }));
    }
    case 'pbq-config':
      return (p as ConfigPayload).fields.map((f) => ({ id: f.id, label: f.label, values: f.options }));
    case 'pbq-diagram': {
      const d = p as DiagramPayload;
      return d.zones.map((z) => ({ id: z.id, label: z.name, values: d.labels }));
    }
    default:
      return [];
  }
}

export function correctParts(q: Question): PartMap {
  const a = q.answer as Record<string, unknown>;
  switch (q.type) {
    case 'pbq-match':
      return a.pairs as PartMap;
    case 'pbq-order':
      return Object.fromEntries((a.order as string[]).map((id, i) => [String(i), id]));
    case 'pbq-config':
      return a.values as PartMap;
    case 'pbq-diagram':
      return a.placements as PartMap;
    default:
      return {};
  }
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
  const p = q.payload as never;
  switch (q.type) {
    case 'pbq-match':
      return (p as MatchPayload).choices.map((c) => c.id);
    case 'pbq-order':
      return (p as OrderPayload).steps.map((s) => s.id);
    case 'pbq-diagram':
      return (p as DiagramPayload).labels.map((l) => l.id);
    default:
      return [];
  }
}

type Issue = { path: (string | number)[]; message: string };

function dupes(path: (string | number)[], ids: string[], out: Issue[]) {
  if (new Set(ids).size !== ids.length) out.push({ path, message: 'duplicate id' });
}

/** Structural and cross-reference checks for a template 1–4 question. */
export function pbqIssues(type: Template14, payload: unknown, answer: unknown): Issue[] {
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
  if (type === 'pbq-diagram') dupes(['payload', 'nodes'], (payload as DiagramPayload).nodes.map((n) => n.id), out);

  if (type === 'pbq-order') {
    const order = (answer as { order: string[] }).order;
    const steps = (payload as OrderPayload).steps.map((x) => x.id);
    if (order.length !== steps.length || new Set(order).size !== order.length || order.some((id) => !steps.includes(id))) {
      out.push({ path: ['answer', 'order'], message: 'order must be a permutation of the step ids' });
    }
    return out;
  }
  const key = correctParts(q);
  for (const p of parts) {
    if (!(p.id in key)) out.push({ path: ['answer', p.id], message: `part "${p.id}" has no answer` });
    else if (!p.values.some((v) => v.id === key[p.id])) out.push({ path: ['answer', p.id], message: `"${key[p.id]}" is not a value for part "${p.id}"` });
  }
  for (const k of Object.keys(key)) {
    if (!parts.some((p) => p.id === k)) out.push({ path: ['answer', k], message: `unknown part "${k}"` });
  }
  return out;
}
