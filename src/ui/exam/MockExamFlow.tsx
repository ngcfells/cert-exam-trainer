import { useState } from 'react';
import { loadPool } from '../../banks/pool';
import { PBQ_TEMPLATES } from '../../domain/pbq';
import { assembleExam, type AssembledExam } from '../../exam/assemble';
import { buildChances } from '../../exam/chance';
import { clearInProgress, saveInProgress, saveProgress } from '../../exam/inProgress';
import { newSeed } from '../../exam/rng';
import type { Responses } from '../../exam/scoring';
import type { Repo } from '../../storage';
import { Loading, metaFor, useLoad } from '../kit';
import { usePanels } from '../panels/PanelProvider';
import { LoadError } from '../study/LoadError';
import { ExamRunner } from './ExamRunner';
import { ExamSetup } from './ExamSetup';
import { ResultsScreen } from './ResultsScreen';
import { finishAttempt, type Finished } from './saveAttempt';

export function MockExamFlow({
  repo,
  examCode,
  onDrill,
  seed,
  recovered,
}: {
  repo: Repo;
  examCode: string;
  onDrill?: (objectiveIds: string[]) => void;
  seed?: number;
  /** A mock a refresh or close cut off, already scored (see recoverMock): the flow opens on its results. */
  recovered?: Finished;
}) {
  const meta = metaFor(examCode);
  const [exam] = useLoad(async () => {
    const [pool, history] = await Promise.all([loadPool(repo, examCode), repo.listRecords('results')]);
    return assembleExam({ meta, pool, seed: seed ?? newSeed(), chances: buildChances(history, pool, examCode, new Date()), pbqTypes: PBQ_TEMPLATES });
  }, [repo, examCode, seed]);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [done, setDone] = useState<Finished | null>(recovered ?? null);
  const { close: closePanel } = usePanels();

  // Saved as it goes, so a refresh or close still scores the attempt; a failed save only loses that safety net.
  // The exam is written once at the start; each change after that writes only the answers.
  function saveStart(e: AssembledExam, start: Date) {
    const at = start.toISOString();
    saveInProgress(repo, { exam: e, startedAt: at, savedAt: at, responses: {}, flagged: [] }).catch(() => {});
  }
  function save(start: Date, p: { responses: Responses; flagged: string[] }) {
    saveProgress(repo, { startedAt: start.toISOString(), savedAt: new Date().toISOString(), ...p }).catch(() => {});
  }

  if (done) return <ResultsScreen meta={meta} {...done} onDrill={onDrill} />;
  if (exam === undefined) return <Loading />;
  if (exam === null) return <LoadError />;
  if (!startedAt)
    return (
      <ExamSetup
        meta={meta}
        plannedCount={exam.items.length}
        onStart={() => {
          const start = new Date();
          setStartedAt(start);
          saveStart(exam, start);
        }}
      />
    );
  return (
    <ExamRunner
      exam={exam}
      timeLimitMs={meta.timeLimitMinutes * 60_000}
      startedAt={startedAt}
      onProgress={(p) => save(startedAt, p)}
      onSubmit={(p) =>
        void finishAttempt(repo, meta, exam, startedAt, p).then(async (f) => {
          await clearInProgress(repo).catch(() => {});
          // A panel opened while saving (the app's Settings) must not cover the results.
          closePanel({ restoreFocus: false });
          setDone(f);
        })
      }
    />
  );
}
