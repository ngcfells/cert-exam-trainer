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
- **Chunk 4 is done and merged to `main`** (2026-10-30; 137 unit tests and 10 e2e tests pass; plan: `docs/superpowers/plans/2026-10-30-chunk4-pbq-templates-5-8.md`):
  - `src/domain/pbq.ts` covers all 8 templates (`PBQ_TEMPLATES`, `isPbqTemplate`). Templates 5–8 use the same `PartMap` model. One function, `partCorrect`, decides every part for scoring, results and the answer key.
  - `pbq-terminal`: steps are typed commands, or "choose an action" when the step has `options`. `matchesPattern` trims and collapses whitespace but keeps case. `*` matches one or more non-space characters; everything else is literal.
  - `pbq-data`: a real captioned table, plus an optional bar chart that is `aria-hidden` because the table is its text equivalent. The schema rejects rows of the wrong length and non-numeric charted cells.
  - `pbq-hotspot`: one checkbox per spot is the keyboard and tap path, and the SVG is a click enhancement. It is scored with the select-all rule, so an untouched hotspot scores 0 and shows as unanswered.
  - `pbq-buckets`: one select per item, with drag onto buckets as an enhancement. Items are shuffled per attempt.
  - The Data+ bank has one original approved PBQ per template (8 in all). The e2e tests use seeds 4 and 67, which together cover all 8 types.
- All chunk-4 review findings are fixed, minors included. Rules for writing PBQs (terminal `*` wildcard, quoting, data and hotspot rules) are in `docs/pbq-authoring.md`.
- **Chunk 5 is done and merged to `main`** (2026-10-30; 196 unit tests and 16 e2e tests pass; all review findings fixed, minors included; plan: `docs/superpowers/plans/2026-10-30-chunk5-study-modes.md`):
  - `src/study/`: `srs.ts` (SM-2, strict `srsRecordSchema`, `applyReviews`), `mastery.ts` (`computeMastery`, `weakestObjectives`, `history`, `trendPoints`), `session.ts` (`assemblePractice`, `assembleCram`).
  - `src/ui/study/`: `PracticeSetup`/`PracticeFlow`, `CramFlow`, `StudyRunner` (shared by both), `ProgressScreen` (mastery tables, due counts, history table, SVG trend line).
  - Home has Mock exam / Practice / Cram / Progress buttons per exam; `App` routes on a `Screen` union (`src/ui/screens.ts`).
  - "Drill these" (mock and practice results) and "Drill weakest objectives" (progress) open practice preset to those objectives.
  - `saveAttempt` saves a result and schedules SRS reviews for mock, practice and cram.
- **Decisions made in chunk 5:**
  - Results gain an optional `mode` (`practice` | `cram`; absent = mock). Old results still validate. Recency (`recentQuestionIds`) counts mock attempts only; mastery counts every mode.
  - SM-2: start ease 2.5, floor 1.3; intervals 1, 6, then interval × previous ease. Quality from score: < 50% → 1 (miss), < 100% → 3, 100% → 5; acronyms: knew 4, didn't 1. A miss is due again in 10 minutes.
  - Mock exams schedule answered questions only; practice and cram schedule only questions the user checked (instant) or answered (end feedback). Unseen items are never marked missed.
  - Cram is MCQ-only, 15 items: due questions (most overdue first), then the 3 weakest objectives in order, then anything; up to 5 acronyms (due, then new). Data+ has no acronyms yet, so cram shows none until chunk 7/9.
  - Backup import now rejects malformed `srs` records (strict schema, ISO datetimes). If an SRS field is ever added, bump the backup `version` and accept both shapes, or older builds and this one will reject each other's files.
  - Practice and cram save and score only the questions the user reached ("Finish now" or a timeout leaves the rest out), so unseen questions never count as wrong in mastery.
  - Study load failures show "Could not load your data." with a way back; after Check answer or Show answer, focus moves to the verdict or to "I knew it"; a checked PBQ ignores later drag-and-drop.
- **Chunk 6 is done and merged to `main`** (2026-10-30; 251 unit tests and 17 e2e tests pass; plan: `docs/superpowers/plans/2026-10-30-chunk6-question-adder.md`):
  - `src/storage/pack.ts`: the question pack (`cert-exam-trainer-questions` v1, `{ format, version, exportedAt, questions }`) is the one interchange format for user questions. Entries may leave out `source`, `acronyms`, `status` and `explanation`. Import always merges. Packs and backups share `validateUserQuestions` (`backup.ts`), which now also rejects an id repeated within a file.
  - `src/banks/pool.ts`: `loadPool` applies the Ours / Mine / Both setting (`sourceFilter`, default `both`) for mock, practice, cram and progress. `SourceToggle` sits on Home.
  - `src/ui/author/`: `MyQuestions` (list, edit, delete with confirm, pack import and export) and `ContentNotice` (setting `userContentNoticeAccepted`; add and import stay hidden until it is accepted). `QuestionEditor` has a structured form for MCQs and, for PBQs, the shared fields plus JSON editors for payload, answer and part explanations, seeded from `src/authoring/starters.ts`. It validates live with `questionSchema` and previews live with `McqView`/`PbqView`.
  - `npm run md-to-pack -- <in.md...> --exam DA0-002 --out <file.json>` converts the plain-text format in `docs/question-template.md` into a pack (parser: `src/authoring/mdPack.ts`). PBQs are written as a ```` ```pbq ```` JSON fence. The script can't read screenshots: a person, or Claude, turns them into a fence, and the script validates it.
- **Decisions made in chunk 6:**
  - PBQ authoring uses JSON editors seeded with a valid starter, rather than a separate structured form per template; the live preview and the error list (with paths) make this workable.
  - Generated ids: the editor uses `user-<uuid>`; md-to-pack uses `<prefix>-<FNV hash of stem>` unless an `Id:` line is given.
  - Image-only Markdown blocks are skipped with one warning.
  - Only approved user questions enter the mock, practice and cram pools, the same rule as bundled questions; the editor says so under Status.
  - Importing on a My questions screen skips questions for other exams and reports them as skipped.
  - Editor errors appear after the first save attempt: focus moves to a summary of links, and each field gets `aria-invalid` and `aria-describedby`. Each PBQ template keeps its own JSON while the author switches types, and Cancel asks before discarding changes.
  - The final review's 3 important and 8 minor findings are all fixed. One minor finding (Home shows only the "ours" count) did not apply: Home already shows a "(mine)" count.
- **Chunk 7 is done and merged to `main`** (2026-10-30; 288 unit tests and 20 e2e tests pass; all review findings fixed, minors included; plan: `docs/superpowers/plans/2026-10-30-chunk7-acronym-tester.md`):
  - `src/acronyms/`:
    - `extract.ts`: `extractAcronyms`, `questionText`, `NOT_ACRONYMS`.
    - `list.ts`: `AcronymEntry` with source `official`, `community` or `mine`; `mergeAcronyms`.
    - `quiz.ts`: `assembleDeck`, `isCorrect`, `normalizeAnswer`, `buildChoices`.
    - `userList.ts`: the user's list in the setting `userAcronyms:<exam>`; `loadAcronyms`; `unexpandedUserTerms`.
  - `content.test.ts` is the build-time check: every acronym token in a bundled question must have an expansion. The rules are in `docs/acronyms.md`.
  - `src/ui/acronyms/`:
    - The `AcronymFlow` screen, reached from the `Acronyms: <code>` button on Home.
    - The setup lists the full table, the choice of mode (flashcards or quiz), which side to show, due-and-new or all cards, the number of cards, and for quizzes typed or chosen answers with an optional time limit of 2, 5 or 10 minutes.
    - `FlashcardRunner`, `QuizRunner` (with "Count as correct" for typos), `AcronymResults` and `MyAcronyms` (add, edit, delete, plus terms found in the user's questions).
  - Cram and Progress now use the merged list and respect the source filter.
  - Data+ has 6 `community` acronyms that we wrote (API, CSV, ETL, JSON, PII, SQL). The official list comes in chunk 9.
- **Decisions made in chunk 7:**
  - The source filter applies to acronyms: `ours` gives official and community entries, `mine` gives the user's only, `both` gives all. On a repeated term, official wins over community, and community over mine. A user cannot add a term that is already in the built-in list.
  - SRS: knew or correct counts as quality 4, didn't know or wrong as 1. Unanswered cards are never graded, including after a timeout.
  - Typed answers ignore case, punctuation, `&`/`and` and parentheticals. Acronym answers ignore everything except letters and digits.
  - Quiz results are not saved to the `results` store; only SRS is updated.
  - `NOT_ACRONYMS` was seeded with SQL keywords and log levels.
- **Owner's working data:** `_WorkingData/` (gitignored) holds the owner's third-party practice questions and screenshots. They are for building and testing only: **never ship, bundle, commit or copy them into fixtures.** `_WorkingData/DataPlus/addQuestions.pack.json` (18 MCQs and 1 PBQ, built with `pbq1.md`) imports cleanly (19 imported, 0 skipped).
- **Commands:**
  - `npm run check` runs lint, typecheck, unit tests, the single-file build and e2e with axe.
  - `npm run build` writes `dist/`; `npm run build:single` writes `dist-single/index.html`.
  - On a new machine, run `npx playwright install chromium` first.
- **Open issues and notes:**
  - Tooling: a local hook blocks Bash heredocs that contain an apostrophe; write files with Write/Edit instead.
  - Manual keyboard-only pass: covered by the automated keyboard e2e; a human pass in a real screen reader is still to do.
- **Priority:** Data+ (DA0-002) first, working end to end, before any other exam.
- **Bank targets per exam:** at least 500 MCQs and at least 80 PBQs (10 of each of the 8 types).

- **Chunk 8 is done and merged to `main`** (2026-10-30; 331 unit tests and 30 e2e tests pass; all final-review findings fixed, minors included; plan: `docs/superpowers/plans/2026-10-30-chunk8-dataplus-bank.md`).
  - Data+ objectives, metadata and the official acronym list are verified (no `VERIFY chunk 9` values left; 18 objectives).
  - The shipped bank is JSON per objective in `src/banks/dataplus/items/`: 553 MCQs (552 approved, 1 draft seed) and 104 approved PBQs. Per template: match 15, buckets 14, order 13, config 13, data 13, diagram 12, hotspot 12, terminal 12.
  - Unit tests and the fixture e2e run against the fixture bank (`VITE_BANK=fixture`, build `dist-e2e`). `src/banks/dataplus/bank.test.ts` checks the shipped bank: schema, acronyms, near-duplicates, key position and length tells, no order PBQ authored in answer order, and targets (totals, per template, per-objective quotas).
  - Playwright has two projects: `fixture` (everything but `bank.spec.ts`) and `bank` (`tests/e2e/bank.spec.ts` on `dist-single`: Home count, a full mock exam, and a one-item practice per PBQ template with axe).
  - Dev-only review tool: `npm run dev` → Review bank. The write-back endpoint refuses cross-origin requests and writes the new file before trimming the old one. Nothing of it ships in `dist/` or `dist-single/`.
- **Decisions made in chunk 8:**
  - Drafting used Claude subagents, as the Ollama trial only met the bar at the margin (spec §12 note).
  - A full mock exam shows fewer than 90 items, because PBQs take their weight in slots; the bank e2e checks 75 to 90.
  - ESLint ignores `content-drafts/`, `dist-e2e/` and `_WorkingData/`.
  - Azure Data Studio (retired 2026-02-28) stays as an exam-named tool but is never keyed as the current recommendation.

- **Chunk 9 is done and merged to `main`** (2026-10-30; plan: `docs/superpowers/plans/2026-10-30-chunk9-legal-branding-deploy.md`; all final-review minors fixed):
  - **License (owner):** code is MIT + Commons Clause (`LICENSE`); bundled questions are CC BY-NC 4.0 plus an additional permission for teaching and internal training, businesses included, at no charge to learners (`CONTENT_LICENSE.md`). Summary: free to use and share, nobody may sell it or charge for access. Up to `8f4be2d` was plain MIT. The owner should check their employment IP clause, and a legal review is still recommended before a public launch.
  - `src/ui/legal.ts` holds `APP_NAME`, `DISCLAIMER_POINTS` (README must match, `legal-files.test.ts`), `LICENSE_SUMMARY`, `KOFI_URL`. The About screen (footer "About" button) shows version (`__APP_VERSION__`), disclaimer, licenses, privacy, and the owner's Ko-fi tip box (text copied from battletech-tools gh-pages; a plain link, no widget script, dark text on `#72a4f2` for contrast).
  - Theme: colour tokens in `src/index.css` (light, dark via `prefers-color-scheme`, and `data-theme`); area CSS files use tokens only (`theme.test.ts` forbids hex/rgb in `src/ui`). SVG colours come from CSS. Home has Theme (system/light/dark) and Reduce motion (`src/ui/display.ts`, settings `theme`, `reducedMotion`).
  - Playwright projects: `fixture`, `bank`, `phone` (360×780 touch), `tablet` (820×1180 touch), `pwa` (serves `dist/` at `/cert-exam-trainer/` via `vite preview`). `responsive.spec.ts` checks no horizontal overflow and axe in light and dark on every PBQ type.
  - PWA: vite-plugin-pwa 1.2.0 (`generateSW`, autoUpdate) in the `dist/` build only; `__PWA__` compiles registration out of the single file, which also skips `public/`. `npm run check` now builds `dist/` and `dist-single/` before unit tests (`pwa-build.test.ts`).
  - `npm run deploy [-- --dry-run] [-- --force]` (`scripts/deploy-lib.ts`): refuses uncommitted changes, refuses non-main without `--force`, builds `dist/`, commits it plus `.nojekyll` to `gh-pages` through a temporary worktree, pushes to origin.
- **Decisions made in chunk 9:** app name stays Cert Exam Trainer; deploy target is the `gh-pages` branch.

- **Streamline refactor merged** (2026-10-30, `refactor/streamline`; 354 unit and 45 e2e tests pass): app code down 481 lines (7,261 → 6,780, about 6.6%) with no behaviour change.
  - `src/ui/kit.tsx`: `QuestionView` (MCQ or PBQ), `useLoad` (`undefined` loading, `null` failed, `reload(showLoading)`), `useCountdown`, `useFocusLater`, `useFocusHeading`, `RunnerFrame` (study, quiz and flashcard runners), `AcronymFlip`, `metaFor`, `pct`, `toCount`, `Loading`. `src/ui/Table.tsx` is the one captioned-table component (kept separate to avoid an import cycle with the PBQ views).
  - `finishAttempt` and `acronymReview` (`src/ui/exam/saveAttempt.ts`) score and save attempts for mock, practice and cram.
  - `src/domain/pbq.ts`: one `TEMPLATES` table gives each template's parts, answer key and shuffled pool. PBQ views share `PartSelects` and `Boxes` (`pbq/parts.tsx`).
  - Mock exam now shows the load-error screen instead of hanging when loading fails.
  - Decision: the owner chose not to collapse formatting just to reach a 25% line cut.

## Next session

- **Deployed 2026-10-30:** <https://ngcfells.github.io/cert-exam-trainer/> is live from `gh-pages` (Pages already configured). Redeploy with `npm run deploy` after merging to `main`.
- **Then start chunk 10: remaining tooling** (spec §13 item 10): the acronym harvester (dump-site source off by default). The dev-only review tool already exists from chunk 8.
- Write the plan with superpowers:writing-plans, then execute it. Fix every review finding, minors included, before closing the chunk.
- **Execution method (owner's choice):** Native. Use superpowers:executing-plans and implement every task inline, then dispatch one final whole-branch reviewer.
- **Owner rules for sessions:**
  - Content work runs one domain at a time, with a `/clear` between.
  - Subagents use the cheapest model that does the job; final whole-branch reviews of a large content chunk run on Opus.
  - Inline `node -e` with a multi-line script fails silently in the Bash tool here. Write a script file instead.

## Standing rules

- Do not use GitHub Actions workflows or Git LFS; the owner's quota is low. Deploy to Pages locally from a branch.
- Bundled content must be original. Never ingest dump questions. The acronym harvester keeps only acronym tokens.
- Accessibility is enforced: axe must show no serious or critical violations, and every drag interaction needs a keyboard and tap alternative.
- Update this file at the end of every chunk.
- Finish each chunk in full before moving on. Fix review minors too; never defer them.
