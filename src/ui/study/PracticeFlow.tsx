import { useState } from 'react';
import { PBQ_TEMPLATES } from '../../domain/pbq';
import type { AssembledExam } from '../../exam/assemble';
import { recentQuestionIds } from '../../exam/result';
import { newSeed } from '../../exam/rng';
import type { Repo } from '../../storage';
import { assemblePractice, onlySeen } from '../../study/session';
import { ResultsScreen } from '../exam/ResultsScreen';
import { finishAttempt, type Finished } from '../exam/saveAttempt';
import { Loading, metaFor, useLoad } from '../kit';
import { LoadError } from './LoadError';
import { loadStudy } from './loadStudy';
import { MCQ_TYPES, PracticeSetup, type PracticeChoices } from './PracticeSetup';
import { StudyRunner } from './StudyRunner';

export const DEFAULT_PRACTICE_COUNT = 10;

export function PracticeFlow({
  repo,
  examCode,
  seed,
  presetObjectiveIds,
  onDrill,
}: {
  repo: Repo;
  examCode: string;
  seed?: number;
  presetObjectiveIds?: string[];
  onDrill?: (objectiveIds: string[]) => void;
}) {
  const meta = metaFor(examCode);
  const [data] = useLoad(async () => {
    const { pool, results } = await loadStudy(repo, examCode);
    return { pool, recent: recentQuestionIds(results, examCode) };
  }, [repo, examCode]);
  const [choices, setChoices] = useState<PracticeChoices>(() => ({
    objectiveIds: presetObjectiveIds ?? meta.objectives.map((o) => o.id),
    types: [...MCQ_TYPES, 'numeric', ...PBQ_TEMPLATES],
    count: DEFAULT_PRACTICE_COUNT,
    feedback: 'instant',
  }));
  const [run, setRun] = useState<{ exam: AssembledExam; startedAt: Date } | null>(null);
  const [done, setDone] = useState<Finished | null>(null);

  if (data === undefined) return <Loading />;
  if (data === null) return <LoadError />;
  if (done) return <ResultsScreen meta={meta} {...done} mode="practice" onDrill={onDrill} />;
  if (!run) {
    const start = () => setRun({ exam: assemblePractice({ meta, pool: data.pool, seed: seed ?? newSeed(), recentIds: data.recent, options: choices }), startedAt: new Date() });
    return <PracticeSetup meta={meta} pool={data.pool} value={choices} onChange={setChoices} onStart={start} />;
  }
  return (
    <StudyRunner
      warnIncomplete
      items={run.exam.items.map((item) => ({ kind: 'question', item }))}
      feedback={choices.feedback}
      startedAt={run.startedAt}
      onFinish={(o) =>
        void finishAttempt(repo, meta, onlySeen(run.exam, o.seen), run.startedAt, { ...o, autoSubmitted: false, mode: 'practice' }, o.checked).then(setDone)
      }
    />
  );
}
