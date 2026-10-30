import type { ExamMeta, Question } from '../domain/types';
import { parseResults, resultMode, type ResultMode } from '../exam/result';
import { itemFraction } from '../exam/scoring';

interface Tally {
  earned: number;
  possible: number;
  /** null until something was answered. */
  fraction: number | null;
}

export interface Mastery {
  domains: ({ domainId: string; title: string } & Tally)[];
  objectives: ({ objectiveId: string; domainId: string; title: string; attempts: number } & Tally)[];
}

const fractionOf = (t: { earned: number; possible: number }) => (t.possible > 0 ? t.earned / t.possible : null);

/**
 * Per-domain and per-objective scores over every saved result for the exam.
 * An MCQ counts 1 and a PBQ its `pbqWeight`; only a question's first
 * objective counts, as in `scoreExam`. Questions no longer in `questions` are skipped.
 */
export function computeMastery(meta: ExamMeta, results: unknown[], questions: Question[]): Mastery {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const objectives = meta.objectives.map((o) => ({ objectiveId: o.id, domainId: o.domainId, title: o.title, attempts: 0, earned: 0, possible: 0, fraction: null as number | null }));
  for (const r of parseResults(results, meta.code)) {
    for (const id of r.questionIds) {
      const q = byId.get(id);
      const o = q && objectives.find((x) => x.objectiveId === q.objectiveIds[0]);
      if (!q || !o) continue;
      const w = q.type === 'mcq-single' || q.type === 'mcq-multi' ? 1 : (q.pbqWeight ?? 1);
      o.attempts++;
      o.possible += w;
      o.earned += w * itemFraction(q, r.responses[id]);
    }
  }
  objectives.forEach((o) => (o.fraction = fractionOf(o)));
  const domains = meta.domains.map((d) => {
    const mine = objectives.filter((o) => o.domainId === d.id);
    const t = { earned: mine.reduce((s, o) => s + o.earned, 0), possible: mine.reduce((s, o) => s + o.possible, 0) };
    return { domainId: d.id, title: d.title, ...t, fraction: fractionOf(t) };
  });
  return { domains, objectives };
}

/** Attempted objectives, weakest first, then never-attempted ones in exam order. */
export function weakestObjectives(m: Mastery, n: number): string[] {
  const tried = m.objectives.filter((o) => o.fraction !== null).sort((a, b) => a.fraction! - b.fraction!);
  const untried = m.objectives.filter((o) => o.fraction === null);
  return [...tried, ...untried].slice(0, n).map((o) => o.objectiveId);
}

export interface HistoryEntry {
  id: string;
  finishedAt: string;
  mode: ResultMode;
  score: number;
  passed: boolean;
}

/** Newest first. */
export function history(results: unknown[], exam: string): HistoryEntry[] {
  return parseResults(results, exam)
    .map((r) => ({ id: r.id, finishedAt: r.finishedAt, mode: resultMode(r), score: r.score, passed: r.passed }))
    .sort((a, b) => b.finishedAt.localeCompare(a.finishedAt));
}

/** Mock exam scores, oldest first. */
export function trendPoints(h: HistoryEntry[]): { finishedAt: string; score: number }[] {
  return h
    .filter((e) => e.mode === 'mock')
    .map(({ finishedAt, score }) => ({ finishedAt, score }))
    .reverse();
}
