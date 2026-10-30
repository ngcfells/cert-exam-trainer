# Chunk 3: PBQ Templates 1–4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the match, order, config and diagram PBQ templates with per-part scoring, wired into assembly, `ExamRunner`, `scoreExam` and the results review.

**Architecture:** Every template-1–4 PBQ reduces to *parts*: a part id mapped to one chosen value id. The response for a PBQ is `Record<partId, valueId>`, the answer key is the same shape, and one function scores any of the four by counting matching parts. Each template is a small React view that edits that map; drag is an enhancement, and every part also has a native `<select>` (keyboard and tap alternative).

**Tech Stack:** React 18, TypeScript, Zod 3, Vitest + Testing Library, Playwright + axe.

**Spec:** `docs/superpowers/specs/2026-10-30-comptia-exam-trainer-design.md` (§5 question records, §6 PBQ engine, §7 scoring/randomness, §8 accessibility)

## Global Constraints

- Every part is scored independently to give partial credit (§6).
- Each PBQ awards its share in proportion to the parts it got right (§7).
- The order of PBQ elements (draggable items, steps, buckets) is shuffled per attempt, from the seeded RNG (§7 4a).
- Every drag interaction needs a keyboard and tap alternative; axe must show no serious or critical violations (HANDOFF standing rules).
- Bundled content must be original.
- Diagrams are structured data rendered as SVG — never raw SVG/HTML strings from question data (user-authored PBQs reuse these templates).

## Review Focus

- An untouched PBQ is "unanswered" in the review grid and confirm dialog, and scores 0 — including an order PBQ whose shuffled start happens to be correct.
- A partially completed PBQ (some parts blank) earns credit only for the filled, correct parts and counts as answered.
- A PBQ whose payload/answer is malformed (answer references an unknown id) is rejected by `questionSchema`, so it never reaches the runner.
- Navigating away from a PBQ and back keeps its response (state lives in `ExamRunner`, not the view).
- Old saved results (responses as `string[]` only) still validate after the schema change.

---

### Task 1: PBQ payload/answer schemas and part helpers

**Files:**
- Create: `src/domain/pbq.ts`, `src/domain/pbq.test.ts`
- Modify: `src/domain/schema.ts` (superRefine validates pbq-match/order/config/diagram payload+answer), `src/domain/types.ts` (export the types)

**Interfaces — Produces (`src/domain/pbq.ts`):**
- `type PartMap = Record<string, string>`
- Payloads/answers:
  - `pbq-match`: payload `{ prompts: Item[]; choices: Item[] }`, answer `{ pairs: PartMap }` (promptId → choiceId; every prompt keyed; choices may be reused/unused)
  - `pbq-order`: payload `{ steps: Item[] }`, answer `{ order: string[] }` (a permutation of step ids)
  - `pbq-config`: payload `{ fields: { id; label; options: Item[] }[] }`, answer `{ values: PartMap }` (fieldId → optionId)
  - `pbq-diagram`: payload `{ width; height; nodes: { id; x; y; w; h; text? }[]; edges: { from; to }[]; zones: { id; x; y; name }[]; labels: Item[] }`, answer `{ placements: PartMap }` (zoneId → labelId); `Item = { id: string; text: string }`
- `TEMPLATE_1_4: readonly ['pbq-match','pbq-order','pbq-config','pbq-diagram']`
- `pbqSchemas: Record<typeof TEMPLATE_1_4[number], { payload: ZodType; answer: ZodType }>`
- `correctParts(q: Question): PartMap` — order becomes `{ '0': id0, '1': id1, … }`
- `partLabel(q: Question, partId: string): string` and `valueText(q: Question, partId: string, valueId: string): string` (for the review screen; order part label is `Step ${n+1}`)
- `elementIds(q: Question): string[]` — the shuffleable pool: match choices, order steps, config: none (`[]`), diagram labels

- [ ] **Step 1: Write failing tests** in `pbq.test.ts`: a valid fixture of each type parses through `questionSchema`; each of these is rejected: match answer keyed by an unknown prompt, match missing a prompt, order answer not a permutation, config value not among that field's options, diagram zone with unknown label, duplicate ids within a list. `correctParts` on an order question with `order: ['s2','s1']` returns `{ '0': 's2', '1': 's1' }`.
- [ ] **Step 2:** `npx vitest run src/domain` — FAIL (module missing).
- [ ] **Step 3:** Implement; `questionSchema.superRefine` parses `payload`/`answer` with `pbqSchemas[type]` for the four types (others stay `unknown` until chunk 4) and adds cross-reference issues.
- [ ] **Step 4:** `npx vitest run src/domain` — PASS. Add the four fixtures to `src/exam/testFixtures.ts` as `pbqMatch(id,w)`, `pbqOrder`, `pbqConfig`, `pbqDiagram` (each valid) and change `pbq()` default fixtures used by assembly tests to `pbqMatch` so existing tests keep valid PBQs.
- [ ] **Step 5:** Commit `feat(domain): schemas and part helpers for PBQ templates 1-4`.

### Task 2: Per-part scoring, response type, result schema

**Files:** Modify `src/exam/scoring.ts`, `src/exam/scoring.test.ts`, `src/exam/result.ts`, `src/exam/result.test.ts`

**Interfaces:**
- `type ItemResponse = string[] | PartMap`; `type Responses = Record<string, ItemResponse>`
- `isAnswered(r: ItemResponse | undefined): boolean` — array non-empty, or map has ≥1 non-empty value
- `pbqFraction(q: Question, given: PartMap): number` — matching parts / total parts
- `ItemScore` gains `parts?: { partId: string; correct: boolean }[]` for PBQs
- `examResultSchema.responses`: `z.record(z.union([z.array(z.string()), z.record(z.string())]))`; new optional `elementOrders: z.record(z.array(z.string()))`

- [ ] **Step 1: Failing tests:** match with 4 prompts, 3 right → fraction 0.75, earned = 0.75 × unit × w; blank response → 0, `answered: false`; order with untouched (absent) response → 0; MCQ with a map response → 0 (no crash); a result with `{ q1: ['a'] }` and one with `{ p1: { x: 'y' } }` both parse.
- [ ] **Step 2:** `npx vitest run src/exam` — FAIL.
- [ ] **Step 3:** Implement; MCQ path treats a non-array response as `[]`; `buildResult` writes `elementOrders` from items that have one.
- [ ] **Step 4:** `npx vitest run src/exam` — PASS.
- [ ] **Step 5:** Commit `feat(exam): per-part PBQ scoring`.

### Task 3: Element shuffle in assembly

**Files:** Modify `src/exam/assemble.ts`, `src/exam/assemble.test.ts`

**Interfaces:** `ExamItem.elementOrder?: string[]` — `shuffle(elementIds(q), rng)` for each PBQ, set only when non-empty; drawn after the PBQ pick and before MCQs.

- [ ] **Step 1: Failing test:** with seed 1 an order PBQ's `elementOrder` is a permutation of its step ids; same seed → same order; across seeds 1..20 at least two distinct orders appear.
- [ ] **Step 2–4:** run (FAIL), implement, run (PASS).
- [ ] **Step 5:** Commit `feat(exam): shuffle PBQ elements per attempt`.

### Task 4: Template views and runner hookup

**Files:**
- Create: `src/ui/exam/pbq/PbqView.tsx` (dispatcher), `MatchView.tsx`, `OrderView.tsx`, `ConfigView.tsx`, `DiagramView.tsx`, `src/ui/exam/pbq/pbq.test.tsx`
- Modify: `src/ui/exam/ExamRunner.tsx`, `src/ui/exam/exam.css`

**Interfaces:** every view: `({ item: ExamItem; value: PartMap; onChange: (v: PartMap) => void })`. `PbqView` takes the same props and switches on type.

Behaviour:
- Shared: stem as `<h3>`-free legend text in a `<fieldset>`; each part's `<select>` has an accessible label (prompt text / field label / zone name / `Position n`) and a blank first option "Choose…"; choice/label options listed in `elementOrder`.
- Match & diagram: chips (the pool) are `draggable`; dropping a chip onto a part's drop target sets that part. Selects remain the primary control.
- Order: an `<ol>` in current order (response order if complete, else `elementOrder`) with "Move up"/"Move down" buttons per row (`aria-label="Move <text> up"`); any move writes the full order as a PartMap, so an untouched order PBQ stays unanswered. Rows also `draggable` for reordering. Polite live region announces "<text> moved to position n".
- Diagram: SVG (`role="img"`, `aria-label` = stem) draws nodes as rects with text and edges as lines; zones are absolutely-positioned HTML targets over the SVG holding their `<select>`.
- Runner: non-MCQ items render `PbqView` with `value={responses[id] as PartMap ?? {}}`; `isAnswered` from scoring replaces the local check.

- [ ] **Step 1: Failing tests** (`pbq.test.tsx`, user-event): match — selecting a choice for a prompt calls `onChange` with `{ p1: 'c2' }`; order — clicking "Move <first> down" emits the swapped full order; config — selecting emits field value; diagram — SVG has role img and each zone select is labelled by its zone name; runner — a PBQ answer persists after Next then Previous, and the review grid marks it answered.
- [ ] **Step 2–4:** run (FAIL), implement, run `npx vitest run src/ui` (PASS).
- [ ] **Step 5:** Commit `feat(ui): PBQ templates match, order, config, diagram`.

### Task 5: Per-part results review

**Files:** Modify `src/ui/exam/ResultsScreen.tsx`, `src/ui/exam/components.test.tsx`

For a missed PBQ, render a table caption "Parts" with columns Part / Your answer / Correct answer / Result ("Correct"/"Incorrect" text, not colour only), then `partExplanations[partId]` when present, using `partLabel`/`valueText`.

- [ ] **Step 1: Failing test:** a match PBQ with one wrong part shows a row with "Incorrect" and the right choice text.
- [ ] **Step 2–4:** run (FAIL), implement, run (PASS).
- [ ] **Step 5:** Commit `feat(ui): per-part PBQ review on results`.

### Task 6: Enable in the mock exam, seed content, e2e

**Files:** Modify `src/ui/exam/MockExamFlow.tsx` (`pbqTypes: TEMPLATE_1_4`), `src/banks/dataplus/questions.ts` (one original approved Data+ PBQ of each of the four types), `tests/e2e/exam.spec.ts`, `src/ui/exam/MockExamFlow.test.tsx` if counts change.

- [ ] **Step 1:** Add the four PBQs; `npx vitest run src/banks` validates them through the registry.
- [ ] **Step 2:** e2e: replace hard-coded "of 2" with a regex; add a test that, for seeds forcing PBQs (pass a seed via the flow if supported, else walk all items), each PBQ screen passes axe and can be answered with keyboard only (Tab to a select, ArrowDown, then Next).
- [ ] **Step 3:** `npm run check` — all green.
- [ ] **Step 4:** Commit `feat: enable PBQ templates 1-4 in mock exams`.

### Task 7: Handoff

- [ ] Update `HANDOFF.md` (chunk 3 done, decisions, next = chunk 4 templates 5–8), commit `docs: handoff after chunk 3`, push `main`.
