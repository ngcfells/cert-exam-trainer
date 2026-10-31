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
