# Question selection: seen history, chances and domain weights

Fixes bugs #12 and #13 and builds enhancement #8 together, because all three change how questions are picked.

## Why

The owner saw the same question in 2 of 3 short practice runs, after fewer than 60 questions, and had answered it right the first time (#8). The causes:

- Only mock exams count as "seen" (#12). `recentQuestionIds` (`src/exam/result.ts`) keeps only the last 3 `mock` results, so practice, cram and lesson checks never lower a question's odds.
- Practice ignores the exam's domain weights (#13). `assemblePractice` (`src/study/session.ts`) shuffles every matching question and keeps the first N, so the mix follows bank sizes. It also shows every PBQ first, then the MCQs.

Success: a question you have just answered right rarely comes back soon, a question you keep missing keeps coming back, and every run's mix follows the real exam's domain weights.

## Goals

1. One seen history, built from every saved result of every mode (mock, practice, cram, lesson) for the exam.
2. Each question gets a chance from that history (the owner's rule, below). Every pick in mock, practice and cram uses those chances.
3. Practice splits its count across the chosen domains by the exam's domain weights and mixes the run, so it is never grouped by objective, domain or question type.
4. Mock exam PBQs also follow the domain weights.

## Non-goals

- No change to lesson checks: they keep their fixed, linked items. Their results do count in the history.
- No change to the SRS schedule (`src/study/srs.ts`), to scoring, or to the result and backup formats.
- No setting to turn the rule off, and no on-screen display of a question's chance.

## Anti-goals

- A question is never fully blocked. If the pool is small, low-chance questions still fill the run.
- No run may be grouped by domain or objective (practice) or show all PBQs first (practice). The mock exam keeps PBQs first, as on the real exam.

## The chance rule (owner, #8, with the owner's answers of 2026-11-04)

Walk a question's answers oldest first. Start at 1 (100%).

- Right answer: multiply by 0.5.
- Miss: multiply by 0.75.
- **Right means full credit only** (`itemFraction` = 1). Partial credit, and a question shown but not answered, are misses.
- **If the question has ever been missed, its chance never goes below 0.15.**
- **If it has never been missed and has 5 or more views, its chance is 0.01.**

**Time (owner, 2026-11-04):** this applies only when the question's latest answer was right. Once 30 days have passed since it was last shown, its chance is at least 0.10, and it then rises by 0.005 a day until it is shown again: time chance = 0.10 + 0.005 × (days since last shown − 30), capped at 1. So it is 0.10 at day 30, 0.25 at day 60, 0.40 at day 90 and 1 at day 210. The final chance is the larger of the answer chance and the time chance. Showing the question again restarts the clock. Before day 30, time changes nothing. **A question whose latest answer was a miss keeps its answer chance, with no time rise, until it is answered right.**

So a never-missed question goes 1, 0.5, 0.25, 0.125, 0.0625, then 0.01 from the fifth right answer on. A miss after that lifts it back to at least 0.15. Examples with a miss: wrong once = 0.75; wrong then right = 0.375; wrong then right 3 times = 0.15 (floor).

The chances are relative weights, not separate coin flips. A run of N questions draws N without replacement, each with odds in proportion to its chance (for example, the Efraimidis–Spirakis key `u^(1/chance)` from the seeded RNG, keeping the largest keys). A fresh question (1) is twice as likely as a 0.5 one, and 100 times as likely as a 0.01 one. This replaces `freshFirst` and the "last 3 mock attempts" rule (`RECENT_ATTEMPTS`), which are removed.

## Building the history

- Source: the `results` store, every valid result for the exam (`parseResults`), sorted by `finishedAt`, all modes.
- For each result, each id in `questionIds` is one view. Its outcome is rescored from the saved response with `itemFraction(question, responses[id])` against the question in the current pool.
- A question no longer in the pool (a deleted custom question) is skipped.
- Practice and cram results hold only the questions the user reached (`onlySeen`), so they count only what was shown. A mock result lists every item of the exam, including any never reached before time ran out; these count as misses (owner's answer: shown but unanswered is a miss). Builder may note this in a comment.
- A view's date is its result's `finishedAt`; "days since last shown" is measured from the newest one to the time the flow loads.
- The history is built once when a flow loads, as the recent-ids set is today.

## Where the chances are used

### Domain split (shared helper)

Pull the mock exam's quota logic (`allocateByWeight` plus the shortfall loop in `assembleExam`) into one helper that splits a count across domains by weight, capped at each domain's available questions, moving any shortfall to the domains with spares by weight. Mock MCQs, mock PBQs and practice all use it.

### Mock exam (`assembleExam`)

- PBQ count: drawn as today (`PBQ_COUNT_WEIGHTS`), capped by the PBQ pool.
- **PBQs follow domain weights (owner, 2026-11-04):** split the PBQ count across domains with the helper, then draw each domain's PBQs by chance. The PBQs stay first and are shuffled among themselves. The existing cap (Σ pbqWeight ≤ maxQuestions − 1) still drops PBQs from the end.
- MCQs: split by domain as today; within each domain, draw by chance instead of fresh-first. Then shuffle all MCQs together, as today.

### Practice (`assemblePractice`)

- The domains in play are those of the chosen objectives that have matching questions. Their exam weights are renormalised to those domains (the helper does this by taking the weights of only those domains).
- Split the count across those domains with the helper. Within a domain, draw by chance from every matching question of the chosen objectives in that domain (MCQs, numeric and PBQs together, by the chosen types).
- Shuffle the whole run, so PBQs and MCQs mix and no domain is bunched.
- "Drill these" (preset objectives) uses the same rule.

### Cram (`assembleCram`)

- **Due SRS reviews still come first, most overdue first (owner, 2026-11-04).** Then the weakest objectives, then everything else, as today; but the weak-objective and fill-in lists are ordered by a chance-weighted draw instead of a plain shuffle. Acronym cards are unchanged.

## Code touched (expected)

- New `src/exam/chance.ts` (or similar): the chance rule, the history builder and the weighted draw. Pure functions, unit-tested against the owner's numbers above.
- `src/exam/assemble.ts`: domain-split helper, PBQ domain weighting, chance draws; `freshFirst` removed. `AssembleInput.recentIds` becomes a chance lookup.
- `src/exam/result.ts`: `recentQuestionIds` and `RECENT_ATTEMPTS` removed.
- `src/study/session.ts`: practice and cram as above.
- `src/ui/exam/MockExamFlow.tsx`, `src/ui/study/PracticeFlow.tsx`, `src/ui/study/CramFlow.tsx`: build the chances from results and pass them in.
- Tests in `src/exam/*.test.ts`, `src/study/session.test.ts` and the flow tests updated. Existing e2e tests use fixed seeds; any that assert a specific question order may need new expectations.

## Left to the builder

- Names, file layout, and the exact weighted-draw algorithm (any seeded, reproducible draw without replacement in proportion to chance).
- How a missing chance is treated (a question with no history is 1).
- Test shape, including a statistical check that a 0.01 question is rarely drawn against fresh ones.
- Removing the now-unused code paths and docs mentions (handoff notes on "recency").
