import { lazy, Suspense, useEffect, useState } from 'react';
import { openRepo, type Repo } from './storage';
import { About } from './ui/About';
import { AcronymFlow } from './ui/acronyms/AcronymFlow';
import { LearnFlow } from './ui/learn/LearnFlow';
import { applyDisplay, loadDisplay } from './ui/display';
import { APP_NAME } from './ui/legal';
import { Disclaimer } from './ui/Disclaimer';
import { ExamPage } from './ui/ExamPage';
import { Home } from './ui/Home';
import { SettingsScreen } from './ui/SettingsScreen';
import { MyQuestions } from './ui/author/MyQuestions';
import { QuestionEditor } from './ui/author/QuestionEditor';
import { MockExamFlow } from './ui/exam/MockExamFlow';
import { parentOf, type Screen } from './ui/screens';
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
    void openRepo().then(async (s) => {
      // Apply the saved theme before the first screen paints; a read failure keeps the defaults.
      try {
        const d = await loadDisplay(s.repo);
        applyDisplay(d.theme, d.reducedMotion);
      } catch {
        /* defaults stay */
      }
      setStorage(s);
    });
  }, []);

  // Browser Back steps through in-app screens: each navigation is a history entry.
  useEffect(() => {
    window.history.replaceState({ screen: { name: 'home' } }, '');
    const onPop = (e: PopStateEvent) => {
      const s = (e.state as { screen?: Screen } | null)?.screen;
      setScreen(s ?? { name: 'home' });
      setVisit((v) => v + 1);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  function go(s: Screen) {
    window.history.pushState({ screen: s }, '');
    setScreen(s);
    setVisit((v) => v + 1);
  }

  function body(repo: Repo, persistent: boolean) {
    const home = () => go(parentOf(screen));
    const key = `${screen.name}-${visit}`;
    switch (screen.name) {
      case 'home':
        return <Home repo={repo} persistent={persistent} onNavigate={go} />;
      case 'exam':
        return <ExamPage key={key} repo={repo} examCode={screen.exam} onNavigate={go} />;
      case 'settings':
        return <SettingsScreen key={key} repo={repo} />;
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
      case 'learn':
        return <LearnFlow key={key} repo={repo} examCode={screen.exam} lessonId={screen.lesson} onExit={home} />;
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
        {screen.name !== 'home' && (
          <nav className="top-nav" aria-label="Navigation">
            <button type="button" onClick={() => go(parentOf(screen))}>
              ← Back
            </button>
            <button type="button" onClick={() => go({ name: 'home' })}>
              ⌂ All exams
            </button>
          </nav>
        )}
        {!storage ? <p>Loading…</p> : body(storage.repo, storage.persistent)}
      </main>
      <Disclaimer onAbout={() => go({ name: 'about' })} />
    </>
  );
}
