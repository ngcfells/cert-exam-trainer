import { useEffect, useState } from 'react';
import { getBundledQuestions, listExams } from '../banks';
import type { Repo } from '../storage';
import { StorageBanner } from './StorageBanner';
import { questions } from './plural';
import type { Screen } from './screens';

/** The landing page: one card per exam, plus Settings. */
export function Home({ repo, persistent, onNavigate }: { repo: Repo; persistent: boolean; onNavigate?: (s: Screen) => void }) {
  const [mine, setMine] = useState<Record<string, number>>({});

  useEffect(() => {
    void repo.getUserQuestions().then((all) => {
      const counts: Record<string, number> = {};
      for (const q of all) counts[q.exam] = (counts[q.exam] ?? 0) + 1;
      setMine(counts);
    });
  }, [repo]);

  return (
    <>
      <StorageBanner persistent={persistent} />
      <h2>Exams</h2>
      <ul className="exam-cards">
        {listExams().map((e) => (
          <li key={e.code}>
            <button type="button" className="exam-card" onClick={() => onNavigate?.({ name: 'exam', exam: e.code })}>
              <strong>{`${e.name} (${e.code})`}</strong>
              <span>{`Stock: ${questions(getBundledQuestions(e.code).length)}`}</span>
              <span>{`Custom: ${questions(mine[e.code] ?? 0)}`}</span>
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => onNavigate?.({ name: 'settings' })}>
        Settings
      </button>
    </>
  );
}
