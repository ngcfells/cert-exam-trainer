import { z } from 'zod';

export const PRIMER_GROUPS = ['basics', 'text', 'network', 'files', 'services', 'dev', 'data'] as const;
export type PrimerGroup = (typeof PRIMER_GROUPS)[number];

export const GROUP_TITLES: Record<PrimerGroup, string> = {
  basics: 'Shell basics',
  text: 'Working with text',
  network: 'Network checks',
  files: 'Files and security',
  services: 'Services',
  dev: 'Developer tools',
  data: 'Data (SQL and pandas)',
};

const text = z.string().min(1);

/** A PowerShell cell: a command in backticks, exactly "Same command", or "No close equivalent." plus why. */
const powershellCell = text.refine((s) => /`[^`]+`/.test(s) || s === 'Same command' || /^No close equivalent\. \S/.test(s), {
  message: 'use a command in backticks, "Same command", or "No close equivalent." followed by why',
});

const row = z.object({ bash: text, powershell: powershellCell.optional(), does: text }).strict();
type Row = z.infer<typeof row>;

export const topicSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/, 'use lowercase letters, digits and hyphens'),
    group: z.enum(PRIMER_GROUPS),
    title: text,
    purpose: text,
    /** Command words that lead here; two words for a subcommand ("git push"). */
    aliases: z.array(text),
    /** SQL: aliases match ignoring case. */
    anyCase: z.literal(true).optional(),
    /** Single-column topics (SQL, pandas): where these are typed. Rows then have no PowerShell cell. */
    where: text.optional(),
    what: z.array(text).min(1),
    forms: z.array(row).min(1),
    example: z.object({ intro: text, lines: z.array(z.object({ line: text, note: text }).strict()).min(1) }).strict(),
    trap: z.object({ wrong: text, why: text }).strict(),
    more: z.array(z.object({ heading: text, paragraphs: z.array(text).min(1), forms: z.array(row).min(1).optional() }).strict()).min(1),
    links: z.array(z.object({ label: text, url: z.string().url().startsWith('https://', 'use an https link') }).strict()).default([]),
  })
  .strict()
  .superRefine((t, ctx) => {
    if (new Set(t.aliases).size !== t.aliases.length) ctx.addIssue({ code: 'custom', path: ['aliases'], message: 'repeated alias' });
    const check = (rows: Row[], path: (string | number)[]) =>
      rows.forEach((r, i) => {
        if (t.where && r.powershell !== undefined) ctx.addIssue({ code: 'custom', path: [...path, i, 'powershell'], message: 'a topic with where has no PowerShell column' });
        if (!t.where && r.powershell === undefined) ctx.addIssue({ code: 'custom', path: [...path, i, 'powershell'], message: 'give the PowerShell form' });
      });
    check(t.forms, ['forms']);
    t.more.forEach((m, i) => m.forms && check(m.forms, ['more', i, 'forms']));
  });

export type PrimerTopic = z.infer<typeof topicSchema>;

/** Validates topics, naming the topic that fails. Ids must be unique. */
export function parseTopics(raw: unknown[]): PrimerTopic[] {
  const seen = new Set<string>();
  return raw.map((x, i) => {
    const r = topicSchema.safeParse(x);
    const id = String((x as { id?: unknown })?.id ?? `#${i + 1}`);
    if (!r.success) {
      const issue = r.error.issues[0];
      throw new Error(`primer topic ${id} is invalid: ${issue.path.join('.')}: ${issue.message}`);
    }
    if (seen.has(r.data.id)) throw new Error(`primer topic ${r.data.id} is repeated`);
    seen.add(r.data.id);
    return r.data;
  });
}

const rowText = (r: Row) => [r.bash, r.powershell ?? '', r.does];

/** All topic prose, for the acronym and overlap checks. Code is left in; those checks strip it. */
export function primerText(t: PrimerTopic): string {
  return [
    t.title,
    t.purpose,
    t.where ?? '',
    ...t.what,
    ...t.forms.flatMap(rowText),
    t.example.intro,
    ...t.example.lines.flatMap((l) => [l.line, l.note]),
    t.trap.wrong,
    t.trap.why,
    ...t.more.flatMap((m) => [m.heading, ...m.paragraphs, ...(m.forms ?? []).flatMap(rowText)]),
    ...t.links.map((l) => l.label),
  ]
    .filter(Boolean)
    .join('\n');
}
