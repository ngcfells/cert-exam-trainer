import { useEffect, useState } from 'react';
import { getBundledQuestions, listExams } from '../banks';
import type { Repo } from '../storage';
import { useFocusHeading } from './kit';
import { StorageBanner } from './StorageBanner';
import { questions } from './plural';
import type { Screen } from './screens';

/** The landing page: one card per exam, and About. Settings sits in the app header. */
export function Home({ repo, persistent, onNavigate }: { repo: Repo; persistent: boolean; onNavigate?: (s: Screen) => void }) {
  const headingRef = useFocusHeading();
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
      <h2 ref={headingRef} tabIndex={-1}>Exams</h2>
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
      <p className="home-about">
        <button type="button" className="link-button" onClick={() => onNavigate?.({ name: 'about' })}>
          About
        </button>
      </p>
    </>
  );
}
