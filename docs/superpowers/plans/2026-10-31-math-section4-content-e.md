# Math Section 4 — Content E Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (owner's choice: Native) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the area E (data math) lessons and their check items for DA0-002.

**Architecture:** Content only, same pattern as sections 2 and 3. Lessons go in `src/banks/dataplus/lessons/E-data-math.json` (picked up by the glob in `src/banks/lessons.ts`), validated by `lessonSchema`. Check items are approved bank items in `src/banks/dataplus/items/2.3.json` (transformation: scaling, binning, derived fields, units) and `2.2.json` (aggregation pitfalls, double counting). Every numeric item gets a recomputation in `src/banks/dataplus/numericChecks.ts`.

**Tech Stack:** JSON content, Vitest (`bank.test.ts`, `content.test.ts`).

**Spec:** `docs/superpowers/specs/2026-10-31-dataplus-math-module-design.md` (§2, §3 E, §4, §7, §8a)

## Global Constraints

- Original content only; `_WorkingData/` guides topics, never text.
- Lesson parts: meaning (1–2 plain sentences), formula with every symbol named (or a rule when there is no formula), worked example (≤ 8 data points, round-ish numbers, captioned table where it helps), exam trap.
- 3–5 check ids per lesson; a lesson with a formula links ≥ 1 `numeric` item; linked items are `approved`. Existing items may be linked (`da2-2-3-mcq-008`/`-009` binning, `-014`/`-015` min-max, `-040` z-score).
- Symbol names in lessons are plain text (Unicode), never `^{}`/`_{}` in `symbols`.
- Numeric stems state form and rounding; tolerance 0.5 whole numbers, 0.05 one decimal, 0.01 two decimals; `payload.suffix: "%"` for percents, `prefix: "$"` for dollars; `payload` always present (`{}` if no unit).
- Ids: numeric `da2-2-3-num-NNN` and `da2-2-2-num-NNN` from 001; MCQs `da2-2-3-math-mcq-NNN` and `da2-2-2-math-mcq-NNN` from 001.
- Target: 15 numeric items (tally 33 → 48 of 60).
- Keep quotas, key-position/length-tell and near-duplicate checks passing; every acronym in lesson or item text needs an expansion, or is written out.

## Review Focus

- Min-max vs. z-score: min-max gives 0–1; z-score gives mean 0, SD 1 and can be negative. No item may call z-score output "between 0 and 1".
- Equal width vs. equal count (frequency) bins: width = (max − min) ÷ number of bins; equal count bins have unequal widths.
- Average of averages: the key must use the weighted (total ÷ count) answer, never the simple mean of group means, unless group sizes are equal.
- Date differences: state whether both end dates count (inclusive) or not; the key must match the stem.
- Percent stored as 0.05 vs. 5: stems must say which form the answer takes.

---

### Task 1: Area E lessons (data math)

**Files:**
- Create: `src/banks/dataplus/lessons/E-data-math.json`
- Modify: `src/banks/dataplus/items/2.3.json`, `2.2.json`, `src/banks/dataplus/numericChecks.ts`

Lessons (id → formula/rule → checks):
- `e-units-precision` — rule (round only at the end; read K/M scales; a percent stored as 0.05 means 5%); 3 numeric (convert 0.075 to %; 2.4 million in thousands; round a computed value to 2 decimals), 1 MCQ (rounding too early).
- `e-normalization` — `x′ = (x − min) ÷ (max − min)` and `z = (x − x̄) ÷ s`; helpers `minMax(x, lo, hi)`, `zScore(x, m, s)`; 3 numeric (min-max value, z-score, reverse a z-score to x), 1 MCQ + link `da2-2-3-mcq-040`.
- `e-binning` — `bin width = (max − min) ÷ number of bins`; 2 numeric (width; which bin number holds a value), 1 MCQ + links `da2-2-3-mcq-008`, `-009`.
- `e-derived-fields` — rule (duration = end − start; ratio = part ÷ whole; running total = sum so far); 4 numeric (days between dates, hours between timestamps, ratio as %, running total at row 3), 1 MCQ.
- `e-aggregation-pitfalls` — rule (overall average = total ÷ count, not the mean of group means; a one-to-many join repeats the "one" side's values); items in `2.2.json`: 3 numeric (true overall average, wrong average of averages vs. right gap, inflated total after join), 2 MCQs.

- [ ] **Step 1:** Add helpers and `NUMERIC_CHECKS` entries for the 15 new ids; `npx vitest run src/banks/dataplus/bank.test.ts` → FAIL (ids absent).
- [ ] **Step 2:** Write the items and the lesson file.
- [ ] **Step 3:** `npx vitest run src/banks/dataplus src/acronyms` → PASS.
- [ ] **Step 4:** Commit `feat(content): area E data math lessons`.

### Task 2: Verify, review, handoff

- [ ] **Step 1:** `npm run check` → all green.
- [ ] **Step 2:** One section reviewer (Opus) on accuracy (Review Focus list) and plain language; fix every finding, minors included; re-run `npm run check`.
- [ ] **Step 3:** Update `HANDOFF.md` (section 4 done; 25 of 30 lessons; numeric tally; next: section 5, area F joins — needs ≥ 5 lessons, ≥ 10 join PBQs and the rest of the 60 numeric); commit `docs: handoff for math section 5`.
