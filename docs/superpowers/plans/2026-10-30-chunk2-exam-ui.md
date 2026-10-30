# Chunk 2: Exam UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A working timed mock exam for Data+: random, domain-weighted assembly with recency deprioritization and option shuffling, an exam-style shell (top bar, timer, flag, Previous/Next, review grid), submit and auto-submit, scoring out of 900, and a results screen saved to history.

**Architecture:**

- Pure logic in `src/exam/` (no React): seeded RNG, assembly, scoring, result record schema. Fully unit-tested.
- React screens in `src/ui/exam/`: `ExamSetup`, `ExamRunner` (with `TopBar`, `McqView`, `ReviewGrid`), `ResultsScreen`.
- `App.tsx` holds a tiny screen state machine (`home | setup | exam | results`); no router.
- Attempts are saved via the existing `Repo.putRecord('results', …)`.

**Tech Stack:** unchanged from chunk 1 (React 18, TS strict, Zod, Vitest + Testing Library, Playwright + axe).

**Spec:** `docs/superpowers/specs/2026-10-30-comptia-exam-trainer-design.md` (§7, §10, §10a)

## Global Constraints

- Single-file `file://` build must keep working; no runtime network.
- WCAG 2.2 AA; any serious/critical axe violation fails e2e. Lint with jsx-a11y must pass.
- No CompTIA/Pearson logos or branding; exam shell "evokes, doesn't copy".
- Only `approved` bundled questions in production; drafts only when `import.meta.env.DEV`.
- No GitHub Actions, no LFS.
- PBQ rendering is out of scope (chunks 3–4). Assembly supports PBQs but chunk 2 calls it with `pbqTypes: []`.

## Decisions made here (builder's calls)

- **RNG:** `mulberry32(seed: number)`; seed is a uint32 from `crypto.getRandomValues` at exam start; stored on the result.
- **PBQ count distribution (1–6, toward 2–4):** relative weights `[1, 3, 3, 3, 1, 1]` for counts 1..6, then capped by available PBQs and by `Σw ≤ maxQuestions − 1`.
- **Domain allocation:** largest-remainder (Hamilton) on domain weights for the MCQ target; a domain short of questions donates its shortfall to the others, again by weight.
- **Recency:** questions in the last `RECENT_ATTEMPTS = 3` results for this exam are drawn only after all fresh ones in that domain are used.
- **Small bank:** if the bank has fewer MCQs than the target, the exam uses every available one. Scoring generalizes the spec: `unit = 900 / (mcqCount + Σw)`; each MCQ is worth `unit` (= 10 when the bank is full), each PBQ `unit × w`. This equals spec §7 exactly when `mcqCount + Σw = maxQuestions`.
- **Select-all scoring:** `max(0, correctPicks − wrongPicks) / correctCount` of the item's points.
- **Score display:** `Math.round(total)`; pass iff rounded score ≥ `passingScore`.
- **Timer:** deadline-based (`deadline = start + limit`), ticking via `setInterval(1000)`; display `mm:ss` (or `h:mm:ss`). Screen-reader announcements only at 10, 5 and 1 minutes remaining via a polite live region, not every second. Auto-submit at 0.
- **In-progress attempts are not persisted** (refresh loses the attempt). Noted in HANDOFF.
- **Question pool:** bundled + user questions for the exam (the Ours/Mine/Both toggle arrives in chunk 6).

## Review Focus

1. **Bank smaller than the exam size** (Data+ has 2 approved MCQs): the exam runs with what exists, shows "N questions" honestly, and the score is still out of 900. → Task 2 + Task 3 tests.
2. **Timer hits zero while a dialog/review screen is open, or tab was backgrounded:** submission happens exactly once and the remaining time is computed from the deadline, not tick count. → Task 5 test.
3. **Submitting with unanswered questions:** the confirm step names the unanswered count; unanswered items score 0 and appear in review as "Not answered". → Task 5, Task 6 tests.
4. **Same seed reproduces the same attempt; different seeds give different sets** when the bank is larger than the exam. → Task 1, Task 2 tests.
5. **Saving the result fails** (storage error): the results screen still shows and an error message says history was not saved. → Task 6 test.

---

### Task 1: Seeded RNG and shuffling

**Files:**
- Create: `src/exam/rng.ts`
- Test: `src/exam/rng.test.ts`

**Interfaces:**
- Produces: `type Rng = () => number` (in [0,1)); `mulberry32(seed: number): Rng`; `shuffle<T>(xs: readonly T[], rng: Rng): T[]` (Fisher–Yates, returns a new array); `weightedPick(weights: readonly number[], rng: Rng): number` (index); `newSeed(): number`.

- [ ] **Step 1: Write failing tests**
  - `mulberry32(42)` called twice yields identical first 5 values across two instances; `mulberry32(1)` differs from `mulberry32(2)`.
  - all values in `[0, 1)` over 1000 draws.
  - `shuffle([1..10], mulberry32(7))` is a permutation, does not mutate input, and is equal for equal seeds.
  - `weightedPick([0, 1, 0], rng)` always returns 1; over 10 000 draws of `[1, 3]`, index 1 frequency is within 0.72–0.78.
  - `newSeed()` is an integer in `[0, 2**32)`.
- [ ] **Step 2:** `npx vitest run src/exam/rng.test.ts` → FAIL (module not found).
- [ ] **Step 3:** Implement. `newSeed` uses `crypto.getRandomValues(new Uint32Array(1))[0]`.
- [ ] **Step 4:** Re-run → PASS.
- [ ] **Step 5:** `git commit -m "feat(exam): seeded rng and shuffle"`

### Task 2: Exam assembly

**Files:**
- Create: `src/exam/assemble.ts`
- Test: `src/exam/assemble.test.ts` (build a synthetic `ExamMeta` with 3 domains weighted 50/30/20, `maxQuestions: 10`, and generated MCQ/PBQ fixtures)

**Interfaces:**
- Consumes: `Rng`, `mulberry32`, `shuffle`, `weightedPick` (Task 1); `ExamMeta`, `Question`, `McqPayload` (`src/domain/types.ts`).
- Produces:
  ```ts
  export interface ExamItem {
    question: Question;
    optionOrder?: string[]; // shuffled MCQ option ids
  }
  export interface AssembledExam {
    exam: string;
    seed: number;
    items: ExamItem[];        // PBQs first, then MCQs
    mcqCount: number;
    pbqWeightSum: number;
  }
  export interface AssembleInput {
    meta: ExamMeta;
    pool: Question[];
    seed: number;
    recentIds: ReadonlySet<string>;
    pbqTypes: readonly QuestionType[]; // chunk 2 passes []
  }
  export function assembleExam(input: AssembleInput): AssembledExam;
  export function allocateByWeight(total: number, weights: readonly number[]): number[]; // largest remainder
  export const PBQ_COUNT_WEIGHTS = [1, 3, 3, 3, 1, 1] as const;
  ```
  Domain of a question = domain of its first `objectiveIds` entry (via `meta.objectives`).

- [ ] **Step 1: Write failing tests**
  - `allocateByWeight(10, [50, 30, 20])` → `[5, 3, 2]`; `allocateByWeight(7, [50, 30, 20])` sums to 7 and equals `[4, 2, 1]`.
  - With 30 MCQs per domain and `pbqTypes: []`: `items.length === 10`, `mcqCount === 10`, per-domain counts `[5, 3, 2]`, no duplicate ids.
  - Same seed → identical `items` ids and `optionOrder`; seeds 1 and 2 → different id sets.
  - Shortfall: domain C has only 1 question → C gets 1, the other 9 split between A and B, total still 10.
  - Small bank: pool of 2 MCQs → `items.length === 2`, `mcqCount === 2`.
  - Recency: domain A has 6 questions, 5 of them in `recentIds`, and A's quota is 5 → the 1 fresh one is always included (check across 20 seeds).
  - Each MCQ item's `optionOrder` is a permutation of its option ids.
  - PBQs: with 4 PBQs of weight 2 in the pool and `pbqTypes: ['pbq-match']`: PBQs come before every MCQ, `1 ≤ pbqCount ≤ 4`, `mcqCount === 10 − pbqWeightSum`.
  - PBQ cap: one PBQ of weight 6 and `maxQuestions: 6` → no PBQ chosen (Σw must be ≤ maxQuestions − 1).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement `assembleExam`:
  1. Partition pool into PBQs (type in `pbqTypes`) and MCQs (`mcq-single`/`mcq-multi`); ignore others.
  2. PBQs: draw a count with `weightedPick(PBQ_COUNT_WEIGHTS)` + 1, cap at available; pick that many from `shuffle` (fresh before recent); drop from the end while `Σw > maxQuestions − 1`.
  3. MCQs: `target = maxQuestions − Σw`; allocate per domain with `allocateByWeight`; redistribute shortfalls among domains that still have spare questions (loop until no change); from each domain take `shuffle(fresh)` then `shuffle(recent)`.
  4. Shuffle the final MCQ list order; attach `optionOrder = shuffle(option ids)`.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** `git commit -m "feat(exam): domain-weighted random assembly with recency"`

### Task 3: Scoring and result record

**Files:**
- Create: `src/exam/scoring.ts`, `src/exam/result.ts`
- Test: `src/exam/scoring.test.ts`, `src/exam/result.test.ts`
- Modify: `src/storage/backup.ts` — use `examResultSchema` for `results` (closes deferred item f for results; `srs` stays as-is).

**Interfaces:**
- Consumes: `AssembledExam`, `ExamItem` (Task 2).
- Produces:
  ```ts
  // scoring.ts
  export type Responses = Record<string, string[]>; // questionId -> selected option ids
  export interface ItemScore { questionId: string; earned: number; possible: number; fraction: number; answered: boolean }
  export interface ScoreReport {
    score: number;           // rounded, 0..900
    passed: boolean;
    items: ItemScore[];
    byDomain: { domainId: string; title: string; earned: number; possible: number }[];
    weakestObjectives: { objectiveId: string; title: string; fraction: number }[]; // ascending, max 5, only fraction < 1
  }
  export function mcqFraction(correct: readonly string[], picked: readonly string[], type: 'mcq-single' | 'mcq-multi'): number;
  export function scoreExam(exam: AssembledExam, responses: Responses, meta: ExamMeta): ScoreReport;
  // result.ts
  export interface ExamResult {
    id: string; exam: string; seed: number; startedAt: string; finishedAt: string;
    autoSubmitted: boolean; questionIds: string[]; optionOrders: Record<string, string[]>;
    responses: Responses; flagged: string[]; score: number; passed: boolean;
  }
  export const examResultSchema: z.ZodType<ExamResult>;
  export function buildResult(args: { exam: AssembledExam; responses: Responses; flagged: string[]; report: ScoreReport; startedAt: Date; finishedAt: Date; autoSubmitted: boolean }): ExamResult; // id = `${exam}-${finishedAt.getTime()}-${seed}`
  export function recentQuestionIds(results: unknown[], exam: string, n?: number): Set<string>; // n defaults to RECENT_ATTEMPTS = 3; ignores records failing the schema
  ```
  PBQ items in `scoreExam` score 0 for now with `possible = unit × w` (chunk 3 plugs in per-part scoring).

- [ ] **Step 1: Write failing tests**
  - `mcqFraction(['a'], ['a'], 'mcq-single') === 1`; `(['a'], ['b'], …) === 0`; `(['a'], [], …) === 0`.
  - `mcqFraction(['a','c'], ['a'], 'mcq-multi') === 0.5`; `(['a','c'], ['a','b'], …) === 0`; `(['a','c'], ['a','c','d'], …) === 0.5`; `(['a','c'], ['b','d'], …) === 0`.
  - Full-size exam: 72 MCQs + 3 PBQs of w=6, all MCQs right, PBQs 0 → `score === 720`, each MCQ `possible === 10`, each PBQ `possible === 60`.
  - Small bank: 2 MCQs, one right → `score === 450`; both right → 900, `passed === true` with `passingScore: 675`; one right → `passed === false`.
  - Unanswered item → `answered: false`, `earned: 0`.
  - `byDomain` sums `possible` to 900 (within 1e-9); `weakestObjectives` sorted ascending, excludes fraction 1.
  - `examResultSchema` round-trips `buildResult(...)`; rejects a record missing `seed`.
  - `recentQuestionIds`: given 4 results for the exam (different `finishedAt`) and 1 for another exam, returns ids from the 3 newest for the exam only; garbage records are ignored.
  - backup: importing a file whose `results` contains `{ id: 'x' }` only → `ImportError` mentioning `results`. Update the existing backup fixtures/tests that use bare `{ id }` results to use a valid `ExamResult`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. `unit = 900 / (mcqCount + pbqWeightSum)`; domain/objective of an item from its first `objectiveIds` entry; objective fraction = Σearned/Σpossible.
- [ ] **Step 4:** `npm test` → PASS (whole suite, since backup changed).
- [ ] **Step 5:** `git commit -m "feat(exam): scoring, result schema, recent-item lookup"`

### Task 4: Exam shell components (MCQ view, top bar, review grid)

**Files:**
- Create: `src/ui/exam/McqView.tsx`, `src/ui/exam/TopBar.tsx`, `src/ui/exam/ReviewGrid.tsx`, `src/ui/exam/formatTime.ts`, `src/ui/exam/exam.css`
- Test: `src/ui/exam/components.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  formatTime(ms: number): string // clamps <0 to 0; 3_599_000 -> "59:59", 3_600_000 -> "1:00:00", 61_500 -> "1:01" (floor seconds)
  <McqView item={ExamItem} selected={string[]} onChange={(ids: string[]) => void} />
    // mcq-single: radio group; mcq-multi: checkboxes + hint "Select all that apply." (stem text decides "TWO" etc.)
    // options rendered in item.optionOrder; fieldset with legend = stem
  <TopBar index={number} total={number} remainingMs={number} flagged={boolean} onToggleFlag={() => void} />
    // "Question 3 of 10"; timer in element with aria-label "Time remaining"; flag is a toggle button with aria-pressed
    // a separate visually-hidden polite live region announces "10 minutes remaining" / "5 minutes remaining" / "1 minute remaining" once each when crossed
  <ReviewGrid items={{ index: number; answered: boolean; flagged: boolean }[]} onJump={(index: number) => void} />
    // one button per item: accessible name e.g. "Question 4, unanswered, flagged"; visual state not color-only (icon/text)
  ```
- [ ] **Step 1: Write failing tests** (Testing Library + userEvent)
  - `formatTime` cases above.
  - McqView single: options appear in `optionOrder` order; clicking an option calls `onChange(['b'])`; arrow keys move within the radio group.
  - McqView multi: checking a then c calls `onChange` with `['a']` then `['a','c']`; unchecking removes.
  - TopBar: shows "Question 3 of 10"; flag button `aria-pressed="false"` → click → `onToggleFlag` called; rerender `remainingMs` from 601_000 to 599_000 → live region text "10 minutes remaining"; rerender to 598_000 → text unchanged (announced once).
  - ReviewGrid: button named "Question 2, unanswered, flagged"; click → `onJump(1)`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. Exam CSS: plain high-contrast sans font, fixed top bar, bottom nav bar, contrast ≥ 4.5:1, honors `prefers-reduced-motion`. Add a `.visually-hidden` utility to `src/index.css`.
- [ ] **Step 4:** Run → PASS; `npm run lint` clean.
- [ ] **Step 5:** `git commit -m "feat(ui): exam shell components"`

### Task 5: Exam runner (navigation, timer, submit, auto-submit)

**Files:**
- Create: `src/ui/exam/ExamRunner.tsx`
- Test: `src/ui/exam/ExamRunner.test.tsx` (use `vi.useFakeTimers({ shouldAdvanceTime: true })` and `vi.setSystemTime`)

**Interfaces:**
- Consumes: Task 4 components, `AssembledExam`, `Responses`.
- Produces:
  ```ts
  export interface SubmitPayload { responses: Responses; flagged: string[]; autoSubmitted: boolean; finishedAt: Date }
  <ExamRunner exam={AssembledExam} timeLimitMs={number} startedAt={Date} now?={() => number} onSubmit={(p: SubmitPayload) => void} />
  ```
  Views inside: `question` (TopBar + current item + bottom bar with Previous, Next, "Review") and `review` (ReviewGrid + "Return to exam" + "Submit exam"). "Submit exam" opens a confirm `<dialog>` (native, `showModal`) saying "You have N unanswered questions." (or "All questions answered.") with "Submit" and "Cancel". Previous is disabled on the first item; on the last item Next becomes "Review". Focus moves to the question heading on navigation.
- [ ] **Step 1: Write failing tests**
  - Next/Previous move between items; "Question 2 of 2" after Next; Previous disabled on item 1.
  - Answer item 1, flag item 2, open Review → grid names reflect "answered" / "unanswered, flagged"; jumping to item 2 shows it.
  - Submit from review with 1 unanswered → dialog text "You have 1 unanswered question."; Cancel closes without `onSubmit`; Submit calls `onSubmit` once with `autoSubmitted: false` and the responses.
  - Auto-submit: `timeLimitMs: 60_000`; advance system time 61 s → `onSubmit` called exactly once with `autoSubmitted: true`, even while the confirm dialog is open; further ticks do not call again.
  - Backgrounded tab: jump system time forward 30 s in one step → timer shows remaining based on deadline (`0:30`), not ticks.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. Guard double submission with a ref. jsdom lacks `HTMLDialogElement.showModal`; polyfill in `src/test-setup.ts` (set `open` attribute).
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** `git commit -m "feat(ui): exam runner with timer, review and submit"`

### Task 6: Setup, results screen and app wiring

**Files:**
- Create: `src/ui/exam/ExamSetup.tsx`, `src/ui/exam/ResultsScreen.tsx`, `src/ui/exam/MockExamFlow.tsx`
- Modify: `src/App.tsx`, `src/ui/Home.tsx` (add "Start mock exam" button per exam → `onStartExam(code)`)
- Test: `src/ui/exam/MockExamFlow.test.tsx`

**Interfaces:**
- Consumes: everything above; `Repo`, `getBundledQuestions`, `listExams`.
- Produces:
  ```ts
  <MockExamFlow repo={Repo} examCode={string} onExit={() => void} seed?={number} />
    // setup -> runner -> results; loads pool = bundled + repo.getUserQuestions(code); recentIds from repo.listRecords('results')
  <ExamSetup meta={ExamMeta} availableCount={number} plannedCount={number} onStart={() => void} onCancel={() => void} />
    // shows exam name, "N questions", time limit, passing score; if plannedCount < meta.maxQuestions: "The bank has only N questions, so this exam is shorter than the real one (M)."
    // if availableCount === 0: Start disabled with message "No questions available for this exam yet."
  <ResultsScreen meta={ExamMeta} exam={AssembledExam} result={ExamResult} report={ScoreReport} saveError={string | null} onHome={() => void} />
  ```
  Results content: heading "Your score: 450 / 900", "PASS"/"FAIL" as text (not color-only), note "CompTIA reports a scaled score; this is an approximation.", domain breakdown table (`<table>` with caption), "What to study" list of weakest objectives with titles, then a review list of every item with fraction < 1: stem, "Your answer" (option texts, or "Not answered"), "Correct answer", explanation. "Drill these" button is rendered disabled with text "(available in a later update)" — practice mode is chunk 5. If `saveError`: `role="alert"` "Your result could not be saved to history."
  Timer default from `meta.timeLimitMinutes`.
- [ ] **Step 1: Write failing tests** (memory repo, fixed `seed`, `vi.stubEnv('DEV', false)`)
  - Home shows "Start mock exam" for Data+; clicking opens setup with "2 questions" and the shorter-exam notice naming 90.
  - Full flow: start, answer both correctly (look up correct option text from `dataPlusQuestions`), submit → "Your score: 900 / 900" and "PASS"; `repo.listRecords('results')` has 1 record passing `examResultSchema` with the seed.
  - One wrong + one unanswered → review list shows "Not answered" and the explanation text.
  - Save failure: repo whose `putRecord` rejects → results still shown plus alert text.
  - Second attempt receives the first attempt's ids as `recentIds` (spy on `listRecords`, assert it is called; behavior itself covered in Task 2).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement and wire `App.tsx`: state `{ screen: 'home' } | { screen: 'exam'; code: string }`.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** `git commit -m "feat(ui): mock exam setup, results and app wiring"`

### Task 7: Deferred chunk-1 fixes (a–e)

**Files:**
- Modify: `src/storage/index.ts`, `src/ui/BackupControls.tsx`, `src/ui/StorageBanner.tsx`
- Test: `src/storage/repo.test.ts`, `src/ui/Home.test.tsx`

**Interfaces:**
- Produces: `openRepo(opts?: { timeoutMs?: number }): Promise<{ repo: Repo; persistent: boolean }>` (default `timeoutMs: 3000`).
- [ ] **Step 1: Write failing tests**
  - (a) With `indexedDB.open` stubbed to never resolve, `openRepo({ timeoutMs: 50 })` resolves to `persistent: false`.
  - (b) Export: `URL.revokeObjectURL` is not called synchronously; it is called after `setTimeout` (fake timers, advance 0 → called).
  - (c) Export failure (`listSettings` rejects) → live region "Export failed. Please try again."; unexpected import error → "Import failed: something went wrong reading the file." (no raw `String(err)`).
  - (d) Choosing "Replace my data" shows hint "Replace deletes all your questions, settings and history first." and an import in replace mode asks `window.confirm`; declining aborts with no writes.
  - (e) StorageBanner: the live-region container (`role="status"`) is always rendered; the message text is inserted after mount (test: initial render container empty, text present after `await` a tick).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement: `Promise.race` with a timeout in `openRepo`; `setTimeout(() => URL.revokeObjectURL(url), 0)`; try/catch in `onExport`; the confirm + hint; StorageBanner sets message in `useEffect`.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** `git commit -m "fix: deferred chunk-1 review items a-e"`

### Task 8: End-to-end, axe and handoff

**Files:**
- Create: `tests/e2e/exam.spec.ts`
- Modify: `HANDOFF.md`

- [ ] **Step 1: Write e2e tests** against `singleUrl`:
  - Start mock exam → axe on setup, on a question, on the review screen, on the open confirm dialog, on results: no serious/critical violations (reuse the filter from `home.spec.ts`; extract a `expectNoSeriousAxe(page)` helper into `tests/e2e/util.ts`).
  - Keyboard-only run: Tab to "Start mock exam", Enter; answer with Space/arrow keys; reach Review and Submit using only the keyboard; results heading visible.
  - Reload the page after finishing → home still loads (history persisted in IndexedDB; results record count visible is not required).
- [ ] **Step 2:** `npm run check` → all green. Expected: lint, typecheck, unit, build:single, e2e pass.
- [ ] **Step 3:** Manual keyboard-only pass in `npm run dev` (spec §10a); note anything found in HANDOFF.
- [ ] **Step 4:** Update `HANDOFF.md`: chunk 2 done, test counts, decisions above (scoring generalization, recency N=3, no in-progress persistence, PBQs score 0 until chunk 3), next = chunk 3.
- [ ] **Step 5:** `git commit -m "test(e2e): mock exam flow with axe; handoff after chunk 2"`
