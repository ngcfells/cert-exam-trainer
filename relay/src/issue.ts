import type { ReportRequest, ReportType } from '../../src/report/contract';

const LABELS: Record<ReportType, string[]> = {
  bug: ['bug', 'from-app'],
  question: ['bug', 'content', 'from-app'],
  feature: ['enhancement', 'from-app'],
};

const TYPE_NAMES: Record<ReportType, string> = {
  bug: 'Bug',
  question: 'Problem with a question',
  feature: 'Feature request',
};

/** Stops @mentions and #references from pinging people or cross-linking issues. */
export function escapeText(s: string): string {
  return s.replace(/[@#]/g, (c) => (c === '@' ? '&#64;' : '&#35;'));
}

function cleanTitle(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function formatIssue(r: ReportRequest): { title: string; body: string; labels: string[] } {
  const title = r.type === 'question' && r.questionId ? `Question ${r.questionId}: ${cleanTitle(r.title)}` : cleanTitle(r.title);

  const context = [`- Type: ${TYPE_NAMES[r.type]}`];
  if (r.questionId) context.push(`- Question: \`${r.questionId}\``);
  if (r.context?.exam) context.push(`- Exam: ${r.context.exam}`);
  if (r.context?.mode) context.push(`- Mode: ${r.context.mode}`);
  if (r.context?.userAgent) context.push(`- Browser: ${escapeText(r.context.userAgent)}`);

  const parts = [escapeText(r.details), '', '### Context', '', ...context, ''];
  if (r.contact) parts.push('### Contact', '', escapeText(r.contact), '');
  parts.push('---', `Sent from the app, version ${r.version}`);

  return { title, body: parts.join('\n'), labels: [...LABELS[r.type]] };
}
