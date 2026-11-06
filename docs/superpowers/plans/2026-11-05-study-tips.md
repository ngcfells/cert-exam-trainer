# Study Tips Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a closable, cyclable tip box above the question in practice and cram every 10 to 20 new questions, from about 100 general tips plus 5 to 10 per exam, with an on/off switch and a reset in Settings (issue #3).

**Architecture:** Tip data and pure picking logic live in `src/tips/` (no React). An app-wide store in `src/ui/tips/prefs.ts`, built like `src/ui/marks/prefs.ts`, holds the on/off flag and progress (counter, gap, seen ids) and writes them through to the repo, so the runner needs no repo prop. `StudyRunner` gets an optional `tipsFor` prop (the exam's metadata); practice and cram pass it and Learn does not. A `TipBox` component renders in the runner above the question; `TipSettings` sits in Settings.

**Tech Stack:** React 18 + TypeScript, Vitest + Testing Library, Playwright + axe, plain CSS tokens in `src/index.css`.

**Spec:** `docs/superpowers/specs/2026-11-05-study-tips-design.md`

**Branch:** `study-tips`, from `main`. Merge and deploy only after Task 7's final review.

## Global Constraints

- No new dependencies. Tips are bundled (offline and single-file builds work).
- Tips only in practice and cram. None in mock exams or Learn lesson checks.
- Gap: a random whole number from 10 to 20, inclusive, picked fresh after each tip.
- Count only **new questions reached** (an index past the furthest reached in this run). Previous/back and acronym cards don't count.
- One counter and one seen list for the whole app, across exams and modes. Progress is saved as it happens.
- No tip repeats until every eligible tip (general + current exam) has been shown. Then a new shuffled pass starts.
- If a tip falls due while the box is open, the open tip stays and the counter resets with a new gap.
- The box never covers the question, never takes focus on arrival, and never blocks answering.
- Settings: checkbox **"Show study tips in practice and cram"** (on by default) and button **"Start the tips over"** with the status line **"Tips start over from the beginning."**
- Settings keys: `studyTips` (boolean), `tipProgress` (`{ count, gap, seen }`). Unknown or broken values fall back to the defaults.
- No raw colours in `src/ui` (`src/content/theme.test.ts`); AA contrast in light and both dark blocks; no opacity animation (marks ruling).
- Tip text is original: no 8-word run shared with any review source (`sharedRuns` in `src/content/overlap.ts`).
- Exam numbers (time, question count, passing score) only through placeholders `{minutes}`, `{maxQuestions}`, `{passingScore}`, filled from `ExamMeta`.
- `npm run check` stays green, bounds included.

## Review Focus

1. A `tipProgress` value from a hand-edited or old backup (`seen` not an array, `gap` NaN or 0, ids of tips that no longer exist) → defaults or cleaned values, no crash. Test in Task 2.
2. The student switches exams, or every eligible tip is already seen → a new pass starts and a tip is always returned. An exam with no exam-specific tips still gets general tips. Tests in Task 1.
3. React StrictMode double effects, or going Previous then Next again, must not count a question twice. Test in Task 4.
4. A repo write that fails (private window, quota) → tips keep working in memory and the run shows no error. Test in Task 2.
5. Importing a backup in Settings with `studyTips: false` → the next run shows no tips, without a reload. Test in Task 5.

---

### Task 1: Tip types, placeholders and the picker

**Files:**
- Create: `src/tips/types.ts`, `src/tips/picker.ts`, `src/tips/picker.test.ts`, `src/tips/list.ts` (the five owner tips for now; Task 6 fills the rest)

**Interfaces:**
- Produces:
  - `type TipGroup = 'test-room' | 'study'`
  - `interface Tip { id: string; group: TipGroup; text: string; exam?: string }`
  - `interface TipProgress { count: number; gap: number; seen: string[] }`
  - `const TIPS: readonly Tip[]` (in `list.ts`)
  - `const OWNER_TIP_IDS = ['no-reading-aloud', 'silly-answers', 'know-acronyms', 'key-word', 'last-sentence-first'] as const` (in `list.ts`)
  - `const PLACEHOLDERS = ['minutes', 'maxQuestions', 'passingScore'] as const`
  - `randomGap(rand: () => number): number`: 10..20 inclusive
  - `freshProgress(rand: () => number): TipProgress`: `{ count: 0, gap: randomGap(rand), seen: [] }`
  - `reach(p: TipProgress, rand: () => number): { progress: TipProgress; due: boolean }`
  - `eligible(tips: readonly Tip[], exam: string): Tip[]`: general (no `exam`) plus `exam === exam`
  - `pickTip(tips: readonly Tip[], exam: string, p: TipProgress, rand: () => number): { tip: Tip; progress: TipProgress }`
  - `fillTip(text: string, meta: ExamMeta): string`

- [ ] **Step 1: Write the failing tests** in `src/tips/picker.test.ts`:
  - `randomGap` with `rand` 0 → 10, 0.999999 → 20, and every result over 1,000 `Math.random` draws is an integer in 10..20.
  - `reach`: `{count: 8, gap: 10}` → count 9, not due. `{count: 9, gap: 10}` → due, count 0, `gap === randomGap(rand)`. `seen` is unchanged.
  - `eligible`: given tips `g1` (general), `d1` (`DA0-002`), `c1` (`CY0-001`), for `DA0-002` → `[g1, d1]`.
  - `pickTip` never returns a tip in `seen` while unseen eligible ones remain. Over `eligible.length` calls from fresh progress it returns each eligible tip exactly once, and the returned progress adds the tip id to `seen`.
  - `pickTip` when every eligible id is in `seen` → removes the eligible ids from `seen` (keeps other exams' ids), then picks. It always returns a tip.
  - `pickTip` for an exam with no exam tips → a general tip.
  - `fillTip('You have {minutes} minutes for {maxQuestions} questions; pass at {passingScore}.', meta)` → the meta's `timeLimitMinutes`, `maxQuestions`, `passingScore`. An unknown `{foo}` is left as is (Task 6's test bans it in content).
- [ ] **Step 2: Run** `npx vitest run src/tips` → FAIL (modules missing).
- [ ] **Step 3: Implement** `types.ts`, `picker.ts`, and `list.ts` with the five owner tips (ids as in `OWNER_TIP_IDS`; wording from spec §5, original, one to three sentences). `pickTip` chooses uniformly at random among the unseen eligible tips using `rand`.
- [ ] **Step 4: Run** `npx vitest run src/tips` → PASS.
- [ ] **Step 5: Commit** `feat(tips): tip types and picker`.

### Task 2: Tips store

**Files:**
- Create: `src/ui/tips/prefs.ts`, `src/ui/tips/prefs.test.ts`
- Modify: `src/App.tsx` (startup load beside `applyMarks`), `src/ui/SettingsScreen.tsx` (`onImported`)

**Interfaces:**
- Consumes: Task 1 `TipProgress`, `freshProgress`, `reach`, `pickTip`, `TIPS`.
- Produces (in `src/ui/tips/prefs.ts`):
  - `TIPS_SETTING = 'studyTips'`, `TIP_PROGRESS_SETTING = 'tipProgress'`
  - `interface TipPrefs { on: boolean; progress: TipProgress }`
  - `loadTips(repo: Repo): Promise<TipPrefs>`: `on` is `false` only when stored `false`. `progress` is cleaned: `count` a whole number ≥ 0 else 0; `gap` a whole number in 10..20 else `randomGap`; `seen` keeps only strings that are ids in `TIPS`.
  - `applyTips(p: TipPrefs, repo?: Repo): void`: sets the store, and remembers `repo` for write-through when given.
  - `useTipsOn(): boolean` (`useSyncExternalStore`)
  - `reachQuestion(): boolean`: runs `reach` with `Math.random`, saves, and returns `due` (always `false` when off)
  - `nextTip(exam: string): Tip`: runs `pickTip`, saves
  - `setTipsOn(on: boolean): Promise<void>` and `resetTips(): Promise<void>` (progress → `freshProgress`). Both update the store first, then write; they reject on a write failure so Settings can show an error.
  - Write-through for `reachQuestion` / `nextTip` is fire-and-forget; a rejected write is swallowed.
  - `resetTipsForTests(): void`

- [ ] **Step 1: Write the failing tests** in `src/ui/tips/prefs.test.ts` with the memory repo used by `src/ui/marks/prefs.test.ts`:
  - Empty repo → `on: true`, count 0, gap in 10..20, seen `[]`.
  - Review Focus 1: stored `tipProgress` of `{ count: -3, gap: NaN, seen: 'x' }`, of `{ count: 2.5, gap: 0, seen: [1, 'gone-id', 'key-word'] }`, and of `"junk"` → no throw; cleaned to count 0, gap in 10..20, and seen `[]` / `['key-word']` / `[]`.
  - `studyTips` stored as `'no'` → `on: true`; stored `false` → `on: false`.
  - `reachQuestion` called `gap` times → `true` only on the last call, and the repo then holds count 0 and a new gap.
  - Off → `reachQuestion` returns `false` and leaves the count alone.
  - `nextTip('DA0-002')` adds its id to the stored `seen`.
  - Review Focus 4: a repo whose `setSetting` rejects → `reachQuestion` and `nextTip` still work in memory and throw nothing (no unhandled rejection).
- [ ] **Step 2: Run** `npx vitest run src/ui/tips` → FAIL.
- [ ] **Step 3: Implement** `prefs.ts`. Wire `applyTips(await loadTips(s.repo), s.repo)` into App's startup `try` and Settings `onImported`.
- [ ] **Step 4: Run** `npx vitest run src/ui/tips src/App.test.tsx src/ui/SettingsScreen.test.tsx` → PASS.
- [ ] **Step 5: Commit** `feat(tips): tips store with saved progress`.

### Task 3: TipBox component

**Files:**
- Create: `src/ui/tips/TipBox.tsx`, `src/ui/tips/TipBox.test.tsx`, `src/ui/tips/tips.css`
- Modify: `src/index.css` only if a new token is needed (all three blocks, then `src/content/markContrast.test.ts`-style AA check added for it)

**Interfaces:**
- Consumes: Task 1 `Tip`, `fillTip`; Task 2 `nextTip`.
- Produces: `TipBox({ first, meta, onClose }: { first: Tip; meta: ExamMeta; onClose: () => void })`

- [ ] **Step 1: Write the failing tests** in `TipBox.test.tsx`:
  - Renders `section` with the accessible name **"Test-room tip"** or **"Study tip"** (an `h3` by the tip's group) and the filled text.
  - The text sits in an `aria-live="polite"` element. Rendering does not move focus (the focused element before = after).
  - **"Next tip"** calls `nextTip(meta.code)` and shows its text. **"Previous tip"** is disabled on the first tip and, after Next, returns to the earlier tip without calling `nextTip`. Next after Previous moves forward through the history before asking for a new tip.
  - **"Close tip"** (✕, with that accessible name) calls `onClose`.
  - The box contains no form controls besides its three buttons.
- [ ] **Step 2: Run** `npx vitest run src/ui/tips/TipBox.test.tsx` → FAIL.
- [ ] **Step 3: Implement.** Keep a local history array and position. Style from existing tokens (`--surface`/border like other panels), with words that wrap (bounds rules), and buttons at least 44 px tall to match the app's tap targets. No opacity transitions.
- [ ] **Step 4: Run** `npx vitest run src/ui/tips src/content/theme.test.ts` → PASS.
- [ ] **Step 5: Commit** `feat(tips): tip box with close and cycle`.

### Task 4: Tips in practice and cram

**Files:**
- Modify: `src/ui/study/StudyRunner.tsx`, `src/ui/study/PracticeFlow.tsx`, `src/ui/study/CramFlow.tsx`
- Test: `src/ui/study/StudyRunner.test.tsx`, `src/ui/study/flows.test.tsx`

**Interfaces:**
- Consumes: Task 2 `reachQuestion`, `nextTip`, `useTipsOn`, `applyTips`, `resetTipsForTests`; Task 3 `TipBox`.
- Produces: `StudyRunner` prop `tipsFor?: ExamMeta`.

- [ ] **Step 1: Write the failing tests** in `StudyRunner.test.tsx`. Set up each test with `applyTips({ on: true, progress: { count: 0, gap: 10, seen: [] } })`:
  - 12 question items, `tipsFor` given: Next 8 times (9 reached) → no box; Next once more (10 reached) → a region named "Study tip" or "Test-room tip" appears above the question (it comes before the question's fieldset in document order).
  - Review Focus 3: reach item 5, go Previous 3 times and Next 3 times → still counts 5 (check the store's count). Render inside `<StrictMode>` and reach 10 → exactly one box, count 0.
  - Closing the box removes it and moves focus to the item heading.
  - The box stays while moving Next/Previous. Reaching the next gap while open keeps the same tip text.
  - Without `tipsFor` (lesson checks) → no box after 10, and the count does not change.
  - Off (`applyTips({ on: false, … })`) → no box.
  - Acronym items do not count: 9 questions then 5 acronym cards → no box.
  - The question can be answered and checked with the box open.
- [ ] **Step 2: Run** `npx vitest run src/ui/study` → FAIL.
- [ ] **Step 3: Implement.** In `StudyRunner`, keep a ref `Set` of counted question keys. In an effect on `index`, when the current item is a question past `furthest` and not yet counted, add it and call `reachQuestion()`. When that returns true and no box is open, open `TipBox` with `nextTip(tipsFor.code)`. Render the box as the first child inside `RunnerFrame`. Pass `tipsFor={meta}` from `PracticeFlow` and `CramFlow`; `LearnFlow` stays as is. In `flows.test.tsx`, add one test each that practice and cram pass it (a box shows after `gap` items, with `gap` stored as 10 and a 10-item run).
- [ ] **Step 4: Run** `npx vitest run src/ui/study src/ui/learn` → PASS.
- [ ] **Step 5: Commit** `feat(tips): tips in practice and cram runs`.

### Task 5: Settings section

**Files:**
- Create: `src/ui/tips/TipSettings.tsx`, `src/ui/tips/TipSettings.test.tsx`
- Modify: `src/ui/SettingsScreen.tsx` (render `<TipSettings key={`tips-${imports}`} repo={repo} />` after `MarkSettings`)

**Interfaces:**
- Consumes: Task 2 `loadTips`, `setTipsOn`, `resetTips`, `useTipsOn`.

- [ ] **Step 1: Write the failing tests**:
  - A group **"Study tips"** (fieldset legend) holds the checkbox **"Show study tips in practice and cram"**, checked on an empty repo.
  - Unchecking stores `studyTips: false` and `useTipsOn()` becomes false.
  - **"Start the tips over"** stores progress with `seen: []`, count 0, and shows status **"Tips start over from the beginning."**
  - A failing write shows a `role="alert"` **"Could not save this choice."** A failed read still shows the controls from the defaults (the marks ruling).
  - Review Focus 5 (in `SettingsScreen.test.tsx`): importing a backup whose settings hold `studyTips: false` → the checkbox shows unchecked and `useTipsOn()` is false.
- [ ] **Step 2: Run** `npx vitest run src/ui/tips src/ui/SettingsScreen.test.tsx` → FAIL.
- [ ] **Step 3: Implement** following `MarkSettings.tsx` (same `display-settings` class).
- [ ] **Step 4: Run** the same command → PASS.
- [ ] **Step 5: Commit** `feat(tips): tips on/off and reset in Settings`.

### Task 6: Write the tips

**Files:**
- Modify: `src/tips/list.ts`
- Create: `src/tips/list.test.ts`

**Interfaces:**
- Consumes: Task 1 `Tip`, `TIPS`, `OWNER_TIP_IDS`, `PLACEHOLDERS`; `listExams()` from the registry (`src/banks`).

- [ ] **Step 1: Write the failing test** `src/tips/list.test.ts`:
  - Ids are unique and kebab-case. Every `OWNER_TIP_IDS` id is present.
  - At least 100 general tips, with at least 40 in each group.
  - Each shipped exam (`listExams()`) has 5 to 10 tips. Every `exam` value is a shipped exam code.
  - Text is 20 to 280 characters, with no `\n`.
  - Every `{name}` in the text is in `PLACEHOLDERS`. `fillTip` with each shipped exam's meta leaves no `{`.
- [ ] **Step 2: Run** `npx vitest run src/tips/list.test.ts` → FAIL (counts).
- [ ] **Step 3: Save the review sources.** In the scratchpad, `curl` each source page from spec §5 (the CompTIA PBQ page and blog, ASMED, CyberKraft, SimeonOnSecurity, ITU Online, CrucialExams). Strip the HTML to `.txt` in a folder `tip-refs/` that holds nothing else.
- [ ] **Step 4: Draft the tips** (cheapest capable model: one Sonnet drafter). Brief it with spec §5 and §7: second person, plain words for a first-time test taker, original wording, invented phrasing (not a reworded sentence from a source). Test-centre rules go to "check with your test provider". No PBQ-type claims per exam. Exam tips cover what is special about the exam (AT0-001 automation and ops, DA0-002 math by hand and data PBQs, CY0-001 AI security), using placeholders for numbers.
- [ ] **Step 5: Review.** One blind Sonnet reviewer for accuracy (flags anything wrong, stale or risky) and one Haiku copywriter (plain words, length, no repeats or near-duplicates). Fix the flags and re-review the changed tips until clean.
- [ ] **Step 6: Overlap check.** A scratchpad script runs `sharedRuns(tip.text, ref)` (from `src/content/overlap.ts`) for every tip against every `tip-refs/*.txt` file → no hits. Reword any hit.
- [ ] **Step 7: Run** `npx vitest run src/tips` → PASS.
- [ ] **Step 8: Commit** `content(tips): about 100 general and per-exam tips`.

### Task 7: Browser check, full check, docs

**Files:**
- Create: `tests/e2e/tips.responsive.spec.ts`, `tests/e2e/fixtures/backup-tip-due.json`
- Modify: `HANDOFF.md`, `README.md` (feature list, if it lists study features)

- [ ] **Step 1: Write the e2e** `tests/e2e/tips.responsive.spec.ts` (the file name puts it in the phone and tablet projects, as with marks). Import `backup-tip-due.json` on Settings: `settings: { tipProgress: { count: 9, gap: 10, seen: [] } }`, with a DA0-002 question so the run can start. Then start a 2-question DA0-002 practice run (`startPractice` pattern from `marks.responsive.spec.ts`) and press Next:
  - The tip region shows above the question, and focus has not moved into it.
  - In light and dark: no horizontal overflow, axe clean, `textOutOfBounds(page)` is empty.
  - Next tip through every eligible DA0-002 tip (count = general + DA0-002 tips): after each, `textOutOfBounds(page)` is empty and the page does not scroll sideways. Previous tip goes back. Close tip removes it.
  - In a fresh page: import the backup, then uncheck "Show study tips in practice and cram" → the same run shows no tip after Next.
- [ ] **Step 2: Run** `npx playwright test tests/e2e/tips.responsive.spec.ts` (after `npm run build:e2e`) → PASS on phone and tablet.
- [ ] **Step 3: Run** `npm run check` → green (lint, typecheck, builds, unit, e2e, bounds).
- [ ] **Step 4: Update `HANDOFF.md`.** Mark #3 done and set #5 as next under "Next session". List what shipped, the rulings and the test counts.
- [ ] **Step 5: Commit** `test(tips): tips axe clean and in bounds; docs`.
- [ ] **Step 6: Final review.** One Opus whole-branch review. Fix every finding, minors included. Then merge to `main`, `npm run deploy`, and close issue #3 with a comment.
