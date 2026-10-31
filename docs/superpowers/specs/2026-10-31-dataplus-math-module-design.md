# Data+ Math & Data Concepts Module — Design

Status: approved by owner 2026-10-31. Parent spec: `2026-10-30-comptia-exam-trainer-design.md`.

## 1. Intent

The owner is a CompTIA trainer, not a data analyst. On a Data+ practice exam they met calculation and statistics items (standard deviation by hand, percent change, which fields to join on). The answer keys showed the arithmetic but not the meaning. Students who don't understand the concepts can't answer these items.

The app is used as **homework**. This module teaches each concept in plain English and then tests it, so a student who never took statistics can reach the level Data+ expects.

Success: a student with no stats background can work through a lesson, explain what the formula means, compute it with small numbers, avoid the exam's trap, and pass the lesson check. The same concepts then appear in mock, practice and cram.

## 2. Goals

- A **Learn** area for DA0-002: one lesson per concept, grouped by topic area, reached from a `Learn: DA0-002` button on Home (beside Acronyms).
- Each lesson has four parts, in this order:
  1. **What it means**: one or two plain sentences, and why an analyst cares.
  2. **The formula**: every symbol named in words (Σ, x̄, n, n−1, H₀ and so on). Lessons without a formula (joins, correlation vs. causation) give the rule or a picture instead.
  3. **Worked example**: small, friendly numbers, one step per row, as a captioned table where that helps (e.g. a table of x, x − x̄ and (x − x̄)²).
  4. **Exam trap**: the usual wrong answer and why it's wrong (e.g. percent change divided by the *new* value).
- A **check** at the end of each lesson: 3–5 questions with instant right/wrong feedback and the worked solution.
- A new question type, **`numeric`**: the student types a number, which is accepted within a stated tolerance. It is usable in lesson checks and in the main bank (mock, practice, cram).
- **Progress** per lesson: not started, in progress, or done (check passed, ≥ 80%; the builder may tune this). It is shown on the Learn list.
- Lesson check items are ordinary bank questions, tagged with a Data+ objective, so they feed mastery and SRS like any other question.
- **Bank growth**: new original MCQs, PBQs and numeric items on these topics in the main bank, including more join PBQs.

## 3. Topic list

Each line is one lesson unless the builder merges two closely related ones. Objective tags are suggestions; 3.2 is the default for statistics.

**A. Business math and percentages** (3.2)
- Percent change (divide by the old value); increase vs. decrease; negative change.
- Percentage points vs. percent.
- Growth rates and ratios across periods.
- CAGR, `(end / start)^(1/n) − 1`, and why a simple average of yearly growth is wrong.
- Rule of 72.
- Weighted averages.

**B. Descriptive statistics** (3.2, 2.2)
- Mean, median and mode: when each is right (skewed data and ordinal data → median; categories → mode).
- Range, variance and standard deviation: the full by-hand method (n, x̄, (x − x̄)², Σ, ÷ n − 1, √). Sample (n − 1) vs. population (n), and which one the exam means.
- Outliers: how they pull the mean but not the median; IQR and the 1.5×IQR rule; z-score idea.
- Distribution shape: normal, skew, the 68-95-99.7 rule.

**C. Inferential statistics** (3.2)
- Population vs. sample.
- Null and alternative hypotheses: writing H₀ and H₁ from a scenario (e.g. "mean weekly sales > $8,000").
- Type I and Type II errors.
- p-values and the significance level (α = 0.05); reading "statistically significant".
- Confidence intervals: what "95% confident" does and doesn't mean.
- Which test fits the question: t-test, chi-squared, ANOVA (name and use only, no computing).

**D. Correlation and regression** (3.2, 1.5)
- Correlation coefficient r: sign and strength; correlation vs. causation.
- Linear regression: slope and intercept, reading `y = mx + b`, R².
- Logistic regression: predicting yes/no outcomes (concept only).
- Time series: trend, seasonality, moving averages, simple forecasting.

**E. Data math** (2.3, 2.2)
- Rounding, precision and units (thousands, millions, percents stored as 0.05 vs. 5).
- Normalization and scaling (min-max, z-score standardization).
- Binning (equal width vs. equal count).
- Derived fields: date differences and durations, ratios, running totals.
- Aggregation pitfalls: average of averages, double counting after a join.

**F. Joins and keys** (1.1, 2.3)
- Primary and foreign keys; why to join on an ID and never on a name or address.
- Inner, left, right, full outer and cross joins, with small before/after tables and row counts.
- What a bad join does: duplicated rows, lost rows, inflated totals.
- Union vs. join; transposing (pivot and unpivot).

## 4. Non-goals and anti-goals

- Not a statistics course: depth stops at what Data+ tests. No calculus, no proofs, no computing test statistics beyond mean, variance and standard deviation.
- No third-party text. The owner's screenshots and practice items in `_WorkingData/` are a guide to **kinds** of questions only, never copied.
- No locking: students may open any lesson in any order, and the check is never required to move on (owner made no gating request; builder's call to leave it open).
- Failure even if it works: jargon left unexplained, a symbol used before it is named, or an example whose numbers are too large to follow by hand.

## 5. Constraints

- Everything in the parent spec still applies: original content, axe with no serious or critical violations, keyboard and tap paths, light and dark themes, phone width, no GitHub Actions.
- Formulas must be readable with a screen reader. Use plain text and HTML (`<sup>`, `<sub>`, `√`, `Σ`, `x̄`) with an `aria-label` that reads the formula in words. No math rendering library unless the builder finds the plain approach unreadable; adding one is a builder decision to note in the plan.
- Lessons are bundled data, not raw HTML: a typed structure validated by a Zod schema, like questions. Tables reuse `src/ui/Table.tsx`.
- `numeric` scoring:
  - Answer: `{ value: number, tolerance: number }` (absolute), plus an optional `unit` label shown beside the input (e.g. `%`, `$`).
  - Input accepts digits, one `.`, a leading `-`, and ignores `,`, `$`, `%` and spaces. A blank or unparseable answer is unanswered.
  - Full credit within tolerance, else 0. Counts as one MCQ unit in the 900 scale.
  - The explanation should show the steps.
- Old backups and packs must still validate. `numeric` joins the question union, so user packs and the editor gain it too (the editor needs a structured form or a JSON starter).

## 6. How it fits the app

- New screen(s) under `src/ui/learn/`: a lesson list (areas → lessons, with status) and a lesson view (four parts plus the check). The check reuses `StudyRunner` or `QuestionView` in instant-feedback mode.
- Lesson content: `src/banks/dataplus/lessons/` (one JSON or TS file per area). Each lesson lists the ids of its check questions. Those questions live in the normal items files, so they are in the bank, and a lesson only references them.
- Lesson status is stored as a setting or a new small store. If the backup format changes, bump the backup `version` and accept both shapes (see the handoff note on SRS).
- `bank.test.ts` gains: every lesson's check ids exist and are approved; every lesson has all four parts; every numeric item's value is within its own tolerance of a recomputation where the builder adds a checker (at least for the standard-deviation and percent-change items).
- Acronyms in lesson text follow the existing completeness check (`content.test.ts`).

## 7. Content targets

- At least 30 lessons across areas A–F.
- Each lesson: 3–5 check items, at least one `numeric` where the lesson has a formula.
- Main bank additions: at least 60 numeric items, at least 10 new join PBQs (key choice, join type and row-count outcomes), plus MCQs to cover any topic in §3 that the bank lacks. Keep the existing per-objective quotas in `bank.test.ts` passing.
- Numbers in examples stay small (≤ 8 data points, round-ish values) so a student can follow them with a phone calculator.

## 8. Work sections (one session each, `/clear` + handoff between; E and F split per §8a)

1. **Engine:** the `numeric` type (schema, scoring, view, results, editor starter, md-to-pack, pack/backup), the lesson schema, Learn screens, lesson status, tests, one sample lesson. No bulk content.
2. **Content A + B:** business math and descriptive statistics lessons and items.
3. **Content C + D:** inferential statistics, correlation and regression.
4. **Content E + F:** data math, joins and keys (including the join PBQs).
5. **Final:** bank audit against §7 targets, whole-branch review on Opus, redeploy.

Each content section follows the owner's rules: one domain per session, cheapest adequate subagent model for drafting, and every review finding fixed, minors included.

## 8a. Settled after the builder check (Claude's calls, owner to confirm in reading)

- **Counting:** lesson check items count toward the §7 totals (the 60 numeric items include them). Content areas E and F are split into separate sessions, so §8 becomes 6 sessions: engine; A+B; C+D; E; F; final.
- **SRS and mastery:** answering a lesson check writes SRS and mastery like practice does (it is homework, so it should count). It does not affect mock-exam recency.
- **Approval:** check items use the existing `status` field and ship `approved` after the builder's review, the same as the current bank. Draft items may not be linked from a lesson.
- **Percent answers:** each numeric item has one correct value. The question says which form it wants ("as a percent, e.g. 25" or "as a decimal, e.g. 0.25"), and the `unit` label shows `%` when the answer is a percent. No alternate answers.
- **Lesson status storage:** keep it in the existing settings store if backups already include settings, so the backup format doesn't change. Otherwise add a store, bump the backup `version`, and accept both shapes. Backups made after this change don't need to import into older builds.
- **Cram:** includes numeric items. A typed number is a single field, so it fits cram's fast flow.
- **Editor:** a JSON starter for `numeric`, like PBQs. A structured form is not needed.

## 9. Left to the builder

- Exact lesson ids, file layout and the status store.
- Whether a check reuses `StudyRunner` or a lighter runner.
- The done threshold (default 80%).
- The default tolerance per item (suggest 0.01 for two-decimal answers, 0.5 for percents given to whole numbers), stated in each item's question text ("round to two decimals").
- Whether `numeric` items appear in cram (default: yes; cram is MCQ-only today, so this needs a small change).
