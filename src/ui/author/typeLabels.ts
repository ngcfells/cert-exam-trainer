import type { QuestionType } from '../../domain/types';
import { TYPE_NAMES } from '../study/PracticeSetup';

export const TYPE_LABELS: Record<QuestionType, string> = {
  'mcq-single': 'Multiple choice (one answer)',
  'mcq-multi': 'Multiple choice (select all)',
  ...TYPE_NAMES,
};
