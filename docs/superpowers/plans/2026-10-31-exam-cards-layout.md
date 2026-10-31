# Exam cards and layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the one-list Home with a landing page of exam cards, a page per exam, one Back / All exams bar on every other screen (browser Back included), a Settings screen, and Stock/Custom wording with a per-exam source choice.

**Architecture:** `App` keeps one `Screen` and gains `settings` and `exam` screens. A pure `parentOf(screen)` says where Back goes; a small nav context lets a tool override Back for its inner levels (lesson → list) and raise a leave guard during a run. Browser Back is wired through one "trap" history entry, so it always does exactly what the on-screen Back does.

**Tech Stack:** React 18, TypeScript, Vite 5, Vitest + Testing Library, Playwright + axe.

**Spec:** `docs/superpowers/specs/2026-10-31-exam-cards-and-acronym-table-design.md`, sections Landing page, Settings, Exam page, Navigation on every other screen, Stock and Custom, and calls 1, 6 and 8.

## Owner scope (2026-10-31)

- In: landing page cards for the **registered** exams (Data+, SecAI+), Settings, exam page, nav bar, Stock/Custom with per-exam source.
- Out (later): the eight new exams, `provisional` metadata and "Details not final", course assessments, the master acronym table.
- Browser and phone Back step back inside the app (owner answer to the spec's open question).

## Global Constraints

- Copy: "← Back", "⌂ All exams", "← Back to Data+" (exam short name = `meta.name` without the leading "CompTIA "), "Leave this exam? Your answers will be lost.", "Questions to use", "Stock + Custom", "Stock only", "Custom only", "Stock: 657 questions · Custom: 19 questions" (use `questions()` from `plural.ts`).
- Stored values stay `ours` / `mine` / `both`; backup and pack formats unchanged.
- Setting key `sourceFilter:<exam code>`; when absent, fall back to the global `sourceFilter`; the global key is never written again or deleted.
- Theme tokens only (`theme.test.ts` forbids hex/rgb in `src/ui`). axe: no serious or critical violations.
- Nav bars are `nav` landmarks labelled "Page navigation" and "Page navigation (bottom)"; the bottom one renders only while the page is taller than the window (checked on resize and content resize).
- Leave guard asks only after the first answer of a run (mock, practice, cram, lesson check, acronym quiz, flashcards once one is rated). Results screens never ask. The question editor guards with its own wording when dirty: "Discard your changes?".
- Focus moves to the new screen's heading after navigation (as today).

## Review Focus

1. **Browser Back during a run.** Pressing the browser Back button mid-mock must ask, and Cancel must leave the user on the same question with answers intact. Pinned in Task 2 (`history` unit test) and Task 5 (e2e).
2. **Browser Back on the landing page** must leave the app normally (no trap that swallows Back forever). Pinned in Task 2.
3. **Old global source setting.** A user who chose "Ours" before this build must still see Stock only on both exams. Pinned in Task 1.
4. **Inner Back in Learn.** From a lesson, Back goes to the lesson list, not the exam page; from the list, to the exam page. Pinned in Task 4.
5. **No dead ends.** The load-error screen, an empty acronym list and "Lesson not found" all still have a way out (the nav bar). Pinned in Task 4 (each test asserts the nav bar).

---

### Task 1: Per-exam source choice and Stock / Custom wording

**Files:**
- Modify: `src/banks/pool.ts` (+ `pool.test.ts`), `src/acronyms/userList.ts` (+ test), `src/ui/SourceToggle.tsx`, `src/ui/acronyms/AcronymSetup.tsx` (`SOURCE_LABELS.mine` → `'Custom'`), any test that sets `SOURCE_SETTING`

**Interfaces:**
- Produces: `sourceSettingKey(exam: string): string` (`sourceFilter:<exam>`); `getSourceFilter(repo: Repo, exam: string): Promise<SourceFilter>` (per-exam value, else global, else `'both'`); `setSourceFilter(repo, exam, v): Promise<void>`. `loadPool` and `loadAcronyms` pass their exam. `SourceToggle({ repo, examCode })`.

- [ ] **Step 1: Failing tests** in `pool.test.ts`: global `'ours'` with no per-exam key → `getSourceFilter(repo, 'DA0-002') === 'ours'`; after `setSourceFilter(repo, 'DA0-002', 'mine')`, DA0-002 is `'mine'` and CY0-001 still `'ours'`; the global setting is still `'ours'`; nonsense per-exam value falls back to global. `SourceToggle` test: legend "Questions to use", radios "Stock + Custom", "Stock only", "Custom only" (in that order), choosing one writes `sourceFilter:DA0-002`.
- [ ] **Step 2:** Run `npx vitest run src/banks/pool.test.ts src/ui`; expect FAIL.
- [ ] **Step 3:** Implement. The hint line reads "Applies to mock exams, practice, cram, progress and acronyms for this exam."
- [ ] **Step 4:** `npm run test`; expect PASS.
- [ ] **Step 5:** Commit `feat: per-exam question source; Stock and Custom wording`.

### Task 2: Navigation core and browser history

**Files:**
- Modify: `src/ui/screens.ts`, `src/App.tsx`
- Create: `src/ui/nav.tsx` (+ `nav.test.tsx`), `src/ui/history.ts` (+ `history.test.ts`), styles in `src/index.css`

**Interfaces:**
- Produces in `screens.ts`: `Screen` gains `{ name: 'settings' }` and `{ name: 'exam'; exam: string }`. `parentOf(s: Screen): Screen | null`: home → null; about, settings, exam → home; edit → questions (same exam); every other tool → `{ name: 'exam', exam }`. `backLabel(s: Screen): string`: "← Back to <short name>" when the parent is an exam page, else "← Back".
- Produces in `nav.tsx`: `NavProvider` (props: `screen`, `onGo(s: Screen)`), `useNav(): { back(): void; home(): void }`, `useNavUp(up: { label: string; onUp: () => void } | null)` (a tool's inner level; latest mounted wins; cleared on unmount), `useLeaveGuard(active: boolean, message?: string)`, `NavBar()` (renders both bars; nothing on the home screen). Back and All exams run the guard first (`window.confirm(message)`); declining does nothing.
- Produces in `history.ts`: `armHistory(onBack: () => void): { arm(): void; disarm(): void; dispose(): void }`. `arm()` pushes one trap entry if none is armed; a `popstate` while armed marks it consumed and calls `onBack`; `disarm()` (used when the app itself reaches home) calls `history.back()` and ignores the `popstate` that follows. App arms whenever the screen is not home and disarms on reaching home, so Back on the landing page leaves the app.

- [ ] **Step 1: Failing tests.**
  - `screens.test.ts`: `parentOf({name:'mock',exam:'DA0-002'})` is the DA0-002 exam page; `parentOf({name:'edit',exam:'DA0-002'})` is `questions`; `parentOf({name:'home'})` is null; `backLabel({name:'practice',exam:'DA0-002'}) === '← Back to Data+'`; `backLabel({name:'settings'}) === '← Back'`.
  - `history.test.ts` (jsdom, spy on `history.pushState`/`back`): `arm()` twice pushes once; a dispatched `popstate` calls `onBack` once and the next `arm()` pushes again; after `disarm()` the following `popstate` does not call `onBack`.
  - `nav.test.tsx`: with screen = mock, the top bar shows "← Back to Data+" and "⌂ All exams" in that order inside `nav[aria-label="Page navigation"]`; clicking Back calls `onGo` with the exam page; with `useLeaveGuard(true)` and `confirm` returning false, `onGo` is not called; with `useNavUp({label:'← Back to lessons', onUp})` mounted, the label changes and Back calls `onUp`; no bar on home.
- [ ] **Step 2:** Run them; expect FAIL.
- [ ] **Step 3:** Implement. App wraps the screen body in `NavProvider`, renders `<NavBar />` (top before the body, bottom after it), and replaces the per-screen `onExit={home}` callbacks with `() => go(parentOf(screen) ?? home)` so results and setup flows still have a target. Bottom bar: `ResizeObserver` on `document.body` plus `resize`; shown when `document.documentElement.scrollHeight > window.innerHeight`. Bar style: flex row, `gap: 0.5rem`, buttons at the 2.75rem touch height used elsewhere.
- [ ] **Step 4:** `npm run test`; expect PASS.
- [ ] **Step 5:** Commit `feat: shared Back / All exams bar with browser history`.

### Task 3: Landing page, exam page, Settings

**Files:**
- Modify: `src/ui/Home.tsx` (+ `Home.test.tsx`), `src/ui/Disclaimer.tsx`, `src/App.tsx`, `src/index.css`
- Create: `src/ui/ExamPage.tsx` (+ test), `src/ui/SettingsScreen.tsx` (+ test)

**Interfaces:**
- Consumes: `SourceToggle({repo, examCode})` (Task 1), `Screen` and `NavBar` (Task 2).
- Produces: `Home({ repo, persistent, onNavigate })`: storage banner; a header row with the Settings button at the right; `<ul class="exam-cards">` of one `<button class="exam-card">` per `listExams()` exam whose text is name, "(code)" and "N Stock questions"; an "About" link-button bottom right. `ExamPage({ repo, examCode, onNavigate })`: `h2` "CompTIA Data+ (DA0-002)" focused on mount, counts line, `SourceToggle`, then buttons "Mock exam", "Practice", "Cram", "Learn" (only with lessons), "Acronyms", "Progress", "My questions", "Review bank" (dev only). `SettingsScreen({ repo })`: `h2` "Settings", `DisplaySettings`, `BackupControls`. `Disclaimer()` takes no props.

- [ ] **Step 1: Failing tests.** `Home.test.tsx` (fixture): two card buttons named /CompTIA Data\+ \(DA0-002\)/ and /CompTIA SecAI\+ \(CY0-001\)/ in that order; a "Settings" button; an "About" button; no "Questions to use" group on Home. `ExamPage.test.tsx`: heading text, "Stock: 11 questions · Custom: 0 questions" appears before the "Questions to use" group, Learn present for DA0-002 and absent for CY0-001, clicking "Mock exam" navigates to `{name:'mock', exam:'DA0-002'}`. `SettingsScreen.test.tsx`: theme radios, reduce motion, export/import present, no "Questions to use".
- [ ] **Step 2:** Run; expect FAIL.
- [ ] **Step 3:** Implement. Cards: CSS grid `repeat(auto-fill, minmax(14rem, 1fr))`, card uses `--surface`/`--border` tokens and the focus ring already used for buttons; the whole card is the button.
- [ ] **Step 4:** `npm run test`; expect PASS.
- [ ] **Step 5:** Commit `feat: exam cards landing page, exam page and Settings`.

### Task 4: One way back in every tool; leave guards

**Files:**
- Modify: `src/ui/About.tsx`, `src/ui/study/LoadError.tsx`, `src/ui/study/ProgressScreen.tsx`, `src/ui/study/CramFlow.tsx`, `src/ui/study/PracticeSetup.tsx`, `src/ui/exam/ExamSetup.tsx`, `src/ui/exam/ResultsScreen.tsx`, `src/ui/exam/ExamRunner.tsx`, `src/ui/study/StudyRunner.tsx`, `src/ui/learn/LearnFlow.tsx`, `src/ui/learn/LessonList.tsx`, `src/ui/learn/LessonView.tsx`, `src/ui/acronyms/AcronymFlow.tsx`, `AcronymSetup.tsx`, `AcronymResults.tsx`, `QuizRunner.tsx`, `FlashcardRunner.tsx`, `src/ui/author/MyQuestions.tsx`, `src/ui/author/QuestionEditor.tsx`, `src/ui/review/ReviewScreen.tsx`, and their tests

**Interfaces:**
- Consumes: `useNavUp`, `useLeaveGuard` (Task 2).

- [ ] **Step 1: Failing tests** (render inside a test `NavProvider` helper exported from `nav.tsx` as `TestNav`):
  - No button named /back to home|back to lessons|back to lesson$|^back$|^cancel$/i remains on: About, LoadError, ProgressScreen, cram (empty and ready), practice setup, mock setup, results, lesson list, lesson view, "Lesson not found", acronym setup and results, My questions, review screen. Each still shows the nav bar.
  - Learn: on a lesson the bar reads "← Back to lessons" and goes to the list; on a lesson-check result it reads "← Back to lesson"; on the list it reads "← Back to Data+".
  - Guard: ExamRunner with no answer → Back does not call `confirm`; after one answer → `confirm` is called with "Leave this exam? Your answers will be lost."; same for StudyRunner, QuizRunner (after one graded card) and FlashcardRunner (after one rating); ResultsScreen never asks.
  - QuestionEditor: after editing the stem, Back asks "Discard your changes?".
- [ ] **Step 2:** Run; expect FAIL.
- [ ] **Step 3:** Implement: delete the in-screen back/cancel buttons and the props that only fed them (`onCancel`, `backLabel`, `onBack`, `onHome` where unused); `LearnFlow` and `AcronymFlow` call `useNavUp` for their inner levels; runners call `useLeaveGuard(answeredCount > 0)`.
- [ ] **Step 4:** `npm run test`; expect PASS.
- [ ] **Step 5:** Commit `feat: one way back in every tool; ask before leaving a run`.

### Task 5: E2e on the new paths

**Files:**
- Modify: `tests/e2e/util.ts` (add `openExam(page, code)`: click the card, wait for the exam heading), every spec that clicks a Home tool button (`acronyms`, `author`, `bank`, `exam`, `home`, `learn`, `pwa`, `responsive`, `study`, `tests/e2e-dev/review.spec.ts`)
- Create: `tests/e2e/nav.spec.ts`

- [ ] **Step 1:** Port every spec to card → exam page → tool, naming its exam. The "mine count" import test moves to Settings → Import, then checks the exam page's "Custom: 1 question".
- [ ] **Step 2:** `nav.spec.ts`: (a) landing and DA0-002 exam page pass axe in light and dark at 360×780 and 1280×800; (b) keyboard only: Tab to the Data+ card, Enter, Tab to Practice, Enter, then activate "← Back to Data+" and "⌂ All exams", ending on the landing heading; (c) browser `page.goBack()` from Practice setup lands on the exam page, and again lands on the landing page; (d) mid-mock with one answer, `goBack()` raises the confirm; dismissing keeps "Question 1 of"; accepting returns to the exam page; (e) bottom bar absent on Settings at 1280×800 and present on a lesson at 360×780.
- [ ] **Step 3:** `npm run check`; expect PASS. Record unit and e2e counts.
- [ ] **Step 4:** Commit `test(e2e): card, exam page and navigation paths`.

### Task 6: Close-out

- [ ] **Step 1:** Record the owner's Back answer and the scope cut in the spec's "Open for the owner" section; update `HANDOFF.md` (UI redesign part 1 done; still to do: eight exams, provisional metadata, master acronym table).
- [ ] **Step 2:** One final whole-branch review on the most capable model; fix every finding, minors included; `npm run check` passes.
- [ ] **Step 3:** Merge `ui-exam-cards` into `main`, push, run `npm run deploy`, and check the live site shows the cards.
