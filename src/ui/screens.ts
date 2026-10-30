export type Screen =
  | { name: 'home' }
  | { name: 'mock'; exam: string }
  | { name: 'practice'; exam: string; preset?: string[] }
  | { name: 'cram'; exam: string }
  | { name: 'progress'; exam: string }
  | { name: 'questions'; exam: string }
  | { name: 'edit'; exam: string; id?: string };

export type ExamScreen = Exclude<Screen, { name: 'home' }>;
