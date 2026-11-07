import { listExams } from '../banks';

export type Screen =
  | { name: 'home' }
  | { name: 'about' }
  | { name: 'settings' }
  | { name: 'exam'; exam: string }
  | { name: 'mock'; exam: string }
  | { name: 'practice'; exam: string; preset?: string[] }
  | { name: 'cram'; exam: string }
  | { name: 'progress'; exam: string }
  | { name: 'acronyms'; exam: string }
  | { name: 'learn'; exam: string; lesson?: string }
  | { name: 'primer'; exam: string }
  | { name: 'questions'; exam: string }
  | { name: 'edit'; exam: string; id?: string }
  /** Dev only: the bank review tool. */
  | { name: 'review'; exam: string };

export type ExamScreen = Exclude<Screen, { name: 'home' } | { name: 'about' } | { name: 'settings' }>;

/** Where "Back" goes: a tool returns to its exam page, everything else to the exam list. */
export function parentOf(s: Screen): Screen {
  if (s.name === 'edit') return { name: 'questions', exam: s.exam };
  if ('exam' in s && s.name !== 'exam') return { name: 'exam', exam: s.exam };
  return { name: 'home' };
}

/** The Back button's words: it names the exam when Back goes to that exam's page. */
export function backLabel(s: Screen): string {
  const parent = parentOf(s);
  if (parent.name !== 'exam') return '← Back';
  const meta = listExams().find((m) => m.code === parent.exam);
  return meta ? `← Back to ${meta.name.replace(/^CompTIA /, '')}` : '← Back';
}
