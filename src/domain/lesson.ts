import { z } from 'zod';

export const LESSON_AREAS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

export const AREA_TITLES: Record<(typeof LESSON_AREAS)[number], string> = {
  A: 'Business math and percentages',
  B: 'Descriptive statistics',
  C: 'Inferential statistics',
  D: 'Correlation and regression',
  E: 'Data math',
  F: 'Joins and keys',
};

const text = z.string().min(1);

/** The pictures a lesson can show; each is drawn in code by src/ui/learn/LessonDiagram.tsx. */
export const DIAGRAM_KINDS = ['join-venn', 'bell-rule', 'tail-curve', 'error-matrix', 'regression-fit', 'sigmoid-curve'] as const;

export const lessonSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/, 'use lowercase letters, digits and hyphens'),
    exam: text,
    area: z.enum(LESSON_AREAS),
    title: text,
    objectiveIds: z.array(text).min(1),
    meaning: z.array(text).min(1).max(2),
    /** A picture for the lesson: the caption is shown, the description is read by screen readers. */
    diagram: z.object({ kind: z.enum(DIAGRAM_KINDS), caption: text, description: text }).strict().optional(),
    /** `text` may use `^{...}` for superscript and `_{...}` for subscript; `spoken` reads it in words. */
    formula: z.object({ text, spoken: text, symbols: z.array(z.object({ symbol: text, meaning: text }).strict()).min(1) }).strict().optional(),
    /** For lessons without a formula: the rule, one paragraph per entry. */
    rule: z.array(text).min(1).optional(),
    example: z
      .object({
        intro: text,
        table: z.object({ caption: text, head: z.array(text).min(1), rows: z.array(z.array(z.string())).min(1) }).strict().optional(),
        steps: z.array(text).min(1),
      })
      .strict(),
    trap: z.object({ wrong: text, why: text }).strict(),
    checkIds: z.array(text).min(3).max(5),
  })
  .strict()
  .superRefine((l, ctx) => {
    if (!l.formula === !l.rule) ctx.addIssue({ code: 'custom', path: ['formula'], message: 'give exactly one of formula or rule' });
    if (new Set(l.checkIds).size !== l.checkIds.length) ctx.addIssue({ code: 'custom', path: ['checkIds'], message: 'repeated check id' });
    l.example.table?.rows.forEach((r, i) => {
      if (r.length !== l.example.table!.head.length) {
        ctx.addIssue({ code: 'custom', path: ['example', 'table', 'rows', i], message: `row has ${r.length} cells, expected ${l.example.table!.head.length}` });
      }
    });
  });

export type Lesson = z.infer<typeof lessonSchema>;

/** All lesson prose, for the acronym-completeness check. */
export function lessonText(l: Lesson): string {
  return [
    l.title,
    ...l.meaning,
    ...(l.diagram ? [l.diagram.caption, l.diagram.description] : []),
    ...(l.formula ? [l.formula.text, l.formula.spoken, ...l.formula.symbols.flatMap((s) => [s.symbol, s.meaning])] : []),
    ...(l.rule ?? []),
    l.example.intro,
    ...(l.example.table ? [l.example.table.caption, ...l.example.table.head, ...l.example.table.rows.flat()] : []),
    ...l.example.steps,
    l.trap.wrong,
    l.trap.why,
  ].join('\n');
}
