# Handoff

**Repo:** <https://github.com/ngcfells/cert-exam-trainer> (public)
**Spec (approved):** `docs/superpowers/specs/2026-10-30-comptia-exam-trainer-design.md`

## Current state

- **Chunk 1 is done and merged to `main`:** scaffold, Zod schemas, bank registry (Data+ metadata marked `VERIFY chunk 9`, 2 approved and 1 draft seed question), IndexedDB repo with memory fallback, JSON backup export/import, home screen.
- **Chunk 2 is done on branch `chunk2-exam-ui`** (2026-10-30; 93 unit tests and 8 e2e tests pass; plan: `docs/superpowers/plans/2026-10-30-chunk2-exam-ui.md`):
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

Merge `chunk2-exam-ui` if not done. Then chunk 3: PBQ templates 1–4 (match, order, config, diagram) with per-part scoring, plugged into `ExamRunner` and `scoreExam`. Write its plan with superpowers:writing-plans, then execute it.

**Execution method (owner's choice):** Native. Use superpowers:executing-plans and implement every task inline, then dispatch one final whole-branch reviewer.

## Standing rules

- Do not use GitHub Actions workflows or Git LFS; the owner's quota is low. Deploy to Pages locally from a branch.
- Bundled content must be original. Never ingest dump questions. The acronym harvester keeps only acronym tokens.
- Accessibility is enforced: axe must show no serious or critical violations, and every drag interaction needs a keyboard and tap alternative.
- Update this file at the end of every chunk.
