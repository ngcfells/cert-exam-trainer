# Question Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every mode picks questions by the owner's chance rule from one all-modes seen history, and practice and mock PBQs follow the exam's domain weights (#12, #13, #8).

**Architecture:** A new pure module `src/exam/chance.ts` turns saved results into a chance per question and gives a seeded weighted draw. `assemble.ts` gains one domain-split helper used by mock MCQs, mock PBQs and practice. The flows build the chances once on load and pass them in, replacing `recentQuestionIds`.

**Tech Stack:** TypeScript, React, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-04-question-selection-design.md`

## Global Constraints

- Right = `itemFraction(q, response) === 1` (compare `>= 1 - 1e-9`). Partial credit and unanswered = miss.
- Right ×0.5, miss ×0.75, start 1. Ever missed: floor 0.15. Never missed with ≥ 5 views: 0.01.
- Time, only when the latest view was right: from 30 whole days after it, chance ≥ 0.10 + 0.005 × (days − 30), capped at 1. Latest view a miss: no time rise.
- No change to result or backup formats, SRS, scoring or lesson checks.
- Mock PBQs stay first; practice runs are fully shuffled.
- All randomness comes from the seeded `Rng` (same seed, same history → same run).

## Review Focus

1. Saved results naming questions no longer in the pool, results from other exams, or invalid records: skipped without error. Test in Task 1.
2. Every question at 0.01 or the pool smaller than the count: the run still fills to `min(count, pool)`. Tests in Tasks 2 and 3.
3. Practice over one domain, or over domains where one has no matching questions: the whole count comes from the domains that have questions. Test in Task 3.
4. A mock exam whose PBQs all sit in one domain: every PBQ slot is still filled from that domain. Test in Task 2.
5. A result dated in the future (clock change): days since shown below 0 means no time rise. Test in Task 1.

---

### Task 1: Chance rule, history and weighted draw

**Files:**
- Create: `src/exam/chance.ts`
- Test: `src/exam/chance.test.ts`

**Interfaces:**
- Produces:
  - `export interface View { right: boolean; at: string }` (`at` = ISO `finishedAt`)
  - `export type Chances = ReadonlyMap<string, number>`
  - `export function chanceFromViews(views: readonly View[], now: Date): number` (views oldest first; `[]` → 1)
  - `export function buildChances(results: unknown[], pool: readonly Question[], exam: string, now: Date): Chances` (uses `parseResults`, sorts by `finishedAt`, rescoring with `itemFraction`; ids with no views are absent)
  - `export function chanceOf(chances: Chances, id: string): number` (absent → 1)
  - `export function weightedOrder<T>(xs: readonly T[], weight: (x: T) => number, rng: Rng): T[]` (all of `xs`, ordered by Efraimidis–Spirakis key `Math.log(rng()) / weight`, largest first; a prefix of length k is a draw of k without replacement)

- [ ] **Step 1: Write the failing tests** in `src/exam/chance.test.ts`. Helpers: `R = (daysAgo = 0) => ({ right: true, at: iso(daysAgo) })`, `W` likewise, `now = 2026-06-01T00:00:00Z`.
  - `chanceFromViews`: `[]` → 1; `[R]` → 0.5; `[R,R,R,R]` → 0.0625; 5×R → 0.01; 6×R → 0.01; `[W]` → 0.75; `[W,R]` → 0.375; `[W,R,R,R]` → 0.15; 5×R then W → 0.15 (`toBeCloseTo`).
  - Time: 5×R with the last 29 days ago → 0.01; 30 → 0.10; 60 → 0.25; 90 → 0.40; 210 → 1; 400 → 1. `[W,R,R,R]` last 90 days ago → 0.40. `[R,R,R,W]` last 90 days ago → 0.15. `[W]` 400 days ago → 0.75. 5×R with last 5 days in the future → 0.01.
  - `buildChances`: two results for `T-001` (older one answers `A0` wrong, newer one right) → `chanceOf(c,'A0')` = 0.375; an mcq-multi answered with one of its two keys counts as a miss; a result for another exam, an invalid record `{}` and an id missing from the pool are ignored; `chanceOf(c,'B9')` = 1.
  - `weightedOrder`: returns a permutation; same seed → same order; over 2000 seeds, with 9 items at weight 1 and one at 0.01, taking the first 5, the 0.01 item appears in under 2% of runs, and each weight-1 item in 50–62%.
- [ ] **Step 2: Run** `npx vitest run src/exam/chance.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement** `src/exam/chance.ts` with the signatures above and the Global Constraints values as named constants (`RIGHT_FACTOR`, `MISS_FACTOR`, `MISSED_FLOOR`, `MASTERED_VIEWS`, `MASTERED_CHANCE`, `TIME_START_DAYS`, `TIME_START_CHANCE`, `TIME_PER_DAY`). Days = `Math.floor((now − at) / 86_400_000)`.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(exam): chance rule from seen history (#8, #12)`.

### Task 2: Mock exam uses chances and weights its PBQs

**Files:**
- Modify: `src/exam/assemble.ts`, `src/exam/result.ts` (remove `RECENT_ATTEMPTS`, `recentQuestionIds`), `src/ui/exam/MockExamFlow.tsx`
- Test: `src/exam/assemble.test.ts`, `src/exam/result.test.ts`

**Interfaces:**
- Consumes: Task 1's `Chances`, `chanceOf`, `weightedOrder`, `buildChances`.
- Produces:
  - `export function splitByDomain(total: number, weights: readonly number[], available: readonly number[]): number[]` — zeroes the weight of any domain with 0 available, `allocateByWeight` of `min(total, Σavailable)`, then the existing shortfall loop. Never gives a domain more than it has.
  - `AssembleInput.recentIds` is replaced by `chances: Chances`.
  - `freshFirst` is removed.

- [ ] **Step 1: Write the failing tests.**
  - `splitByDomain(10, [50,30,20], [30,30,30])` → `[5,3,2]`; `(10, [50,30,20], [30,30,1])` → sums to 10 with index 2 = 1; `(10, [50,30,20], [0,30,30])` → `[0,6,4]`; `(5, [50,30,20], [1,1,1])` → `[1,1,1]`.
  - Replace "prefers fresh questions over recent ones": pool `bank({A:6,B:30,C:30})`, chances 0.01 for `A0..A4`; over 20 seeds, `A5` is in every exam (the 5 A slots have only one fresh question).
  - New: every question at 0.01 still fills the exam (10 items).
  - New: PBQs follow domain weights. Pool `bank({A:30,B:30,C:30})` plus 6 match PBQs (weight 1) in domain A and 6 in domain C (set `objectiveIds`). Over 200 seeds, the share of PBQs from A is between 0.6 and 0.8 (A:C weights 50:20 → 0.71).
  - New: all PBQs in domain C only → the drawn PBQ count equals `min(weightedPick + 1, pool)` as before (assert ≥ 1 PBQ, all from C).
  - Update every `recentIds: new Set()` to `chances: new Map()` (also `result.test.ts`); delete the `recentQuestionIds` tests.
- [ ] **Step 2: Run** `npx vitest run src/exam`. Expected: FAIL (`splitByDomain` missing, `chances` unknown).
- [ ] **Step 3: Implement.** In `assembleExam`: group PBQs by `domainOf`, `splitByDomain(want, weights, counts)`, take each domain's `weightedOrder(...).slice(0, n)`, `shuffle` the PBQs together, then the existing weight cap. MCQs: `weightedOrder` per domain in place of `freshFirst`, quotas from `splitByDomain`. Questions with no known domain are left out, as MCQs are today. `MockExamFlow`: `chances: buildChances(history, pool, examCode, new Date())`.
- [ ] **Step 4: Run** `npx vitest run src/exam src/ui/exam`. Expected: PASS.
- [ ] **Step 5: Commit** `fix(exam): mock picks by chance and weights PBQs by domain (#12, #13)`.

### Task 3: Practice and cram use chances; practice follows domain weights

**Files:**
- Modify: `src/study/session.ts`, `src/ui/study/PracticeFlow.tsx`, `src/ui/study/CramFlow.tsx`
- Test: `src/study/session.test.ts`, `src/ui/study/flows.test.tsx`

**Interfaces:**
- Consumes: `Chances`, `chanceOf`, `weightedOrder`, `buildChances` (Task 1); `splitByDomain`, `domainOf`, `itemFor` (Task 2).
- Produces: `assemblePractice({ meta, pool, seed, chances, options })` and `assembleCram({ ..., chances })`, each taking `chances: Chances` (practice's `recentIds` is removed).

- [ ] **Step 1: Write the failing tests** in `session.test.ts`.
  - Replace "puts PBQs first and shuffles options": with `count: 14`, over 50 seeds, at least one run does not start with both PBQs; options are still shuffled.
  - New: domain weights. Pool `bank({A:30,B:30,C:60})`, all objectives, MCQ types, `count: 10` → domain counts `[5,3,2]` for every seed 0..9.
  - New: objectives `['A.1','C.1']`, pool `bank({A:30,B:30,C:30})`, `count: 7` → `[5,0,2]` (50:20 renormalised).
  - New: one domain (`['B.1']`), `count: 3` → 3 items, all B.
  - New: chances 0.01 for `B0..B2` in `bank({A:4,B:4,C:4})`, objectives `['B.1']`, `count: 1`: over 50 seeds `B3` is drawn at least 45 times.
  - New: every match at 0.01 and `count: 99` → all 14 items.
  - Cram: a due review still comes first with `chances` set. With the `big` pool (30 MCQs), no SRS records, empty mastery and no acronyms, chance 0.01 on every MCQ except `B5` (chance 1): `B5` is among the chosen in at least 48 of 50 seeds (a plain shuffle gives about half).
  - Update the existing calls (`recentIds` → `chances: new Map()`).
- [ ] **Step 2: Run** `npx vitest run src/study`. Expected: FAIL.
- [ ] **Step 3: Implement.** `assemblePractice`: `matchingPool`, group by `domainOf`, `splitByDomain(count, weights, counts)`, `weightedOrder` per domain, then `shuffle` the whole run before `toExam`. `assembleCram`: the weak-objective and fill-in lists use `weightedOrder(…, (q) => chanceOf(chances, q.id), rng)` in place of `shuffle`; due order unchanged. Flows: `chances: buildChances(results, pool, examCode, new Date())` at load. Update the doc comments ("fresh ones first, PBQs before MCQs").
- [ ] **Step 4: Run** `npx vitest run src/study src/ui/study`. Expected: PASS. Fix any flow test that asserted a specific question order (seed 1) by asserting the new order or the set.
- [ ] **Step 5: Commit** `fix(study): practice and cram pick by chance and domain weight (#12, #13, #8)`.

### Task 4: Full check, docs and handoff

**Files:**
- Modify: `HANDOFF.md` (the recency ruling under chunk 2 and "Next session"), any doc mentioning the "last 3 attempts" rule (`grep -rn "last 3\|recent" docs README.md`).

- [ ] **Step 1: Run** `npx tsc --noEmit` and `npx eslint .`. Expected: no errors (no leftover `freshFirst`/`recentQuestionIds` imports).
- [ ] **Step 2: Run** `npm run check`. Expected: all unit and e2e tests pass. Fix any e2e that depended on the old order.
- [ ] **Step 3: Update** the handoff: the chunk-2 recency ruling is replaced by the chance rule (link the spec); #12, #13 and #8 are fixed on `fix/question-selection`.
- [ ] **Step 4: Commit** `docs(handoff): question selection done (#12, #13, #8)`.
- [ ] **Step 5:** Dispatch one Opus whole-branch reviewer; fix every finding, minors included; rerun `npm run check`.
