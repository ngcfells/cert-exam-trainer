import { z } from 'zod';

// Shared by the app and the relay Worker (relay/src). Keep it free of browser-only imports.

export const REPORT_TYPES = ['bug', 'question', 'feature'] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_MODES = ['practice', 'cram', 'lesson', 'results'] as const;
export type ReportMode = (typeof REPORT_MODES)[number];

export const LIMITS = { title: 120, details: 5000, contact: 200 } as const;

export const EXAM_RE = /^[A-Z0-9-]{1,20}$/;
export const QUESTION_ID_RE = /^[A-Za-z0-9._:-]{1,120}$/;

// eslint-disable-next-line no-control-regex
const VISIBLE_RE = /[^\s\u0000-\u001f\u007f\u200b-\u200d\ufeff]/;

/** True when the text has at least one character a person can see. */
export function hasVisibleText(s: string): boolean {
  return VISIBLE_RE.test(s);
}

const contextSchema = z
  .object({
    exam: z.string().regex(EXAM_RE).optional(),
    mode: z.enum(REPORT_MODES).optional(),
    userAgent: z.string().max(400).optional(),
  })
  .strict();

export const reportRequestSchema = z
  .object({
    id: z.string().uuid(),
    type: z.enum(REPORT_TYPES),
    title: z.string().trim().min(1).max(LIMITS.title).regex(VISIBLE_RE),
    details: z.string().trim().min(1).max(LIMITS.details).regex(VISIBLE_RE),
    contact: z.string().trim().max(LIMITS.contact).optional(),
    version: z.string().regex(/^[0-9A-Za-z.+-]{1,40}$/),
    questionId: z.string().regex(QUESTION_ID_RE).optional(),
    context: contextSchema.optional(),
    turnstileToken: z.string().min(1).max(2048),
  })
  .strict()
  .refine((r) => r.type !== 'question' || r.questionId !== undefined, {
    message: 'A question report needs a question id',
    path: ['questionId'],
  });

export type ReportRequest = z.infer<typeof reportRequestSchema>;
export type ReportDraft = Omit<ReportRequest, 'turnstileToken'>;

export const reportReplySchema = z.object({ number: z.number().int().positive(), url: z.string().url() });
export type ReportReply = z.infer<typeof reportReplySchema>;
