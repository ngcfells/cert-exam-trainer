/** Study tips (issue #3). */
export type TipGroup = 'test-room' | 'study';

export interface Tip {
  id: string;
  group: TipGroup;
  /** One to three short sentences. May hold placeholders such as {minutes}. */
  text: string;
  /** An exam code for an exam tip; absent for a general tip. */
  exam?: string;
}

/** App-wide tip progress: questions reached since the last tip, the gap to the next one, and tip ids shown this pass. */
export interface TipProgress {
  count: number;
  gap: number;
  seen: string[];
}
