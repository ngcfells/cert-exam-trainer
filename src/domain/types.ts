import type { z } from 'zod';
import type { examMetaSchema, QUESTION_TYPES } from './schema';

export type QuestionType = (typeof QUESTION_TYPES)[number];

export interface Question {
  id: string;
  exam: string;
  source: 'ours' | 'user';
  type: QuestionType;
  objectiveIds: string[];
  difficulty: 1 | 2 | 3;
  pbqWeight?: number;
  /** mcq-multi only: how many to pick (missing = the number of correct answers). */
  pick?: number | 'all';
  stem: string;
  payload: unknown;
  answer: unknown;
  explanation: string;
  partExplanations?: Record<string, string>;
  /** Short phrase for the Learn more search links (see src/learn/phrase.ts). */
  searchTerm?: string;
  acronyms: string[];
  status: 'draft' | 'reviewed' | 'approved';
}

export interface McqPayload {
  options: { id: string; text: string }[];
}

export interface McqAnswer {
  correct: string[];
}

export interface NumericPayload {
  prefix?: string;
  suffix?: string;
}

export interface NumericAnswer {
  value: number;
  /** Absolute, inclusive. */
  tolerance: number;
}

export type ExamMeta = z.infer<typeof examMetaSchema>;
