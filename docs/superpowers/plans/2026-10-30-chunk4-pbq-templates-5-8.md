# Chunk 4: PBQ Templates 5–8 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the terminal, data, hotspot and buckets PBQ templates with per-part scoring, wired into assembly, `ExamRunner`, `scoreExam`, the results review and mock exams.

**Architecture:** All eight templates keep chunk 3's `PartMap` model (partId → value). Correctness moves from `given[id] === key[id]` into one function, `partCorrect(q, partId, given)`, so terminal parts can match typed text against accepted patterns and hotspot parts can treat "missing" as "not selected". `pbqFraction` stays matching-parts / parts for every type except hotspot, which uses the select-all rule already used for MCQs.

**Tech Stack:** React 18, TypeScript, Zod 3, Vitest + Testing Library, Playwright + axe.

**Spec:** `docs/superpowers/specs/2026-10-30-comptia-exam-trainer-design.md` (§3 non-goals, §6 PBQ engine, §7 scoring/randomness, §8 accessibility)

## Global Constraints

- Template 5: "Logs or a simulated terminal, where the user reads output and types a command or chooses an action. Answers are matched against accepted patterns." No real shell or execution (§3 non-goal).
- Every part is scored independently to give partial credit (§6).
- PBQ elements (draggable items, steps, buckets) are shuffled per attempt from the seeded RNG (§7 4a).
- Every drag interaction needs a keyboard and tap alternative; axe must show no serious or critical violations.
- Charts and hotspot images are structured data drawn as SVG, never raw markup from question data, and always have a text equivalent.
- Bundled content must be original.

## Review Focus

- A terminal answer typed with extra spaces, a trailing space or a different letter case in the command name is still compared fairly: whitespace is collapsed and trimmed; case is kept (shell commands are case-sensitive), so `LS -l` is wrong for `ls -l`.
- An untouched hotspot scores 0 (not credit for every correctly-unselected spot) and is "unanswered" in the review grid.
- A buckets PBQ with an item dropped into a bucket, then moved to another bucket, keeps only the last placement.
- A data PBQ with a non-numeric value in the charted column still renders the table, and the schema rejects it so the chart never draws `NaN`.
- Old results and backups from chunk 3 (only template 1–4 responses) still validate.

---

### Task 1: Schemas, part helpers and `partCorrect` for templates 5–8

**Files:**
- Modify: `src/domain/pbq.ts`, `src/domain/pbq.test.ts`, `src/domain/pbqFixtures.ts`, `src/domain/schema.ts`, `src/ui/exam/MockExamFlow.tsx` (import rename only)

**Interfaces — Produces (`src/domain/pbq.ts`):**
- Payloads/answers (`Item = { id; text }`):
  - `pbq-terminal`: payload `{ output: string[] (lines, min 1); steps: { id; label; options?: Item[] (min 2) }[] (min 1) }`, answer `{ accept: Record<stepId, string[] (min 1)> }`. A step with `options` is "choose an action" (accept holds option ids); without, it is typed text (accept holds patterns).
  - `pbq-data`: payload `{ caption: string; columns: string[] (min 1); rows: string[][] (min 1); chart?: { kind: 'bar'; labelColumn: number; valueColumn: number }; fields: ConfigPayload['fields'] }`, answer `{ values: PartMap }`.
  - `pbq-hotspot`: payload `{ width; height; nodes (same shape as diagram nodes); spots: { id; x; y; w; h; name }[] (min 2) }`, answer `{ selected: string[] (min 1) }`.
  - `pbq-buckets`: payload `{ buckets: Item[] (min 2); items: Item[] (min 2) }`, answer `{ placements: PartMap }` (itemId → bucketId).
- Renames: `TEMPLATE_1_4` → `PBQ_TEMPLATES` (all 8), `Template14` → `PbqTemplate`, `isTemplate14` → `isPbqTemplate`. Export `TerminalPayload`, `DataPayload`, `HotspotPayload`, `BucketsPayload`.
- `HOTSPOT_ON = 'on'`; hotspot parts have values `[{ id: 'on', text: 'Selected' }, { id: 'off', text: 'Not selected' }]`.
- Parts: terminal = steps (values = options or `[]`); data = fields; hotspot = spots; buckets = items (values = buckets).
- `correctParts`: terminal → first accepted entry per step; hotspot → `on`/`off` per spot; data `values`; buckets `placements`.
- `normalizeCommand(s: string): string` — trim, collapse runs of whitespace to one space.
- `matchesPattern(typed: string, pattern: string): boolean` — both normalized; `*` in the pattern matches one or more non-space characters; everything else literal (escape regex metacharacters).
- `partCorrect(q: Question, partId: string, given: PartMap): boolean` — terminal typed step: any accept pattern matches; terminal choice step: given ∈ accept; hotspot: `(given[id] === 'on') === selected.includes(id)`; all others: `!!given[id] && given[id] === key[id]`.
- `elementIds`: buckets → item ids; others among 5–8 → `[]`.
- `valueText` for a terminal typed step returns the text itself (existing fallback).

- [ ] **Step 1: Write failing tests** in `pbq.test.ts`: one valid fixture per new type (add `terminal`, `data`, `hotspot`, `buckets` to `pbqFixtures.ts`) parses through `questionSchema`; rejected: terminal accept missing a step, terminal choice accept id not among options, terminal empty pattern, data row length ≠ columns length, data chart column out of range, data chart value cell not numeric, hotspot selected id not a spot, hotspot spot outside the image, buckets placement to unknown bucket, buckets missing an item. Plus:
  ```ts
  expect(matchesPattern('  ls   -l /var/log ', 'ls -l /var/log')).toBe(true);
  expect(matchesPattern('LS -l', 'ls -l')).toBe(false);
  expect(matchesPattern('grep ERROR app.log', 'grep ERROR *')).toBe(true);
  expect(matchesPattern('grep ERROR', 'grep ERROR *')).toBe(false);
  expect(matchesPattern('a.b', 'a+b')).toBe(false); // metacharacters are literal
  expect(partCorrect(hotspot, 's2', {})).toBe(true);   // s2 is not in selected
  expect(partCorrect(hotspot, 's1', {})).toBe(false);  // s1 is
  ```
- [ ] **Step 2:** `npx vitest run src/domain` — FAIL.
- [ ] **Step 3:** Implement; `schema.ts` calls `pbqIssues` for every `isPbqTemplate` type. Update the `MockExamFlow` import to `PBQ_TEMPLATES` but keep passing only the four chunk-3 types until Task 4 (`PBQ_TEMPLATES.slice(0, 4)`).
- [ ] **Step 4:** `npx vitest run` — PASS (whole suite; renames compile).
- [ ] **Step 5:** Commit `feat(domain): schemas and part helpers for PBQ templates 5-8`.

### Task 2: Scoring via `partCorrect`, hotspot select-all rule

**Files:** Modify `src/exam/scoring.ts`, `src/exam/scoring.test.ts`

**Interfaces:** Consumes `partCorrect`, `HOTSPOT_ON`. `pbqFraction(q, given)` and `isComplete` keep their signatures.

- [ ] **Step 1: Failing tests:** terminal with steps t1 (typed) and t2 (choice), given `{ t1: 'grep  ERROR app.log', t2: 'wrong' }` → 0.5; hotspot selected `['s1','s3']` of 4 spots: `{}` → 0, `{ s1: 'on' }` → 0.5, `{ s1:'on', s3:'on', s2:'on' }` → 0.5, all four on → 0; `isComplete(hotspot, {})` false, `isComplete(hotspot, { s1: 'on' })` true; `scoreExam` item `parts` for hotspot `{}` mark unselected wrong-free spots correct but fraction 0; buckets with 3 items, 2 right → 2/3. In `src/exam/result.test.ts`, a chunk-3 result fixture (template 1–4 responses only) still parses.
- [ ] **Step 2:** `npx vitest run src/exam` — FAIL.
- [ ] **Step 3:** `pbqFraction`: hotspot → `mcqFraction(selected, onIds, 'mcq-multi')`; otherwise count `partCorrect`. `scoreExam` parts use `partCorrect`. `isComplete`: hotspot → any `on`; otherwise every part non-empty (terminal typed text counts after `normalizeCommand` is non-empty).
- [ ] **Step 4:** `npx vitest run` — PASS.
- [ ] **Step 5:** Commit `feat(exam): score PBQ templates 5-8`.

### Task 3: Views for terminal, data, hotspot, buckets

**Files:**
- Create: `src/ui/exam/pbq/TerminalView.tsx`, `DataView.tsx`, `HotspotView.tsx`, `BucketsView.tsx`
- Modify: `src/ui/exam/pbq/PbqView.tsx` (register views), `src/ui/exam/pbq/pbq.test.tsx`, `src/ui/exam/exam.css`, `src/ui/exam/ResultsScreen.tsx` (hotspot "Not answered" shows "Not selected"; terminal shows typed text)

**Interfaces:** Each view is `(props: PbqProps) => JSX.Element`, reusing `PartSelect`, `ChipPool`, `DropTarget`, `inOrder` from `parts.tsx`.

- **Terminal:** `output` in a `<pre>` inside a region labelled "Terminal output" (`tabIndex=0` so it can scroll by keyboard). Typed step: labelled `<input type="text" autoComplete="off" spellCheck={false}>` prefixed visually with `$`, `onChange` writes raw text. Choice step: `PartSelect`.
- **Data:** a real `<table>` with `<caption>` and `<th scope="col">`; when `chart` exists, an SVG bar chart (`aria-hidden`, because the table is the text equivalent) with value labels; then fields as `PartSelect`s.
- **Hotspot:** SVG of nodes plus spot rects; clicking a rect toggles it (pointer enhancement, SVG `aria-hidden`); the keyboard/tap path is a native checkbox per spot labelled with `name`. Selected spots are drawn with a thicker outline **and** a pattern/check mark (not colour alone). Writes `'on'` or removes the key.
- **Buckets:** `ChipPool` of items in `elementOrder`, one `DropTarget` per bucket listing its placed items; per item a `PartSelect` (values = buckets).

- [ ] **Step 1: Failing tests** in `pbq.test.tsx`: typing `grep ERROR app.log` into the "Find errors" input calls `onChange` with `{ t1: 'grep ERROR app.log' }`; data table has caption and column headers by role; checking "Web server" checkbox gives `{ s1: 'on' }` and unchecking gives `{}`; choosing bucket "Qualitative" for item "Eye colour" gives `{ i1: 'b2' }`, then choosing "Quantitative" overwrites it; results show "Not selected" for an untouched hotspot spot.
- [ ] **Step 2:** `npx vitest run src/ui` — FAIL.
- [ ] **Step 3:** Implement the four views and CSS (terminal monospace, dark-on-light contrast ≥ 4.5:1; layouts stack below 40rem like the diagram).
- [ ] **Step 4:** `npx vitest run` — PASS.
- [ ] **Step 5:** Commit `feat(ui): PBQ templates terminal, data, hotspot, buckets`.

### Task 4: Bank content, mock exam enablement, e2e

**Files:**
- Modify: `src/banks/dataplus/questions.ts` (one original approved PBQ per new template, Data+ themed: log triage with `grep`, sales table with bar chart, data-pipeline hotspot, qualitative/quantitative buckets), `src/ui/exam/MockExamFlow.tsx` (`pbqTypes: PBQ_TEMPLATES`), `tests/e2e/exam.spec.ts`, `tests/e2e/home.spec.ts` (question count), `src/banks/registry.test.ts` if counts are asserted

- [ ] **Step 1:** Add the four questions; `npx vitest run src/banks` — PASS (they validate).
- [ ] **Step 2:** Find a seed whose exam includes all 8 PBQ types if one exists, else two seeds that together cover them (write a throwaway script in the scratchpad that calls `assembleExam` over seeds 1..5000; PBQ count is capped at 6 so two seeds are expected). Update the e2e header comment, `TOTAL`, and walk each seed through axe per screen; the keyboard-only test answers a terminal step by typing and a hotspot by Space on a checkbox.
- [ ] **Step 3:** `npm run check` — all pass.
- [ ] **Step 4:** Commit `feat: enable PBQ templates 5-8 in mock exams`.

### Task 5: Handoff

- [ ] Update `HANDOFF.md`: chunk 4 done, decisions (pattern rules, hotspot scoring, data chart `aria-hidden` with table as text), next = chunk 5. Commit `docs: handoff after chunk 4`.
