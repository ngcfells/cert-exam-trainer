import { useEffect, useState } from 'react';
import { getBundledQuestions, listExams } from '../../banks';
import type { Question } from '../../domain/types';
import { assembleExam, type AssembledExam } from '../../exam/assemble';
import { buildResult, recentQuestionIds, type ExamResult } from '../../exam/result';
import { newSeed } from '../../exam/rng';
import { scoreExam, type ScoreReport } from '../../exam/scoring';
import type { Repo } from '../../storage';
import { ExamRunner, type SubmitPayload } from './ExamRunner';
import { ExamSetup } from './ExamSetup';
import { ResultsScreen } from './ResultsScreen';

type Stage =
  | { stage: 'loading' }
  | { stage: 'setup'; exam: AssembledExam }
  | { stage: 'running'; exam: AssembledExam; startedAt: Date }
  | { stage: 'results'; exam: AssembledExam; result: ExamResult; report: ScoreReport; saveError: string | null };

export function MockExamFlow({ repo, examCode, onExit, seed }: { repo: Repo; examCode: string; onExit: () => void; seed?: number }) {
  const meta = listExams().find((m) => m.code === examCode)!;
  const [s, setS] = useState<Stage>({ stage: 'loading' });

  useEffect(() => {
    let live = true;
    void (async () => {
      const [mine, history] = await Promise.all([repo.getUserQuestions(examCode), repo.listRecords('results')]);
      const pool: Question[] = [...getBundledQuestions(examCode), ...mine];
      const exam = assembleExam({
        meta,
        pool,
        seed: seed ?? newSeed(),
        recentIds: recentQuestionIds(history, examCode),
        pbqTypes: [], // PBQ templates arrive in chunks 3–4.
      });
      if (live) setS({ stage: 'setup', exam });
    })();
    return () => {
      live = false;
    };
  }, [repo, examCode, meta, seed]);

  async function finish(exam: AssembledExam, startedAt: Date, p: SubmitPayload) {
    const report = scoreExam(exam, p.responses, meta);
    const result = buildResult({ exam, report, startedAt, ...p });
    let saveError: string | null = null;
    try {
      await repo.putRecord('results', result);
    } catch {
      saveError = 'Your result could not be saved to history.';
    }
    setS({ stage: 'results', exam, result, report, saveError });
  }

  switch (s.stage) {
    case 'loading':
      return <p>Loading…</p>;
    case 'setup':
      return (
        <ExamSetup
          meta={meta}
          plannedCount={s.exam.items.length}
          onStart={() => setS({ stage: 'running', exam: s.exam, startedAt: new Date() })}
          onCancel={onExit}
        />
      );
    case 'running':
      return (
        <ExamRunner
          exam={s.exam}
          timeLimitMs={meta.timeLimitMinutes * 60_000}
          startedAt={s.startedAt}
          onSubmit={(p) => void finish(s.exam, s.startedAt, p)}
        />
      );
    case 'results':
      return <ResultsScreen meta={meta} exam={s.exam} result={s.result} report={s.report} saveError={s.saveError} onHome={onExit} />;
  }
}
