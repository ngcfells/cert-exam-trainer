import { useCallback, useEffect, useState } from 'react';
import { getBundledQuestions, listExams } from '../banks';
import type { Repo } from '../storage';
import { BackupControls } from './BackupControls';
import { StorageBanner } from './StorageBanner';
import { questions } from './plural';

export function Home({ repo, persistent, onStartExam }: { repo: Repo; persistent: boolean; onStartExam?: (code: string) => void }) {
  const [mine, setMine] = useState<Record<string, number>>({});

  const refresh = useCallback(async () => {
    const all = await repo.getUserQuestions();
    const counts: Record<string, number> = {};
    for (const q of all) counts[q.exam] = (counts[q.exam] ?? 0) + 1;
    setMine(counts);
  }, [repo]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <>
      <StorageBanner persistent={persistent} />
      <h2>Exams</h2>
      <ul>
        {listExams().map((e) => (
          <li key={e.code}>
            <strong>{`${e.name} (${e.code})`}</strong>
            <ul>
              <li>{`${questions(getBundledQuestions(e.code).length)} (ours)`}</li>
              <li>{`${questions(mine[e.code] ?? 0)} (mine)`}</li>
            </ul>
            {onStartExam && (
              <button type="button" onClick={() => onStartExam(e.code)}>
                {`Start mock exam: ${e.code}`}
              </button>
            )}
          </li>
        ))}
      </ul>
      <BackupControls repo={repo} onImported={refresh} />
    </>
  );
}
