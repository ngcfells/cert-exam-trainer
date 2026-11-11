# 2026-11-11 (night): CySA+ domain 3 DONE (3.1 to 3.3: 120 MCQ + 21 PBQ approved). Next: domain 4. START HERE

Next session model: **Sonnet**. `gh issue list` first (only #19, enhancement). Branch `chunk13-cysa`, not pushed, do NOT deploy until the bank meets its targets.
Bank now 531 items = 450 MCQ + 81 PBQ; every PBQ template is at 10+ (diagram 10, config 10, match 11, buckets 10, hotspot 10, data 10, terminal 10, order 10).
Left: domain 4 (4.1 lesson-7.5/8.x style reporting, 4.2 incident reporting; slices `lesson-7.5`, `lesson-8.1` to `8.4` in `_WorkingData/CySAPlus/prep/ref`, pick by topic), 40 MCQ (29 single + 11 multi) + 7 PBQ per objective,
mix freely (data and match for metrics and reporting, order for escalation, buckets); then close-out (`describeBankTargets` in `bank.test.ts`, full `npm run check`, e2e `--workers=3` if slow).
Method unchanged (3 Sonnet drafters, 3 Sonnet blind + 3 Haiku copy reviewers, 3 Sonnet fixers, blind round 2, approve). Briefs and tools were in the session scratchpad `d3/`
(`drafter-cs.md`, `reviewer-blind.md`, `reviewer-copy.md`, `fixer.md`, `mkblind.cjs`, `cmp.cjs`); rebuild from the list below if gone. Domain 3 notes: the openssl primer topic
now shows for the bank, so `CN` and `GMT` were added to `meta.ts` (community); terminal `partExplanations` are keyed by STEP ID (only order PBQs use position); blind
reviewers cannot see terminal `accept` lists (their "accept" flags are stale, check the file); blind reviewers sometimes write ids without zero padding (`mcq-30`): normalise before `cmp.cjs`.
`BOUNDS_EXAM=CS0-004 npm run check-bounds` and `npx vitest run src/banks/cysa` passed with 531 items.

# 2026-11-11 (evening): CySA+ domain 2 DONE (468 items approved, committed) (history)

Next session model: **Sonnet**. `gh issue list` first. Branch `chunk13-cysa`, not pushed, do NOT deploy until the bank meets its targets.
Domain 2 = 2.1 to 2.4, 39 items each (27 single + 6 multi + 6 PBQ) = 132 MCQ + 24 PBQ; bank now 390 items (330 MCQ + 60 PBQ).
Left: domain 3 (3.1 to 3.3) and domain 4 (4.1, 4.2), 40 MCQ + 7 PBQ per objective; then close-out (`describeBankTargets`, full `npm run check`).
PBQ tally now: terminal 6, data 9, hotspot 8, buckets 8, match 9, config 7, order 7, diagram 6. Domains 3 and 4 (35 PBQs) must lift
every template to 10+: favour terminal (4 more), diagram (4), config (3), order (3), hotspot (2), buckets (2); containment and response
fit terminal, order and diagram.
Same method as below. Briefs, `mkblind.cjs`, `cmp.cjs`, `keys.cjs` are in the session scratchpad `d2/` (the d1 ones still exist in an older
scratchpad); rebuild from the list below if gone. Domain 2 notes: widened terminal `accept` lists are expected to change `answer` in
`keys.cjs` (check only additions); blind reviewers' "Preventative/Responsive" nits are the objective's own words, keep; a stem that lets
two tools fit (Trivy and Prowler both scan IaC) needs a clearly wrong distractor; order stems need a rule for every adjacent pair
(2.4 order failed round 2 until a rule was added). `BOUNDS_EXAM=CS0-004 npm run check-bounds` passed with 390 items.

# 2026-11-11 (afternoon): CySA+ domain 1 DONE (234 items approved, committed) (history)

Next session model: **Sonnet** (orchestrating Sonnet drafters, Sonnet blind reviewers, Haiku copy reviewers). `gh issue list` first
(2026-11-11: only #19, no bugs). One domain per session, then handoff and /clear.

- **Branch `chunk13-cysa`, not pushed, not merged, do NOT deploy** until the bank meets its targets (500 MCQ, 80 PBQ, 10 per
  PBQ template). Domain 1 = objectives 1.1 to 1.6 (six, not five), 39 items each (27 single + 6 multi + 6 PBQ) = 198 MCQ + 36 PBQ.
  Tally: terminal 2, data 6, hotspot 5, buckets 5, match 6, config 4, order 5, diagram 3. Domains 2 to 4 must add terminal
  and diagram (and keep every template at 10+): domain 2 (2.1 to 2.4) lean on terminal (scanner output, `nmap`, `curl`) and config.
- **Quotas per objective** (500/80): 1.x 29 MCQ + 5 PBQ; 2.x 33 + 6; 3.x and 4.x 40 + 7. Draft about 6 PBQs and 33 to 40 MCQs per objective.
- **Method that worked (about 1 hour, 6 + 6 + 6 + 6 subagents):** briefs and tools are in the session scratchpad (`d1/`:
  `drafter-cs.md`, `reviewer-blind.md`, `reviewer-copy.md`, `fixer.md`, `mkblind.cjs`, `cmp.cjs`, `keys.cjs`). Rebuild them in a
  new scratchpad from this list. Steps: (1) 1 Sonnet drafter per objective writing `src/banks/cysa/items/<obj>.json` as
  drafts, `check-drafts` with `--ref` = the 44 deck slices (copy `_WorkingData/CySAPlus/prep/ref/*.txt` to the scratchpad; agents
  never read `_WorkingData`); (2) commit as drafts; (3) blind Sonnet reviewer (file with `answer`, `explanation`,
  `partExplanations` stripped) + Haiku copy reviewer per objective; (4) compare blind answers with keys (`answer.correct` is
  an array); (5) 1 Sonnet fixer per objective applies both flag files, never changes a key, lengthens distractors instead
  of shortening keys; (6) blind round 2; (7) sed `"status": "draft"` to `approved`; (8) `npx vitest run src/banks/cysa`
  (bank.test.ts runs `describeShippedBank`), `BOUNDS_EXAM=CS0-004 npm run check-bounds`, `check-drafts` over all files.
- **Gotchas found:** Haiku copy reviewers wrongly asked to rekey order-PBQ `partExplanations` to step ids: they are keyed by
  POSITION ("0", "1", ...) on purpose (`src/domain/pbq.ts` key fn). The "key longest" floor counts STRICT longest only (ties
  do not count): 1.3 fell to 7%, fixed by lengthening three keys by a word. A fixer that shortens an order stem can drop the
  rule that fixes the order: restore it. The primer topics add `PID` and `UTC` to the shown acronyms: now in `meta.ts`.
  Domain 4 has only 4.1 and 4.2 (two objectives, 16%): CySA+ has 15 objectives in all.
- **Left in domain 1:** `cs4-1-2-terminal-001` prints `listen` in `ss` output (real tools print `LISTEN`; the acronym check
  rejects it): cosmetic. `bank.test.ts` has `describeShippedBank` only; add `describeBankTargets` in the close-out task.
- Full `npm run check` was last run before the drafts (unit 1273 pass; e2e 130 of 134, the 4 failures were the empty-bank
  bounds tests, since fixed). Run it again at close-out; e2e with `--workers=3` if the default times out under load.


Older history (2026-11-10 and earlier, including the audit findings and the 2026-11-06 start-here notes): `docs/archive/HANDOFF-2026-11-10-and-earlier.md`.
