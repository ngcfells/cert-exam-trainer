import { parseExamMeta, parseQuestion } from '../domain/schema';
import type { ExamMeta, Question } from '../domain/types';

export interface QuestionQuery {
  includeDrafts?: boolean;
}

export function createRegistry() {
  const exams = new Map<string, { meta: ExamMeta; questions: Question[] }>();

  function registerExam(rawMeta: ExamMeta, rawQuestions: Question[]): void {
    const meta = parseExamMeta(rawMeta);
    if (exams.has(meta.code)) throw new Error(`exam ${meta.code} is already registered`);
    const objectiveIds = new Set(meta.objectives.map((o) => o.id));
    const seen = new Set<string>();
    const questions = rawQuestions.map((raw) => {
      const q = parseQuestion(raw);
      if (q.exam !== meta.code) throw new Error(`question ${q.id} belongs to ${q.exam}, not ${meta.code}`);
      if (q.source !== 'ours') throw new Error(`bundled question ${q.id} must have source "ours"`);
      if (seen.has(q.id)) throw new Error(`duplicate question id ${q.id}`);
      seen.add(q.id);
      for (const o of q.objectiveIds) {
        if (!objectiveIds.has(o)) throw new Error(`question ${q.id} references unknown objective ${o}`);
      }
      return q;
    });
    exams.set(meta.code, { meta, questions });
  }

  function listExams(): ExamMeta[] {
    return [...exams.values()].map((e) => e.meta);
  }

  function getBundledQuestions(code: string, opts: QuestionQuery = {}): Question[] {
    const includeDrafts = opts.includeDrafts ?? import.meta.env.DEV;
    const questions = exams.get(code)?.questions ?? [];
    return includeDrafts ? questions : questions.filter((q) => q.status === 'approved');
  }

  return { registerExam, listExams, getBundledQuestions };
}
