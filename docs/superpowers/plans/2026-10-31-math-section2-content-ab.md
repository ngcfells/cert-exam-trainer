# Math Section 2 — Content A + B Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (owner's choice: Native) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the area A (business math) and area B (descriptive statistics) lessons and their check items for DA0-002.

**Architecture:** Content only. Lessons go in `src/banks/dataplus/lessons/A-business-math.json` and a new `B-descriptive-stats.json`, validated by `lessonSchema` (`src/domain/lesson.ts`). Check items are ordinary approved bank items in `src/banks/dataplus/items/3.2.json` (area A, area B stats) and `2.2.json` where tagged 2.2. Every numeric item gets a recomputation in `src/banks/dataplus/numericChecks.ts`.

**Tech Stack:** JSON content, Vitest (`bank.test.ts`, `content.test.ts`).

**Spec:** `docs/superpowers/specs/2026-10-31-dataplus-math-module-design.md` (§2, §3 A–B, §7, §8a)

## Global Constraints

- Original content only; `_WorkingData/` guides topics, never text.
- Lesson parts: meaning (1–2 plain sentences), formula with every symbol named (or rule), worked example (≤ 8 data points, round-ish numbers, captioned table where it helps), exam trap.
- 3–5 check ids per lesson; a lesson with a formula links ≥ 1 `numeric` item; linked items are `approved`.
- Numeric stems state the form ("as a percent, rounded to a whole number" / "rounded to two decimals"); tolerance 0.5 for whole-number answers, 0.01 for two-decimal, 0.05 for one-decimal; `payload.suffix: "%"` for percents.
- Explanations show the steps. No symbol used before it is named. Assume no stats background.
- Ids: numeric `da2-<obj>-num-NNN` (continue from 003), MCQs `da2-<obj>-math-mcq-NNN`.
- Keep existing quotas, key-position/length-tell and near-duplicate checks in `bank.test.ts` passing; every acronym in lesson text needs an expansion.

## Review Focus

- A numeric answer whose stem rounding differs from the recomputation (e.g. CAGR to one decimal) — the `NUMERIC_CHECKS` entry must compute exactly what the stem asks before rounding; tolerance covers the rounding.
- Sample vs. population SD: each SD stem must say which; recomputation uses `sampleSd` or a population helper accordingly.
- Percentage points vs. percent: stems must say which unit the answer is in.
- MCQ correct-answer position and length spread (bank tells test).
- Median with an even count of values: example and items must average the middle two.

---

### Task 1: Area A lessons (business math)

**Files:**
- Modify: `src/banks/dataplus/lessons/A-business-math.json` (append 5 lessons)
- Modify: `src/banks/dataplus/items/3.2.json`, `src/banks/dataplus/numericChecks.ts`

Lessons (id → formula → required numeric checks):
- `a-percentage-points` — rule-free formula `pp difference = new% − old%`; items: pp difference (numeric), percent change of a rate (numeric), pp-vs-% MCQ.
- `a-growth-ratios` — `ratio = this period ÷ last period`, growth = ratio − 1; items: 2 numeric, 1 MCQ.
- `a-cagr` — `CAGR = (end ÷ start)^{1/n} − 1`; items: 2 numeric (one-decimal %), MCQ on why simple average of yearly growth is wrong.
- `a-rule-of-72` — `years to double ≈ 72 ÷ rate`; items: 2 numeric, 1 MCQ.
- `a-weighted-average` — `Σ(w × x) ÷ Σw`; items: 2 numeric, 1 MCQ (unweighted-mean trap).

- [ ] **Step 1:** Add `NUMERIC_CHECKS` entries (helpers `cagr(start,end,n)`, `rule72(rate)`, `weightedMean(xs, ws)`) for the new ids; run `npx vitest run src/banks/dataplus/bank.test.ts` → FAIL (ids not numeric/absent).
- [ ] **Step 2:** Write the items and lessons.
- [ ] **Step 3:** Run `npx vitest run src/banks/dataplus src/acronyms` → PASS.
- [ ] **Step 4:** Commit `feat(content): area A math lessons and checks`.

### Task 2: Area B lessons (descriptive statistics)

**Files:**
- Create: `src/banks/dataplus/lessons/B-descriptive-stats.json`
- Modify: `src/banks/dataplus/items/3.2.json`, `2.2.json`, `numericChecks.ts`

Lessons:
- `b-mean-median-mode` — formula `x̄ = Σx ÷ n`; items: numeric mean, numeric median (even count), MCQ "skewed salaries → median", MCQ "categories → mode".
- `b-standard-deviation` — `s = √(Σ(x − x̄)^{2} ÷ (n − 1))`, table of x, x − x̄, (x − x̄)²; items: numeric sample SD (two decimals), numeric variance, numeric population SD, MCQ sample vs. population.
- `b-outliers-iqr` — `IQR = Q3 − Q1`, fences `Q1 − 1.5×IQR`, `Q3 + 1.5×IQR`, z = (x − x̄) ÷ s; items: numeric upper fence, numeric z-score, MCQ outlier pulls mean not median. Quartiles are given in the stem (no quartile-method ambiguity).
- `b-distribution-shape` — rule (68-95-99.7, skew direction vs. mean/median); items: numeric "% within 2 SD" style, 2 MCQs (right skew mean > median; normal shape).

- [ ] **Step 1:** Add `NUMERIC_CHECKS` (add `mean`, `median`, `popSd`, `sampleVar`) → bank test FAIL.
- [ ] **Step 2:** Write items and lessons.
- [ ] **Step 3:** `npx vitest run src/banks/dataplus src/acronyms` → PASS.
- [ ] **Step 4:** Commit `feat(content): area B statistics lessons and checks`.

### Task 3: Verify, review, handoff

- [ ] **Step 1:** `npm run check` → all green (lint, typecheck, unit, builds, e2e incl. bank project).
- [ ] **Step 2:** One whole-branch-section reviewer (Opus) on content accuracy and plain language; fix every finding, minors included; re-run `npm run check`.
- [ ] **Step 3:** Update `HANDOFF.md` (section 2 done, counts, next: section 3 C+D); commit `docs: handoff for math section 3`.
