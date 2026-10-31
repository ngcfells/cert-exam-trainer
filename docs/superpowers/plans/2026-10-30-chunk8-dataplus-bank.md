# Chunk 8: Data+ Shipped Question Bank Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship at least 500 original MCQs and 80 original PBQs (10 per template) for DA0-002, mapped to the verified objectives, with automated quality checks and an owner approval tool.

**Architecture:** Bank content moves from one TypeScript file to one JSON file per objective under `src/banks/dataplus/items/`, loaded with `import.meta.glob`. A pure `src/content/` module computes quotas and quality findings, used by both a bank test and a dev-only review screen. The e2e suite keeps running against today's 10-item set via a fixture bank swapped in at build time, plus a smoke test against the real bank.

**Tech Stack:** TypeScript, React 18, Zod, Vite 5 (`import.meta.glob`, dev-server plugin), Vitest, Playwright + axe, Ollama (drafting trial), Claude subagents (drafting and review).

**Spec:** `docs/superpowers/specs/2026-10-30-comptia-exam-trainer-design.md` (§5, §6, §8, §12, §13 item 8)

## Global Constraints

- Every bundled item is original, written from the public objectives. **Never read `_WorkingData/`** while drafting or reviewing, and never give its path to a subagent.
- Every item passes `questionSchema`, has `source: 'ours'`, and passes the acronym content check (`src/acronyms/content.test.ts`); each new acronym gets a `community` expansion unless it is on the official list.
- Targets: ≥ 500 MCQs and ≥ 80 PBQs, ≥ 10 of each of the 8 PBQ types; each objective gets a minimum in proportion to its domain weighting.
- Only `approved` items appear in production. An item is `approved` once it passes both independent reviewers (data analyst and copywriter); the owner may spot-check and reject in the review tool.
- Accessibility: axe shows no serious or critical violations on any screen, including the review tool.
- A local hook blocks Bash heredocs containing an apostrophe: write files with Write/Edit.
- No GitHub Actions, no Git LFS. Commit on branch `chunk8-dataplus-bank`; merge to `main` at the end.
- Fix every review finding, minors included.

## Review Focus

1. **Answer-position and length tells.** A drafted MCQ set where the correct option is usually `b`, or usually the longest, lets learners score without knowing the material. Expect: the correct letter is spread evenly and the correct option is strictly longest in ≤ 40% of single-answer MCQs. Pinned in Task 3 (`answerBalance`, `longestOptionTell`).
2. **Near-duplicate stems.** Batches drafted per objective by different subagents repeat each other. Expect: no two items whose normalized stem word-trigram Jaccard ≥ 0.6. Pinned in Task 3 (`nearDuplicates`).
3. **Wrong answer keys.** A plausible item with the wrong key teaches the wrong thing. Expect: every item's key is decided independently by a reviewer who did not draft it, and disagreements are resolved before `reviewed`. Pinned in Task 6 (independent review step) and the owner pass in Task 7.
4. **E2e coupled to bank size.** Growing the bank breaks every test that assumes 8 exam questions. Expect: the existing e2e suite keeps passing unchanged against the fixture bank, and the real bank gets its own smoke test. Pinned in Task 1 and Task 7.
5. **Review tool leaking into the shipped build.** Expect: no review-tool code or write-back endpoint in `dist/` or `dist-single/`. Pinned in Task 4 (`grep` over the build output).

---

### Task 1: JSON item files and the fixture bank

**Files:**
- Create: `src/banks/dataplus/items/` (one `<objectiveId>.json` per objective, each a `Question[]`), `src/banks/dataplus/fixture.ts`
- Modify: `src/banks/dataplus/questions.ts`, `vite.config.ts`, `package.json`, `playwright.config.ts` (if it names the build), `.gitignore` (add `content-drafts/`)
- Test: `src/banks/dataplus/questions.test.ts`

**Interfaces:**
- Produces: `dataPlusQuestions: Question[]` (unchanged name), loaded from `import.meta.glob('./items/*.json', { eager: true, import: 'default' })`, sorted by file name then array order. `dataPlusFixtureQuestions: Question[]` in `fixture.ts` holds today's 10 seed items verbatim. Env var `VITE_BANK=fixture` makes `questions.ts` export the fixture set instead.

- [ ] **Step 1:** Create branch `chunk8-dataplus-bank`.
- [ ] **Step 2: Write the failing test** `questions.test.ts`: `it('loads every item file')` asserts `dataPlusQuestions.length` equals the sum of the JSON array lengths read with `fs` from `items/`, and `it('keeps the fixture set')` asserts `dataPlusFixtureQuestions.map(q => q.id)` equals the 10 ids in today's `questions.ts`, in order.
- [ ] **Step 3:** Run `npx vitest run src/banks/dataplus/questions.test.ts`; expect FAIL (no `items/`, no `fixture.ts`).
- [ ] **Step 4:** Move today's 10 items into `fixture.ts`; write them also as the initial `items/1.1.json`, `items/3.1.json` etc. (by current `objectiveIds[0]`). Rewrite `questions.ts` to glob `items/` and return the fixture set when `import.meta.env.VITE_BANK === 'fixture'`.
- [ ] **Step 5:** Add `"build:e2e": "cross-env SINGLE=1 VITE_BANK=fixture vite build --outDir dist-e2e"`; point Playwright's `singleUrl` at `dist-e2e/index.html`; `check` runs `build:single` then `build:e2e` then e2e. Add `dist-e2e/` to `.gitignore`.
- [ ] **Step 6:** Run `npm run check`; expect all existing unit and e2e tests PASS unchanged.
- [ ] **Step 7:** Commit `refactor: Data+ bank as per-objective JSON; fixture bank for e2e`.

### Task 2: Verified DA0-002 metadata

**Files:**
- Modify: `src/banks/dataplus/meta.ts`, every `items/*.json` whose objective id changes, `fixture.ts` objective ids if they no longer exist
- Create: `docs/sources/DA0-002.md` (where each value came from: URL, retrieval date, page)
- Test: `src/banks/dataplus/meta.test.ts`

**Interfaces:**
- Produces: `dataPlusMeta` with the real `domains`, `objectives` (ids like `'2.3'`), `maxQuestions`, `timeLimitMinutes`, `passingScore`, and `acronyms` holding every official entry with `source: 'official'` plus the existing `community` ones not on the official list.

- [ ] **Step 1:** Fetch CompTIA's public DA0-002 exam page and objectives PDF with the `web-fetch` agent. If the PDF needs a form or download, stop and ask the owner to save it to `_sources/` (gitignored; add it) — never commit it.
- [ ] **Step 2: Write the failing test** `meta.test.ts`: domain weights sum to 100; every objective's `domainId` exists; every domain has ≥ 1 objective; objective ids match `/^[1-5]\.\d+$/` and start with their domain id; `meta.ts` source text contains no `VERIFY`; no acronym term appears twice; there is at least one `official` acronym.
- [ ] **Step 3:** Run it; expect FAIL on `VERIFY` and the official-acronym check.
- [ ] **Step 4:** Fill `meta.ts` from the sources; record each value's source in `docs/sources/DA0-002.md`. Remap seed items to real objectives.
- [ ] **Step 5:** Run `npm run test`; expect PASS (registry rejects any item pointing at a removed objective).
- [ ] **Step 6:** Commit `feat: verified DA0-002 objectives, exam facts and official acronyms`.

### Task 3: Content quality module

**Files:**
- Create: `src/content/quota.ts`, `src/content/quality.ts`, `src/content/index.ts`
- Test: `src/content/quota.test.ts`, `src/content/quality.test.ts`, `src/banks/dataplus/bank.test.ts`

**Interfaces:**
- Produces:
  - `objectiveQuotas(meta: ExamMeta, totals: { mcq: number; pbq: number }): Record<string, { mcq: number; pbq: number }>` — per objective `ceil(total × domainWeight/100 ÷ objectivesInDomain)`.
  - `coverage(meta, questions): Record<string, { mcq: number; pbq: number }>` — counted by `objectiveIds[0]`.
  - `pbqTypeCounts(questions): Record<PbqTemplate, number>`.
  - `nearDuplicates(questions, threshold = 0.6): Array<[string, string, number]>` — normalized (lowercase, letters/digits/spaces) stem word-trigram Jaccard.
  - `answerBalance(questions): Record<string, number>` — share of single-answer MCQs keyed by correct option **position** (`'0'..'3'`).
  - `longestOptionTell(questions): number` — share of single-answer MCQs whose correct option text is strictly longest.
  - `CONTENT_TARGETS = { mcq: 500, pbq: 80, perPbqType: 10, maxPositionShare: 0.35, maxLongestShare: 0.4, dupThreshold: 0.6 }`.

- [ ] **Step 1: Write the failing tests:**
  - `objectiveQuotas` on a 2-domain meta (60/40, objectives 2 and 1) with totals `{ mcq: 10, pbq: 5 }` gives `{ '1.1': {mcq:3,pbq:2}, '1.2': {mcq:3,pbq:2}, '2.1': {mcq:4,pbq:2} }`.
  - `nearDuplicates` flags a stem pair differing by one word in twelve, and does not flag two unrelated stems; ignores case and punctuation.
  - `answerBalance` on keys at positions 0,0,1,2 gives `{ '0': 0.5, '1': 0.25, '2': 0.25, '3': 0 }`; multi-answer MCQs and PBQs are ignored.
  - `longestOptionTell` returns 0 for an empty list (no divide by zero).
  - `bank.test.ts` (quality only, on `includeDrafts: true`): no near duplicates; every position share ≤ `maxPositionShare` once there are ≥ 40 single-answer MCQs; `longestOptionTell` ≤ `maxLongestShare` under the same guard.
- [ ] **Step 2:** Run `npx vitest run src/content src/banks/dataplus/bank.test.ts`; expect FAIL (module missing).
- [ ] **Step 3:** Implement the functions in `quota.ts` (quotas, coverage, type counts) and `quality.ts` (the rest).
- [ ] **Step 4:** Run the tests; expect PASS.
- [ ] **Step 5:** Commit `feat: content quota and quality checks`.

### Task 4: Dev-only review tool

**Files:**
- Create: `src/ui/review/ReviewScreen.tsx`, `src/ui/review/ReviewScreen.test.tsx`, `scripts/review-plugin.ts`
- Modify: `vite.config.ts`, `src/App.tsx`, `src/ui/screens.ts`

**Interfaces:**
- Consumes: `McqView`/`PbqView` previews (chunk 6), `QuestionEditor` for Edit, everything in Task 3.
- Produces: screen `{ name: 'review'; exam: string }`, reachable only when `import.meta.env.DEV` via a Home link "Review bank (dev)". Vite plugin `reviewPlugin()` with `apply: 'serve'`, middleware `POST /__review/item` body `{ question: Question }` → rewrites that item in place in `src/banks/dataplus/items/<objectiveIds[0]>.json` (moving it if the objective changed), 2-space JSON plus trailing newline; returns 400 with Zod issues if `questionSchema` fails; 404 for an unknown id.

- [ ] **Step 1: Write the failing test** `ReviewScreen.test.tsx` with a stubbed `fetch`: filter by status (default `approved`), objective and type; shows "n of m" and the rendered item with its key and explanations; Approve posts the item with `status: 'approved'` and advances; Reject posts `status: 'draft'` with a required note field stored nowhere but the request log; Edit opens `QuestionEditor` and Save posts the edit; a panel lists Task 3 findings (quota gaps per objective, type counts, duplicates, balance) for the whole bank.
- [ ] **Step 2:** Run it; expect FAIL.
- [ ] **Step 3:** Implement `ReviewScreen` (lazy-imported in `App.tsx` behind `import.meta.env.DEV` so production tree-shakes it) and `reviewPlugin`. The question schema is strict, so a reject note is not stored on the item: the plugin appends `{ id, note, at }` to `content-drafts/rejections.jsonl` (gitignored).
- [ ] **Step 4:** Run the test; expect PASS. Run `npm run dev`, approve and reject one fixture-like item by hand, confirm the JSON file changes and HMR reloads.
- [ ] **Step 5:** Run `npm run build && npm run build:single`, then `grep -rl "__review\|ReviewScreen" dist dist-single`; expect no matches.
- [ ] **Step 6:** The review screen is absent from the single-file build, so add `tests/e2e-dev/review.spec.ts` with its own Playwright config whose `webServer` runs `npm run dev`; it opens the review screen and runs `expectNoSeriousAxe`. Add `"test:e2e-dev"` to `package.json` (not part of `check`) and run it; expect no serious or critical violations.
- [ ] **Step 7:** Commit `feat: dev-only review tool with JSON write-back`.

### Task 5: Drafting brief and the Ollama trial

**Files:**
- Create: `docs/content-drafting.md`, `scripts/draft-ollama.ts`
- Modify: `package.json` (`"draft:ollama": "vite-node scripts/draft-ollama.ts --"`)

**Interfaces:**
- Produces: `docs/content-drafting.md`, the brief given verbatim to every drafter and reviewer: item JSON shape per type (link `docs/pbq-authoring.md`), id scheme `da2-<objective with dot→dash>-<type short>-<nnn>` (e.g. `da2-2-3-mcq-007`, `da2-2-3-hotspot-002`), one clear best answer, 4 options for single, 5–6 options with "Which TWO/THREE" for multi, no "all/none of the above", distractors from the same concept family and similar length, rotate the correct position, scenario stems preferred at difficulty 2–3, explanations say why the key is right **and** why each distractor is wrong, `pbqWeight` 1–6 by part count, tag `acronyms`, `status: 'draft'`, never consult `_WorkingData/` or any question dump.
- `draft-ollama.ts --objective <id> --count <n> --out content-drafts/<file>.json`: posts the brief plus the objective title to `http://localhost:11434/api/chat` with `model: 'qwen3.6:27b'`, `format: 'json'`, validates each returned item with `questionSchema`, writes valid ones, logs invalid ones with issues.

- [ ] **Step 1:** Write the brief.
- [ ] **Step 2:** Write the script; run `npm run draft:ollama -- --objective <first objective> --count 10 --out content-drafts/ollama-trial.json`. Expect a file plus a valid/invalid count.
- [ ] **Step 3:** Grade the 10 against the brief (schema-valid share, factual errors, key errors, tells). Record the grades and the decision in `docs/content-drafting.md` under "Drafting trial". Rule: use Ollama only if ≥ 8/10 are schema-valid **and** ≤ 1 has a factual or key error; otherwise draft with Claude subagents on the strongest model.
- [ ] **Step 4:** Commit `docs: drafting brief and Ollama trial result`.

### Task 6: Draft and review the bank, one domain at a time

Repeat Steps 1–6 for domains 1, 2, 3, 4, 5 in order (five passes, five commits).

**Files:**
- Modify: `src/banks/dataplus/items/<objectiveId>.json` for the domain's objectives; `src/banks/dataplus/meta.ts` (new `community` acronyms)

**Interfaces:**
- Consumes: `objectiveQuotas(dataPlusMeta, { mcq: 500, pbq: 80 })` for per-objective counts; the brief from Task 5.
- PBQ type plan: the 80+ PBQs are allocated so each template reaches ≥ 10 overall; before each domain, compute remaining per-type need and assign templates to the objectives they suit (terminal/data → analysis and preparation, diagram → environments, buckets/match → concepts and governance).

- [ ] **Step 1: Draft.** For each objective in the domain, the chosen drafter (Ollama script or a `general-purpose` subagent given the brief, the objective's title and sub-bullets, the ids already used, and the stems already in that objective) writes its quota plus 10% spare as `status: 'draft'`.
- [ ] **Step 2: Independent review, two reviewers (owner decision 2026-10-30).** Neither reviewer drafted the items.
  - **Data analyst reviewer:** given the brief and the items **with `answer` removed**, answers each item and flags factual errors, outdated practice, more than one defensible answer, and misalignment with the objective.
  - **Copywriter reviewer:** given the brief and the full items, flags unclear or wordy stems, ambiguity, grammar, inconsistent terms, answer tells (length, grammar cues, absolutes), and explanations that don't explain why each distractor is wrong.
  - An item passes only when the analyst's answer matches the key and neither reviewer raises an unresolved problem. I fix or drop flagged items and re-run the flagging reviewer on fixed ones; decisions go in the commit message body.
- [ ] **Step 3:** Set passing items to `status: 'approved'` (owner decision: two-reviewer pass counts as approval); trim spares so near duplicates and weakest items go first.
- [ ] **Step 4:** Add `community` expansions for new acronyms the content check reports.
- [ ] **Step 5:** Run `npm run test`; expect PASS (schema, registry, acronym check, Task 3 quality checks).
- [ ] **Step 6:** Commit `content: Data+ domain <n> items (<mcq> MCQ, <pbq> PBQ), reviewed`.

### Task 7: Targets, owner approval and close-out

**Files:**
- Modify: `src/banks/dataplus/bank.test.ts`, `HANDOFF.md`, `docs/superpowers/specs/2026-10-30-comptia-exam-trainer-design.md` (§12 note on the trial outcome)
- Create: `tests/e2e/bank.spec.ts` (runs against `dist-single`, not the fixture)

- [ ] **Step 1: Write the target tests** in `bank.test.ts` over `approved` items only: total MCQs ≥ 500; total PBQs ≥ 80; every template ≥ 10; every objective meets its `objectiveQuotas` minimum. Run; expect PASS (Task 6 produced the content). If any fails, return to Task 6 for that objective.
- [ ] **Step 2: Write `bank.spec.ts`:** on `dist-single/index.html` Home shows a Data+ bundled count ≥ 580 (once approved); a mock exam starts with `Question 1 of 90` (the verified `maxQuestions`); and for each of the 8 templates a 1-question practice filtered to that type renders and passes axe. Add the spec to `check` via a second Playwright project whose `singleUrl` is `dist-single`.
- [ ] **Step 3: Owner spot-check (optional, not blocking).** Items are already `approved` by the two-reviewer pass. The owner can open `npm run dev` → Review bank at any time; a Reject moves an item back to `draft` and it is fixed and re-reviewed. Re-run Step 1 after any rejection.
- [ ] **Step 4:** Run `npm run check`; expect all PASS. Record unit and e2e counts.
- [ ] **Step 5:** Dispatch one whole-branch reviewer (most capable model) with this plan and the spec. Fix every finding, minors included; re-run `npm run check`.
- [ ] **Step 6:** Update `HANDOFF.md` (chunk 8 done, decisions, counts, next: chunk 9), merge `chunk8-dataplus-bank` into `main`, commit.
