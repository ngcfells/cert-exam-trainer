import { useEffect, useState } from 'react';
import { openRepo, type Repo } from './storage';
import { Disclaimer } from './ui/Disclaimer';
import { Home } from './ui/Home';
import { MyQuestions } from './ui/author/MyQuestions';
import { QuestionEditor } from './ui/author/QuestionEditor';
import { MockExamFlow } from './ui/exam/MockExamFlow';
import type { Screen } from './ui/screens';
import { CramFlow } from './ui/study/CramFlow';
import { PracticeFlow } from './ui/study/PracticeFlow';
import { ProgressScreen } from './ui/study/ProgressScreen';

/** `?seed=N` replays a specific attempt (spec §7); used by e2e. */
function seedFromUrl(): number | undefined {
  const s = new URLSearchParams(window.location.search).get('seed');
  return s && /^\d+$/.test(s) ? Number(s) : undefined;
}

export default function App() {
  const [storage, setStorage] = useState<{ repo: Repo; persistent: boolean } | null>(null);
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  // Bumped on every navigation so revisiting a screen starts it fresh.
  const [visit, setVisit] = useState(0);

  useEffect(() => {
    void openRepo().then(setStorage);
  }, []);

  function go(s: Screen) {
    setScreen(s);
    setVisit((v) => v + 1);
  }

  function body(repo: Repo, persistent: boolean) {
    const home = () => go({ name: 'home' });
    const key = `${screen.name}-${visit}`;
    switch (screen.name) {
      case 'home':
        return <Home repo={repo} persistent={persistent} onNavigate={go} />;
      case 'mock':
        return (
          <MockExamFlow
            key={key}
            repo={repo}
            examCode={screen.exam}
            seed={seedFromUrl()}
            onExit={home}
            onDrill={(ids) => go({ name: 'practice', exam: screen.exam, preset: ids })}
          />
        );
      case 'practice':
        return (
          <PracticeFlow
            key={key}
            repo={repo}
            examCode={screen.exam}
            seed={seedFromUrl()}
            presetObjectiveIds={screen.preset}
            onExit={home}
            onDrill={(ids) => go({ name: 'practice', exam: screen.exam, preset: ids })}
          />
        );
      case 'cram':
        return <CramFlow key={key} repo={repo} examCode={screen.exam} seed={seedFromUrl()} onExit={home} />;
      case 'progress':
        return (
          <ProgressScreen
            key={key}
            repo={repo}
            examCode={screen.exam}
            onExit={home}
            onDrill={(ids) => go({ name: 'practice', exam: screen.exam, preset: ids })}
          />
        );
      case 'questions':
        return <MyQuestions key={key} repo={repo} examCode={screen.exam} onExit={home} onEdit={(id) => go({ name: 'edit', exam: screen.exam, id })} />;
      case 'edit':
        return <QuestionEditor key={key} repo={repo} examCode={screen.exam} id={screen.id} onDone={() => go({ name: 'questions', exam: screen.exam })} />;
    }
  }

  return (
    <>
      <main>
        <h1>Cert Exam Trainer</h1>
        {!storage ? <p>Loading…</p> : body(storage.repo, storage.persistent)}
      </main>
      <Disclaimer />
    </>
  );
}
