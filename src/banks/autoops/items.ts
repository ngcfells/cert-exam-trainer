import type { Question } from '../../domain/types';

// The shipped bank: one JSON file per objective, each a Question[]. The registry validates them.
const files = import.meta.glob<Question[]>('./items/*.json', { eager: true, import: 'default' });

export const autoOpsItems: Question[] = Object.keys(files)
  .sort()
  .flatMap((f) => files[f]);
