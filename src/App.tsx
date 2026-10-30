import { useEffect, useState } from 'react';
import { openRepo, type Repo } from './storage';
import { Disclaimer } from './ui/Disclaimer';
import { Home } from './ui/Home';

export default function App() {
  const [storage, setStorage] = useState<{ repo: Repo; persistent: boolean } | null>(null);

  useEffect(() => {
    void openRepo().then(setStorage);
  }, []);

  return (
    <>
      <main>
        <h1>Cert Exam Trainer</h1>
        {storage ? <Home repo={storage.repo} persistent={storage.persistent} /> : <p>Loading…</p>}
      </main>
      <Disclaimer />
    </>
  );
}
