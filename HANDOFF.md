# Handoff

**Repo:** <https://github.com/ngcfells/cert-exam-trainer> (public)
**Spec (approved):** `docs/superpowers/specs/2026-10-30-comptia-exam-trainer-design.md`

## Current state

- **Chunk 1 is done and merged to `main`** (2026-10-30; 48 unit tests and 5 e2e tests pass):
  - Vite 6, React 18 and strict TypeScript scaffold.
  - Zod question and exam schemas (`src/domain/`).
  - Bank registry with Data+ DA0-002 metadata (marked `VERIFY chunk 9`) and 3 seed questions: 2 approved, 1 draft.
  - IndexedDB repo with an in-memory fallback (`src/storage/`).
  - JSON backup export and import:
    - Validates the whole file first.
    - Rejects unknown exams and objectives.
    - Skips bundled questions and ids that collide with bundled ones.
    - Restores the previous data if a write fails partway through.
  - Home screen with exam counts, a storage banner and backup controls.
- **Commands:**
  - `npm run check` runs lint, typecheck, unit tests, the single-file build and e2e with axe.
  - `npm run build` writes `dist/`.
  - `npm run build:single` writes `dist-single/index.html`, which you can double-click.
  - On a new machine, run `npx playwright install chromium` first.
- **Open issues and notes:**
  - `Repo` gained `listSettings()`, which the backup export needs.
  - Counts pluralize ("1 question (mine)").
  - Data+ objectives are placeholders until chunk 9.
  - Deferred review items, to fold into chunk 2 if cheap:
    - (a) `openRepo` has no timeout, so the app can hang on "Loading…" if IndexedDB never answers.
    - (b) The export revokes the Blob URL synchronously, which can produce an empty download in Firefox and Safari.
    - (c) Export errors aren't caught, and unexpected import errors show a raw `String(err)`.
    - (d) "Replace my data" has no confirmation or warning hint.
    - (e) The `StorageBanner` live region is present on first render, so some screen readers won't announce it.
    - (f) Imported `results` and `srs` records are only checked for `id`. Add strict schemas when those stores get types.
- **Priority:** Data+ (DA0-002) first, working end to end, before any other exam.
- **Bank targets per exam:** at least 500 MCQs and at least 80 PBQs (10 of each of the 8 types).
- **Randomness:** each mock exam draws a different random set of questions, recently seen items are deprioritized, and options are shuffled. See spec §7 item 4a; this lands in chunk 2.

## Next session

Chunk 2 is the exam UI: the mock exam runner, timer, scoring, and randomness from spec §7 item 4a. Write its plan with superpowers:writing-plans, then execute it.

**Execution method (owner's choice):** Native. Use superpowers:executing-plans and implement every task inline, then dispatch one final whole-branch reviewer.

## Standing rules

- Do not use GitHub Actions workflows or Git LFS; the owner's quota is low. Deploy to Pages locally from a branch.
- Bundled content must be original. Never ingest dump questions. The acronym harvester keeps only acronym tokens.
- Accessibility is enforced: axe must show no serious or critical violations, and every drag interaction needs a keyboard and tap alternative.
- Update this file at the end of every chunk.
