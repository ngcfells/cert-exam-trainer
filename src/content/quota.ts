import { PBQ_TEMPLATES, isPbqTemplate, type PbqTemplate } from '../domain/pbq';
import type { ExamMeta, Question } from '../domain/types';

export interface Counts {
  mcq: number;
  pbq: number;
}

/** Minimum items per objective: each total split by domain weight, then evenly across the domain's objectives, rounded up. */
export function objectiveQuotas(meta: ExamMeta, totals: Counts): Record<string, Counts> {
  const out: Record<string, Counts> = {};
  for (const d of meta.domains) {
    const objectives = meta.objectives.filter((o) => o.domainId === d.id);
    for (const o of objectives) {
      out[o.id] = {
        mcq: Math.ceil((totals.mcq * d.weight) / 100 / objectives.length),
        pbq: Math.ceil((totals.pbq * d.weight) / 100 / objectives.length),
      };
    }
  }
  return out;
}

/** MCQ and PBQ counts per objective, by each question's first objective. */
export function coverage(meta: ExamMeta, questions: Question[]): Record<string, Counts> {
  const out: Record<string, Counts> = Object.fromEntries(meta.objectives.map((o) => [o.id, { mcq: 0, pbq: 0 }]));
  for (const q of questions) {
    const c = out[q.objectiveIds[0]];
    if (c) c[isPbqTemplate(q.type) ? 'pbq' : 'mcq']++;
  }
  return out;
}

export function pbqTypeCounts(questions: Question[]): Record<PbqTemplate, number> {
  const out = Object.fromEntries(PBQ_TEMPLATES.map((t) => [t, 0])) as Record<PbqTemplate, number>;
  for (const q of questions) if (isPbqTemplate(q.type)) out[q.type]++;
  return out;
}
