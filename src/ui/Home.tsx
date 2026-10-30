import { useCallback, useEffect, useState } from 'react';
import { getBundledQuestions, listExams } from '../banks';
import type { Repo } from '../storage';
import { BackupControls } from './BackupControls';
import { SourceToggle } from './SourceToggle';
import { StorageBanner } from './StorageBanner';
import { questions } from './plural';
import type { ExamScreen } from './screens';

export function Home({ repo, persistent, onNavigate }: { repo: Repo; persistent: boolean; onNavigate?: (s: ExamScreen) => void }) {
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
      <SourceToggle repo={repo} />
      <ul>
        {listExams().map((e) => (
          <li key={e.code}>
            <strong>{`${e.name} (${e.code})`}</strong>
            <ul>
              <li>{`${questions(getBundledQuestions(e.code).length)} (ours)`}</li>
              <li>{`${questions(mine[e.code] ?? 0)} (mine)`}</li>
            </ul>
            {onNavigate && (
              <div className="home-actions">
                <button type="button" className="primary" onClick={() => onNavigate({ name: 'mock', exam: e.code })}>
                  {`Start mock exam: ${e.code}`}
                </button>
                <button type="button" onClick={() => onNavigate({ name: 'practice', exam: e.code })}>
                  {`Practice: ${e.code}`}
                </button>
                <button type="button" onClick={() => onNavigate({ name: 'cram', exam: e.code })}>
                  {`Cram: ${e.code}`}
                </button>
                <button type="button" onClick={() => onNavigate({ name: 'progress', exam: e.code })}>
                  {`Progress: ${e.code}`}
                </button>
                <button type="button" onClick={() => onNavigate({ name: 'acronyms', exam: e.code })}>
                  {`Acronyms: ${e.code}`}
                </button>
                <button type="button" onClick={() => onNavigate({ name: 'questions', exam: e.code })}>
                  {`My questions: ${e.code}`}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      <BackupControls repo={repo} onImported={refresh} />
    </>
  );
}
