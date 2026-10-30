# Handoff

**Repo:** https://github.com/ngcfells/cert-exam-trainer (public)
**Spec (approved):** `docs/superpowers/specs/2026-10-30-comptia-exam-trainer-design.md`

## Current state
- Design is approved. No code has been written yet.
- **Priority:** Data+ (DA0-002) first, working end to end, before any other exam.

## Next session
Execute `docs/superpowers/plans/2026-10-30-chunk1-scaffold-and-core.md`, which covers the scaffold, schema, bank registry, storage and backup.

## Standing rules
- Do not use GitHub Actions workflows or Git LFS; the owner's quota is low. Deploy to Pages locally from a branch.
- Bundled content must be original. Never ingest dump questions. The acronym harvester keeps only acronym tokens.
- Accessibility is enforced: axe must show no serious or critical violations, and every drag interaction needs a keyboard and tap alternative.
- Update this file at the end of every chunk.
