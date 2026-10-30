import { useEffect, useState } from 'react';
import { openRepo, type Repo } from './storage';
import { Disclaimer } from './ui/Disclaimer';
import { Home } from './ui/Home';
import { MockExamFlow } from './ui/exam/MockExamFlow';

/** `?seed=N` replays a specific attempt (spec §7); used by e2e. */
function seedFromUrl(): number | undefined {
  const s = new URLSearchParams(window.location.search).get('seed');
  return s && /^\d+$/.test(s) ? Number(s) : undefined;
}

export default function App() {
  const [storage, setStorage] = useState<{ repo: Repo; persistent: boolean } | null>(null);
  const [examCode, setExamCode] = useState<string | null>(null);

  useEffect(() => {
    void openRepo().then(setStorage);
  }, []);

  return (
    <>
      <main>
        <h1>Cert Exam Trainer</h1>
        {!storage ? (
          <p>Loading…</p>
        ) : examCode ? (
          <MockExamFlow key={examCode} repo={storage.repo} examCode={examCode} seed={seedFromUrl()} onExit={() => setExamCode(null)} />
        ) : (
          <Home repo={storage.repo} persistent={storage.persistent} onStartExam={setExamCode} />
        )}
      </main>
      <Disclaimer />
    </>
  );
}
