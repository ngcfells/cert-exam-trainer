# Chunk 12: AutoOps+ (AT0-001) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add CompTIA AutoOps+ (AT0-001) as the third exam, with verified metadata, the official acronyms and a reviewed original bank of at least 500 MCQs and 80 PBQs, then merge and deploy.

**Architecture:** No new engine code. Chunk 11 made the bank, the tools and the checks exam-aware, so AT0-001 is one more registration (`src/banks/paths.ts`, `metas.ts`, `index.ts`) plus content. Every task below mirrors a chunk 11 task; where it says "as chunk 11 Task N", follow `docs/superpowers/plans/2026-10-31-chunk11-secai.md` with the values given here.

**Tech Stack:** React + TypeScript + Vite, Zod, Vitest, Playwright (unchanged).

**Spec:** `docs/superpowers/specs/2026-10-30-comptia-exam-trainer-design.md` (bank targets, PBQ templates), plus the chunk 11 plan for method. Source of truth for the exam: `_WorkingData/AutoOpsPlus/comptiaautoopsat0001examobjectivesv21781007202950.pdf` (git-ignored; never copied).

## Verified exam facts (from the objectives PDF, 2026-11-01)

- Code `AT0-001`, version `1`, name `CompTIA AutoOps+`. Up to 60 questions, MCQ and performance-based, 60 minutes.
- **Passing score is not in the PDF.** Check CompTIA's AutoOps+ page in Task 1. If it is not published, use `750` (on the 100–900 scale) and mark it `VERIFY` in `docs/sources/AT0-001.md`. **Owner rule (2026-11-01): when a passing score is unknown, assume 750 of 900.**
- Domains and weights: 1 Automation Coding Concepts 31%, 2 System Configuration 25%, 3 Continuous Integration 24%, 4 Continuous Delivery 20%.
- Objectives (titles copied in full from the PDF in Task 1; several wrap in the extract):
  - 1.1 use code to support automation; 1.2 source control to version code; 1.3 IaC concepts; 1.4 troubleshoot the code life cycle.
  - 2.1 configuration management to deploy …; 2.2 basic approaches to automation; 2.3 interact with REST-compliant APIs …; 2.4 troubleshoot system configuration.
  - 3.1 environmental factors in CI …; 3.2 workflow management in CI; 3.3 analyze configurations to manage basic automation ….
  - 4.1 techniques of CD; 4.2 application service levels; 4.3 methods to secure a connection to providers.
- The PDF has an official acronym list; it ships as `official` acronyms.

## Global Constraints

- Bank path `src/banks/autoops/`, id prefix `at1` (for example `at1-2-3-mcq-004`).
- Targets (`CONTENT_TARGETS`, unchanged): ≥ 500 approved MCQs, ≥ 80 approved PBQs, ≥ 10 of each of the 8 PBQ templates, every per-objective quota from `objectiveQuotas` met.
- Every multi-answer stem states its count (pick-count rules, `src/domain/pick.ts`).
- Key longest in 10% or more of singles per objective with 20+ singles (`shippedChecks` floor); aim for a natural 15–25%.
- Content is original. The instructor decks and the performance outline in `_WorkingData/AutoOpsPlus/` are reference only (owner rule, see memory): never copy or paraphrase wording, examples, questions or diagrams. Every draft passes `check-drafts --ref` (8-word overlap). Drafters invent their own scenarios. The git cheat sheet PDF is reference only too.
- Agents get scratchpad text extracts, never `_WorkingData` paths.
- One domain per content session, `/clear` and a handoff update between. Cheapest model that does the job; Opus only for the final whole-branch review.
- Branch `chunk12-autoops` from `main`. No merge or deploy until Task 6 unless the owner asks.
- No GitHub Actions, no Git LFS. Keep the SDD ledger in `.superpowers/sdd/2026-11-01-chunk12-autoops/`.

## Review Focus

1. **Code in stems and options** (YAML, JSON, Bash, Python, HCL snippets): must render as preformatted text and stay readable at 360 px. Task 2 adds a bank e2e item with a code block at phone width.
2. **Tool and vendor neutrality:** the exam names generic concepts; items must not key one product (Jenkins, GitHub Actions, Ansible, Terraform) as "the" answer unless the stem names it. Reviewer brief line in Task 3.
3. **Terminal PBQ ambiguity** (git and CLI commands have many valid forms): accept lists must take every equivalent form (short and long flags, `--flag=value`, path forms). Checked by hand with `term.mjs` in each slice.
4. **Git command accuracy** (1.2, 1.4): reset/revert/restore, rebase vs merge, detached HEAD. The blind reviewer must answer every git item from its own knowledge, not the key.
5. **HTTP status codes and REST verbs** (2.3): idempotency and status meanings must match RFC 9110. Reviewer brief line in Task 3.

---

## Session 1: groundwork

### Task 1: Register AT0-001 with verified metadata and acronyms

**Files:**

- Create: `src/banks/autoops/{meta.ts,meta.test.ts,items.ts,questions.ts,fixture.ts,items/}`, `docs/sources/AT0-001.md`
- Modify: `src/banks/paths.ts` (`'AT0-001': { dir: 'autoops', idPrefix: 'at1' }`), `src/banks/metas.ts`, `src/banks/index.ts`, `scripts/exam-args.ts`, `scripts/draft-ollama-lib.ts` (an AT0-001 example item), and the tests that list exams (`paths.test.ts`, `exam-args.test.ts`, `Home.test.tsx`, `screens.test.ts`).

**Interfaces:**

- Produces: `autoOpsMeta: ExamMeta`, `autoOpsItems`, a 3-item fixture (one MCQ, one multi, one PBQ) for `VITE_BANK=fixture`.

- [ ] **Step 1:** Write `meta.test.ts` as chunk 11 Task 3 did: 4 domains with the weights above summing to 100, 15 objectives with the PDF's full titles, every objective in a domain, and every acronym in the official list present with its PDF expansion. Run `npx vitest run src/banks/autoops`: FAIL (module missing).
- [ ] **Step 2:** Extract the PDF to the scratchpad (`pdf2txt.py` with `pypdf`), then write `meta.ts` and the official acronyms. Record source, document version and date in `docs/sources/AT0-001.md`. Check the passing score per the facts above.
- [ ] **Step 3:** Register the exam in every place CY0-001 is registered (`grep -r "CY0-001" src scripts tests`) and update the tests that count exams. Run `npx vitest run`: PASS.
- [ ] **Step 4:** Commit `feat(autoops): register AT0-001 with verified metadata and acronyms`.

### Task 2: Acronym harvest, deck notes and e2e

**Files:**

- Create: `_WorkingData/AutoOpsPlus/harvest-sources.json` and `_WorkingData/AutoOpsPlus/notes/index.md` (both git-ignored)
- Modify: `src/banks/autoops/meta.ts` (community acronyms), `tests/e2e/*.spec.ts` (the CY0-001 blocks gain AT0-001 equivalents)

- [ ] **Step 1:** Harvest as chunk 11 Task 4 (`npm run harvest-acronyms -- --exam AT0-001`, then `expand-acronyms`). Keep only unambiguous on-topic terms as `community`; list the rest as flagged in the handoff.
- [ ] **Step 2:** Make the deck notes as chunk 11 Task 4a: extract the six session decks to text, write an objective → deck-section map, and keep the `--ref` folder holding deck notes only.
- [ ] **Step 3:** Extend the e2e exam blocks to AT0-001 (Home card, exam page, acronyms). Add the Review Focus 1 check: a fixture MCQ with a code block shows no horizontal overflow at 360 px.
- [ ] **Step 4:** `npm run check`: green. Commit `feat(autoops): community acronyms and e2e for AT0-001`.

## Sessions 2–5: content, one domain per session

### Task 3: Draft and review one domain (run once per domain)

Order: domain 1 (session 2), 2 (session 3), 3 (session 4), 4 (session 5). Method as chunk 11 Task 7, with the lessons in `HANDOFF.md` sessions 2–7 applied:

- [ ] **Step 1:** Print the domain's quotas (`objectiveQuotas`) and plan PBQ templates so every template reaches 10 across the exam. Natural fits: terminal (git, CLI, curl), config (YAML pipelines, IaC), order (CI/CD stages, branching flows), data (pipeline metrics, SLO tables), match/buckets (concepts), diagram (pipeline and environment layouts), hotspot (config files, dashboards).
- [ ] **Step 2:** One Sonnet drafter per objective, briefed to invent scenarios, mix key lengths (key longest and key shortest each about 15–25%), state counts in multi stems, and use the Write tool.
- [ ] **Step 3:** `npm run check-drafts -- --exam AT0-001 --ref <notes>`: no overlap flags, no schema errors.
- [ ] **Step 4:** Round 1: one blind Sonnet reviewer (answers without the key; checks Review Focus 2, 4 and 5) and one Haiku copywriter per objective. Round 2 on changed items; round 3 blind-only. Check terminal accept lists by hand. Apply final one-line copy fixes by hand.
- [ ] **Step 5:** Approve, move into `src/banks/autoops/items/`, `npm run check` green, commit `content(autoops): domain N`, and update the handoff with the bank and template tally.

## Session 6: close-out

### Task 4: Lock the targets

- [ ] Add `src/banks/autoops/bank.test.ts` with `describeShippedBank(autoOpsMeta, autoOpsItems, {})` and `describeBankTargets(autoOpsMeta, autoOpsItems)`. Run it. If a target fails, draft only the shortfall with Task 3's method. Commit.

### Task 5: Whole-branch review

- [ ] One Opus reviewer: blind-answer a sample of 80+ items across all 15 objectives, check the overlap report over every file, and audit Review Focus 1–5. Fix every finding, minors included. `npm run check` green. Commit.

### Task 6: Merge and deploy

- [ ] Fast-forward `chunk12-autoops` into `main`, `npm run deploy`, confirm the live asset hash matches gh-pages, update `HANDOFF.md`, commit.

## Budget note (owner, 2026-11-01)

The owner is on the Pro plan with little quota left. Session 1 is light. Each content session drafts and reviews about 140–165 items with many subagents, so it is the expensive part: start one only with a fresh quota window. If quota runs short mid-domain, stop after a finished objective, commit it, and record where to resume in the handoff.
