import type { Question, QuestionType } from '../../domain/types';
import { TYPE_NAMES } from '../study/PracticeSetup';

export const TYPE_LABELS: Record<QuestionType, string> = {
  'mcq-single': 'Multiple choice (one answer)',
  'mcq-multi': 'Multiple choice (select all)',
  ...TYPE_NAMES,
};

export const STATUS_LABELS: Record<Question['status'], string> = { draft: 'Draft', reviewed: 'Reviewed', approved: 'Approved' };

export const ellipsize = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);
