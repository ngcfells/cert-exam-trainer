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

const ZWSP = '\u200B';

/**
 * Stops learner text from pinging people, cross-linking issues or faking headings. GitHub decodes HTML entities
 * before it looks for mentions, so a zero-width space is used instead: after every @ and #, inside github.com and
 * GH-N, and before a line of only - or = (which would turn the line above into a heading).
 */
export function escapeText(s: string): string {
  return s
    .replace(/[@#]/g, `$&${ZWSP}`)
    .replace(/(github)(\.com)/gi, `$1${ZWSP}$2`)
    .replace(/\b(gh)-/gi, `$1${ZWSP}-`)
    .replace(/^(?=[ \t]*(?:-+|=+)[ \t]*$)/gm, ZWSP);
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
  parts.push('---', `Sent from the app, version ${r.version}`, `<!-- report-id: ${r.id} -->`);

  return { title, body: parts.join('\n'), labels: [...LABELS[r.type]] };
}
