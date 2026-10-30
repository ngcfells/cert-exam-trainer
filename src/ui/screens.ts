export type Screen =
  | { name: 'home' }
  | { name: 'mock'; exam: string }
  | { name: 'practice'; exam: string; preset?: string[] }
  | { name: 'cram'; exam: string }
  | { name: 'progress'; exam: string };

export type ExamScreen = Exclude<Screen, { name: 'home' }>;
