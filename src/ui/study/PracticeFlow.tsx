import { useEffect, useState } from 'react';
import { listExams } from '../../banks';
import { PBQ_TEMPLATES } from '../../domain/pbq';
import type { Question } from '../../domain/types';
import type { AssembledExam } from '../../exam/assemble';
import { buildResult, recentQuestionIds, type ExamResult } from '../../exam/result';
import { newSeed } from '../../exam/rng';
import { scoreExam, type ScoreReport } from '../../exam/scoring';
import type { Repo } from '../../storage';
import { assemblePractice } from '../../study/session';
import { ResultsScreen } from '../exam/ResultsScreen';
import { saveAttempt } from '../exam/saveAttempt';
import { loadStudy } from './loadStudy';
import { MCQ_TYPES, PracticeSetup, type PracticeChoices } from './PracticeSetup';
import { StudyRunner, type StudyOutcome } from './StudyRunner';

type Stage =
  | { stage: 'loading' }
  | { stage: 'setup' }
  | { stage: 'running'; exam: AssembledExam; startedAt: Date }
  | { stage: 'results'; exam: AssembledExam; result: ExamResult; report: ScoreReport; saveError: string | null };

export const DEFAULT_PRACTICE_COUNT = 10;

export function PracticeFlow({
  repo,
  examCode,
  seed,
  presetObjectiveIds,
  onExit,
  onDrill,
}: {
  repo: Repo;
  examCode: string;
  seed?: number;
  presetObjectiveIds?: string[];
  onExit: () => void;
  onDrill?: (objectiveIds: string[]) => void;
}) {
  const meta = listExams().find((m) => m.code === examCode)!;
  const [s, setS] = useState<Stage>({ stage: 'loading' });
  const [data, setData] = useState<{ pool: Question[]; recent: Set<string> }>({ pool: [], recent: new Set() });
  const [choices, setChoices] = useState<PracticeChoices>(() => ({
    objectiveIds: presetObjectiveIds ?? meta.objectives.map((o) => o.id),
    types: [...MCQ_TYPES, ...PBQ_TEMPLATES],
    count: DEFAULT_PRACTICE_COUNT,
    feedback: 'instant',
  }));

  useEffect(() => {
    let live = true;
    void loadStudy(repo, examCode).then(({ pool, results }) => {
      if (!live) return;
      setData({ pool, recent: recentQuestionIds(results, examCode) });
      setS({ stage: 'setup' });
    });
    return () => {
      live = false;
    };
  }, [repo, examCode]);

  function start() {
    const exam = assemblePractice({ meta, pool: data.pool, seed: seed ?? newSeed(), recentIds: data.recent, options: choices });
    setS({ stage: 'running', exam, startedAt: new Date() });
  }

  async function finish(exam: AssembledExam, startedAt: Date, o: StudyOutcome) {
    const report = scoreExam(exam, o.responses, meta);
    const result = buildResult({ exam, report, startedAt, responses: o.responses, flagged: [], finishedAt: o.finishedAt, autoSubmitted: false, mode: 'practice' });
    const saveError = await saveAttempt(repo, result, report, o.checked, o.finishedAt);
    setS({ stage: 'results', exam, result, report, saveError });
  }

  switch (s.stage) {
    case 'loading':
      return <p>Loading…</p>;
    case 'setup':
      return <PracticeSetup meta={meta} pool={data.pool} value={choices} onChange={setChoices} onStart={start} onCancel={onExit} />;
    case 'running':
      return (
        <StudyRunner
          items={s.exam.items.map((item) => ({ kind: 'question', item }))}
          feedback={choices.feedback}
          startedAt={s.startedAt}
          onFinish={(o) => void finish(s.exam, s.startedAt, o)}
        />
      );
    case 'results':
      return (
        <ResultsScreen
          meta={meta}
          exam={s.exam}
          result={s.result}
          report={s.report}
          saveError={s.saveError}
          onHome={onExit}
          mode="practice"
          onDrill={onDrill}
        />
      );
  }
}
