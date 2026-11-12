import type { ExamMeta } from '../domain/types';
import { dataPlusMeta } from './dataplus/meta';
import { secAiMeta } from './secai/meta';
import { autoOpsMeta } from './autoops/meta';
import { cysaMeta } from './cysa/meta';

// Every exam's metadata, with no import.meta.glob, so Node tools and the Vite config can import it.
export const EXAM_METAS: ExamMeta[] = [dataPlusMeta, secAiMeta, autoOpsMeta, cysaMeta];

export function metaFor(code: string): ExamMeta | undefined {
  return EXAM_METAS.find((m) => m.code === code);
}
