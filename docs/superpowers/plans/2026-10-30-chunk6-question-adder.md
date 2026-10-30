# Chunk 6: Question Adder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Users can author, edit, delete, import and export their own questions of every type, and choose Ours / Mine / Both as the question source for every mode.

**Architecture:** A "question pack" JSON format (`cert-exam-trainer-questions` v1) is the one interchange format for user questions: the in-app import/export uses it, and a dev script converts the plain-text Markdown authoring format into it. Validation for packs and backups shares one function. The editor screen uses a structured form for MCQs. For PBQs it uses the shared fields plus a JSON editor for `payload`/`answer`, seeded from a starter per template, checked live by `questionSchema` and previewed live with the existing `PbqView`.

**Tech Stack:** React 18, Zod, Vitest + Testing Library, Playwright + axe, vite-node for the script.

**Spec:** `docs/superpowers/specs/2026-10-30-comptia-exam-trainer-design.md` (§9, §13 item 6)

## Global Constraints

- User questions are stored locally only and are **never bundled**. Nothing from `_WorkingData/` is ever copied into `src/`, `tests/` or `docs/` (owner's instruction, 2026-10-30): test fixtures are original.
- Before the first add or import, a notice states that the user is solely responsible for their content and must not add NDA-protected or braindump material.
- The source toggle (Ours, Mine, Both) applies to every mode: mock, practice, cram and progress.
- WCAG 2.2 AA: axe must show no serious or critical violations, every control has a label, and errors are announced.
- No GitHub Actions and no Git LFS.

## Review Focus

1. A pack with the same id twice → rejected before anything is written (Task 1 test `rejects duplicate ids in a pack`).
2. A pack question whose id matches a bundled question → skipped and reported, not overwritten (Task 1 test `skips ids used by bundled questions`).
3. Toggle set to Mine with no user questions → the mock/practice setup says there are no questions instead of crashing (Task 3 test `mine with no questions shows empty message`).
4. Editing a question and changing its type → the old payload doesn't leak into the save; the starter for the new type loads (Task 5 test `switching type loads that starter`).
5. Markdown with an unknown answer letter (`Correct Answer: F` with 4 options) → the script fails with that question's number and makes no file (Task 2 test `unknown answer letter is an error`).

---

### Task 1: Question pack format and shared validation

**Files:**
- Create: `src/storage/pack.ts`, `src/storage/pack.test.ts`
- Modify: `src/storage/backup.ts` (move per-question checks into `validateUserQuestions`)

**Interfaces:**
- Produces: `PACK_FORMAT = 'cert-exam-trainer-questions'`; `interface QuestionPack { format; version: 1; exportedAt: string; questions: Question[] }`; `validateUserQuestions(raw: unknown[]): { toWrite: Question[]; skipped: ImportResult['skipped'] }` (throws `ImportError`); `exportPack(repo, exam?: string, now?): Promise<QuestionPack>`; `importPack(repo, json: string): Promise<ImportResult>` (always merges).
- Pack entries may leave out `source` (default `'user'`), `acronyms` (`[]`), `status` (`'approved'`) and `explanation` (`''`). An entry with `source: 'ours'` is skipped.

- [ ] Tests: `exports only user questions for the exam`, `round-trips export to import`, `fills defaults`, `rejects duplicate ids in a pack`, `skips ids used by bundled questions`, `rejects a backup file with a clear message`, `an invalid question names its index and path`. Existing backup tests still pass.
- [ ] Implement, run `npx vitest run src/storage`, commit.

### Task 2: Markdown → pack converter

**Files:**
- Create: `src/authoring/mdPack.ts`, `src/authoring/mdPack.test.ts`, `scripts/md-to-pack.ts`, `docs/question-template.md`
- Modify: `package.json` (script `md-to-pack`: `vite-node scripts/md-to-pack.ts --`), `docs/pbq-authoring.md` (link to the template)

**Interfaces:**
- Produces: `parseMarkdown(md: string, opts: { exam: string; idPrefix: string; defaultObjective: string }): { questions: unknown[]; warnings: string[] }` (throws `Error('Question N: …')`).
- Format: blocks are separated by lines of `---`. An MCQ block has the stem, then options as `A - text`, `A. text`, `A) text`, or a letter alone on a line followed by the text. The answer is either `Correct Answer(s): A, B` (text after ` - ` is ignored) or a `Correct Answer:` line placed after an option, which marks that option. The explanation is everything after an `Explanation` or `Why …` heading, or after the answer line. Two or more correct answers make the type `mcq-multi`. Optional metadata lines anywhere in a block: `Id:`, `Objective:` (comma-separated), `Difficulty: 1|2|3`. A block holding a ```` ```pbq ```` fence is a PBQ: the fence holds JSON with `type`, `stem`, `payload`, `answer`, and optionally `pbqWeight` (default 2), `explanation`, `partExplanations`, `objectiveIds` and `difficulty`. Image lines are ignored with a warning. Every result passes `questionSchema`.
- The script runs `npm run md-to-pack -- <in.md...> --exam DA0-002 --out <file.json> [--prefix user-da] [--objective 1.1]`. It writes a `QuestionPack`, prints warnings, and exits 1 without writing anything on any error.

- [ ] Tests (original fixture text only): `dash options and Correct Answer(s) line`, `letter on its own line and marker after option`, `two correct makes mcq-multi`, `metadata lines override defaults`, `pbq fence builds a valid pbq-data`, `image lines warn`, `unknown answer letter is an error`, `no correct answer is an error`.
- [ ] Implement, run, commit.

### Task 3: Source filter applied to every mode

**Files:**
- Create: `src/banks/pool.ts`, `src/banks/pool.test.ts`, `src/ui/SourceToggle.tsx`
- Modify: `src/ui/exam/MockExamFlow.tsx:40-41`, `src/ui/study/loadStudy.ts`, `src/ui/Home.tsx`

**Interfaces:**
- Produces: `type SourceFilter = 'ours' | 'mine' | 'both'`; `SOURCE_SETTING = 'sourceFilter'`; `getSourceFilter(repo): Promise<SourceFilter>` (default `'both'`); `loadPool(repo, exam): Promise<Question[]>`.
- `SourceToggle` is a radio fieldset titled "Questions from", shown on Home, and it saves the setting.

- [ ] Tests: `defaults to both`, `ours excludes user questions`, `mine excludes bundled`, Home test `toggle persists`, flows test `mine with no questions shows empty message`.
- [ ] Implement, run, commit.

### Task 4: My questions screen, notice, pack import/export, delete

**Files:**
- Create: `src/ui/author/MyQuestions.tsx`, `src/ui/author/ContentNotice.tsx`, `src/ui/author/author.css`, `src/ui/author/MyQuestions.test.tsx`
- Modify: `src/ui/screens.ts` (`{ name: 'questions'; exam: string }` and `{ name: 'edit'; exam: string; id?: string }`), `src/App.tsx`, `src/ui/Home.tsx` (button `My questions: <code>`)

**Interfaces:**
- `NOTICE_SETTING = 'userContentNoticeAccepted'`. `ContentNotice({ onAccept })` shows the §9 text, an "I understand" checkbox and a Continue button that stays disabled until the box is checked.
- MyQuestions lists the user's questions (stem preview, type, status) with Edit and Delete (Delete asks `window.confirm`), "Add question", "Export my questions" (pack file `cert-exam-trainer-questions-<exam>-YYYY-MM-DD.json`) and "Import questions (.json)". Add and import show the notice until it has been accepted. Results go to a polite live region.

- [ ] Tests: `notice gates add until accepted`, `delete removes after confirm`, `import reports imported and skipped`.
- [ ] Implement, run, commit.

### Task 5: Question editor with live preview

**Files:**
- Create: `src/authoring/starters.ts` (one valid starter `{payload, answer}` per PBQ template, from original content), `src/authoring/starters.test.ts`, `src/ui/author/QuestionEditor.tsx`, `src/ui/author/QuestionEditor.test.tsx`

**Interfaces:**
- Consumes: `questionSchema`, `PbqView`, `McqView`, `Repo.upsertUserQuestion`.
- Shared fields: type select, objectives (checkboxes from the exam meta), difficulty, stem, explanation, status. MCQ: an option list (add, remove, text, correct checkbox). PBQ: weight 1–6, `payload` and `answer` textareas holding JSON, and optional `partExplanations` JSON. Errors appear in a list linked by `aria-describedby`. The preview renders the draft whenever it parses. Save stays disabled while the draft is invalid. A new question's id is `user-${crypto.randomUUID()}`.

- [ ] Tests: `every starter passes questionSchema`, `mcq save round-trips`, `invalid json shows error and disables save`, `switching type loads that starter`, `edit loads existing question`.
- [ ] Implement, run, commit.

### Task 6: e2e, docs, handoff, whole-branch review

- [ ] e2e `tests/e2e/author.spec.ts`: accept the notice, add an MCQ, set the toggle to Mine, start practice, and see the question; run axe on the editor and on My questions.
- [ ] Run `npm run check` and make sure it passes.
- [ ] Update HANDOFF.md, dispatch the final reviewer, fix every finding (minors included), merge.
