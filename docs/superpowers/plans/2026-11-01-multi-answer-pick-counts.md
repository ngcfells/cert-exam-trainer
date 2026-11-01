# Multi-answer Pick Counts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Multi-answer questions carry a pick count (select N or select all). The answer screen enforces it, scoring follows the owner's rules, the mock submit dialog stops counting unanswered items, and practice and cram warn at Finish.

**Architecture:** A new pure module `src/domain/pick.ts` owns the rules (effective pick, stem check, display text). Schema, scoring, views, editor, Markdown import and bank checks all call it. The code is shared, so the rules apply to every exam (Data+, SecAI+ and later ones).

**Tech Stack:** React 18 + TypeScript, Zod, Vitest + Testing Library, Playwright e2e.

**Spec:** `docs/superpowers/specs/2026-11-01-multi-answer-pick-counts-design.md`

## Global Constraints

- `pick` exists only on `mcq-multi`: a whole number ≥ 2 that equals the number of correct answers, or `"all"`. Optional.
- Missing `pick` = the number of correct answers. Never "select all".
- Hotspot PBQ scoring does not change.
- Saved mock exam scores do not change; mastery recomputes (accepted).
- No edits to shipped bank JSON.
- Accessibility: axe shows no serious or critical violations. Disabled checkboxes use the `disabled` attribute.
- Branch `chunk11-secai`. Commit after each task. `npm run check` must pass at the end.
- Copy pinned by the spec: "(Choose two.)", "(Choose three.)", "(Select all that apply.)", hint "Select 2." / "Select 3." / "Select all that apply.", editor error "Select two needs exactly 2 correct answers.", practice dialog "You have N unanswered or partly answered questions. Finish anyway?" with "Finish" and "Keep going".

## Review Focus

1. A student moves Next and back on a "select two" item with 2 picks: the other choices are still disabled on return (Task 3 test).
2. A restored or imported response with more picks than allowed scores 0, not partial (Task 2 test).
3. A user question with 4 correct answers and no `pick`, whose stem doesn't say "four": the stem shows "(Choose four.)" and 4 picks are allowed (Task 1 and Task 3 tests).
4. Switching the editor's type from multi to single and back does not save a stale `pick` on a single-answer question (Task 6 test).
5. Lesson checks (LearnFlow uses StudyRunner) never show the Finish warning (Task 5 test).

---

### Task 1: Pick rules, type and schema

**Files:**
- Create: `src/domain/pick.ts`, `src/domain/pick.test.ts`
- Modify: `src/domain/types.ts` (`Question`), `src/domain/schema.ts:38-39, 55-78`, `src/domain/schema.test.ts`

**Interfaces:**
- Produces (from `pick.ts`):
  - `export type PickCount = number | 'all'`
  - `effectivePick(q: Question): PickCount`: `mcq-single` → 1; `mcq-multi` → `q.pick ?? new Set(correct).size`. Callers use it only on MCQs.
  - `stemStatesPick(stem: string, pick: PickCount): boolean`
  - `pickSuffix(pick: PickCount): string`: "(Choose two.)", "(Choose three.)", "(Choose four.)" … up to ten in words, digits beyond that; `'all'` → "(Select all that apply.)".
  - `displayStem(q: Question): string`: the stem, plus a space and `pickSuffix`, only for `mcq-multi` whose stem does not state its pick.
  - `pickHint(pick: PickCount): string`: "Select 2." / "Select 3." / "Select all that apply."
- `Question` gains `pick?: PickCount`.

- [ ] **Step 1: Write failing tests** in `pick.test.ts`:
  - `effectivePick`: multi with 2 correct and no pick → 2; with `pick: 'all'` and 2 correct → `'all'`; single → 1.
  - `stemStatesPick`: true for "Which TWO controls…" (2), "Select 3 answers" (3), "choose 2" (2), "Select all that apply" (`'all'`). False for "Which of the 3 servers fails?" (2), "Step 2 of the process" (3), "Which two…" with `'all'`.
  - Rule for numbers: the word (two/three/…/ten, case-insensitive, whole word) anywhere, or `(select|choose|pick)\s+<digit>`. Rule for `'all'`: `/all that apply/i`.
  - `displayStem`: "Which TWO help most?" unchanged; "Which controls help most?" with 2 correct → "Which controls help most? (Choose two.)"; 4 correct and no pick → ends "(Choose four.)"; `'all'` → ends "(Select all that apply.)"; single → unchanged.
  - `pickHint(2)` → "Select 2."; `pickHint('all')` → "Select all that apply.".
- [ ] **Step 2: Add schema tests** in `schema.test.ts`: multi with `pick: 2` and 2 correct parses; `pick: 3` with 2 correct fails with path `['pick']`; `pick: 'all'` with 2 correct parses; `pick: 1` fails; `pick` on `mcq-single` fails (strict); multi without `pick` still parses.
- [ ] **Step 3: Run** `npx vitest run src/domain` → the new tests fail.
- [ ] **Step 4: Implement.** In `schema.ts`, give only the `mcq-multi` object `pick: z.union([z.number().int().min(2), z.literal('all')]).optional()`. In `superRefine`, when `typeof q.pick === 'number' && q.pick !== n`, add an issue with path `['pick']` and message `` `pick ${q.pick} needs exactly ${q.pick} correct answers` ``. Write `pick.ts`.
- [ ] **Step 5: Run** `npx vitest run src/domain` → pass. Also `npx tsc --noEmit -p .` → clean.
- [ ] **Step 6: Commit** `feat(pick): pick-count rules and schema field`.

### Task 2: Scoring and the "answered" rule

**Files:**
- Modify: `src/exam/scoring.ts:25-47, 72-77`, `src/exam/scoring.test.ts`

**Interfaces:**
- Consumes: `effectivePick` (Task 1).
- Produces:
  - `selectAllFraction(correct: readonly string[], picked: readonly string[]): number`: the old multi formula, `max(0, right − wrong) / correct.length`. Used only by `pbqFraction` for hotspots.
  - `mcqFraction(q: Question, picked: readonly string[]): number` (signature replaces the old one). Rules:
    - single: unchanged (exactly one pick and it is right).
    - pick N: `picked.length > N` → 0; else `right / N`.
    - `'all'`: `picked.length === options.length && correct.length < options.length` → 0; else `selectAllFraction`.
  - `isComplete`: a `mcq-multi` with numeric pick N is complete only with exactly N picks. Select all: ≥ 1 pick. Other types unchanged. (Its only caller is `ExamRunner`; Task 5 adds the second.)

- [ ] **Step 1: Rewrite the `mcqFraction` tests** for the new signature, using the file's existing `mcq(...)` helper or a new multi helper with 5 options:
  - pick 2: right+right → 1; right+wrong → 0.5; right only → 0.5; wrong+wrong → 0; three picks (two right) → 0.
  - pick 3: two right + one wrong → 2/3.
  - `'all'` with 2 correct of 5: a,c → 1; a,c,b → 0.5; all five → 0; a only → 0.5.
  - `'all'` with every option correct and all picked → 1.
  - missing pick behaves as pick N (right+wrong on 2 correct → 0.5, not 0).
- [ ] **Step 2: Add `isComplete` tests**: pick-2 item with 1 pick → false, 2 picks → true; `'all'` item with 1 pick → true. Keep the existing hotspot `pbqFraction` tests unchanged; they must still pass.
- [ ] **Step 3: Run** `npx vitest run src/exam/scoring.test.ts` → fails.
- [ ] **Step 4: Implement** as in Interfaces. `itemFraction` calls `mcqFraction(q, picked)`.
- [ ] **Step 5: Run** `npx vitest run src/exam src/study` → pass. Then `npx vitest run` and fix any other caller or expectation broken by the new partial credit (report each one changed in the commit message).
- [ ] **Step 6: Commit** `feat(scoring): pick-aware multi-answer scoring`.

### Task 3: Answer and review screens

**Files:**
- Modify: `src/ui/exam/McqView.tsx`, `src/ui/exam/ItemReview.tsx:39-48`, `src/ui/exam/components.test.tsx`

**Interfaces:**
- Consumes: `effectivePick`, `displayStem`, `pickHint` (Task 1).

- [ ] **Step 1: Write failing tests** in `components.test.tsx`:
  - McqView, pick-2 item: hint "Select 2." shown; after picking two, the other checkboxes are disabled; unpicking one enables them; a click on a disabled checkbox does not call `onChange` with a third id.
  - Re-render with `selected` of 2 ids (as after Next/Previous): the others are disabled from the start.
  - `'all'` item: hint "Select all that apply."; picking every option is possible.
  - A 4-correct item with no pick and a stem without the count: the legend ends "(Choose four.)", and 4 picks are allowed.
  - ItemReview shows `displayStem` text and the hint for a multi item.
  - axe: no serious or critical violations with disabled checkboxes (use the file's existing axe helper if it has one).
- [ ] **Step 2: Run** `npx vitest run src/ui/exam/components.test.tsx` → fails.
- [ ] **Step 3: Implement.** McqView: legend shows `displayStem(q)`; hint `pickHint(pick)` for multi; for numeric pick N, `disabled={!checked && selected.length >= N}`. ItemReview: `displayStem(q)` in the stem line and the hint under it for `mcq-multi`.
- [ ] **Step 4: Run** the file → pass.
- [ ] **Step 5: Commit** `feat(ui): enforce pick count on multi-answer questions`.

### Task 4: Mock submit dialog without unanswered count

**Files:**
- Modify: `src/ui/exam/ExamRunner.tsx:85, 149-166`, `src/ui/exam/ExamRunner.test.tsx:80-90`

- [ ] **Step 1: Change the test** "confirms before submitting and names unanswered count" to "confirms before submitting without counting unanswered": the dialog does not contain "unanswered" and does contain "You can't change your answers after you submit." Keep the review-grid tests (✓, ○, ⚑ labels) as they are, and add one: a pick-2 item with 1 pick shows as "unanswered" in the grid.
- [ ] **Step 2: Run** → fails.
- [ ] **Step 3: Implement.** Remove the `unanswered` count; the dialog's paragraph reads "You can't change your answers after you submit." The flag button in `TopBar` stays as is.
- [ ] **Step 4: Run** `npx vitest run src/ui/exam` → pass.
- [ ] **Step 5: Commit** `feat(exam): submit dialog no longer counts unanswered items`.

### Task 5: Finish warning in practice and cram

**Files:**
- Modify: `src/ui/study/StudyRunner.tsx`, `src/ui/study/PracticeFlow.tsx`, `src/ui/study/CramFlow.tsx`, `src/ui/study/StudyRunner.test.tsx`

**Interfaces:**
- Consumes: `isComplete` (Task 2).
- Produces: `StudyRunner` prop `warnIncomplete?: boolean` (default false). PracticeFlow and CramFlow pass `true`; LearnFlow does not.

- [ ] **Step 1: Write failing tests** in `StudyRunner.test.tsx`:
  - With `warnIncomplete`, 3 question items, one answered: "Finish now" opens a dialog with "You have 2 unanswered or partly answered questions. Finish anyway?"; "Keep going" closes it, `onFinish` is not called, and focus returns to the run; "Finish" calls `onFinish` once.
  - A pick-2 item with one pick counts as partly answered.
  - Acronym card items are not counted.
  - All answered: Finish calls `onFinish` with no dialog.
  - Without `warnIncomplete`: Finish never shows the dialog.
  - Timer expiry with `warnIncomplete` finishes with no dialog.
- [ ] **Step 2: Run** → fails.
- [ ] **Step 3: Implement.** Count `items` of kind `'question'` where `!isComplete(q, responses[id])`. Use a `<dialog>` like ExamRunner's (heading "Finish now?", initial focus on "Keep going"); "1 unanswered or partly answered question" for one. Pass `warnIncomplete` from PracticeFlow and CramFlow.
- [ ] **Step 4: Run** `npx vitest run src/ui/study src/ui/learn` → pass.
- [ ] **Step 5: Commit** `feat(study): warn at Finish about unfinished questions`.

### Task 6: Editor pick control

**Files:**
- Modify: `src/ui/author/QuestionEditor.tsx` (Draft, `newDraft`, `fromQuestion`, `buildQuestion`, `describeIssue`, type change handler ~line 205, options fieldset ~354), `src/ui/author/typeLabels.ts:6`, `src/ui/author/QuestionEditor.test.tsx`

**Interfaces:**
- Consumes: `effectivePick`, `PickCount` (Task 1).
- `Draft` gains `pick: PickCount`.

- [ ] **Step 1: Write failing tests:**
  - Type label reads "Multiple choice (more than one answer)".
  - Choosing that type shows a select labelled "How many to pick" with "Select two", "Select three", "Select all that apply". Default: 2 marked → two; 3 marked → three; 4+ marked → all; fewer than 2 → two.
  - Saving Select two with 3 correct marked shows "Select two needs exactly 2 correct answers." on the correct-answer group, and saves nothing.
  - Marking a third correct answer does not change the control.
  - Editing an old multi question with 3 correct and no `pick` shows Select three; saving writes `pick: 3`.
  - The control only ever offers Select two, Select three and Select all (owner, 2026-11-01). A loaded question whose effective pick is 4 or more shows Select all; saving writes `pick: 'all'`.
  - Multi → single → save: the saved question has no `pick`.
- [ ] **Step 2: Run** `npx vitest run src/ui/author` → fails.
- [ ] **Step 3: Implement.** `buildQuestion` sets `raw.pick = d.pick` only for `mcq-multi`. `describeIssue` maps path head `'pick'` to field `'correct'` with text `` `Select ${word} needs exactly ${n} correct answers.` `` (word from the same number-word table as `pickSuffix`; export it from `pick.ts` as `pickWord(n: number): string`). The default rule runs when the type changes to multi, not on every mark.
- [ ] **Step 4: Run** → pass; then `npx vitest run` and update any other test that used the old label.
- [ ] **Step 5: Commit** `feat(editor): choose how many answers to pick`.

### Task 7: Markdown import and authoring docs

**Files:**
- Modify: `src/authoring/mdPack.ts:25, 58-76, 238-250`, its test file, `docs/question-template.md:22-60`, `docs/content-drafting.md:27`

- [ ] **Step 1: Write failing tests:**
  - A block with `Pick: all` at the top and 2 correct → `mcq-multi` with `pick: 'all'`.
  - `Pick: 2` with 2 correct → `pick: 2`. No `Pick:` line → no `pick` field.
  - `Pick: 3` with 2 correct → throws `Question 1: Pick 3 needs exactly 3 correct answers`.
  - `Pick: 2` on a single-answer question → throws `Question 1: Pick is only for questions with more than one correct answer`.
- [ ] **Step 2: Run** → fails.
- [ ] **Step 3: Implement.** Add `pick` to `META` (top-of-block only, like `id`, `objectives`, `difficulty`); value `all` or a whole number. Check both errors in `parseMcq`'s caller before the schema parse.
- [ ] **Step 4: Update docs.** `question-template.md`: replace the select-all line (59) with the pick rules (select N: equal share per right pick; select all: wrong cancels right, picking everything scores 0 unless all are correct; missing `Pick:` = number of correct answers) and show a `Pick: all` example. `content-drafting.md:27`: shipped `mcq-multi` items leave `pick` unset and state the count in the stem.
- [ ] **Step 5: Run** `npx vitest run src/authoring` → pass.
- [ ] **Step 6: Commit** `feat(authoring): Pick line in Markdown packs`.

### Task 8: Bank checks

**Files:**
- Modify: `src/banks/shippedChecks.ts` (`describeShippedBank`), `scripts/check-drafts.ts:40-49`

- [ ] **Step 1: Add the shipped-bank test** "every multi-answer stem states its pick count": for each `mcq-multi`, `stemStatesPick(q.stem, effectivePick(q))` is true. It runs for every exam that calls `describeShippedBank`.
- [ ] **Step 2: Run** `npx vitest run src/banks` → passes (all 228 shipped items state the count). If any fail, report them to the owner rather than editing the bank.
- [ ] **Step 3: check-drafts.** Inside the `r.success` block, push `stem does not say how many to pick (add "Which TWO…" or a Pick: line)` when the same check fails.
- [ ] **Step 4: Run** `npm run check-drafts -- --exam CY0-001 src/banks/secai/items` (or the script's usual arguments) → "no problems" for the pick check.
- [ ] **Step 5: Commit** `test(banks): multi-answer stems must state the pick count`.

### Task 9: Full check, handoff, final review

- [ ] **Step 1: Run** `npm run check` → lint, typecheck, builds, unit and e2e all pass. Fix any e2e that relied on the old submit text or select-all behaviour.
- [ ] **Step 2: Update `HANDOFF.md`:** mark the owner request done (commit range, test counts, the calls listed in the spec) and keep chunk 11 Tasks 8 and 9 as next.
- [ ] **Step 3: Dispatch one whole-branch reviewer on Opus** over the commits since `f131926`, with the spec and this plan. Fix every finding, minors included; rerun `npm run check`.
- [ ] **Step 4: Commit** `docs: handoff for multi-answer pick counts`. Do not merge or deploy; that happens with chunk 11 Task 9.
