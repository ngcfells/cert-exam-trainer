# Handoff

**Repo:** <https://github.com/ngcfells/cert-exam-trainer> (public)
**Spec (approved):** `docs/superpowers/specs/2026-10-30-comptia-exam-trainer-design.md`

## Current state

- Design is approved. No code has been written yet.
- **Priority:** Data+ (DA0-002) first, working end to end, before any other exam.
- **Bank targets per exam:** at least 500 MCQs and at least 80 PBQs (10 of each of the 8 types).
- **Randomness:** each mock exam draws a different random set of questions, recently seen items are deprioritized, and options are shuffled. See spec §7 item 4a; this lands in chunk 2.

## Next session

Execute `docs/superpowers/plans/2026-10-30-chunk1-scaffold-and-core.md`, which covers the scaffold, schema, bank registry, storage and backup.

**Execution method (owner's choice):** Native. Use superpowers:executing-plans and implement every task inline, then dispatch one final whole-branch reviewer.

## Standing rules

- Do not use GitHub Actions workflows or Git LFS; the owner's quota is low. Deploy to Pages locally from a branch.
- Bundled content must be original. Never ingest dump questions. The acronym harvester keeps only acronym tokens.
- Accessibility is enforced: axe must show no serious or critical violations, and every drag interaction needs a keyboard and tap alternative.
- Update this file at the end of every chunk.
