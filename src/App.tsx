import { useEffect, useState } from 'react';
import { openRepo, type Repo } from './storage';
import { Disclaimer } from './ui/Disclaimer';
import { Home } from './ui/Home';
import { MockExamFlow } from './ui/exam/MockExamFlow';

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
          <MockExamFlow key={examCode} repo={storage.repo} examCode={examCode} onExit={() => setExamCode(null)} />
        ) : (
          <Home repo={storage.repo} persistent={storage.persistent} onStartExam={setExamCode} />
        )}
      </main>
      <Disclaimer />
    </>
  );
}
