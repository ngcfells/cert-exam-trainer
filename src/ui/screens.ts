export type Screen =
  | { name: 'home' }
  | { name: 'about' }
  | { name: 'mock'; exam: string }
  | { name: 'practice'; exam: string; preset?: string[] }
  | { name: 'cram'; exam: string }
  | { name: 'progress'; exam: string }
  | { name: 'acronyms'; exam: string }
  | { name: 'questions'; exam: string }
  | { name: 'edit'; exam: string; id?: string }
  /** Dev only: the bank review tool. */
  | { name: 'review'; exam: string };

export type ExamScreen = Exclude<Screen, { name: 'home' } | { name: 'about' }>;
