# Data+ Math Module, Section 1 (Engine) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the `numeric` question type, a validated lesson structure, the Learn screens with per-lesson status, and one sample lesson, with no bulk content.

**Architecture:** `numeric` joins the question union as a one-unit item (scored like an MCQ, response stored as `[rawText]`). Lessons are bundled JSON validated by Zod and served per exam like questions. Lesson checks run through the existing `StudyRunner` in instant mode and save a result with `mode: 'lesson'`, so mastery and SRS pick them up. Lesson status lives in the settings store (already in backups, so the backup format does not change).

**Tech Stack:** React 18, TypeScript, Zod, Vitest + Testing Library, Playwright + axe.

**Spec:** `docs/superpowers/specs/2026-10-31-dataplus-math-module-design.md` (§5, §6, §8 item 1, §8a, §9).

## Global Constraints

- Original content only; nothing from `_WorkingData/` is copied into the repo.
- axe: no serious or critical violations; every interaction has a keyboard and tap path; light and dark themes; no horizontal overflow at 360 px.
- No GitHub Actions, no Git LFS. No math-rendering library: formulas are plain text with `<sup>`/`<sub>` and an `aria-label` that reads the formula in words.
- Colours in `src/ui` use tokens only (`theme.test.ts`).
- Numeric input: accepts digits, one `.`, a leading `-`; ignores `,`, `$`, `%` and spaces. Blank or unparseable = unanswered. Full credit within `tolerance` (absolute, inclusive), else 0. Worth one MCQ unit.
- Old backups, packs and results must still validate. Backups made after this change need not import into older builds.
- Lesson done threshold: best check score ≥ 80%.
- Lesson check items are ordinary bank questions, `approved`, tagged with a Data+ objective; a lesson may not link a draft.
- Every acronym token in lesson text passes the completeness rule in `docs/acronyms.md`.
- Bash heredocs with an apostrophe are blocked by a local hook; write files with Write/Edit. Multi-line `node -e` fails silently; write a script file.

## Review Focus

1. A student types `1,250`, `$12.50`, `25 %` or `-3.5`: accepted and parsed to 1250, 12.5, 25, -3.5. `1.2.3`, `--4`, `abc`, `.` and `` are unanswered, and **Check answer** stays disabled. → Task 1 `parseNumeric` table test and Task 3 view test.
2. A value exactly at the tolerance edge (value 12.5, tolerance 0.05, typed 12.55) earns full credit despite float error. → Task 2 scoring test (compare with a 1e-9 slack).
3. A lesson check finished early ("Finish now" after one item) must not mark the lesson done: the score is over all check items, unseen = 0. → Task 6 status test.
4. A user pack or old backup with no numeric items still imports; one with a numeric item whose `tolerance` is negative or `value` is not finite is rejected with a path. → Task 1 schema test, Task 4 pack test.
5. Reopening the Learn list after a check shows the new status without a reload, and a corrupt `lessonStatus:<exam>` setting falls back to "Not started" instead of crashing. → Task 6 tests.

---

### Task 1: `numeric` in the domain

**Files:**
- Modify: `src/domain/schema.ts`, `src/domain/types.ts`
- Create: `src/domain/numeric.ts`
- Test: `src/domain/numeric.test.ts`, `src/domain/schema.test.ts`

**Interfaces:**
- Produces:
  - `QUESTION_TYPES` gains `'numeric'` (after `'mcq-multi'`).
  - `interface NumericPayload { prefix?: string; suffix?: string }` and `interface NumericAnswer { value: number; tolerance: number }` in `types.ts`.
  - `parseNumeric(text: string): number | null` in `numeric.ts`.
  - `numericCorrect(answer: NumericAnswer, text: string | undefined): boolean` (inclusive, with `1e-9` slack).
  - `isUnitItem(q: Pick<Question, 'type'>): boolean` — true for `mcq-single`, `mcq-multi`, `numeric` (one scoring unit, never a PBQ).
  - `formatNumericAnswer(q: Question): string` — e.g. `$12.50`, `25% (± 0.5)`; tolerance shown only when > 0.

- [ ] **Step 1: Write failing tests.** `numeric.test.ts`: a table for `parseNumeric` with the Review Focus 1 inputs and outputs; `numericCorrect({value:12.5,tolerance:0.05}, '12.55') === true`, `'12.56' === false`, `undefined === false`; `isUnitItem` true for the three unit types and false for `pbq-match`. `schema.test.ts`: a valid numeric parses; `pbqWeight` on numeric, `tolerance: -1`, `value: Infinity`, a missing `answer.value`, and extra keys in payload each fail with a path under `payload`/`answer`/`pbqWeight`.
- [ ] **Step 2: Run** `npx vitest run src/domain` — new tests FAIL.
- [ ] **Step 3: Implement.** Add a strict union member `{ ...base, type: z.literal('numeric'), pbqWeight: z.undefined(...), payload: z.object({ prefix: z.string().min(1).max(4).optional(), suffix: z.string().min(1).max(8).optional() }).strict(), answer: z.object({ value: z.number().finite(), tolerance: z.number().finite().min(0) }).strict() }`. `parseNumeric`: strip `,`, `$`, `%` and whitespace, then match `/^-?(\d+\.?\d*|\.\d+)$/`.
- [ ] **Step 4: Run** `npx vitest run src/domain` — PASS; `npx tsc --noEmit` clean (fix any exhaustive `Record<QuestionType, …>` the new type breaks, e.g. `TYPE_LABELS`, with the label `'Type a number'`).
- [ ] **Step 5: Commit** `feat: numeric question type in the domain schema`.

### Task 2: Score, assemble and study with `numeric`

**Files:**
- Modify: `src/exam/scoring.ts`, `src/exam/assemble.ts`, `src/study/session.ts`, `src/study/mastery.ts`, `src/ui/study/PracticeSetup.tsx`, `src/ui/study/StudyRunner.tsx`, `src/exam/testFixtures.ts`
- Test: `src/exam/scoring.test.ts`, `src/exam/assemble.test.ts`, `src/study/session.test.ts`, `src/study/mastery.test.ts`

**Interfaces:**
- Consumes: Task 1 `isUnitItem`, `numericCorrect`, `parseNumeric`.
- Produces:
  - Numeric response shape: `ItemResponse` stays `string[] | PartMap`; a numeric response is `[rawText]`.
  - `hasAnswer(q: Question, r: ItemResponse | undefined): boolean` in `scoring.ts`: numeric → `parseNumeric(r[0]) !== null`; otherwise `isAnswered(r)`. `isComplete` delegates to it for numeric.
  - `itemFraction` returns 1/0 for numeric; `scoreExam` gives numeric one unit and `answered: hasAnswer(...)`.
  - `testFixtures.ts`: `numeric(id: string, domain: string, value = 25, tolerance = 0.5): Question`.
  - `MCQ_TYPES` renamed to `UNIT_TYPES: QuestionType[] = ['mcq-single','mcq-multi','numeric']`; `TYPE_NAMES` gains `numeric: 'Type a number'` (practice type filter lists it).

- [ ] **Step 1: Write failing tests.** Scoring: a numeric at 12.55 vs value 12.5 ± 0.05 earns one full unit; `['abc']` is unanswered and earns 0; an exam of 1 MCQ + 1 numeric splits 900 into 450 each. Assembly: `assembleExam` draws numeric items into the per-domain one-unit pool and counts them in `mcqCount`. Session: `assembleCram` includes a due numeric item; `onlySeen` counts numeric as a unit. Mastery: a numeric item has weight 1.
- [ ] **Step 2: Run** `npx vitest run src/exam src/study` — FAIL.
- [ ] **Step 3: Implement** by replacing every `q.type === 'mcq-single' || q.type === 'mcq-multi'` test in these files (and `isMcq` in `session.ts`) with `isUnitItem`, except where options are read (`itemFor` shuffles options only for MCQs; numeric gets `{ question }`). `StudyRunner`'s **Check answer** uses `hasAnswer(current.item.question, …)`, and its `checked` list in end-feedback mode filters with `hasAnswer`.
- [ ] **Step 4: Run** `npx vitest run` — PASS (all existing tests too).
- [ ] **Step 5: Commit** `feat: score, assemble and cram numeric items`.

### Task 3: Numeric view and review

**Files:**
- Create: `src/ui/exam/NumericView.tsx`
- Modify: `src/ui/kit.tsx` (`QuestionView`), `src/ui/exam/ItemReview.tsx`, `src/ui/exam/exam.css`
- Test: `src/ui/exam/components.test.tsx`

**Interfaces:**
- Consumes: Task 1 `NumericPayload`, `parseNumeric`, `formatNumericAnswer`; Task 2 response shape.
- Produces: `NumericView({ item, value, onChange }: { item: ExamItem; value: string; onChange: (v: string[]) => void })`.

- [ ] **Step 1: Write failing tests.** Renders the stem as the input's label (`getByLabelText(stem)`), `prefix`/`suffix` as visible text beside the input, `inputMode="decimal"` and `type="text"`; typing `1,250` calls `onChange(['1,250'])`; clearing calls `onChange([])`; typing `abc` shows the hint "Enter a number, such as 12.5" (linked with `aria-describedby`). `ItemReview` for numeric shows "Your answer" (raw text, or "Not answered") and "Correct answer" from `formatNumericAnswer`.
- [ ] **Step 2: Run** `npx vitest run src/ui/exam` — FAIL.
- [ ] **Step 3: Implement.** Stem in a `<label>` wrapping a `<p className="stem">`; affixes are `aria-hidden` visible spans, and the input's accessible description includes the unit ("Answer in %"). `QuestionView` routes `numeric` to `NumericView` with `value = response?.[0] ?? ''`.
- [ ] **Step 4: Run** `npx vitest run src/ui` — PASS.
- [ ] **Step 5: Commit** `feat: numeric answer view and review`.

### Task 4: Authoring numeric items

**Files:**
- Modify: `src/authoring/starters.ts`, `src/ui/author/QuestionEditor.tsx`, `src/authoring/mdPack.ts`, `docs/question-template.md`
- Test: `src/authoring/starters.test.ts`, `src/ui/author/QuestionEditor.test.tsx`, `src/authoring/mdPack.test.ts`, `src/storage/pack.test.ts`, `src/storage/backup.test.ts`

**Interfaces:**
- Consumes: Task 1 schema.
- Produces:
  - `JSON_STARTERS: Record<JsonType, { payload: unknown; answer: unknown }>` where `JsonType = PbqTemplate | 'numeric'` (rename of `PBQ_STARTERS`); numeric starter is `{ payload: { suffix: '%' }, answer: { value: 25, tolerance: 0.5 } }`.
  - `usesJsonEditor(t: QuestionType): t is JsonType` in `starters.ts`.
  - Markdown: a block with a `Correct Number: <value>` line becomes `numeric`. Optional lines after it: `Tolerance: <n>` (default 0), `Prefix: <text>`, `Suffix: <text>`. Text before `Correct Number:` is the stem; text after the optional lines is the explanation (same `Explanation` heading rule as MCQs).

- [ ] **Step 1: Write failing tests.** Starters: every `JSON_STARTERS` entry parses with `questionSchema`. Editor: choosing "Type a number" shows the payload and answer JSON editors seeded from the starter and no PBQ weight field; saving with `tolerance: -1` lists an error linked to the answer editor. mdPack: a `Correct Number: 12.5` / `Tolerance: 0.05` / `Suffix: %` block yields the numeric question; `Correct Number: twelve` throws `Question 1: ...` naming the line. Pack and backup: a v1 file with a numeric user question imports; existing fixtures with none still import.
- [ ] **Step 2: Run** `npx vitest run src/authoring src/ui/author src/storage` — FAIL.
- [ ] **Step 3: Implement.** In the editor, replace the `isPbqTemplate` checks that decide "JSON editors vs option form" with `usesJsonEditor`; keep `pbqWeight` only for `isPbqTemplate`; widen `parked` to `Partial<Record<JsonType, PbqTexts>>`. Add a "Typed number" section to `docs/question-template.md` with one example.
- [ ] **Step 4: Run** `npx vitest run` — PASS.
- [ ] **Step 5: Commit** `feat: author numeric items in the editor and Markdown`.

### Task 5: Lesson schema, loader and sample lesson

**Files:**
- Create: `src/domain/lesson.ts`, `src/banks/lessons.ts`, `src/banks/dataplus/lessons/A-business-math.json`, `src/banks/dataplus/lessonFixture.ts`, `src/banks/dataplus/numericChecks.ts`
- Modify: `src/banks/dataplus/items/3.2.json` (3 check items), `src/banks/dataplus/fixture.ts` (1 numeric + enough items for the fixture lesson), `src/banks/dataplus/bank.test.ts`, `src/acronyms/content.test.ts`
- Test: `src/domain/lesson.test.ts`, `src/banks/lessons.test.ts`

**Interfaces:**
- Produces:
  - `lessonSchema` (strict) and `type Lesson`:
    ```ts
    {
      id: string;                       // e.g. 'a-percent-change'
      exam: string;
      area: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
      title: string;
      objectiveIds: string[];           // min 1
      meaning: string[];                // 1–2 paragraphs
      formula?: { text: string; spoken: string; symbols: { symbol: string; meaning: string }[] };
      rule?: string[];                  // exactly one of formula / rule
      example: { intro: string; table?: { caption: string; head: string[]; rows: string[][] }; steps: string[] };
      trap: { wrong: string; why: string };
      checkIds: string[];               // 3–5, unique
    }
    ```
    `formula.text` markup: `^{...}` → `<sup>`, `_{...}` → `<sub>`; nothing else. Table rows must match `head` length.
  - `AREA_TITLES: Record<Lesson['area'], string>` (spec §3 headings: "Business math and percentages", "Descriptive statistics", "Inferential statistics", "Correlation and regression", "Data math", "Joins and keys").
  - `getLessons(exam: string): Lesson[]` in `src/banks/lessons.ts`: shipped lessons from `import.meta.glob('./dataplus/lessons/*.json')`, or `lessonFixture` when `VITE_BANK === 'fixture'`; validated on load (throws naming the lesson id).
  - `NUMERIC_CHECKS: Record<string, () => number>` — question id → recomputation of the answer from the item's own numbers.
- Sample lesson `a-percent-change` (objective 3.2): meaning (change ÷ old value, why analysts use it), formula `((new − old) / old) × 100` with spoken text and every symbol named, worked example (old 80, new 100 → +25%; a table with old, new, change, ÷ old, × 100), trap (dividing by the new value gives 20%). Three check items in `3.2.json`: two numeric (one increase, one decrease, both with `suffix: '%'`, `tolerance: 0.5`, "as a percent, rounded to a whole number") and one MCQ on the trap. All original, small numbers, explanations show the steps.

- [ ] **Step 1: Write failing tests.** `lesson.test.ts`: the sample shape parses; both or neither of `formula`/`rule`, 2 or 6 `checkIds`, a repeated check id, and a table row of the wrong length each fail. `lessons.test.ts`: `getLessons('DA0-002')` returns the fixture lesson; unknown exam → `[]`. `bank.test.ts` (shipped bank) gains: every lesson's `checkIds` exist and are `approved`; each lesson with a `formula` links ≥ 1 numeric item; every numeric item's `value` is within its own tolerance of `NUMERIC_CHECKS[id]()` when an entry exists, and both percent-change items have entries. `content.test.ts`: lesson text (meaning, formula, rule, example, trap) passes the same acronym-completeness check as question text.
- [ ] **Step 2: Run** `npx vitest run src/domain src/banks src/acronyms` — FAIL. (Vitest runs with `VITE_BANK=fixture`; `bank.test.ts` reads the shipped files directly, so the shipped lessons must be importable from `lessons.ts` as a named export `shippedLessons` too.)
- [ ] **Step 3: Implement** the schema, loader, sample lesson, items and checks.
- [ ] **Step 4: Run** the same commands — PASS, and existing quota tests still pass.
- [ ] **Step 5: Commit** `feat: lesson schema, loader and percent-change lesson`.

### Task 6: Learn screens and lesson status

**Files:**
- Create: `src/study/lessonStatus.ts`, `src/ui/learn/LearnFlow.tsx`, `src/ui/learn/LessonList.tsx`, `src/ui/learn/LessonView.tsx`, `src/ui/learn/Formula.tsx`, `src/ui/learn/learn.css`
- Modify: `src/exam/result.ts` (mode enum), `src/ui/exam/ResultsScreen.tsx`, `src/ui/study/ProgressScreen.tsx`, `src/ui/screens.ts`, `src/App.tsx`, `src/ui/Home.tsx`
- Test: `src/study/lessonStatus.test.ts`, `src/ui/learn/learn.test.tsx`, `src/exam/result.test.ts`, `src/ui/Home.test.tsx`

**Interfaces:**
- Consumes: Task 5 `getLessons`, `AREA_TITLES`, `Lesson`; Task 2 scoring; `StudyRunner`, `finishAttempt`, `ResultsScreen`, `Table`, `useLoad`, `useFocusHeading`.
- Produces:
  - `examResultSchema.mode` accepts `'lesson'`; `recentQuestionIds` still counts mock only; mastery counts it.
  - `type LessonState = 'not-started' | 'in-progress' | 'done'`; `DONE_THRESHOLD = 0.8`.
  - `loadLessonStatus(repo, exam): Promise<Record<string, { best: number | null }>>` (setting key `lessonStatus:<exam>`; anything that fails a Zod check → `{}`), `markOpened(repo, exam, lessonId)`, `recordCheck(repo, exam, lessonId, fraction)` (keeps the max), `lessonState(entry | undefined): LessonState`.
  - `checkFraction(report: ScoreReport, checkIds: string[]): number` = Σ earned over **all** check ids ÷ (unit × checkIds.length); unseen ids count 0.
  - Screen `{ name: 'learn'; exam: string; lesson?: string }`; Home button `Learn: <code>` placed right after `Acronyms: <code>`.
  - `Formula({ text, spoken })`: `<p role="math" aria-label={spoken}>` with the markup turned into `<sup>`/`<sub>` React elements (never `dangerouslySetInnerHTML`).

- [ ] **Step 1: Write failing tests.** `lessonStatus.test.ts`: absent → not-started; opened → in-progress; `recordCheck(0.67)` then `(0.9)` then `(0.5)` → best 0.9, done; a corrupt setting (`'x'`, `{a:{best:'y'}}`) loads as `{}`; `checkFraction` with 1 of 3 items seen and correct = 1/3. `learn.test.tsx`: the list groups lessons under area headings with a status label per lesson ("Not started" / "In progress" / "Done"); opening a lesson shows h2 title and h3 "What it means", "The formula" (or "The rule"), "Worked example", "Exam trap", "Check your understanding"; the formula element has `role="math"` and the spoken label; starting the check runs the linked items; finishing with all correct saves a result with `mode: 'lesson'` and SRS reviews, shows "Lesson check complete: 100%", and back on the list the lesson reads "Done". `Home.test.tsx`: the Learn button navigates to `{ name: 'learn', exam }`.
- [ ] **Step 2: Run** `npx vitest run src/study src/ui src/exam` — FAIL.
- [ ] **Step 3: Implement.** `LearnFlow` holds the list/lesson/check state; check items are built with `itemFor` in lesson order (fixed seed 0) and run in `StudyRunner` with `feedback="instant"`; on finish call `finishAttempt(..., { mode: 'lesson' }, o.checked)` with `onlySeen`, then `recordCheck` with `checkFraction` computed from a report over the **full** check exam. `ResultsScreen` titles `mode === 'lesson'` as "Lesson check complete" and offers "Back to lesson". `ProgressScreen` history labels the mode "Lesson check". A lesson id in the screen that does not exist shows "Lesson not found." with Back.
- [ ] **Step 4: Run** `npx vitest run` — PASS.
- [ ] **Step 5: Commit** `feat: Learn area with lessons, checks and status`.

### Task 7: End-to-end, accessibility and close-out

**Files:**
- Create: `tests/e2e/learn.spec.ts`
- Modify: `tests/e2e/bank.spec.ts`, `tests/e2e/responsive.spec.ts`, `docs/acronyms.md` (only if lesson text needs a rule note), `HANDOFF.md`

- [ ] **Step 1: Write e2e tests.** `learn.spec.ts` (fixture project): Home → `Learn: DA0-002` → fixture lesson shows "Not started" → open it (status becomes "In progress" on return) → keyboard only: tab to the numeric input, type the answer, Enter/Space on **Check answer**, verdict "Correct", finish → result → back to list shows "Done"; axe clean on the list, lesson and check. `bank.spec.ts`: open `a-percent-change` on the shipped bank, axe clean; one-item practice with type "Type a number" only, axe clean. `responsive.spec.ts`: lesson view and numeric item have no horizontal overflow at phone width, light and dark.
- [ ] **Step 2: Run** `npm run check` — every stage passes (lint, typecheck, unit, builds, e2e with axe). Fix anything found.
- [ ] **Step 3: Whole-branch review.** Dispatch one reviewer (most capable model) over the branch against the spec and this plan; fix every finding, minors included; rerun `npm run check`.
- [ ] **Step 4: Update `HANDOFF.md`**: section 1 done (test counts, decisions: response shape `[rawText]`, `mode: 'lesson'`, status in settings, `NUMERIC_CHECKS`, formula markup); next session = section 2 (content A + B).
- [ ] **Step 5: Commit** `docs: math module section 1 handoff` and merge to `main` per the owner's workflow.
