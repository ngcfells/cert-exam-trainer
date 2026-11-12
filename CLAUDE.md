# testingUtility (cert exam trainer)

Start every session: read `HANDOFF.md` (current block only), run `gh issue list` (bugs and `from-app` issues beat all other work).

## Commands
- `npm run check`: lint, typecheck, builds, unit, e2e (the full gate; e2e with `--workers=3` if it times out under load).
- `npx vitest run src/banks` (bank and shipped-bank tests); `BOUNDS_EXAM=CS0-004 npm run check-bounds`.
- `npm run check-drafts` (draft items, `--ref` = reference slices); `npm run hashes -- --check`.
- `npm run deploy` (content changes need `-- --yes` after reading the changed-id list). Push and deploy are allowed without asking.

## Rules
- Content work: one domain per session, then handoff and /clear. Method: `docs/content-drafting.md`, `docs/pbq-authoring.md`, `HANDOFF.md`.
- `_WorkingData/` is git-ignored reference material (owner decks): never copy from it, never let subagents read it.
- Check `git diff --stat` before each commit (the Write tool once overwrote a CSS file).
- Order PBQ `partExplanations` are keyed by position ("0", "1", ...), not step id, on purpose.
- Old handoff history: `docs/archive/`.
