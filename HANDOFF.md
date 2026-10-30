# Handoff

**Repo:** <https://github.com/ngcfells/cert-exam-trainer> (public)
**Spec (approved):** `docs/superpowers/specs/2026-10-30-comptia-exam-trainer-design.md`

## Current state

- **Chunk 1 is done** (branch `chunk1-scaffold-core`):
  - Vite 6, React 18 and strict TypeScript scaffold.
  - Zod question and exam schemas (`src/domain/`).
  - Bank registry with Data+ DA0-002 metadata (marked `VERIFY chunk 9`) and 3 seed questions: 2 approved, 1 draft.
  - IndexedDB repo with an in-memory fallback (`src/storage/`).
  - JSON backup export and import (validates everything first; `ours` questions are skipped).
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
