# Chunk 1: Scaffold & Engine Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a running, tested React/TS app shell. It has a typed question and exam schema, a bank registry seeded with Data+ (DA0-002) metadata and 3 dummy questions, local persistence, and JSON export and import, and it builds both to a single `index.html` and to a normal `dist/`.

**Architecture:**

- `src/domain/` holds pure TypeScript types and logic, and has no React.
- `src/banks/` registers exam metadata and bundled questions.
- `src/storage/` wraps IndexedDB, using the `idb` library, behind a small repository interface.
- React UI in this chunk is only a home screen that lists exams and question counts. It exists to prove the pipeline end to end.
- Zod schemas validate every question at load and on import.

**Tech Stack:** Vite 6, React 18, TypeScript 5 (strict), Zod, idb, Vitest + @testing-library/react + fake-indexeddb, Playwright + @axe-core/playwright, ESLint with eslint-plugin-jsx-a11y, and vite-plugin-singlefile.

**Spec:** `docs/superpowers/specs/2026-10-30-comptia-exam-trainer-design.md`

## Global Constraints

- The app must run from a double-clicked single `index.html` (`file://`), with no network requests at runtime.
- There are no GitHub Actions workflows and no Git LFS. All checks run locally through npm scripts.
- **Data+ comes first.** Other exams are not added until Data+ works end to end.
- The app must meet WCAG 2.2 AA. Any serious or critical axe violation fails the tests.
- No CompTIA or Pearson logos. The UI and README carry the disclaimer text from spec §11.
- Bundled questions have `source: "ours"`; user questions have `source: "user"` and are never bundled.
- Only questions with `status: "approved"` from the bundled bank are shown to users. Drafts are visible only in dev mode, through `import.meta.env.DEV`.

## Review Focus

1. **Malformed import file** (bad JSON, wrong schema or a wrong exam code): the import is rejected with a readable error, and existing data is untouched.
2. **Import of a question whose `id` already exists:** user questions are upserted; an import never overwrites a bundled (`ours`) question.
3. **IndexedDB unavailable** (private mode or blocked): the app still loads and shows a warning, and in-memory storage is used.
4. **Single-file build opened via `file://`:** the app renders with no console errors, and no external URLs appear in the HTML.
5. **Draft questions:** draft questions never appear in a production build's question counts.

---

### Task 1: Scaffold the project and toolchain

**Files:**

- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `eslint.config.js`, `playwright.config.ts`, `vitest.config.ts` (or a `test` block inside `vite.config.ts`), `tests/e2e/smoke.spec.ts`, `README.md`, `LICENSE` (MIT), `CONTENT_LICENSE.md` (CC BY-NC 4.0), `HANDOFF.md`

**npm scripts (exact names):**

- `dev`
- `build` (normal `dist/`)
- `build:single` (sets `SINGLE=1`, which enables `vite-plugin-singlefile`, and writes to `dist-single/`)
- `test` (vitest run)
- `test:e2e` (playwright)
- `lint`
- `typecheck` (`tsc --noEmit`)
- `check` (lint, typecheck, test, build:single and test:e2e, in that order)

**Steps:**

- [ ] **Step 1:** Scaffold with `npm create vite@latest . -- --template react-ts`. Install the dependencies listed in Tech Stack. Set `base: './'` in the Vite config so relative paths work under `file://`.
- [ ] **Step 2:** Write `tests/e2e/smoke.spec.ts`. It has two tests:
  - (a) Load `dist-single/index.html` through a `file://` URL. Expect the heading "Cert Exam Trainer" to be visible and no console errors.
  - (b) Run `new AxeBuilder({page}).analyze()`. Expect no violations with an impact of `serious` or `critical`.
- [ ] **Step 3:** Run `npm run build:single && npm run test:e2e`. Expect a FAIL, because the heading is missing.
- [ ] **Step 4:** Make `App.tsx` render an `<h1>Cert Exam Trainer</h1>` inside a `<main>` landmark, with a footer that contains the disclaimer from spec §11.
- [ ] **Step 5:** Run `npm run check`. Expect it to pass.
- [ ] **Step 6:** Commit with the message `chore: scaffold vite react-ts app with test, a11y and single-file build`.

### Task 2: Domain types and Zod schemas

**Files:**

- Create: `src/domain/schema.ts`, `src/domain/types.ts`
- Test: `src/domain/schema.test.ts`

**Interfaces:**

- **Produces `ExamMeta`:**

  ```ts
  { code: string; version: string; name: string; maxQuestions: number;
    timeLimitMinutes: number; passingScore: number;
    domains: { id: string; title: string; weight: number }[];
    objectives: { id: string; domainId: string; title: string }[];
    acronyms: { term: string; expansion: string; source: 'official' | 'community' }[] }
  ```

- **Produces `QuestionType`:**

  ```ts
  'mcq-single' | 'mcq-multi' | 'pbq-match' | 'pbq-order' | 'pbq-config' |
  'pbq-diagram' | 'pbq-terminal' | 'pbq-data' | 'pbq-hotspot' | 'pbq-buckets'
  ```

- **Produces `Question`:**

  ```ts
  { id: string; exam: string; source: 'ours' | 'user'; type: QuestionType;
    objectiveIds: string[]; difficulty: 1 | 2 | 3; pbqWeight?: number;
    stem: string; payload: unknown; answer: unknown;
    explanation: string; partExplanations?: Record<string, string>;
    acronyms: string[]; status: 'draft' | 'reviewed' | 'approved' }
  ```

  - `pbqWeight` must be an integer from 1 to 6.
  - `pbqWeight` is required when the type starts with `pbq-` and forbidden otherwise.
- **Produces MCQ payload and answer shapes:**
  - `payload: { options: { id: string; text: string }[] }`
  - `answer: { correct: string[] }`
  - `mcq-single` has exactly 1 correct answer; `mcq-multi` has at least 2.
  - The PBQ payload stays `unknown` in this chunk. Chunks 3–4 add discriminated payload schemas.
- **Produces functions:**
  - `parseQuestion(x: unknown): Question`, which throws a `ZodError`.
  - `parseExamMeta(x: unknown): ExamMeta`.

**Steps:**

- [ ] **Step 1:** Write `schema.test.ts` with these cases:
  - A valid `mcq-single` question parses.
  - `mcq-single` with 2 correct answers throws.
  - A `pbq-order` question without `pbqWeight` throws.
  - `pbqWeight: 7` throws.
  - An `mcq` question with `pbqWeight` throws.
  - A correct id that isn't in the options throws.
  - `ExamMeta` whose domain weights don't sum to 100 throws.
- [ ] **Step 2:** Run `npm test -- schema`. Expect a FAIL.
- [ ] **Step 3:** Implement the schemas with `z.discriminatedUnion` on the MCQ types, plus `superRefine` checks for the cross-field rules.
- [ ] **Step 4:** Run `npm test -- schema`. Expect a PASS.
- [ ] **Step 5:** Commit with the message `feat(domain): question and exam schemas`.

### Task 3: Bank registry plus Data+ seed

**Files:**

- Create: `src/banks/registry.ts`, `src/banks/dataplus/meta.ts`, `src/banks/dataplus/questions.ts`, `src/banks/index.ts`
- Test: `src/banks/registry.test.ts`

**Interfaces:**

- **Consumes** `parseQuestion` and `parseExamMeta` (Task 2).
- **Produces:**
  - `registerExam(meta: ExamMeta, questions: Question[]): void`. It validates everything, and throws if a question's `objectiveIds` aren't in the meta or if there's a duplicate id.
  - `listExams(): ExamMeta[]`
  - `getBundledQuestions(code: string, opts?: { includeDrafts?: boolean }): Question[]`. The default for `includeDrafts` is `import.meta.env.DEV`.

**Data+ metadata (DA0-002):**

These values are entered now and **re-verified against CompTIA's official objectives in chunk 9**; mark them with a `// VERIFY chunk 9` comment.

- code `DA0-002`, name `CompTIA Data+`
- maxQuestions 90, timeLimitMinutes 90, passingScore 675
- domains:
  - `1` Data Concepts and Environments, 20
  - `2` Data Acquisition and Preparation, 22
  - `3` Data Analysis, 24
  - `4` Visualization and Reporting, 20
  - `5` Data Governance, 14
- one placeholder objective per domain (`1.1`, `2.1`, …)
- acronyms: an empty array

**Seed questions:** 3 placeholder questions written by us:

- one `mcq-single` (approved)
- one `mcq-multi` (approved)
- one `mcq-single` (status `draft`)

**Steps:**

- [ ] **Step 1:** Write tests:
  - `listExams()` contains `DA0-002`.
  - Production mode returns 2 bundled Data+ questions.
  - `includeDrafts: true` returns 3.
  - Registering a question with an unknown objective throws.
  - A duplicate id throws.
- [ ] **Step 2:** Run the tests. Expect a FAIL.
- [ ] **Step 3:** Implement the registry and the seed data.
- [ ] **Step 4:** Run the tests. Expect a PASS.
- [ ] **Step 5:** Commit with the message `feat(banks): registry with Data+ DA0-002 seed`.

### Task 4: Storage repository

**Files:**

- Create: `src/storage/repo.ts`, `src/storage/idbRepo.ts`, `src/storage/memoryRepo.ts`, `src/storage/index.ts`
- Test: `src/storage/repo.test.ts`, which runs the same suite against both implementations, using `fake-indexeddb/auto`

**Interfaces:**

- **Produces `Repo`:**

  ```ts
  interface Repo {
    getUserQuestions(exam?: string): Promise<Question[]>;
    upsertUserQuestion(q: Question): Promise<void>;   // throws if q.source !== 'user'
    deleteUserQuestion(id: string): Promise<void>;
    getSetting<T>(key: string): Promise<T | undefined>;
    setSetting<T>(key: string, v: T): Promise<void>;
    putRecord(store: 'results' | 'srs', rec: { id: string } & Record<string, unknown>): Promise<void>;
    listRecords(store: 'results' | 'srs'): Promise<unknown[]>;
    clearAll(): Promise<void>;
  }
  ```

- **Produces** `openRepo(): Promise<{ repo: Repo; persistent: boolean }>`. It tries IndexedDB (database `cert-exam-trainer`, version 1) and falls back to the in-memory repo with `persistent: false`.

**Steps:**

- [ ] **Step 1:** Write a shared contract suite covering:
  - upsert then get
  - an upsert with the same id replaces the question
  - delete
  - an upsert with `source: 'ours'` rejects
  - get and set a setting
  - put and list records
  - clearAll

  Add a separate test: when `indexedDB` is undefined, `openRepo` returns `persistent: false`.
- [ ] **Step 2:** Run the tests. Expect a FAIL.
- [ ] **Step 3:** Implement the repository using the `idb` library, with object stores `userQuestions` (keyPath `id`, index `exam`), `settings`, `results` and `srs`.
- [ ] **Step 4:** Run the tests. Expect a PASS.
- [ ] **Step 5:** Commit with the message `feat(storage): IndexedDB repo with memory fallback`.

### Task 5: Export and import

**Files:**

- Create: `src/storage/backup.ts`
- Test: `src/storage/backup.test.ts`

**Interfaces:**

- **Consumes** `Repo` (Task 4) and `parseQuestion` (Task 2).
- **Produces:**
  - `exportBackup(repo: Repo): Promise<BackupFile>`, where `BackupFile` is:

    ```ts
    { format: 'cert-exam-trainer-backup'; version: 1; exportedAt: string;
      userQuestions: Question[]; settings: Record<string, unknown>;
      results: unknown[]; srs: unknown[] }
    ```

  - `importBackup(repo: Repo, json: string, mode: 'merge' | 'replace'): Promise<{ imported: number; skipped: { id: string; reason: string }[] }>`
  - Questions with a `source` other than `user` are skipped, with the reason `"bundled questions cannot be imported"`.
  - An invalid file throws `ImportError` with a readable message, and the repo is left unchanged. Validate everything before writing anything.

**Steps:**

- [ ] **Step 1:** Write tests:
  - Exporting and then importing into an empty repo round-trips the data.
  - Invalid JSON throws `ImportError`, and the repo is unchanged.
  - A wrong `format` throws.
  - One invalid question means the whole import is rejected, and the repo is unchanged.
  - An `ours` question is skipped with that reason.
  - `replace` clears the repo first; `merge` upserts.
- [ ] **Step 2:** Run the tests. Expect a FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests. Expect a PASS.
- [ ] **Step 5:** Commit with the message `feat(storage): backup export/import`.

### Task 6: Home screen wired to banks and storage

**Files:**

- Modify: `src/App.tsx`
- Create: `src/ui/Home.tsx`, `src/ui/StorageBanner.tsx`, `src/ui/BackupControls.tsx`
- Test: `src/ui/Home.test.tsx`, `tests/e2e/home.spec.ts`

**Behavior:**

- The home screen lists each registered exam as `CompTIA Data+ (DA0-002)`, with counts: "2 questions (ours)" and "N questions (mine)".
- When `persistent` is false, `StorageBanner` shows a `role="status"` warning: "Progress won't be saved in this browser session."
- `BackupControls` has an Export button, which downloads `cert-exam-trainer-backup-YYYY-MM-DD.json` through a Blob URL, and an Import file input (`accept=".json"`) with a Merge/Replace choice. The result or error is announced in an `aria-live="polite"` region.

**Steps:**

- [ ] **Step 1:** Write component tests:
  - The Data+ row shows "2 questions (ours)".
  - The banner appears when `persistent` is false.
  - Importing an invalid file shows the error text in the live region.

  Write the e2e test:
  - Open the single-file build.
  - Run axe and expect no serious or critical violations.
  - Import a fixture backup containing 1 user question and expect "1 questions (mine)" (pluralization is left to the implementer).
- [ ] **Step 2:** Run the tests. Expect a FAIL.
- [ ] **Step 3:** Implement the components. Every control needs a visible label, and focus must be visible.
- [ ] **Step 4:** Run `npm run check`. Expect a PASS.
- [ ] **Step 5:** Update `HANDOFF.md`: what's done, the commands, next is chunk 2 (exam UI), and any open issues. Commit with the message `feat(ui): home screen with exam list, storage banner and backup controls`, then `git push`.
