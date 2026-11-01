# Multi-answer pick counts: design

**Date:** 2026-11-01
**Status:** approved by the owner 2026-11-01
**Scope (owner):** applies to Data+, SecAI+ and every exam added later, unless that exam's design explicitly says otherwise. The rules live in shared code, not per-exam settings.
**Branch:** `chunk11-secai` (the next job on it after this is chunk 11 Tasks 8 and 9)

## Why

Multi-answer questions today all behave as "select all that apply": the answer screen lets a student pick any number of choices, even when the question says "Which TWO…". The owner wants each multi-answer question to say how many to pick, and the answer screen to hold the student to it, the way recent CompTIA exams state the count. The scoring rules change with it, so a "select two" question gives fair partial credit, and "select all" can't be gamed by ticking every box.

## Goals

1. An author chooses **Select two**, **Select three** or **Select all that apply** for each multi-answer question.
2. On "select two" or "select three", once the student has that many picks, the other choices cannot be picked until they unpick one. Nothing else happens: no message, no shake.
3. Scoring follows the owner's rules below.
4. Old backups and question packs still import and behave sensibly.
5. Practice warns at Finish about unanswered and partly answered questions. The mock exam warns about neither.

## Non-goals

- No change to single-answer questions, numeric questions or PBQs. In particular, hotspot PBQs keep their current scoring, which today reuses the select-all rule. The new "picked every choice" rule applies to multi-answer questions only.
- No edits to the shipped bank's JSON. All 228 shipped multi-answer items (126 Data+, 102 SecAI+) already say "two" or "three" in the question text, matching their number of correct answers, and the fallback rule below gives them the right pick count.
- No change to past saved exam scores.

## The pick setting

- Multi-answer questions (`mcq-multi`) gain an optional field, `pick`: a whole number (2 or more) or `"all"`.
  - A number must equal the number of correct answers. The schema rejects a mismatch.
  - `"all"` allows any number of correct answers (2 or more, as today).
  - The field is not allowed on other question types.
- **Missing `pick`** (old backups, old packs, the shipped bank): the question behaves as "select N", where N is its number of correct answers. It never behaves as "select all"; only an explicit `"all"` does that. (Owner's rule: "select all has always been stated in the question.")
- The backup and pack formats stay compatible: old files import unchanged, and new files with `pick` import into this version.

## Question text

- If the question text does not already say how many to pick, the app adds it when it shows the question: "(Choose two.)", "(Choose three.)" or "(Select all that apply.)". (Owner's request: "update question text to declare how many to pick if it is missing".)
- *Builder's call, flagged:* this is done at display time, not by rewriting stored text, so it also covers items written later in the editor or in Markdown. "Already says" means the stem contains the count as a word or digit (two/2, three/3, any case) or the phrase "all that apply". Apply the same check everywhere the stem is shown: exam, practice, cram, lesson checks, review and results.
- Below the options, the hint line says "Select 2." or "Select 3." (today it always says "Select all that apply."). "Select all" items keep "Select all that apply."

## Answer screen (McqView)

- Select two / three: checkboxes. When the number of picks equals N, every unpicked checkbox is disabled; unpicking one enables them again. Disabled controls must still pass the axe check and be announced as unavailable.
- Select all: checkboxes with no limit, as today.
- Single answer: radio buttons, as today.

## Scoring

Each question keeps its current weight in the 900-point score (one unit per MCQ).

- **Select two / three:** each right pick earns 1/N of the question. A wrong pick earns nothing and takes nothing away. One right and one wrong on "select two" = half credit.
  - *Builder's call, flagged:* if a saved response somehow holds more than N picks (only possible through edited or imported data), the question scores 0.
- **Select all:** (right picks − wrong picks) ÷ number of correct answers, never below 0 (the current rule). New: if the student picked every choice, the question scores 0, unless every choice is correct.
- **Single answer:** unchanged.

Progress and mastery are recomputed from saved responses, so past attempts on multi-answer items will show the new scores there. The score saved with each mock exam result does not change. This is accepted.

## "Answered" and the finish warnings

- A "select two/three" question counts as **answered** only with exactly N picks; with fewer it is **partly answered**. A "select all" question counts as answered with one or more picks. This feeds the mock review grid's ✓/○ marks, as PBQs already do (a PBQ is ✓ only when every part is filled).
- **Mock exam:**
  - Keep the "Flag for review" button at the top right of every question (it is already there).
  - Keep the review page as is: question numbers only, no question text, with ✓, ○ and ⚑ marks.
  - The submit dialog no longer mentions unanswered or partly answered questions. It only asks to confirm the submit.
- **Practice:** pressing Finish (or "Finish now") with any unanswered or partly answered question opens a confirm dialog: "You have N unanswered or partly answered questions. Finish anyway?" with "Finish" and "Keep going". With none, Finish works as now. A timer running out still finishes without asking.
  - *Builder's call, flagged:* Cram uses the same runner (StudyRunner), so it gets the same warning; acronym cards in a cram run are not counted. Lesson checks and the acronym quiz and flashcards are not changed.
  - The partly-answered state comes from the same "answered" rule as the mock grid, so PBQs with empty parts also count as partly answered.

## Authoring

- **Editor (QuestionEditor):** the multi-answer type's label changes from "Multiple choice (select all)" to "Multiple choice (more than one answer)". When that type is chosen, a "How many to pick" control offers Select two, Select three and Select all that apply.
  - It defaults to the number of correct answers marked (two if fewer than two are marked).
  - Saving with "Select two" and three correct answers marked shows an inline error on the correct-answer group: "Select two needs exactly 2 correct answers."
  - Editing an old question with no `pick` shows its effective value; saving writes `pick` explicitly.
- **Markdown import (`mdPack.ts`, `md-to-pack`):** a question with several correct answers is still detected as multi-answer. An optional line `Pick: all` (or `Pick: 2`, `Pick: 3`) sets `pick`; without it, `pick` is left unset and the fallback applies. Document the line in `docs/question-template.md` and `docs/content-drafting.md`.
- **Draft tooling** (`draft-ollama.ts`, `check-drafts`): accept `pick`. *Builder's call:* `check-drafts` warns when a shipped multi item's stem does not state its count, so the bank stays explicit.

## Review screens

- ItemReview (results, practice "Check answer", the dev Review screen) shows the hint as on the answer screen ("Select 2.") and the same scoring.

## Tests

- Schema: `pick` accepted and rejected as above; old JSON without `pick` still parses; backups round-trip with `pick`.
- Scoring: unit tests for every rule above, including the "picked every choice" and "more than N picks" cases. Hotspot scoring is unchanged (an existing test should keep passing).
- McqView: picking stops at N; unpicking re-enables; select all has no cap; axe clean.
- Mock: the submit dialog has no unanswered count. Practice: the Finish warning appears and lists the count; "Keep going" returns to the run.
- Editor and Markdown import: the pick control and `Pick:` line.
- Bank test: every shipped multi item's effective pick equals its correct count and its stem states the count.

## Settled after the builder check (my calls)

- **One helper for the pick count.** `effectivePick(q)` returns N or `"all"` (explicit `pick`, else the number of correct answers). Scoring, McqView, ItemReview, the editor, the "answered" rule and the bank test all use it. `"all"` stays "select all" even when only 2 answers are correct.
- **Hotspots never get the new rules.** Keep the current select-all formula as its own function for hotspots; multi-answer MCQs use a new pick-aware function. Existing hotspot tests stay unchanged.
- **Stem check is tied to phrasing, not any digit.** For N: the stem has "two"/"three" as a word, or "select/choose 2/3". For `"all"`: the stem has "all that apply". A stem saying "two" on a select-all question does not suppress "(Select all that apply.)".
- **"Answered" rule.** `isComplete` (which drives the mock review grid) becomes pick-aware in place. Before changing it, check its other callers; if anything besides the review grid and the new Finish warning uses it, keep that caller's behaviour unchanged.
- **Practice Finish count.** Count every question item in the run that is not fully answered, whether skipped or already checked. Acronym cards in cram are not counted.
- **Editor validation.** The pick control never changes by itself when the author marks answers. A mismatch shows the inline error on Save only, for both Select two and Select three.
- **Markdown `Pick:` errors.** A `Pick:` count that doesn't match the correct answers, or a `Pick:` line on a single-answer question, is an import error naming the question number, like the existing import errors.
- **Backups.** No format version bump. Only the current app reads its own backups; an older cached copy of the app would reject `pick`, which is accepted because the site updates on reload.

## Left to the builder

- Exact wording of the dialog and the editor control beyond what is quoted above.
- Where the display-time "(Choose two.)" helper lives.
- Whether `pick` stores `2` or `"two"`, as long as the rules above hold. (This design uses numbers.)
