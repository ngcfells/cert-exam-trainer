# Math Section 5 — Content F (Joins and Keys) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (owner's choice: Native) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the area F (joins and keys) lessons, their check items, and at least 10 new join PBQs for DA0-002.

**Architecture:** Content only, same pattern as sections 2–4. Lessons go in `src/banks/dataplus/lessons/F-joins-keys.json` (picked up by the glob in `src/banks/lessons.ts`), validated by `lessonSchema`. Key concepts live in objective 1.1 (`1.1.json`); joins, unions and pivots are transformation (`2.3.json`). Every numeric item gets a recomputation in `src/banks/dataplus/numericChecks.ts`, using a real join counter rather than a hard-coded number.

**Tech Stack:** JSON content, Vitest (`bank.test.ts`, `content.test.ts`).

**Spec:** `docs/superpowers/specs/2026-10-31-dataplus-math-module-design.md` (§2, §3 F, §4, §7, §8a)

## Global Constraints

- Original content only; `_WorkingData/` guides topics, never text.
- Lessons without a formula give a `rule` and a worked example with small before/after tables (≤ 8 rows each, captioned). Every lesson has meaning, example and trap. The owner is not an analyst: no SQL knowledge assumed in lesson text; SQL appears only as an optional illustration.
- 3–5 check ids per lesson; linked items are `approved`. A lesson with a formula (cross join: rows = m × n) links ≥ 1 `numeric` item.
- Check items must not reuse the worked example's numbers or tables.
- Numeric stems state the form ("Answer as a whole number"); tolerance 0.5 for counts and whole dollars; `payload` always present (`{}` for counts, `prefix: "$"` for dollars).
- Ids: lessons `f-…`; numeric `da2-2-3-num-013…` and `da2-1-1-num-001…`; MCQs `da2-2-3-math-mcq-005…` and `da2-1-1-math-mcq-001…`; PBQs `da2-2-3-<template>-NNN` / `da2-1-1-<template>-NNN`, continuing each existing sequence.
- Targets: ≥ 5 lessons (25 → 30+), ≥ 12 numeric items (48 → 60+), ≥ 10 join PBQs.
- Keep quotas, key-position/length-tell, near-duplicate and "order PBQ not authored in answer order" checks passing; every acronym is expanded or written out (ID is fine as a word only if `content.test.ts` accepts it — otherwise write "identifier" or add a community acronym).

## Review Focus

- Left join row count: every left row appears at least once; a left row matching k right rows appears k times. Count = Σ max(1, matches). Never "equals the left table's row count" when the right key repeats.
- Full outer join count = inner matches + unmatched left + unmatched right; no double counting of matched rows.
- Nulls: a NULL key never matches another NULL in an inner join; unmatched rows get NULLs in the other table's columns.
- Union vs. union all: UNION removes duplicate rows, UNION ALL keeps them; union needs the same columns in the same order, a join adds columns.
- Primary key must be unique and non-null; a foreign key may repeat and may be null; names and addresses are not keys because they repeat and change.

---

### Task 1: Join counter helper and numeric checks

**Files:**
- Modify: `src/banks/dataplus/numericChecks.ts`

- Add `const joinRows = (left: (string | null)[], right: (string | null)[], kind: 'inner' | 'left' | 'right' | 'full'): number` — keys only; null never matches; computes matches per row, then adds unmatched sides per kind.
- Add `NUMERIC_CHECKS` entries for every numeric id in Task 2, each calling `joinRows` (or `m * n` for cross joins, plain arithmetic for totals) on the item's own key lists.

- [ ] **Step 1:** Write the helper and entries; `npx vitest run src/banks/dataplus/bank.test.ts` → FAIL (ids absent from bank).

### Task 2: Area F lessons, check items and join PBQs

**Files:**
- Create: `src/banks/dataplus/lessons/F-joins-keys.json`
- Modify: `src/banks/dataplus/items/1.1.json`, `2.3.json`

Lessons (id → rule → checks):
- `f-keys` (1.1) — primary key unique + non-null; foreign key points to a primary key; join on an identifier, not a name or address. Checks: 2 numeric (`da2-1-1-num-001` duplicates in a candidate key column; `-002` orphan foreign-key rows), 2 MCQs.
- `f-join-types` (2.3) — inner, left, right, full outer with before/after tables. Checks: 4 numeric (inner, left, right, full counts on one pair of key lists different from the example), 1 MCQ.
- `f-cross-join` (2.3) — formula rows = m × n. Checks: 2 numeric (cross count; accidental cross join from a missing join condition), 1 MCQ.
- `f-bad-joins` (2.3) — duplicated rows from a non-unique key, lost rows from inner join or type mismatch, inflated totals. Checks: 3 numeric (row count with a repeated key, inflated sum in dollars, rows lost by inner vs. left), 1 MCQ; may also link `da2-2-2-num-003`.
- `f-union-pivot` (2.3) — union stacks rows (same columns), join adds columns; union vs. union all; pivot (rows → columns) and unpivot (columns → rows). Checks: 2 numeric (union vs. union all count; unpivot row count = rows × pivoted columns), 2 MCQs.

Total numeric: 13 (tally → 61).

Join PBQs (≥ 10, all approved, original company names):
1. `da2-1-1-buckets-002` — sort columns into primary key / foreign key / not a key.
2. `da2-1-1-match-002` — match each table pair to the key to join on.
3. `da2-1-1-hotspot-002` — select the fields that could serve as a primary key.
4. `da2-2-3-config-002` — choose the join type for each business question.
5. `da2-2-3-config-003` — choose union, union all, join, pivot or unpivot per task.
6. `da2-2-3-data-002` — two small tables shown as one table with a source column; questions on inner/left/full row counts.
7. `da2-2-3-data-003` — a join result with inflated totals; find the duplicated key, true total, rows to drop.
8. `da2-2-3-match-00N` — match join type to its before/after outcome description.
9. `da2-2-3-order-00N` — order the steps to join two extracts safely (profile keys → fix types → dedupe → join → reconcile row counts); not authored in answer order.
10. `da2-2-3-terminal-003` — write the SQL join (`SELECT … FROM orders LEFT JOIN customers ON orders.customer_id = customers.customer_id`) with options-based steps where free text would be too strict.
11. `da2-2-3-diagram-00N` — place each table in a star-schema zone and label the key relationships.

- [ ] **Step 1:** Write the items, then the lesson file.
- [ ] **Step 2:** `npx vitest run src/banks/dataplus src/acronyms` → PASS.
- [ ] **Step 3:** Commit `feat(content): area F joins and keys lessons`.

### Task 3: Verify, review, handoff

- [ ] **Step 1:** `npm run check` → all green.
- [ ] **Step 2:** One section reviewer (Opus) on accuracy (Review Focus list), plain language and PBQ answer tells; fix every finding, minors included; re-run `npm run check`.
- [ ] **Step 3:** Update `HANDOFF.md` (section 5 done; lesson, numeric and join-PBQ tallies; next: section 6 final audit, Opus whole-branch review, fix bugs #1/#2, merge, redeploy); commit `docs: handoff for math section 6`.
