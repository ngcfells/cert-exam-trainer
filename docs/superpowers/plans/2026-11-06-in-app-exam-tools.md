# In-App Exam Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Settings opens as a panel from any screen. A calculator and a whiteboard are available in mock, practice
and cram. In a mock exam, leaving the app (another tab or app, a refresh, or the app's own Back and All exams
buttons) ends the exam and scores it.

**Architecture:** One `<dialog>`-based `Panel`, with an app-level `PanelProvider` that keeps one panel open at a
time and holds the mock deadline for the Settings panel's clock. Per-run tool state (whiteboard, calculator memory)
lives in a `RunToolsProvider` mounted by each runner. The calculator is a pure reducer. Leaving is detected by a
hook (`visibilitychange` plus window `blur` with a `document.hasFocus()` check). The mock in progress is saved to
a setting as the learner goes, and on the next app open it is scored with `endedBy: 'left'`.

**Tech Stack:** React 18 + TypeScript, Vite, Zod, Vitest + Testing Library, Playwright (e2e, axe, bounds).

**Spec:** `docs/superpowers/specs/2026-11-06-in-app-exam-tools-design.md`

## Global Constraints

- The timer never pauses. No panel, dialog or leave path stops or hides the countdown. No backdoor.
- Mock exams only for leaving. Practice, cram, lessons and acronym runs never end on blur or hide.
- No calculator or whiteboard in lessons or the acronym tools.
- Backup import stays on the full Settings page. The Settings panel has every other setting.
- Copy, exactly:
  - Warning: "Leaving the app ends this exam and scores it as it stands. That includes switching tabs or apps, locking your phone, and notifications or alarms that take over the screen. Silence notifications before you start."
  - Checkbox label: "I understand"
  - Results line: "Ended because you left the exam."
  - Mock guard prompt: "Leave and score the exam now?"
  - Calculator errors: "Can't divide by zero", "Not a number"
- Accessibility: keyboard and screen reader, focus trapped in an open panel and returned to its opener on close,
  axe clean (no serious or critical), light and dark. Text stays in bounds at 360 px and 1280 px.
- No new dependencies. No GitHub Actions, no LFS.

## Review Focus

1. **The app's own confirm prompt blurring the window.** Pressing Back during a mock and choosing Cancel must
   leave the exam running. A `window.confirm` that fires `blur` would end it. Test: Task 5 e2e "cancel on the
   leave prompt keeps the exam".
2. **Double scoring on refresh.** If the result was saved but the in-progress record was not yet cleared, the next
   open must not save a second result. Test: Task 6 `recoverMock` "skips an attempt already in history".
3. **A panel open when time runs out.** Auto-submit must close the calculator, whiteboard or Settings panel, and
   the results screen must not sit under an open dialog. Test: Task 4 runner test "auto-submit closes an open
   panel".
4. **Typing in the whiteboard or calculator while focus is inside the page.** Moving focus between page parts
   (panel, question, select list) must never count as leaving. Test: Task 5 unit test "blur while the document
   still has focus does not leave".
5. **An in-progress record left in a backup.** An exported backup must not carry the in-progress mock, and an
   import must not restore one (that would score a stale exam). Test: Task 6 backup test.

---

### Task 1: Calculator engine

**Files:**
- Create: `src/ui/tools/calc.ts`
- Test: `src/ui/tools/calc.test.ts`

**Interfaces:**
- Produces:
  - `type CalcKey = '0'…'9' | '.' | '+' | '-' | '*' | '/' | '^' | '=' | '%' | '±' | '√' | 'M+' | 'M-' | 'MR' | 'MC' | 'C'`
  - `interface CalcState { display: string; acc: number | null; op: '+' | '-' | '*' | '/' | '^' | null; fresh: boolean; memory: number; error: string | null }`
  - `const CALC_START: CalcState`
  - `press(s: CalcState, k: CalcKey): CalcState` (pure)
  - `keyFromKeyboard(e: { key: string }): CalcKey | null` (`Enter`→`=`, `Escape`→`C`, digits, `.`, `+ - * / ^ %`)

- [ ] **Step 1: Write the failing tests** in `calc.test.ts` with a helper `run(keys: CalcKey[]): CalcState` folding `press` from `CALC_START`:
  - immediate execution: `2 + 3 * 4 =` → display `'20'`
  - `5 0 %` → `'0.5'`; `9 ±` → `'-9'`; `1 6 √` → `'4'`
  - `2 ^ 0 . 5 =` → `'1.41421356237'` (12 significant digits, no grouping, `.` decimal)
  - `1 0 0 0 0 0 0 *  1 0 0 0 0 0 0 =` → `'1000000000000'`
  - `1 / 0 =` → `error: "Can't divide by zero"`; `9 ± √` → `error: 'Not a number'`; `8 ± ^ 0 . 5 =` → `'Not a number'`
  - after an error, `7` gives display `'7'`, `error: null`; after an error, `+` gives display `'0'`, `error: null`
  - memory: `5 M+ 3 M+ MR` → `'8'`; `M-` subtracts; `MC` → memory `0`; `C` clears display and op but keeps memory
  - `0.1 + 0.2 =` → `'0.3'`
  - `keyFromKeyboard({ key: 'Enter' })` → `'='`; `{ key: 'x' }` → `null`
- [ ] **Step 2: Run** `npx vitest run src/ui/tools/calc.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement `press`.** Format results with `Number(v.toPrecision(12))` then `String()`, falling back
  to `toPrecision(12)` for exponents. A non-finite or NaN result sets `error: 'Not a number'`; dividing by zero sets
  `"Can't divide by zero"`. With `error` set, the next key starts from `{ ...CALC_START, memory }` and then applies
  only if it is a digit or `.`.
- [ ] **Step 4: Run** the test again. Expected: PASS.
- [ ] **Step 5: Commit** `feat(tools): calculator engine`.

### Task 2: Panel, PanelProvider and the Settings panel from anywhere

**Files:**
- Create: `src/ui/panels/Panel.tsx`, `src/ui/panels/PanelProvider.tsx`, `src/ui/panels/panels.css`
- Create: `src/ui/SettingsForm.tsx` (extracted from `SettingsScreen.tsx`)
- Modify: `src/ui/SettingsScreen.tsx` (render `SettingsForm` with backup), `src/App.tsx:147-166` (header button, provider, panel)
- Test: `src/ui/panels/Panel.test.tsx`, `src/App.test.tsx`

**Interfaces:**
- Produces:
  - `type PanelKind = 'settings' | 'calculator' | 'whiteboard'`
  - `usePanels(): { current: PanelKind | null; open(k: PanelKind, opener: HTMLElement | null): void; close(): void; mockDeadline: number | null; setMockDeadline(ms: number | null): void }`
  - `<PanelProvider>` (App level). Opening a panel replaces any open one. Closing returns focus to the opener of
    the panel that was closed.
  - `<Panel kind title onClose>{children}</Panel>`: a `<dialog>` opened with `showModal()`, heading `title` as its
    accessible name, a Close button, Escape closes.
  - `<SettingsForm repo backup: boolean />`

- [ ] **Step 1: Write the failing tests.**
  - `Panel.test.tsx`: opening shows a dialog named by its title; Escape and Close call `onClose`; opening
    `calculator` while `settings` is open leaves only the calculator dialog; after close, focus is on the opener.
  - `App.test.tsx`: on an exam page, the header has a Settings button; pressing it shows a dialog named
    "Settings" with the theme control and no "Import" control; closing it leaves the exam page and its state as
    they were (for example, a practice setup field keeps its typed value). On Home the Settings button still opens
    the full Settings page (with Import). On the Settings page itself the header has no Settings button.
  - Theme change in the panel applies at once (`document.documentElement` theme attribute changes while open).
- [ ] **Step 2: Run** `npx vitest run src/ui/panels src/App.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement.** Extract the body of `SettingsScreen` into `SettingsForm`, leaving out
  `BackupControls` when `backup` is false. In `App.tsx`, wrap `main` in `PanelProvider`, show the header button on
  every screen except `settings` (Home navigates as today; elsewhere `open('settings', button)`), and render
  `<SettingsPanel repo />` when `current === 'settings'`. When `mockDeadline` is set, the Settings panel shows
  "Time left: m:ss" at its top (via `useCountdown(mockDeadline, Date.now, () => {})` and `formatTime`). During a
  mock (`mockDeadline !== null`) it also shows the line "Answer marks and tips apply in practice, cram and results."
  Closing panels on every `go()` keeps a panel from outliving its screen.
- [ ] **Step 4: Run** the tests again plus `npx vitest run`. Expected: PASS, no other failures.
- [ ] **Step 5: Commit** `feat(settings): settings panel from any screen`.

### Task 3: Calculator and whiteboard panels, run tool state

**Files:**
- Create: `src/ui/tools/RunTools.tsx` (provider, tool buttons and the two panels), `src/ui/tools/Calculator.tsx`, `src/ui/tools/Whiteboard.tsx`, `src/ui/tools/tools.css`
- Test: `src/ui/tools/Calculator.test.tsx`, `src/ui/tools/Whiteboard.test.tsx`

**Interfaces:**
- Consumes: `press`, `CALC_START`, `keyFromKeyboard` (Task 1); `usePanels`, `Panel` (Task 2).
- Produces:
  - `<RunToolsProvider>`: holds `{ calc: CalcState; text: string; strokes: { x: number; y: number }[][] }` for
    one run. Unmounting it drops the state (cleared when the run ends).
  - `<ToolButtons />`: "Calculator" and "Whiteboard" buttons, side by side, Calculator first.
  - `<ToolPanels />`: renders the calculator or whiteboard panel when `usePanels().current` matches.

- [ ] **Step 1: Write the failing tests.**
  - Calculator: buttons named by key, with screen-reader names for symbols ("plus", "minus", "times", "divide",
    "power", "percent", "plus or minus", "square root", "memory add", "memory subtract", "memory recall",
    "memory clear", "clear", "equals"); the display is an `output` with `aria-live="polite"`; typing `2+3*4` then
    Enter in the panel shows `20`; memory survives closing and reopening the panel inside one provider.
  - Whiteboard: a labelled textarea ("Notes") whose text survives close and reopen; a canvas labelled "Drawing
    area" with `touch-action: none`; pointer down, move and up adds a stroke; "Clear drawing" empties it; a fresh
    provider starts empty.
- [ ] **Step 2: Run** `npx vitest run src/ui/tools`. Expected: FAIL.
- [ ] **Step 3: Implement.** The canvas uses pointer events (mouse, trackpad, touch, pen) with
  `setPointerCapture`, stores points as fractions of its size and redraws on mount and resize. Use theme tokens for
  stroke and background colours so light and dark both work.
- [ ] **Step 4: Run** the tests again. Expected: PASS.
- [ ] **Step 5: Commit** `feat(tools): calculator and whiteboard panels`.

### Task 4: Tools in the mock, practice and cram runners

**Files:**
- Modify: `src/ui/exam/TopBar.tsx` (a `tools?: ReactNode` slot), `src/ui/exam/ExamRunner.tsx`, `src/ui/kit.tsx:102-168` (`RunnerFrame` gets `tools?: ReactNode` in its header), `src/ui/study/StudyRunner.tsx` (prop `tools?: boolean`), `src/ui/study/PracticeFlow.tsx`, `src/ui/study/CramFlow.tsx`
- Test: `src/ui/exam/ExamRunner.test.tsx`, `src/ui/study/StudyRunner.test.tsx`

**Interfaces:**
- Consumes: `RunToolsProvider`, `ToolButtons`, `ToolPanels` (Task 3); `usePanels` (Task 2).
- Produces: `ExamRunner` calls `setMockDeadline(deadline)` on mount and `setMockDeadline(null)` on unmount or submit.

- [ ] **Step 1: Write the failing tests.**
  - ExamRunner: the top bar shows Calculator and Whiteboard buttons; opening the calculator keeps the timer
    visible and counting (advance the fake `now`, timer text changes); **auto-submit closes an open panel**
    (open the whiteboard, pass the deadline, no dialog remains and `onSubmit` got `autoSubmitted: true`); opening
    the submit dialog closes an open panel.
  - StudyRunner: with `tools` the header shows both buttons; without it (lesson checks) neither shows; finishing
    closes an open panel.
  - PracticeFlow and CramFlow pass `tools`; the lesson flow does not.
- [ ] **Step 2: Run** `npx vitest run src/ui/exam src/ui/study`. Expected: FAIL.
- [ ] **Step 3: Implement.** Wrap each runner's output in `RunToolsProvider`. Call `close()` from `usePanels` in
  `submit` / `finish` and before `showModal()` of the submit or finish dialog.
- [ ] **Step 4: Run** `npx vitest run`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(tools): calculator and whiteboard in mock, practice and cram`.

### Task 5: Leaving ends the mock

**Files:**
- Create: `src/ui/exam/useLeaveDetect.ts`
- Modify: `src/ui/nav.tsx` (`Guard` gets `onLeave?: () => void`; `useLeaveGuard(active, message, onLeave?)`), `src/exam/result.ts` (`endedBy`), `src/ui/exam/saveAttempt.ts` (pass `endedBy` through), `src/ui/exam/ExamRunner.tsx`, `src/ui/exam/ExamSetup.tsx`, `src/ui/exam/ResultsScreen.tsx`
- Test: `src/ui/exam/useLeaveDetect.test.ts`, `src/ui/nav.test.tsx`, `src/exam/result.test.ts`, `src/ui/exam/ExamRunner.test.tsx`, `src/ui/exam/MockExamFlow.test.tsx`, `src/ui/exam/ResultsScreen.test.tsx`, `tests/e2e/exam.spec.ts`, `tests/e2e/nav.spec.ts`

**Interfaces:**
- Produces:
  - `export const LEAVE_MOCK = 'Leave and score the exam now?'` in `nav.tsx`
  - `useLeaveDetect(active: boolean, onLeave: () => void): void`: fires once on `visibilitychange` to hidden, or
    on window `blur` when `document.hasFocus()` is false on the next task (`setTimeout(…, 0)`).
  - `examResultSchema` gains `endedBy: z.enum(['left']).optional()`; `buildResult` takes `endedBy?: 'left'` and
    writes it only when set.
  - `SubmitPayload` gains `endedBy?: 'left'`.
  - `LeaveGuards.confirmLeave()`: for a guard with `onLeave`, on OK it calls `onLeave()`; either way it returns
    `false`, so the app stays on the screen and the results show there.

- [ ] **Step 1: Write the failing tests.**
  - `useLeaveDetect`: hidden fires once; **blur while the document still has focus does not leave**; blur with
    `hasFocus` stubbed false fires; inactive fires nothing; listeners are removed on unmount.
  - `nav.test.tsx`: a guard with `onLeave` calls it on OK and returns false; on Cancel returns false and does not
    call it; guards without `onLeave` behave as today.
  - `result.test.ts`: `buildResult({ …, endedBy: 'left' })` round-trips through `examResultSchema`; a result
    without `endedBy` still parses.
  - ExamSetup: shows the warning text exactly; "Start exam" is disabled until "I understand" is ticked; a new
    setup starts unticked.
  - ExamRunner: hiding the page submits with `endedBy: 'left'` and `autoSubmitted: false`; a second hide does
    nothing; Back's guard prompt is `LEAVE_MOCK`.
  - ResultsScreen: `endedBy: 'left'` shows "Ended because you left the exam." and not the time-ran-out line.
  - MockExamFlow: update the existing tests that expect "Leave this exam? Your answers will be lost." during a
    mock to the new behaviour (OK shows results, Cancel stays).
  - e2e `exam.spec.ts`: tick and start; dispatch hidden (`Object.defineProperty(document, 'visibilityState', …)`
    plus a `visibilitychange` event) and see the results line; **cancel on the leave prompt keeps the exam**
    (dismiss the dialog, the question is still shown and answerable a second later); OK shows results; opening and
    using the calculator, whiteboard and Settings panel does not end the exam; axe clean on the setup, each panel
    and the results screen in light and dark.
  - e2e `nav.spec.ts`: update any mock-exam leave expectations.
- [ ] **Step 2: Run** `npx vitest run src/ui/exam src/ui/nav.test.tsx src/exam`. Expected: FAIL.
- [ ] **Step 3: Implement.** ExamRunner: `submit(reason: 'submit' | 'timeout' | 'left')`,
  `useLeaveDetect(!isSubmitted, () => submit('left'))`, `useLeaveGuard(!isSubmitted, LEAVE_MOCK, () => submit('left'))`.
  ExamSetup: the warning paragraph and the checkbox above Start.
- [ ] **Step 4: Run** `npx vitest run`, then `npm run build:e2e && npx playwright test tests/e2e/exam.spec.ts tests/e2e/nav.spec.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(exam): leaving ends and scores the mock`.

### Task 6: Refresh or close counts as leaving

**Files:**
- Create: `src/exam/inProgress.ts`, `src/ui/exam/recover.ts`
- Modify: `src/ui/exam/MockExamFlow.tsx` (save as you go; `recovered?: Finished` prop), `src/ui/exam/ExamRunner.tsx` (`onProgress`), `src/App.tsx` (recover on open), `src/storage/backup.ts` (drop the key on export and import)
- Test: `src/exam/inProgress.test.ts`, `src/ui/exam/recover.test.ts`, `src/storage/backup.test.ts`, `src/App.test.tsx`, `tests/e2e/exam.spec.ts`

**Interfaces:**
- Consumes: `finishAttempt` with `endedBy` (Task 5), `metaFor` (`src/ui/kit.tsx`).
- Produces:
  - `export const IN_PROGRESS_SETTING = 'mockInProgress'`
  - `interface MockInProgress { exam: AssembledExam; startedAt: string; savedAt: string; responses: Responses; flagged: string[] }`
  - `saveInProgress(repo, p: MockInProgress): Promise<void>`, `loadInProgress(repo): Promise<MockInProgress | null>` (null on missing or invalid), `clearInProgress(repo): Promise<void>` (sets the setting to `null`)
  - `ExamRunner` prop `onProgress?: (p: { responses: Responses; flagged: string[] }) => void`, called after each change
  - `recoverMock(repo, now = () => new Date()): Promise<{ examCode: string; finished: Finished } | null>`

- [ ] **Step 1: Write the failing tests.**
  - `inProgress`: save then load round-trips; garbage loads as null; clear then load is null.
  - `recoverMock`: with a record, it saves one result with `endedBy: 'left'`, `finishedAt` = `savedAt`, the saved
    responses, and clears the record; **skips an attempt already in history** (a result with the same exam, seed
    and startedAt exists: no new result, record cleared, returns null); no record returns null.
  - backup: `exportBackup` leaves out `mockInProgress`; importing a file that has it does not write it.
  - App: with a saved record, the app opens on the mock results screen showing "Ended because you left the exam."
  - e2e: start a mock, answer question 1, `page.reload()`, see the results with the line and question 1 counted
    as answered.
- [ ] **Step 2: Run** `npx vitest run src/exam src/ui/exam src/storage src/App.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement.** MockExamFlow saves on Start and on each `onProgress` (errors ignored), and clears
  after `finishAttempt` resolves. App calls `recoverMock` after the settings load and before `setStorage`; on a
  result it sets the screen to `{ name: 'mock', exam: examCode }` and passes `recovered` to `MockExamFlow`, which
  starts on `ResultsScreen`. The next navigation drops `recovered`.
- [ ] **Step 4: Run** `npx vitest run`, then `npm run build:e2e && npx playwright test tests/e2e/exam.spec.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(exam): a refresh ends and scores the mock`.

### Task 7: Bounds, full check, docs

**Files:**
- Modify: `tests/e2e/bounds.spec.ts` (mock setup with the warning, the Settings panel, calculator and whiteboard
  panels, the "left" results line), `HANDOFF.md`
- Ledger: list of Data+ items the calculator keys can't solve, in `.superpowers/sdd/` (spec "Left to the builder")

- [ ] **Step 1:** Add the screens to the bounds test at 360 and 1280.
- [ ] **Step 2: Run** `npm run check` and `npm run check-bounds`. Expected: all pass.
- [ ] **Step 3:** Skim the Data+ bank for items needing keys beyond the set (logs, factorials, statistics
  functions) and note them in the ledger for the owner.
- [ ] **Step 4:** Update `HANDOFF.md`. **Commit** `test(bounds): exam tools screens; docs: handoff`.
