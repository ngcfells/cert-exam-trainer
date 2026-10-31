# Math Section 3 — Content C + D Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (owner's choice: Native) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the area C (inferential statistics) and area D (correlation and regression) lessons and their check items for DA0-002.

**Architecture:** Content only, same pattern as section 2. Lessons go in new files `src/banks/dataplus/lessons/C-inferential-stats.json` and `D-correlation-regression.json` (picked up by the glob in `src/banks/lessons.ts`), validated by `lessonSchema`. Check items are approved bank items in `src/banks/dataplus/items/3.2.json` (default) and `1.5.json` where the item is about modelling (logistic regression). Every numeric item gets a recomputation in `src/banks/dataplus/numericChecks.ts`.

**Tech Stack:** JSON content, Vitest (`bank.test.ts`, `content.test.ts`).

**Spec:** `docs/superpowers/specs/2026-10-31-dataplus-math-module-design.md` (§2, §3 C–D, §4, §7, §8a)

## Global Constraints

- Original content only; `_WorkingData/` guides topics, never text.
- Lesson parts: meaning (1–2 plain sentences), formula with every symbol named (or a rule when there is no formula), worked example (≤ 8 data points, round-ish numbers, captioned table where it helps), exam trap.
- 3–5 check ids per lesson; a lesson with a formula links ≥ 1 `numeric` item; linked items are `approved`. Existing items may be linked (`da2-3-2-mcq-004` CI, `-027` p-value, `-030` r, `-032` regression).
- No computing test statistics (§4): t, χ² and ANOVA are name-and-use only. Numeric items stay to CI bounds, margin of error given, regression predictions, slope from two points, R² from r, moving averages, simple trend forecasts.
- Symbol names in lessons are plain text: Unicode (H₀, H₁, α, x̄, r², ±), never `^{}`/`_{}` in `symbols`.
- Numeric stems state form and rounding; tolerance 0.5 whole numbers, 0.05 one decimal, 0.01 two decimals; `payload.suffix: "%"` for percents.
- Ids: numeric `da2-3-2-num-NNN` from 023, MCQs `da2-3-2-math-mcq-NNN` from 012, `da2-1-5-math-mcq-NNN` from 001.
- Keep quotas, key-position/length-tell and near-duplicate checks passing; every acronym (ANOVA, CI, etc.) in lesson or item text needs an expansion, or is written out.

## Review Focus

- "95% confident" wording: no item or lesson may say there is a 95% probability the true value lies in a computed interval.
- p-value wording: never "probability H₀ is true"; "fail to reject", never "accept H₀".
- Type I vs. Type II swapped in any key or explanation (Type I = false positive, rejecting a true H₀).
- Direction of H₁ (> vs. ≠) must match the scenario's wording exactly.
- R² vs. r: R² = r² only for simple linear regression; stems must say one predictor. Correlation items never imply causation in the key.

---

### Task 1: Area C lessons (inferential statistics)

**Files:**
- Create: `src/banks/dataplus/lessons/C-inferential-stats.json`
- Modify: `src/banks/dataplus/items/3.2.json`, `src/banks/dataplus/numericChecks.ts`

Lessons (id → formula/rule → checks):
- `c-population-sample` — rule (population = everyone, sample = the part measured; statistic estimates parameter; random sampling); 1 numeric (sample share, e.g. 400 of 20,000 as %), 2 MCQs.
- `c-hypotheses` — rule: H₀ is "no change / equals", H₁ is the claim (>, <, ≠); 3 MCQs from scenarios (incl. "mean weekly sales > $8,000"), one on one- vs. two-tailed.
- `c-type-errors` — rule table (decision × truth); α = chance of Type I; 3 MCQs (false positive, false negative, which is worse in a scenario).
- `c-p-values` — rule: reject H₀ when p ≤ α; 1 numeric (confidence level = (1 − α) × 100), 2 MCQs + link `da2-3-2-mcq-027`.
- `c-confidence-intervals` — `CI = x̄ ± margin of error`; 2 numeric (lower bound, upper bound / width), MCQ on meaning + link `da2-3-2-mcq-004`.
- `c-choosing-a-test` — rule table: t-test (2 means), ANOVA (3+ means), chi-squared (categories / counts); 3 MCQs.

- [ ] **Step 1:** Add `NUMERIC_CHECKS` entries for the new numeric ids; `npx vitest run src/banks/dataplus/bank.test.ts` → FAIL (ids absent).
- [ ] **Step 2:** Write the items and the lesson file.
- [ ] **Step 3:** `npx vitest run src/banks/dataplus src/acronyms` → PASS.
- [ ] **Step 4:** Commit `feat(content): area C inferential statistics lessons`.

### Task 2: Area D lessons (correlation and regression)

**Files:**
- Create: `src/banks/dataplus/lessons/D-correlation-regression.json`
- Modify: `src/banks/dataplus/items/3.2.json`, `1.5.json`, `numericChecks.ts`

Lessons:
- `d-correlation` — rule: r from −1 to +1, sign = direction, size = strength; correlation ≠ causation; 3 MCQs (one on a confounder) + link `da2-3-2-mcq-030`.
- `d-linear-regression` — `y = mx + b`, `R² = r²` (one predictor); helpers `predict(m, b, x)`, `slope(x1, y1, x2, y2)`; 3 numeric (prediction, slope from two points, R² as % from r), 1 MCQ + link `da2-3-2-mcq-032`.
- `d-logistic-regression` — rule: predicts a probability 0–1 of a yes/no outcome, threshold (usually 0.5) turns it into a class; 1 numeric (how many of a list of given probabilities are ≥ 0.5), 2 MCQs in `1.5.json` (linear vs. logistic fit).
- `d-time-series` — `moving average = (sum of last k values) ÷ k`; helper `movingAvg(xs, k)` (last k); 2 numeric (3-period moving average, naive trend forecast = last + average change), 2 MCQs (trend vs. seasonality).

- [ ] **Step 1:** Add helpers and `NUMERIC_CHECKS` entries → bank test FAIL.
- [ ] **Step 2:** Write items and the lesson file.
- [ ] **Step 3:** `npx vitest run src/banks/dataplus src/acronyms` → PASS.
- [ ] **Step 4:** Commit `feat(content): area D correlation and regression lessons`.

### Task 3: Verify, review, handoff

- [ ] **Step 1:** `npm run check` → all green (lint, typecheck, unit, builds, e2e incl. bank project).
- [ ] **Step 2:** One section reviewer (Opus) on statistical accuracy (Review Focus list) and plain language; fix every finding, minors included; re-run `npm run check`.
- [ ] **Step 3:** Update `HANDOFF.md` (section 3 done, counts: 20 of 30 lessons, numeric tally; next: section 4, area E); commit `docs: handoff for math section 4`.
