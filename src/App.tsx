import { lazy, Suspense, useEffect, useState } from 'react';
import { openRepo, type Repo } from './storage';
import { About } from './ui/About';
import { AcronymFlow } from './ui/acronyms/AcronymFlow';
import { APP_NAME } from './ui/legal';
import { Disclaimer } from './ui/Disclaimer';
import { Home } from './ui/Home';
import { MyQuestions } from './ui/author/MyQuestions';
import { QuestionEditor } from './ui/author/QuestionEditor';
import { MockExamFlow } from './ui/exam/MockExamFlow';
import type { Screen } from './ui/screens';
import { CramFlow } from './ui/study/CramFlow';
import { PracticeFlow } from './ui/study/PracticeFlow';
import { ProgressScreen } from './ui/study/ProgressScreen';

// Dev only: production builds drop this branch, so the review tool never ships.
const ReviewScreen = import.meta.env.DEV
  ? lazy(() => import('./ui/review/ReviewScreen').then((m) => ({ default: m.ReviewScreen })))
  : null;

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
      case 'about':
        return <About key={key} onExit={home} />;
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
      case 'acronyms':
        return <AcronymFlow key={key} repo={repo} examCode={screen.exam} seed={seedFromUrl()} onExit={home} />;
      case 'questions':
        return <MyQuestions key={key} repo={repo} examCode={screen.exam} onExit={home} onEdit={(id) => go({ name: 'edit', exam: screen.exam, id })} />;
      case 'edit':
        return <QuestionEditor key={key} repo={repo} examCode={screen.exam} id={screen.id} onDone={() => go({ name: 'questions', exam: screen.exam })} />;
      case 'review':
        return ReviewScreen ? (
          <Suspense fallback={<p>Loading…</p>}>
            <ReviewScreen key={key} examCode={screen.exam} onExit={home} />
          </Suspense>
        ) : null;
    }
  }

  return (
    <>
      <main>
        <h1>{APP_NAME}</h1>
        {!storage ? <p>Loading…</p> : body(storage.repo, storage.persistent)}
      </main>
      <Disclaimer onAbout={() => go({ name: 'about' })} />
    </>
  );
}
