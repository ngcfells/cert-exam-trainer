# Math Module Section 6 (Final) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lock the spec §7 targets into tests, fix hotspot bugs #1 (labels overflow) and #2 (fixed spot layout gives the answer away), run one Opus whole-branch review, then merge `math-engine` to `main` and redeploy.

**Architecture:** Hotspot spots join the existing per-attempt shuffle: `TEMPLATES['pbq-hotspot'].pool` returns spot ids, so `assemble` puts them in `elementOrder` and results keep them in `elementOrders`. The view treats the authored spot rectangles as fixed *slots* and places spot `elementOrder[i]` in slot `i`; the checkbox list uses the same order. Spot labels move into the spot itself as wrapping HTML in a `<foreignObject>`.

**Tech Stack:** React, TypeScript, Zod, Vitest, Playwright + axe.

**Spec:** `docs/superpowers/specs/2026-10-31-dataplus-math-module-design.md` (§7, §8 item 5), issues #1 and #2.

## Global Constraints

- At least 30 lessons; each has 3–5 check items, and at least one `numeric` when it has a formula.
- At least 60 numeric items and at least 10 new join PBQs; existing per-objective quotas still pass.
- axe: no serious or critical violations; every drag/click path keeps its keyboard and tap alternative.
- SVG colours come from CSS tokens only (`theme.test.ts`).
- Do not merge before section 6 is complete; deploy with `npm run deploy` from `main`.

## Review Focus

- A hotspot result saved before this change (no `elementOrders` entry for it) still renders, in authored order.
- A seed replays the same hotspot layout (`?seed=N`).
- Hotspot labels fit at phone width (360 px), in light and dark theme.
- A hotspot node that is not under any spot (a pure decoration) stays where it was authored.
- Config/data/terminal option lists: the key must not sit at the same option index in most items (the tell from #2, other types).

---

### Task 1: §7 target tests

**Files:** Modify `src/banks/dataplus/bank.test.ts`

- [ ] **Step 1:** In `describe('targets (approved items only)')` add `it('meets the math module targets (spec §7)')` asserting: `shippedLessons.length >= 30`; every lesson has `checks.length` in 3..5 (use the lesson's real field name); approved `numeric` count `>= 60`; approved PBQs whose id is in the section 5 join list (`da2-1-1-buckets-002`, `da2-1-1-match-002`, `da2-1-1-hotspot-002`, `da2-2-3-config-002`, `-config-003`, `-data-002`, `-data-003`, `-match-001`, `-order-002`, `-terminal-003`, `-diagram-001`) number `>= 10`.
- [ ] **Step 2:** Add `it('does not cluster the key at one option index')` for `pbq-config` and `pbq-data` fields and terminal steps with `options`: over all such parts in the bank, no single index holds more than 50% of keys. Fix the data (reorder options) if it fails.
- [ ] **Step 3:** Run `npx vitest run src/banks/dataplus/bank.test.ts` → PASS. Commit `test: lock math module targets and option-position audit`.

### Task 2: Shuffle hotspot spot placement (#2)

**Files:** Modify `src/domain/pbq.ts` (TEMPLATES `pbq-hotspot`), `src/ui/exam/pbq/HotspotView.tsx`; Test `src/ui/exam/pbq/pbq.test.tsx`, `src/exam/assemble.test.ts` (or the existing assembly test file).

**Interfaces:** Produces `hotspotLayout(p: HotspotPayload, order?: string[]): { spot: Spot; slot: Box; label: string }[]` exported from `src/domain/pbq.ts`. `label` = text of the node whose rect equals the spot's authored rect, else `spot.name`.

- [ ] **Step 1: Failing tests:** `assembleExam` gives a hotspot item an `elementOrder` that is a permutation of spot ids; `hotspotLayout(p, ['b','a'])` puts spot `b` in `a`'s authored rect; `hotspotLayout(p)` keeps authored order; the view renders checkbox labels in `elementOrder` order.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Add `pool: (p: HotspotPayload) => p.spots.map((s) => s.id)`; implement `hotspotLayout`; in `HotspotView`, draw only nodes not matched to a spot via `Boxes`, then each spot at its slot with its label; list checkboxes via `inOrder(p.spots, item.elementOrder)`. Results already store `elementOrders`; make sure the results/review view passes it through for hotspots (check `inOrder` callers).
- [ ] **Step 4:** Run unit tests → PASS. Update any e2e seed expectations that change. Commit `fix(pbq): shuffle hotspot spot placement per attempt (#2)`.

### Task 3: Wrap hotspot labels (#1)

**Files:** Modify `HotspotView.tsx`, `src/ui/exam/exam.css`; Test `tests/e2e/responsive.spec.ts`.

- [ ] **Step 1: Failing e2e:** in `responsive.spec.ts` (phone and default projects, the bank build), open every hotspot item and assert for each `.hotspot .spot-label` that `scrollHeight <= clientHeight + 1` and `scrollWidth <= clientWidth + 1`.
- [ ] **Step 2:** Render each label as `<foreignObject x y width height><div className="spot-label">…</div></foreignObject>` inside the spot `<g>`; CSS: flex centre, `overflow-wrap:anywhere`, `font-size:13px; line-height:1.15`, colour token, padding right 18px so the ✓ never overlaps. Grow any bank spot (and its slot) that still overflows by raising `h` in the JSON.
- [ ] **Step 3:** `npm run check` → all pass. Commit `fix(pbq): wrap hotspot labels inside their spots (#1)`.

### Task 4: Whole-branch review, merge, deploy

- [ ] **Step 1:** Dispatch one Opus reviewer on `git diff main...math-engine` (math correctness of lessons/items, engine, the hotspot fix). Fix every finding, minors included; `npm run check` → pass; commit.
- [ ] **Step 2:** Update `HANDOFF.md` (section 6 done, bugs closed, next: chunk 11 SecAI+); commit.
- [ ] **Step 3:** With owner confirmation: merge `math-engine` into `main`, push, `npm run deploy`, close issues #1 and #2.
