# Learn-more search links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After a learner answers a question, a labelled "Learn more" button (🤔) opens a menu of free learning sites; the choice opens that site's search page, in a new tab, filled with the question's search phrase.

**Architecture:** An optional `searchTerm` on `Question` (schema + type). A pure module `src/learn/` builds the phrase (own `searchTerm`, else acronyms plus objective title) and the search URL per source; a data file lists sources with a per-exam "applies to" list. One `LearnMoreButton` component renders a disclosure menu of `ExternalLink`s and is placed inside `ItemReview` (the single place an answered explanation shows: study, practice, cram, finished-exam results, bank review). It is hidden while `mockDeadline !== null`.

**Tech Stack:** React, TypeScript, zod, vitest + Testing Library, Playwright, axe.

**Spec:** `docs/superpowers/specs/2026-11-10-learn-more-search-design.md`

## Global Constraints

- Free sources only; the learner chooses the source (menu), links open in a new tab with `rel="noopener noreferrer"`.
- Phrase limits: 2 to 6 words, at most 50 characters, letters, digits, spaces, hyphens and periods only.
- Not shown in a live mock (`mockDeadline !== null`) nor before the answer is given.
- The app sends and logs nothing about the learner; the service worker does not touch outbound links.
- Exam folders: `autoops` = AT0-001, `dataplus` = DA0-002, `secai` = CY0-001.
- Tests first. `npm run check` green. One Opus whole-branch review, fix every finding (minors too). Ask the owner for the push OK, then `npm run deploy`.
- Plan covers code, schema and fallback only. The three content passes (phrases per exam) are separate later sessions.

## Review Focus

- A question with no `searchTerm` and no acronyms: fallback is the objective title alone, never an empty or `undefined` query.
- A question whose objective id is missing from the meta: fallback still yields a non-empty phrase (acronyms, else the exam name).
- A phrase with `&`, `#`, `+`, `?` or non-ASCII characters (user-pack questions are not validated by the bank test): URL is encoded, no extra query parameter appears.
- A user-pack question (`source: 'user'`) with an exam code that has no meta: button still works (general web search only).
- Keyboard: Escape closes the menu and returns focus to the button; the menu button has `aria-expanded`.

---

### Task 1: `searchTerm` field and phrase validation

**Files:**
- Modify: `src/domain/schema.ts` (the `base` object, ~line 19), `src/domain/types.ts` (`Question`)
- Create: `src/learn/phrase.ts`, `src/learn/phrase.test.ts`
- Modify: `src/domain/schema.test.ts`

**Interfaces:**
- Produces: `Question.searchTerm?: string`; `isValidSearchTerm(s: string): boolean`; `SEARCH_TERM_PATTERN` (RegExp). Schema rejects an invalid `searchTerm` using the same function.

- [ ] **Step 1: Write failing tests.** `phrase.test.ts`: `isValidSearchTerm('DNS TTL')` true; `'bash local variable'` true; `'one'` false (1 word); seven words false; 51 characters false; `'a&b c'`, `'https://x.y z'`, `'dns/ttl more'`, `''` false; `'TCP/IP stack'` false; `'rfc-1918 private.ranges'` true. `schema.test.ts`: a valid question with `searchTerm: 'DNS TTL'` parses; with `'x&y z'` fails; a question without it still parses.
- [ ] **Step 2:** Run `npx vitest run src/learn/phrase.test.ts src/domain/schema.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement `isValidSearchTerm` (trim-insensitive word count 2..6, length <= 50, `/^[A-Za-z0-9 .-]+$/`). Add `searchTerm: z.string().refine(isValidSearchTerm, 'search term: 2 to 6 words, at most 50 characters, letters, digits, spaces, hyphens, periods').optional()` to `base`; add `searchTerm?: string` to `Question`. The question schemas are `.strict()`, so adding it to `base` is required.
- [ ] **Step 4:** Re-run the same command. Expected: PASS.
- [ ] **Step 5:** Commit `feat(learn): searchTerm field and validation (#6)`.

### Task 2: Phrase fallback and source list

**Files:**
- Create: `src/learn/sources.ts`, `src/learn/learn.ts`, `src/learn/learn.test.ts`

**Interfaces:**
- Consumes: `Question`, `ExamMeta` (`metaFor(code)` from `src/banks/metas.ts`), `isValidSearchTerm`.
- Produces:
  - `searchPhrase(q: Question, meta: ExamMeta | undefined): string` — `q.searchTerm` if valid; else `[...q.acronyms, objectiveTitle].join(' ')` where objectiveTitle is the title of `q.objectiveIds[0]` in `meta.objectives`; if that yields nothing, `meta?.name ?? q.exam`. Never empty. Fallback is not subject to the 2-to-6-word limit.
  - `interface LearnSource { id: string; label: string; exams: string[] | 'all'; url: (phrase: string) => string }`
  - `LEARN_SOURCES: LearnSource[]` — W3Schools (`https://www.w3schools.com/search/search.php?q=`, to be verified in step 3), freeCodeCamp (`https://www.freecodecamp.org/news/search/?query=`), Khan Academy (`https://www.khanacademy.org/search?page_search_query=`), Professor Messer (`https://www.professormesser.com/?s=`), Microsoft Learn (`https://learn.microsoft.com/en-us/search/?terms=`), MDN (`https://developer.mozilla.org/en-US/search?q=`), Web search (`https://duckduckgo.com/?q=`). Programming/web sources (W3Schools, freeCodeCamp, MDN, Khan Academy) apply to `AT0-001` and `DA0-002`; Professor Messer and Microsoft Learn to `CY0-001` (Microsoft Learn also `AT0-001`); Web search `'all'`.
  - `sourcesFor(exam: string): LearnSource[]` — sources whose `exams` is `'all'` or includes the code; unknown exam gives only the `'all'` ones.
  - `learnUrl(source: LearnSource, phrase: string): string` — encodes with `encodeURIComponent`.

- [ ] **Step 1: Write failing tests.** Own phrase wins. Fallback with acronyms `['DNS','TTL']` and objective title `Caching` gives `'DNS TTL Caching'`. No acronyms gives the title alone. Missing objective and no acronyms gives the exam name. `learnUrl` of phrase `'C# & .NET'` contains `C%23%20%26%20.NET` and exactly one `q=`-style parameter. `sourcesFor('NOPE')` returns only Web search. `sourcesFor('CY0-001')` excludes W3Schools. Every source `url('x y')` is `https:` and contains `x%20y`.
- [ ] **Step 2:** Run `npx vitest run src/learn`. Expected: FAIL.
- [ ] **Step 3:** Implement. Check each search URL pattern once by hand in a browser (record in the commit message which loaded a results page; replace any that does not, or drop the source and say so in the handoff). Sources live in `sources.ts` as data; logic in `learn.ts`.
- [ ] **Step 4:** Re-run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(learn): search phrase fallback and source list (#6)`.

### Task 3: `LearnMoreButton` and its placement

**Files:**
- Create: `src/ui/learn/LearnMoreButton.tsx`, `src/ui/learn/LearnMoreButton.test.tsx`, `src/ui/learn/learn.css` (imported where `primer.css` is)
- Modify: `src/ui/exam/ItemReview.tsx` (render `<LearnMoreButton question={q} />` after the explanation `<p>`)

**Interfaces:**
- Consumes: `searchPhrase`, `sourcesFor`, `learnUrl`, `metaFor`, `usePanels().mockDeadline`, `ExternalLink` from `src/ui/primer/ExternalLink.tsx`.
- Produces: `LearnMoreButton({ question }: { question: Question })`.

- [ ] **Step 1: Write failing tests** (render inside the test panel provider used by `CommandHelpButton` tests, `src/ui/panels/testPanels.tsx`): button named `Learn more` with 🤔 `aria-hidden`; menu closed until clicked, `aria-expanded` toggles; opening lists one link per source for the question's exam, each `target="_blank"`, `rel` containing `noopener noreferrer`, `href` containing the encoded `searchTerm`; Escape closes and returns focus to the button; returns null when `mockDeadline` is not null; a user-pack question for an unknown exam shows only Web search. `components.test.tsx`: `ItemReview` shows the button. Add the `&`/`#` phrase case from Review Focus.
- [ ] **Step 2:** Run `npx vitest run src/ui/learn src/ui/exam/components.test.tsx`. Expected: FAIL.
- [ ] **Step 3:** Implement as an inline disclosure (button toggling a `<ul>` of `ExternalLink`s), not a popover, so it works at phone width and needs no focus trap. Include `LINKS_NOTE` text in the menu. Styles reuse the primer button look.
- [ ] **Step 4:** Re-run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(learn): Learn more button after explanations (#6)`.

### Task 4: Bank coverage report, e2e and accessibility

**Files:**
- Modify: `src/banks/shippedChecks.ts` (inside `describeShippedBank`)
- Create: `tests/e2e/learn.spec.ts`
- Modify: `README.md` or authoring docs only if they list question fields (grep `acronyms` in `docs/`)

**Interfaces:**
- Consumes: `isValidSearchTerm`, `searchPhrase`.

- [ ] **Step 1: Write failing tests.** In `shippedChecks`: every shipped question that has a `searchTerm` passes `isValidSearchTerm`; every question yields a non-empty `searchPhrase`; log (not fail) the count still on the fallback. E2E (fixture project, follow `tests/e2e/primer.spec.ts` helpers): in study, before answering no "Learn more"; after answering it appears, opens its menu, links open in a new tab with the encoded phrase; absent during a live mock; present in the finished-exam review; axe clean in both colour schemes; phone width has no horizontal scroll.
- [ ] **Step 2:** Run `npm run build:e2e`, then `npx playwright test tests/e2e/learn.spec.ts --project=fixture --project=phone`. Expected: FAIL.
- [ ] **Step 3:** Add the checks and any minimal fix the e2e shows.
- [ ] **Step 4:** Run `npm run check`. Expected: lint, typecheck, builds, unit and e2e all pass.
- [ ] **Step 5:** Commit `test(learn): coverage report and e2e (#6)`.

### Task 5: Release

- [ ] **Step 1:** One Opus whole-branch review (superpowers:requesting-code-review), as a subagent. Fix every finding, minors too; re-run `npm run check`.
- [ ] **Step 2:** Merge to main. Ask the owner for the push OK, then push and `npm run deploy`.
- [ ] **Step 3:** Comment on #6 (code live, per-exam phrases follow; the button works now on the fallback). Leave #6 open until the three content passes are done. Write the handoff: content sessions order autoops, dataplus, secai; Haiku drafts, one domain per session, spot check; the fallback count from Task 4 is the progress meter.
