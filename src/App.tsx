import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { openRepo, type Repo } from './storage';
import { About } from './ui/About';
import { AcronymFlow } from './ui/acronyms/AcronymFlow';
import { LearnFlow } from './ui/learn/LearnFlow';
import { applyDisplay, loadDisplay } from './ui/display';
import { applyMarks, loadMarks } from './ui/marks/prefs';
import { applyTips, getTips, loadTips } from './ui/tips/prefs';
import { APP_NAME } from './ui/legal';
import { Disclaimer } from './ui/Disclaimer';
import { ExamPage } from './ui/ExamPage';
import { Home } from './ui/Home';
import { SettingsScreen } from './ui/SettingsScreen';
import { MyQuestions } from './ui/author/MyQuestions';
import { QuestionEditor } from './ui/author/QuestionEditor';
import { MockExamFlow } from './ui/exam/MockExamFlow';
import { armHistory } from './ui/history';
import { navBack, NavBar, NavProvider, useNavState, useTallPage } from './ui/nav';
import { backLabel, parentOf, type Screen } from './ui/screens';
import { CramFlow } from './ui/study/CramFlow';
import { PracticeFlow } from './ui/study/PracticeFlow';
import { PanelProvider, usePanelState } from './ui/panels/PanelProvider';
import { SettingsPanel } from './ui/panels/SettingsPanel';
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
  const { api: nav, up } = useNavState();
  const bottomRef = useRef<HTMLDivElement>(null);
  const tall = useTallPage(bottomRef);
  const panels = usePanelState();

  useEffect(() => {
    void openRepo().then(async (s) => {
      // Apply the saved theme before the first screen paints; a read failure keeps the defaults.
      try {
        const d = await loadDisplay(s.repo);
        applyDisplay(d.theme, d.reducedMotion);
        applyMarks(await loadMarks(s.repo));
      } catch {
        /* defaults stay */
      }
      // Tip progress is written through to this repo; a read failure keeps the defaults.
      try {
        applyTips(await loadTips(s.repo), s.repo);
      } catch {
        applyTips(getTips(), s.repo);
      }
      setStorage(s);
    });
  }, []);

  function go(s: Screen) {
    // A panel never outlives its screen; the new screen sets its own focus.
    panels.close({ restoreFocus: false });
    setScreen(s);
    setVisit((v) => v + 1);
  }

  /** The nav bar's Back (see navBack). Returns the screen the app ends up on. */
  function back(): Screen {
    let next = screen;
    navBack(nav, up, () => {
      next = parentOf(screen);
      go(next);
    });
    return next;
  }

  function allExams() {
    if (nav.guards.confirmLeave()) go({ name: 'home' });
  }

  // Browser Back does exactly what the nav bar's Back does (see history.ts).
  const backRef = useRef(back);
  backRef.current = back;
  const screenRef = useRef(screen);
  screenRef.current = screen;
  const historyRef = useRef<ReturnType<typeof armHistory> | null>(null);
  useEffect(() => {
    const h = armHistory(
      () => {
        if (backRef.current().name !== 'home') h.arm();
      },
      () => screenRef.current.name === 'home',
    );
    historyRef.current = h;
    return () => h.dispose();
  }, []);
  useEffect(() => {
    if (screen.name === 'home') historyRef.current?.disarm();
    else historyRef.current?.arm();
  }, [screen]);

  function body(repo: Repo, persistent: boolean) {
    const key = `${screen.name}-${visit}`;
    const drill = (exam: string) => (ids: string[]) => go({ name: 'practice', exam, preset: ids });
    switch (screen.name) {
      case 'home':
        return <Home repo={repo} persistent={persistent} onNavigate={go} />;
      case 'exam':
        return <ExamPage key={key} repo={repo} examCode={screen.exam} onNavigate={go} />;
      case 'settings':
        return <SettingsScreen key={key} repo={repo} />;
      case 'about':
        return <About key={key} />;
      case 'mock':
        return <MockExamFlow key={key} repo={repo} examCode={screen.exam} seed={seedFromUrl()} onDrill={drill(screen.exam)} />;
      case 'practice':
        return (
          <PracticeFlow
            key={key}
            repo={repo}
            examCode={screen.exam}
            seed={seedFromUrl()}
            presetObjectiveIds={screen.preset}
            onDrill={drill(screen.exam)}
          />
        );
      case 'cram':
        return <CramFlow key={key} repo={repo} examCode={screen.exam} seed={seedFromUrl()} />;
      case 'progress':
        return <ProgressScreen key={key} repo={repo} examCode={screen.exam} onDrill={drill(screen.exam)} />;
      case 'acronyms':
        return <AcronymFlow key={key} repo={repo} examCode={screen.exam} seed={seedFromUrl()} />;
      case 'learn':
        return <LearnFlow key={key} repo={repo} examCode={screen.exam} lessonId={screen.lesson} />;
      case 'questions':
        return <MyQuestions key={key} repo={repo} examCode={screen.exam} onEdit={(id) => go({ name: 'edit', exam: screen.exam, id })} />;
      case 'edit':
        return <QuestionEditor key={key} repo={repo} examCode={screen.exam} id={screen.id} onDone={() => go({ name: 'questions', exam: screen.exam })} />;
      case 'review':
        return ReviewScreen ? (
          <Suspense fallback={<p>Loading…</p>}>
            <ReviewScreen key={key} examCode={screen.exam} />
          </Suspense>
        ) : null;
    }
  }

  const onHome = screen.name === 'home';
  const bar = (label: string) => <NavBar label={label} backLabel={up?.label ?? backLabel(screen)} onBack={() => void back()} onHome={allExams} />;
  return (
    <>
      <main>
        <header className="app-header">
          <h1>{APP_NAME}</h1>
          {screen.name !== 'settings' && (
            <button
              type="button"
              aria-haspopup={onHome ? undefined : 'dialog'}
              onClick={(e) => (onHome ? go({ name: 'settings' }) : panels.open('settings', e.currentTarget))}
            >
              Settings
            </button>
          )}
        </header>
        <PanelProvider api={panels}>
          {!onHome && bar('Page navigation')}
          <NavProvider api={nav}>{!storage ? <p>Loading…</p> : body(storage.repo, storage.persistent)}</NavProvider>
          {!onHome && tall && <div ref={bottomRef} className="bottom-nav">{bar('Page navigation (bottom)')}</div>}
          {storage && panels.current === 'settings' && <SettingsPanel repo={storage.repo} />}
        </PanelProvider>
      </main>
      <Disclaimer />
    </>
  );
}
