# Chunk 7: Acronym Tester Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Each exam gets an acronym tester (flashcards both ways, a timed quiz by typing or choosing, spaced repetition), backed by a merged acronym list and a content check that fails when a bundled question uses an acronym with no expansion.

**Architecture:** Pure logic lives in `src/acronyms/` (token extraction, list merging, deck assembly, answer matching, choice building). The user's own acronyms are kept in one setting per exam, so backups carry them with no format change. The UI lives in `src/ui/acronyms/` behind a new `acronyms` screen. Grades go through the existing SM-2 `applyReviews` as `kind: 'acronym'`, and cram and progress switch to the merged list.

**Tech Stack:** React 18, Zod, Vitest + Testing Library, Playwright + axe.

**Spec:** `docs/superpowers/specs/2026-10-30-comptia-exam-trainer-design.md` (§8, §7 learning over time, §13 item 7)

## Global Constraints

- Sources are tagged `official` or `community` (spec §8). User-extracted entries go into "that user's local list" and are tagged `mine`; they are never bundled.
- "Expansions for non-official acronyms are written or verified by us." Bundled `community` expansions are written by us. Nothing comes from `_WorkingData/`.
- The content check (spec §8 item 2, §12 step 5) runs inside `npm run test`, so `npm run check` fails if a bundled acronym has no expansion.
- The harvester (spec §8 items 4–5) is chunk 9, not this chunk.
- The source toggle applies to every mode: `ours` → official + community; `mine` → mine only; `both` → all.
- WCAG 2.2 AA: axe shows no serious or critical violations on each new screen; results are announced; the timer is announced only at 1 minute left and at expiry (as in chunk 5, scaled to quiz length).
- SRS quality: knew or correct = 4, didn't know or wrong = 1 (the same as cram). Items the user never reached are not graded.
- No GitHub Actions and no Git LFS. Never write Bash heredocs containing an apostrophe (local hook).

## Review Focus

1. Typing `extract transform load` for "Extract, Transform, Load" (case, commas, extra spaces) → counted correct; a parenthetical in the expansion is optional (Task 2 test `matching ignores case, punctuation and parentheticals`).
2. An exam or filter with 0 acronyms, or 1 (too few for choices) → the screen says so and offers no start button, or offers flashcards and typed quiz only; nothing crashes (Task 4 test `empty list shows message`, Task 2 test `choices need two entries`).
3. The quiz timer runs out mid-quiz → the unanswered cards are left out of SRS and out of the score total (Task 5 test `timeout grades only answered cards`).
4. The user adds an expansion for a term the bank already has, or types `etl ` in lower case → stored uppercased and trimmed; a term the bank has is refused with a message (Task 3 test `refuses bank terms and normalizes`).
5. A malformed user-acronym setting (for example from a hand-edited backup) → invalid entries are dropped on load, valid ones kept (Task 3 test `drops malformed stored entries`).

---

### Task 1: Token extraction and the bundled content check

**Files:**
- Create: `src/acronyms/extract.ts`, `src/acronyms/extract.test.ts`, `src/acronyms/content.test.ts`, `docs/acronyms.md`
- Modify: `src/domain/schema.ts` (`examMetaSchema` rejects a repeated acronym term), `src/banks/dataplus/meta.ts` (add `community` entries we write for every token the check finds), `src/domain/schema.test.ts`

**Interfaces:**
- Produces: `extractAcronyms(text: string): string[]` (sorted, unique); `questionText(q: Question): string` (stem, explanation, part explanations, and every string inside `payload`, walked recursively); `NOT_ACRONYMS: ReadonlySet<string>` (words in capitals that are not acronyms, start empty and add only as the check meets them).
- Token rule: a word of 2–8 characters made of `A–Z` and `0–9`, starting with a letter, with at least two capital letters; a trailing lower-case `s` is a plural and is dropped (`APIs` → `API`). Mixed-case terms such as `IPv4` are out of scope for auto-extraction and can be listed by hand.

- [ ] Tests in `extract.test.ts`: `finds capitals tokens`, `drops plural s` (`APIs` → `API`), `ignores single letters and lower case`, `ignores NOT_ACRONYMS`, `questionText walks payload strings`.
- [ ] Test in `schema.test.ts`: `rejects a repeated acronym term`.
- [ ] Tests in `content.test.ts`, one per registered exam: `every token in bundled questions has an expansion` (the failure message lists the missing terms) and `every tagged acronym is in the list` (each `q.acronyms` entry).
- [ ] Run `npx vitest run src/acronyms src/domain`; the content test fails and lists the Data+ terms.
- [ ] Add a `community` entry per missing term to `dataPlusMeta.acronyms` (comment `// community: written by us; official list lands in chunk 9`). Write `docs/acronyms.md` (sources, tags, token rule, how to fix a failing check). Rerun: pass. Commit.

### Task 2: Merged list, deck assembly, answer matching and choices

**Files:**
- Create: `src/acronyms/list.ts`, `src/acronyms/quiz.ts`, `src/acronyms/list.test.ts`, `src/acronyms/quiz.test.ts`

**Interfaces:**
- Produces in `list.ts`: `type AcronymSource = 'official' | 'community' | 'mine'`; `interface AcronymEntry { term: string; expansion: string; source: AcronymSource }`; `mergeAcronyms(bank: ExamMeta['acronyms'], mine: AcronymEntry[], filter: SourceFilter): AcronymEntry[]` (sorted by term; on a repeated term, official beats community beats mine).
- Produces in `quiz.ts`:
  - `type Direction = 'term' | 'expansion'` (what the card shows)
  - `assembleDeck({ entries, srs, exam, now, seed, scope, count }): AcronymEntry[]` with `scope: 'all' | 'due'`. `due` gives due cards (most overdue first), then never-reviewed cards in shuffled order. `all` gives every card shuffled. Both are cut to `count`.
  - `normalizeAnswer(s: string): string` (lower case; `&` → `and`; parentheticals removed; non-alphanumerics → space; spaces collapsed; trimmed)
  - `isCorrect(entry, direction, input): boolean`. When the card shows the term, the input must match the expansion after normalizing. When it shows the expansion, the input must match the term (case-insensitive, spaces ignored). Empty input is never correct.
  - `buildChoices(entry, entries, direction, rng): string[]` (the answer plus up to 3 distractors from other entries, with no repeated text, shuffled)
  - `MIN_CHOICE_ENTRIES = 2`

- [ ] Tests: `merge prefers official over community over mine`, `filter ours drops mine`, `filter mine keeps only mine`, `due deck puts overdue first then new`, `all deck is seeded`, `matching ignores case, punctuation and parentheticals` (`extract transform load`, `Extract-Transform-Load`, and `personally identifiable information` for `Personally Identifiable Information (PII)`), `term direction ignores case and spaces`, `empty input is wrong`, `choices contain the answer once and no repeats`, `choices need two entries` (with 1 entry, `buildChoices` returns just the answer).
- [ ] Implement, run `npx vitest run src/acronyms`, commit.

### Task 3: The user's local list (storage and extraction)

**Files:**
- Create: `src/acronyms/userList.ts`, `src/acronyms/userList.test.ts`
- Modify: `src/study/session.ts` and `src/ui/study/CramFlow.tsx` (cram takes `acronyms: AcronymEntry[]` from `loadAcronyms`, not `meta.acronyms`), `src/ui/study/ProgressScreen.tsx:79` (due count uses the same list), `src/study/session.test.ts`

**Interfaces:**
- Produces: `userAcronymSetting(exam: string): string` (`userAcronyms:<exam>`); `loadUserAcronyms(repo, exam): Promise<AcronymEntry[]>` (each entry parsed with a strict Zod schema; invalid ones dropped); `saveUserAcronym(repo, exam, term, expansion): Promise<{ error?: string }>` (term trimmed and uppercased, expansion trimmed, both required; a bank term is refused with `"<TERM> is already in the list."`; an existing mine term has its expansion replaced); `deleteUserAcronym(repo, exam, term)`; `loadAcronyms(repo, exam): Promise<AcronymEntry[]>` (meta + mine through `mergeAcronyms` and the source filter); `unexpandedUserTerms(userQuestions: Question[], list: AcronymEntry[]): string[]` (tokens from `questionText` plus `q.acronyms`, minus terms already listed).
- `assembleCram` changes its `meta.acronyms` use to an `acronyms: AcronymEntry[]` argument; everything else stays the same.

- [ ] Tests: `refuses bank terms and normalizes`, `replaces an existing mine expansion`, `drops malformed stored entries`, `loadAcronyms applies the source filter`, `unexpandedUserTerms lists only unknown tokens`; the cram tests are updated to pass the list.
- [ ] Implement, run `npx vitest run src`, commit.

### Task 4: Acronyms screen (list, setup, my acronyms)

**Files:**
- Create: `src/ui/acronyms/AcronymFlow.tsx`, `src/ui/acronyms/AcronymSetup.tsx`, `src/ui/acronyms/MyAcronyms.tsx`, `src/ui/acronyms/acronyms.css`, `src/ui/acronyms/AcronymFlow.test.tsx`
- Modify: `src/ui/screens.ts` (`{ name: 'acronyms'; exam: string }`), `src/App.tsx`, `src/ui/Home.tsx` (button `Acronyms: <code>`), `src/ui/Home.test.tsx`

**Interfaces:**
- Consumes: `loadAcronyms`, `loadUserAcronyms`, `saveUserAcronym`, `deleteUserAcronym`, `unexpandedUserTerms`, `assembleDeck`, `MIN_CHOICE_ENTRIES`.
- `AcronymFlow({ repo, examCode, seed?, onExit })` holds the stages `loading | error | setup | flashcards | quiz | results`. Load failure reuses `LoadError`.
- `AcronymSetup`: heading `Acronyms: <code>`. It shows the counts (`N acronyms, M due for review`) and a form with:
  - Mode radios: `Flashcards` and `Quiz`.
  - Show radios: `Acronym` and `Meaning`.
  - Cards radios: `Due and new` and `All`.
  - `Number of cards` (1–200, default 20).
  - Quiz only: Answer radios `Type it` and `Choose` (`Choose` is disabled with a hint below `MIN_CHOICE_ENTRIES`), and Time radios `None`, `2 minutes`, `5 minutes` and `10 minutes`.
  - A `Start` button, then a collapsible "Full list" table (Acronym, Meaning, Source) with a caption.
  - With no entries: `No acronyms for this exam with the current source setting.` and no Start button.
  - With an empty deck: `Nothing due. Choose "All" to study every card.`
- `MyAcronyms`: a "Found in your questions" list of `unexpandedUserTerms`, each with an Add button that fills the form. The form has `Acronym` and `Meaning` text inputs and Save; errors are linked with `aria-describedby`. A table of mine entries has a Delete button per row (confirm first). A polite status reports each save or delete.

- [ ] Tests: `empty list shows message`, `choose is disabled with one entry`, `nothing due suggests all`, `my acronyms saves and lists a term found in my questions`, Home test `acronyms button navigates`.
- [ ] Implement, run `npx vitest run src/ui`, commit.

### Task 5: Flashcards, quiz and results

**Files:**
- Create: `src/ui/acronyms/FlashcardRunner.tsx`, `src/ui/acronyms/QuizRunner.tsx`, `src/ui/acronyms/AcronymResults.tsx`, `src/ui/acronyms/runners.test.tsx`
- Modify: `src/ui/acronyms/AcronymFlow.tsx`

**Interfaces:**
- Produces: `interface AcronymGrade { term: string; correct: boolean; given?: string }`. Both runners call `onFinish(grades: AcronymGrade[], timedOut: boolean)` and include only cards the user graded or answered. `AcronymFlow` then calls `applyReviews(repo, exam, grades.map(g => ({ kind: 'acronym', itemId: g.term, quality: g.correct ? 4 : 1 })), new Date())` and shows the results.
- `FlashcardRunner`: shows `Card i of n`, the prompt side, then `Show answer`, which reveals the other side and moves focus to `I knew it`. `I knew it` and `I didn't know it` grade the card and advance; it also has Previous and `Finish now`.
- `QuizRunner`:
  - The answer mode is either a labelled text input `Your answer` with `Check`, or a radio group of `buildChoices` with `Check`. Check shows `Correct` or `Not quite: <answer>` in a focused `role="status"`, then `Next`.
  - For a wrong typed answer, a `Count as correct` button flips the grade (for typos).
  - The timer uses `role="timer"` with `aria-label="Time left"` and is announced at 1 minute; at 0 it finishes with `timedOut`.
- `AcronymResults`:
  - Shows `<k> of <n> correct` (or `known`), and `Time ran out.` when the quiz timed out.
  - Lists the missed cards in a table (Acronym, Meaning, Your answer).
  - Shows a save error, if any, as an alert.
  - Buttons: `Study again` (back to setup, reloaded) and `Back to home`.

- [ ] Tests: `flashcard grades feed SRS` (the repo gets `a:` records with quality 4/1 effect: knew → due in 1 day, didn't → due in 10 minutes), `typed quiz accepts normalized answer`, `count as correct flips a miss`, `choice quiz marks the right option`, `timeout grades only answered cards` (fake timers), `results list missed cards`.
- [ ] Implement, run `npx vitest run src`, commit.

### Task 6: End-to-end, accessibility and handoff

**Files:**
- Create: `tests/e2e/acronyms.spec.ts`
- Modify: `HANDOFF.md`

- [ ] e2e (single-file build, `?seed=1`) covering the flows below, with `expectNoSeriousAxe` on the setup, a flashcard, a quiz card after Check, the results and My acronyms:
  - Home → `Acronyms: DA0-002` → flashcards (Acronym side, All, 2 cards) → grade both → results.
  - Typed quiz with 1 card, using `page.getByText` to read the prompt and typing its expansion from the Full list table.
  - Keyboard only: the choice quiz answered with Tab, arrow keys and Enter.
- [ ] Run `npm run check`; everything passes.
- [ ] Update `HANDOFF.md`: chunk 7 done, the decisions made, and next steps (chunk 8). Commit, then merge to `main` after the final review and its fixes.
