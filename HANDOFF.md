# Handoff

**Repo:** <https://github.com/ngcfells/cert-exam-trainer> (public)
**Spec (approved):** `docs/superpowers/specs/2026-10-30-comptia-exam-trainer-design.md`

## Current state

- **Chunk 1 is done and merged to `main`:** scaffold, Zod schemas, bank registry (Data+ metadata marked `VERIFY chunk 9`, 2 approved and 1 draft seed question), IndexedDB repo with memory fallback, JSON backup export/import, home screen.
- **Chunk 2 is done and merged to `main`** (2026-10-30; 100 unit tests and 8 e2e tests pass; plan: `docs/superpowers/plans/2026-10-30-chunk2-exam-ui.md`):
  - `src/exam/`: seeded RNG (`mulberry32`), assembly (`assembleExam`), scoring (`scoreExam`), result record (`examResultSchema`, `recentQuestionIds`).
  - `src/ui/exam/`: setup, runner (top bar, timer, flag, Previous/Next, review grid, confirm dialog, auto-submit), results screen (score, PASS/FAIL, domain table, what to study, review of missed items with explanations).
  - Results are saved to the `results` store with their seed. Backup import validates them strictly.
  - The deferred chunk-1 items (a)–(f) are fixed. `srs` records are still only checked for `id`.
- **Decisions made in chunk 2:**
  - Scoring: unit = 900 / (MCQ count + Σw). This matches spec §7 exactly when the bank fills the exam, and keeps a small bank scored out of 900.
  - Select-all: (correct − wrong) / correct count, floored at 0.
  - Recency: questions from the last 3 attempts at that exam are used only after fresh ones in the same domain.
  - PBQ count weights `[1,3,3,3,1,1]` for 1..6; Σw is capped at maxQuestions − 1.
  - The timer is announced to screen readers only at 10, 5 and 1 minutes.
  - An in-progress exam is **not** persisted; reloading loses it.
  - PBQs: assembly supports them, but `MockExamFlow` passes `pbqTypes: []`, and `scoreExam` scores PBQs 0. Chunk 3 must enable the types and plug in per-part scoring.
  - "Drill these" is a disabled button until practice mode (chunk 5).
  - The question pool is bundled + user questions (the Ours/Mine/Both toggle is chunk 6).
- **Chunk 3 is done and merged to `main`** (2026-10-30; 119 unit tests and 8 e2e tests pass; plan: `docs/superpowers/plans/2026-10-30-chunk3-pbq-templates-1-4.md`):
  - `src/domain/pbq.ts`: payload/answer schemas for `pbq-match`, `pbq-order`, `pbq-config`, `pbq-diagram`, with cross-reference checks in `questionSchema`. Helpers: `correctParts`, `partIds`, `partLabel`, `valueText`, `elementIds`, `TEMPLATE_1_4`.
  - Every template 1–4 PBQ is a set of parts (`PartMap`: partId → value id). Order parts are positions `'0'..'n-1'`.
  - Scoring: `pbqFraction` = matching parts / parts; `ItemScore.parts` carries per-part right/wrong. `Responses` values are `string[]` (MCQ) or `PartMap` (PBQ).
  - Assembly shuffles PBQ elements into `ExamItem.elementOrder`; results store `elementOrders`.
  - `src/ui/exam/pbq/`: one view per template plus `PbqView`. Each part has a labelled native `<select>` as its keyboard and tap path. HTML5 drag is a mouse-only enhancement, and the chip pool is `aria-hidden`.
  - Results show a per-part table and any `partExplanations`.
  - `?seed=N` in the URL replays an attempt. In the e2e tests, seed 1 draws all four PBQ types.
  - The Data+ bank has one original approved PBQ per template.
- **Decisions made in chunk 3:**
  - An order PBQ is unanswered until the user moves a step or chooses "Keep this order".
  - The review grid and the submit dialog count a PBQ as answered only when every part is filled (`isComplete`). Scoring still gives credit for whatever parts are filled.
  - Diagrams are structured data (nodes, edges, zones) drawn as SVG, never raw markup, plus a visually hidden text description. Below 40rem, the zone selects stack under the image.
  - Shuffling PBQ elements uses the shared RNG, so a given seed now assembles a different exam than it did in chunk 2. Old results still validate.
  - Backups from this build that contain PBQ responses won't import into older builds.
- **Chunk 4 is done on branch `chunk4-pbq-5-8`, not yet merged** (2026-10-30; 134 unit tests and 10 e2e tests pass; plan: `docs/superpowers/plans/2026-10-30-chunk4-pbq-templates-5-8.md`):
  - `src/domain/pbq.ts` covers all 8 templates (`PBQ_TEMPLATES`, `isPbqTemplate`). Templates 5–8 use the same `PartMap` model. One function, `partCorrect`, decides every part for scoring, results and the answer key.
  - `pbq-terminal`: steps are typed commands, or "choose an action" when the step has `options`. `matchesPattern` trims and collapses whitespace but keeps case. `*` matches one or more non-space characters; everything else is literal.
  - `pbq-data`: a real captioned table, plus an optional bar chart that is `aria-hidden` because the table is its text equivalent. The schema rejects rows of the wrong length and non-numeric charted cells.
  - `pbq-hotspot`: one checkbox per spot is the keyboard and tap path, and the SVG is a click enhancement. It is scored with the select-all rule, so an untouched hotspot scores 0 and shows as unanswered.
  - `pbq-buckets`: one select per item, with drag onto buckets as an enhancement. Items are shuffled per attempt.
  - The Data+ bank has one original approved PBQ per template (8 in all). The e2e tests use seeds 4 and 67, which together cover all 8 types.
- **Deferred minors from the chunk-4 review:**
  - `isAnswered` counts whitespace-only terminal text as answered.
  - Results show a wildcard pattern's raw `*` as the correct answer.
  - Duplicate data column names are allowed (they are used as React keys).
  - Placed bucket items can't be dragged again.
  - The `*` wildcard rules aren't documented for authors.
  - One results test asserts against fixture text.
- **Commands:**
  - `npm run check` runs lint, typecheck, unit tests, the single-file build and e2e with axe.
  - `npm run build` writes `dist/`; `npm run build:single` writes `dist-single/index.html`.
  - On a new machine, run `npx playwright install chromium` first.
- **Open issues and notes:**
  - Data+ objectives are placeholders until chunk 9.
  - Manual keyboard-only pass: covered by the automated keyboard e2e; a human pass in a real screen reader is still to do.
- **Priority:** Data+ (DA0-002) first, working end to end, before any other exam.
- **Bank targets per exam:** at least 500 MCQs and at least 80 PBQs (10 of each of the 8 types).

## Next session

First, merge `chunk4-pbq-5-8` into `main` once the owner approves. Then chunk 5 (practice mode; see the spec's chunk list), which also enables the "Drill these" button. Write the plan with superpowers:writing-plans, then execute it.

**Execution method (owner's choice):** Native. Use superpowers:executing-plans and implement every task inline, then dispatch one final whole-branch reviewer.

## Standing rules

- Do not use GitHub Actions workflows or Git LFS; the owner's quota is low. Deploy to Pages locally from a branch.
- Bundled content must be original. Never ingest dump questions. The acronym harvester keeps only acronym tokens.
- Accessibility is enforced: axe must show no serious or critical violations, and every drag interaction needs a keyboard and tap alternative.
- Update this file at the end of every chunk.
