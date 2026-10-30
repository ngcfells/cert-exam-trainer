# Chunk 5: Study Modes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add untimed practice, cram mode, spaced repetition, a mastery dashboard and result history (with trend line), and enable the results screen's "Drill these" button.

**Architecture:** Pure logic lives in a new `src/study/` folder (SM-2 scheduling, mastery from stored results, practice and cram session assembly). All question sessions reuse chunk 2–4's `AssembledExam`, `scoreExam` and `ExamResult`; a result gains an optional `mode` so practice and cram attempts share the `results` store and backup format. One new `StudyRunner` UI drives both practice and cram (question items plus acronym cards, instant or end feedback, optional countdown). `App` gets a small screen union instead of the single `examCode`.

**Tech Stack:** React 18, TypeScript, Zod 3, Vitest + Testing Library, Playwright + axe.

**Spec:** `docs/superpowers/specs/2026-10-30-comptia-exam-trainer-design.md` (§7 Untimed practice, Cram mode, Learning over time, Results screen; §10, §10a)

## Global Constraints

- Practice: "The user chooses the exam, the domains or objectives, the question types and the count. Feedback can be instant or shown at the end. PBQs still come first when they're included."
- Cram: "A fast, short session that combines: the user's weakest objectives, questions that are due for review, acronyms. There is an optional countdown."
- "Spaced repetition (SM-2 or similar) for questions and acronyms, with missed items resurfacing sooner."
- "A domain and objective mastery dashboard." "A history of results with a trend line."
- Results: "What to study: the weakest objectives listed with their titles, plus a 'drill these' button." "Each result is saved to history."
- Outside the exam, study screens may be friendlier; the exam shell look is unchanged.
- WCAG 2.2 AA; axe shows no serious/critical violations on every new screen; charts are `aria-hidden` only when a table carries the same data.
- Old results (no `mode`) and old backups must still import; `srs` backup records are now validated strictly.

## Review Focus

- A practice filter that matches no questions (e.g. only `pbq-terminal` in a domain with none) → Start is disabled and the setup says "No questions match these choices." (Task 6 test).
- A practice count larger than the matching pool → the session uses every match and the setup says "Only N questions match; the session will use all of them." (Task 3 + Task 6 tests).
- A stored result that references a question no longer in the pool (deleted user question) → mastery, history and SRS skip it without throwing (Task 2 test).
- A backup whose `srs` array holds a malformed record → import is rejected with a message naming `srs.0…`, and the repo is untouched; malformed records already in storage are ignored by cram (Task 1 + Task 3 tests).
- The cram countdown reaching zero mid-session → the session ends on the summary; only items the user checked update SRS, unseen items are not marked missed (Task 5 + Task 6 tests).

---

### Task 1: SM-2 scheduling and strict `srs` records

**Files:**
- Create: `src/study/srs.ts`, `src/study/srs.test.ts`
- Modify: `src/storage/backup.ts` (`srs: z.array(srsRecordSchema)`), `src/storage/backup.test.ts`

**Interfaces — Produces (`src/study/srs.ts`):**
- `srsRecordSchema` (strict): `{ id: string; exam: string; kind: 'question' | 'acronym'; itemId: string; ease: number (>= 1.3); intervalDays: number (>= 0); reps: int >= 0; lapses: int >= 0; due: string (ISO); lastReviewed: string (ISO) }`; `type SrsRecord`.
- `srsId(exam: string, kind: SrsRecord['kind'], itemId: string): string` → `` `${exam}:${kind === 'question' ? 'q' : 'a'}:${itemId}` ``.
- `qualityFromFraction(fraction: number): number` → `1` if `< 0.5`, `3` if `< 1`, else `5`.
- `review(prev: SrsRecord | undefined, input: { exam; kind; itemId; quality: number }, now: Date): SrsRecord` — SM-2: new record starts `ease 2.5, reps 0, intervalDays 0, lapses 0`. `quality < 3`: `reps = 0`, `lapses + 1`, `intervalDays = 0`, `due = now + 10 minutes` (missed items resurface sooner). Otherwise `reps + 1`; interval `1`, then `6`, then `round(interval × ease)` using the ease from before this review; `due = now + interval days`. Ease always updates: `max(1.3, ease + 0.1 − (5 − q)(0.08 + (5 − q)·0.02))`.
- `parseSrsRecords(raw: unknown[]): SrsRecord[]` — `safeParse` each, drop failures.
- `isDue(r: SrsRecord, now: Date): boolean` → `due <= now`.
- `applyReviews(repo: Repo, exam: string, reviews: { kind; itemId; quality }[], now: Date): Promise<void>` — reads `srs`, applies `review`, `putRecord('srs', …)` each.

- [ ] **Step 1: Write failing tests** in `srs.test.ts`:
  - `new item answered fully → reps 1, intervalDays 1, due = now + 1 day, ease 2.6`
  - `third success uses interval × ease` (reps 2 / interval 6 / ease 2.5 + q 5 → interval 15)
  - `a miss resets reps, adds a lapse, is due in 10 minutes and lowers ease (q 1: 2.5 → 1.96)`
  - `ease never drops below 1.3` (ten misses)
  - `qualityFromFraction(0.4) === 1, (0.5) === 3, (1) === 5`
  - `parseSrsRecords drops a record missing ease` ; `isDue` true at exactly `due`
  - `applyReviews writes one record per review into a memory repo and updates an existing one`
  - backup.test: `import rejects a backup with a malformed srs record and names srs.0` (repo unchanged); `a backup with a valid srs record round-trips`.
- [ ] **Step 2:** `npx vitest run src/study/srs.test.ts src/storage/backup.test.ts` → FAIL (module missing).
- [ ] **Step 3:** Implement `src/study/srs.ts`; in `backup.ts` replace the `srs` entry with `z.array(srsRecordSchema)` and drop `recordSchema` if unused.
- [ ] **Step 4:** Same command → PASS.
- [ ] **Step 5:** `git commit -m "feat: SM-2 spaced repetition records with strict backup validation"`

---

### Task 2: Result modes, per-item fraction, mastery and history

**Files:**
- Modify: `src/exam/result.ts`, `src/exam/result.test.ts`, `src/exam/scoring.ts`, `src/exam/scoring.test.ts`
- Create: `src/study/mastery.ts`, `src/study/mastery.test.ts`

**Interfaces:**
- `examResultSchema` gains `mode: z.enum(['mock', 'practice', 'cram']).optional()` (absent = mock). `buildResult` takes optional `mode` and writes it only when not `'mock'`. Export `resultMode(r: ExamResult): 'mock' | 'practice' | 'cram'`.
- `recentQuestionIds` counts only mock results (spec: "recent exams").
- `scoring.ts`: export `itemFraction(q: Question, r: ItemResponse | undefined): number` (MCQ: `mcqFraction`, PBQ: `pbqFraction`); `scoreExam` uses it.
- `src/study/mastery.ts`:
  - `interface Mastery { domains: { domainId; title; earned; possible; fraction | null }[]; objectives: { objectiveId; domainId; title; earned; possible; attempts; fraction | null }[] }` — every meta domain/objective listed; `fraction` null when `possible === 0`. Weight per item: MCQ 1, PBQ `pbqWeight ?? 1`. Only the first `objectiveIds` entry counts (same rule as `scoreExam`).
  - `computeMastery(meta: ExamMeta, results: unknown[], questions: Question[]): Mastery` — `safeParse` results, keep `exam === meta.code`, all modes, skip question ids not in `questions`.
  - `weakestObjectives(m: Mastery, n: number): string[]` — objectives with attempts, ascending fraction, then never-attempted ones in meta order; length ≤ n.
  - `history(results: unknown[], exam: string): { id; finishedAt; mode; score; passed }[]` newest first; `trendPoints(h): { finishedAt; score }[]` mock only, oldest first.

- [ ] **Step 1: Failing tests:**
  - result.test: `an old result without mode parses and resultMode is "mock"`; `buildResult with mode practice stores it`; `recentQuestionIds ignores practice and cram results`.
  - scoring.test: `itemFraction scores an MCQ multi and a PBQ like scoreExam does` (use existing fixtures).
  - mastery.test: `two results on objective 1.1 (1 right, 1 wrong) give fraction 0.5, attempts 2`; `PBQ weight counts` (w 3 at 0.5 + MCQ 1 at 1 → 2.5/4); `a result naming an unknown question id is skipped`; `a result for another exam is ignored`; `untouched objective has fraction null`; `weakestObjectives orders attempted ascending then unattempted`; `history newest first; trendPoints oldest first and mock only`.
- [ ] **Step 2:** `npx vitest run src/exam src/study/mastery.test.ts` → FAIL.
- [ ] **Step 3:** Implement as specified.
- [ ] **Step 4:** Same → PASS.
- [ ] **Step 5:** `git commit -m "feat: result modes, item fractions, mastery and history"`

---

### Task 3: Practice and cram session assembly

**Files:**
- Create: `src/study/session.ts`, `src/study/session.test.ts`
- Modify: `src/exam/assemble.ts` (export `freshFirst`; export `itemFor(q: Question, rng: Rng): ExamItem` that shuffles options/elements — reuse it inside `assembleExam`)

**Interfaces — Produces (`src/study/session.ts`):**
- `interface PracticeOptions { objectiveIds: string[]; types: QuestionType[]; count: number }`
- `matchingPool(pool: Question[], o: Omit<PracticeOptions, 'count'>): Question[]` — first objective id in set and type in set.
- `assemblePractice({ meta, pool, seed, recentIds, options }): AssembledExam` — take `min(count, matches)` from `freshFirst(matches)`, then order PBQs first (stable), wrap with `itemFor`; `mcqCount` and `pbqWeightSum` computed from the chosen items.
- `interface AcronymCard { term: string; expansion: string }`
- `interface CramSession { exam: AssembledExam; acronyms: AcronymCard[] }`
- `CRAM_SIZE = 15`, `CRAM_ACRONYMS = 5`.
- `assembleCram({ meta, pool, seed, srs: unknown[], mastery: Mastery, now }): CramSession` — MCQs only (fast). Order of picks, without duplicates, until `CRAM_SIZE − acronyms.length` questions: (1) due question records, most overdue first; (2) questions whose objective is in `weakestObjectives(mastery, 3)`, `freshFirst` with an empty recent set; (3) any other MCQ. Acronyms: due acronym records first, then never-reviewed `meta.acronyms`, up to `CRAM_ACRONYMS`; with an empty list, zero cards and more questions. SRS records parsed with `parseSrsRecords` (malformed ignored).

- [ ] **Step 1: Failing tests** (fixture meta with 2 domains / 3 objectives, 8 MCQs and 2 PBQs; build with existing `src/exam/testFixtures.ts` helpers):
  - `practice filters by objective and type` ; `PBQs come first` ; `count above the pool returns every match` ; `same seed → same session`; `zero matches → zero items`.
  - `cram puts due questions first, most overdue first`; `cram then draws from the weakest objectives`; `cram ignores a malformed srs record`; `cram includes up to 5 acronyms, due ones before new`; `cram with no acronyms fills with questions up to 15 (or the pool)`; `cram contains no PBQs`.
- [ ] **Step 2:** `npx vitest run src/study/session.test.ts src/exam/assemble.test.ts` → FAIL.
- [ ] **Step 3:** Implement. `assembleExam` output for a given seed must not change — `itemFor` consumes RNG in the same order as today (existing seeded tests and e2e seeds 4/67 prove it).
- [ ] **Step 4:** Same → PASS, plus `npx vitest run` all green.
- [ ] **Step 5:** `git commit -m "feat: practice and cram session assembly"`

---

### Task 4: Shared item review, results modes and Drill these

**Files:**
- Create: `src/ui/exam/ItemReview.tsx` (moved from `ResultsScreen`: `optionTexts`, `PartsReview`, and `ItemReview({ q, response })` rendering stem, your/correct answer or parts table, explanation)
- Modify: `src/ui/exam/ResultsScreen.tsx`, `src/ui/exam/ResultsScreen.test.tsx`, `src/ui/exam/MockExamFlow.tsx`, `src/ui/exam/MockExamFlow.test.tsx`

**Interfaces:**
- `ResultsScreen` gains `mode?: 'mock' | 'practice' | 'cram'` (default mock) and `onDrill?: (objectiveIds: string[]) => void`. Practice/cram: heading `Practice complete: N% correct` (N = round(score / 9)), no PASS/FAIL, passing score or scaled-score note. Drill button `Drill these` is enabled when `onDrill` is set and weakest objectives exist; it calls `onDrill(report.weakestObjectives.map(o => o.objectiveId))`. Without `onDrill`, the button is not rendered.
- `MockExamFlow` gains `onDrill?: (objectiveIds: string[]) => void` passed through; after saving, calls `applyReviews(repo, exam, items → { kind: 'question', itemId, quality: qualityFromFraction(fraction) }, finishedAt)` for answered items only; an SRS write failure adds to `saveError` text ("Review scheduling could not be saved.") but still shows results.

- [ ] **Step 1: Failing tests:** `practice mode shows percent and no PASS/FAIL`; `Drill these calls onDrill with weakest objective ids`; `no onDrill → no Drill button`; MockExamFlow: `submitting writes srs records for answered questions only`.
- [ ] **Step 2:** `npx vitest run src/ui/exam` → FAIL.
- [ ] **Step 3:** Implement; ResultsScreen renders missed items with `ItemReview`.
- [ ] **Step 4:** Same → PASS.
- [ ] **Step 5:** `git commit -m "feat: results modes, drill these, SRS updates after mock exams"`

---

### Task 5: StudyRunner

**Files:**
- Create: `src/ui/study/StudyRunner.tsx`, `src/ui/study/StudyRunner.test.tsx`, `src/ui/study/study.css`

**Interfaces — Produces:**
- `type StudyItem = { kind: 'question'; item: ExamItem } | { kind: 'acronym'; card: AcronymCard }`
- `interface StudyOutcome { responses: Responses; checked: string[]; acronymGrades: { term: string; knew: boolean }[]; timedOut: boolean; finishedAt: Date }`
- `StudyRunner({ items, feedback: 'instant' | 'end', timeLimitMs?: number, startedAt, now = Date.now, onFinish: (o: StudyOutcome) => void })`
- Behaviour: heading `Item i of n` (focused on change, like `ExamRunner`); renders `McqView` / `PbqView` from the exam folder. Instant feedback: a `Check answer` button (disabled until `isAnswered`) locks the item (inputs inside a `fieldset disabled`) and shows `Correct` / `Partly correct` / `Incorrect` in a `role="status"` region plus `ItemReview`. End feedback: no Check; every visited answered item counts as checked at Finish. Acronym card: term shown, `Show answer` reveals expansion, then `I knew it` / `I didn't know it` record a grade and advance. Previous / Next / `Finish` (last item, or any time via `Finish now`). Countdown when `timeLimitMs` set: `role="timer"` text `Time left m:ss` via `formatTime`, announced in a polite live region at 1 minute only; at zero calls `onFinish` with `timedOut: true` once.

- [ ] **Step 1: Failing tests:** `instant: Check answer shows Incorrect with the explanation and locks the options`; `end feedback hides Check and reports answered items as checked at Finish`; `acronym card reveal and grade`; `countdown at zero finishes once with timedOut and only checked items listed`; `unanswered item is not in checked`.
- [ ] **Step 2:** `npx vitest run src/ui/study` → FAIL.
- [ ] **Step 3:** Implement (friendlier study styling in `study.css`; reuse `.exam` question styles).
- [ ] **Step 4:** → PASS.
- [ ] **Step 5:** `git commit -m "feat: study runner with instant feedback, acronym cards and countdown"`

---

### Task 6: Practice and cram flows

**Files:**
- Create: `src/ui/study/PracticeSetup.tsx`, `src/ui/study/PracticeFlow.tsx`, `src/ui/study/CramFlow.tsx`, `src/ui/study/flows.test.tsx`

**Interfaces:**
- `PracticeFlow({ repo, examCode, seed?, presetObjectiveIds?: string[], onExit, onDrill })` — stages `setup → running → results`. Setup: one fieldset per domain with an objective checkbox each (all checked, or only `presetObjectiveIds` when given) and a "whole domain" checkbox; a types fieldset (`Multiple choice` = both MCQ types, then each PBQ template by readable name); `Number of questions` number input (default 10, min 1); feedback radios `Instant` (default) / `At the end`. Live text: `N questions match.`, the over-count note, or `No questions match these choices.` with Start disabled. On finish: `scoreExam` → `buildResult({ mode: 'practice' })` → save → `applyReviews` for `checked` → `ResultsScreen mode="practice"` with `onDrill`.
- `CramFlow({ repo, examCode, seed?, onExit })` — setup: short description, `Use a countdown` checkbox and `Minutes` input (default 10) shown when checked, Start. Runs `assembleCram` with `computeMastery` from stored results; acronym grades → `applyReviews` kind `acronym` quality `knew ? 4 : 1`; question results saved with `mode: 'cram'`; summary via `ResultsScreen mode="cram"` plus `Acronyms: k of m known` when any. A session with zero items shows "Nothing to cram yet." and a Back button.

- [ ] **Step 1: Failing tests** (memory repo, DEV stubbed false like `MockExamFlow.test`): `practice setup with no types checked disables Start and says No questions match`; `count above pool shows the over-count note`; `practice instant run saves a practice result and srs records`; `drill preset checks only the given objectives`; `cram timed out mid-session saves only checked items to srs`; `cram summary reports acronyms known` (inject meta acronyms via a registered fixture exam or mock `listExams`).
- [ ] **Step 2:** `npx vitest run src/ui/study` → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** → PASS.
- [ ] **Step 5:** `git commit -m "feat: practice and cram flows"`

---

### Task 7: Progress screen (mastery, history, trend)

**Files:**
- Create: `src/ui/study/ProgressScreen.tsx`, `src/ui/study/ProgressScreen.test.tsx`

**Interfaces:**
- `ProgressScreen({ repo, examCode, onExit, onDrill })` — loads results, srs and the question pool. Sections: `Mastery by domain` table (domain rows with % or `Not attempted`) then a table per domain of objectives (`Objective`, `Score`, `Questions answered`), each % also drawn as a CSS bar with `aria-hidden`; `Review due now: N questions, M acronyms`; `Drill weakest objectives` button (calls `onDrill(weakestObjectives(m, 5))`, disabled with no attempts); `History` table (`Date`, `Mode`, `Score`, `Result` — PASS/FAIL for mock, `N%` otherwise), and above it a `Score trend` SVG line of mock scores with the passing score as a dashed line, `aria-hidden` (the table is its text equivalent), shown only with ≥ 2 mock results. Empty state: `No attempts yet.`

- [ ] **Step 1: Failing tests:** `shows Not attempted with no results`; `two mock results render the trend svg and history newest first`; `mastery percent for an objective`; `due counts`; `Drill weakest objectives calls onDrill`.
- [ ] **Step 2:** `npx vitest run src/ui/study/ProgressScreen.test.tsx` → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** → PASS.
- [ ] **Step 5:** `git commit -m "feat: progress screen with mastery, history and trend"`

---

### Task 8: Navigation, e2e and handoff

**Files:**
- Modify: `src/App.tsx`, `src/ui/Home.tsx`, `src/ui/Home.test.tsx`, `HANDOFF.md`
- Create: `tests/e2e/study.spec.ts`

**Interfaces:**
- `App` screen state: `{ name: 'home' } | { name: 'mock'; exam } | { name: 'practice'; exam; preset?: string[] } | { name: 'cram'; exam } | { name: 'progress'; exam }`. `onDrill` from mock results, practice results and progress → `practice` with `preset`. Changing screens remounts via `key`.
- `Home` props become `onNavigate?: (screen: Exclude<Screen, { name: 'home' }>) => void`; per exam buttons `Start mock exam: CODE`, `Practice: CODE`, `Cram: CODE`, `Progress: CODE`.

- [ ] **Step 1: Failing tests:** Home: `each exam has practice, cram and progress buttons`. e2e `study.spec.ts`: `practice setup, a checked question and results pass axe`; `practice can be completed with the keyboard only`; `cram (with countdown) passes axe and reaches the summary`; `progress after a mock exam shows history and passes axe`; `Drill these from mock results opens practice with weak objectives checked`.
- [ ] **Step 2:** `npx vitest run src/ui/Home.test.tsx` → FAIL.
- [ ] **Step 3:** Implement routing and buttons.
- [ ] **Step 4:** `npm run check` → lint, typecheck, unit and e2e all pass.
- [ ] **Step 5:** Update `HANDOFF.md` (chunk 5 done, decisions: SM-2 constants, 10-minute lapse, cram = MCQ only, mode field, recency = mock only; next: chunk 6). Commit `"feat: study navigation, e2e; handoff for chunk 6"`.
