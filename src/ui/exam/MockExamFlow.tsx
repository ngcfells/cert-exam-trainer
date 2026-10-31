import { useState } from 'react';
import { loadPool } from '../../banks/pool';
import { PBQ_TEMPLATES } from '../../domain/pbq';
import { assembleExam } from '../../exam/assemble';
import { recentQuestionIds } from '../../exam/result';
import { newSeed } from '../../exam/rng';
import type { Repo } from '../../storage';
import { Loading, metaFor, useLoad } from '../kit';
import { LoadError } from '../study/LoadError';
import { ExamRunner } from './ExamRunner';
import { ExamSetup } from './ExamSetup';
import { ResultsScreen } from './ResultsScreen';
import { finishAttempt, type Finished } from './saveAttempt';

export function MockExamFlow({ repo, examCode, onExit, onDrill, seed }: { repo: Repo; examCode: string; onExit: () => void; onDrill?: (objectiveIds: string[]) => void; seed?: number }) {
  const meta = metaFor(examCode);
  const [exam] = useLoad(async () => {
    const [pool, history] = await Promise.all([loadPool(repo, examCode), repo.listRecords('results')]);
    return assembleExam({ meta, pool, seed: seed ?? newSeed(), recentIds: recentQuestionIds(history, examCode), pbqTypes: PBQ_TEMPLATES });
  }, [repo, examCode, seed]);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [done, setDone] = useState<Finished | null>(null);

  if (exam === undefined) return <Loading />;
  if (exam === null) return <LoadError onExit={onExit} />;
  if (done) return <ResultsScreen meta={meta} {...done} onHome={onExit} onDrill={onDrill} />;
  if (!startedAt) return <ExamSetup meta={meta} plannedCount={exam.items.length} onStart={() => setStartedAt(new Date())} onCancel={onExit} />;
  return (
    <ExamRunner
      exam={exam}
      timeLimitMs={meta.timeLimitMinutes * 60_000}
      startedAt={startedAt}
      onSubmit={(p) => void finishAttempt(repo, meta, exam, startedAt, p).then(setDone)}
    />
  );
}
