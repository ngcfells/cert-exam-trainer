# In-app Reports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Learners send a bug report, a problem with a question, or a feature request from inside the app, and it
becomes a labelled GitHub issue on `ngcfells/cert-exam-trainer`, with no sign-in.

**Architecture:** A Cloudflare Worker in `relay/` holds the GitHub token and the Turnstile secret, validates the
report, checks Turnstile, rate-limits, dedupes and creates the issue. The app has a report panel (a fourth panel
kind), a header button, per-question buttons and an IndexedDB outbox for reports that could not be sent. One zod
contract in `src/report/contract.ts` is shared by both sides.

**Tech Stack:** React 18, TypeScript, zod 3, idb 8, vitest + Testing Library, Playwright; Cloudflare Workers
(`wrangler`, KV), Turnstile, GitHub REST API.

**Spec:** `docs/superpowers/specs/2026-11-06-in-app-reports-design.md`

## Global Constraints

- The GitHub token and Turnstile secret exist only as Worker secrets (`GITHUB_TOKEN`, `TURNSTILE_SECRET`). Never in
  app code, the build, a commit, a log, a test fixture or the handoff.
- Turnstile site key (public): `0x4AAAAAAF2w670muVBVNqkR`.
- Repo: `ngcfells/cert-exam-trainer`. Allowed origins: `https://ngcfells.github.io`, and `http://localhost` or
  `http://127.0.0.1` on any port. Every other origin, `null` included, is refused.
- Labels: bug → `bug`, `from-app`; question → `bug`, `content`, `from-app`; feature → `enhancement`, `from-app`.
- Limits: title 120, details 5000, contact 200 characters. Rate: 5 an hour and 20 a day per `CF-Connecting-IP`.
  Dedupe window 24 hours. Outbox cap 10.
- No report button, panel or reminder while a mock is running (`usePanels().mockDeadline !== null`).
- Reports are off (every button hidden) when `VITE_REPORT_URL` or `VITE_TURNSTILE_SITEKEY` is unset, or the page is
  on `file:`. On `file:`, About shows "To report a problem, use the online app" with a link to
  `https://ngcfells.github.io/cert-exam-trainer/`.
- Answers, scores and saved data are never sent.
- Repo rules: keep `.superpowers/sdd` ledgers, no GitHub Actions, no LFS, a busy port means use a free one.
- Execution (owner's standing choice): native, superpowers:executing-plans test-first, then one Opus whole-branch
  review, fix every finding (minors too), then merge, push and `npm run deploy`.

## Review Focus

1. A retry after the network drops mid-send (the issue was created, the reply was lost) must not create a second
   issue. Pinned in Task 2 (dedupe test) and Task 4 (outbox keeps the same `id`).
2. Text with `@user`, `#12` or a Markdown heading must not ping anyone or cross-link. Pinned in Task 1.
3. A report started offline, then sent when back online, must get a fresh Turnstile token (none is stored). Pinned in
   Task 4 (outbox record has no token) and Task 6.
4. Opening the report panel on a half-answered practice question must keep the answer. Pinned in Task 9 (e2e).
5. A running mock must show no Report button anywhere, and it must reappear on the results. Pinned in Task 7 and
   Task 9.

---

### Task 1: Shared contract and issue formatting

**Files:**
- Create: `src/report/contract.ts`, `src/report/contract.test.ts`
- Create: `relay/src/issue.ts`, `relay/src/issue.test.ts`
- Modify: `vite.config.ts` (test `include` adds `'relay/src/**/*.test.ts'`), `tsconfig.json` (`include` adds
  `"relay/src"`)

**Interfaces:**
- Produces (`src/report/contract.ts`):
  - `REPORT_TYPES = ['bug', 'question', 'feature'] as const`; `type ReportType`.
  - `REPORT_MODES = ['practice', 'cram', 'lesson', 'results'] as const`; `type ReportMode`.
  - `LIMITS = { title: 120, details: 5000, contact: 200 } as const`.
  - `reportRequestSchema` (strict): `id` uuid; `type`; `title` trimmed 1..120; `details` trimmed 1..5000;
    `contact?` trimmed ≤ 200; `version` matching `/^[0-9A-Za-z.+-]{1,40}$/`; `questionId?` matching
    `/^[A-Za-z0-9._:-]{1,120}$/`; `context?` strict `{ exam?: /^[A-Z0-9-]{1,20}$/, mode?: ReportMode, userAgent?:
    string ≤ 400 }`; `turnstileToken` 1..2048. Refine: `type === 'question'` requires `questionId`.
  - `type ReportRequest = z.infer<…>`; `type ReportDraft = Omit<ReportRequest, 'turnstileToken'>`.
  - `reportReplySchema = z.object({ number: z.number().int().positive(), url: z.string().url() })`;
    `type ReportReply`.
- Produces (`relay/src/issue.ts`): `formatIssue(r: ReportRequest): { title: string; body: string; labels: string[] }`
  and `escapeText(s: string): string`.

- [ ] **Step 1: Write the failing tests**

`contract.test.ts`: `'accepts a full question report'`; `'rejects a question report with no questionId'`;
`'rejects a 121-character title'`, `'a 5001-character body'`, `'a 201-character contact'`; `'rejects unknown
keys'`; `'rejects a version with a space'`.

`issue.test.ts`:
- `'labels by type'`: bug → `['bug','from-app']`, question → `['bug','content','from-app']`, feature →
  `['enhancement','from-app']`.
- `'prefixes question titles'`: `title === 'Question da2-1-1-mcq-004: Wrong answer key'`.
- `'escapes mentions and references'`: details `'cc @octocat about #12\n# Heading'` → the body contains
  `'cc &#64;octocat about &#35;12\n&#35; Heading'` and contains no `'@'` or `'#'` outside the fixed headings.
- `'strips control characters and newlines from the title'`.
- `'body layout'`: details, then `'### Context'` with `- Type: Problem with a question`, `` - Question:
  `da2-1-1-mcq-004` ``, `- Exam: DA0-002`, `- Mode: practice`, `- Browser: …` (each only when present), then
  `'### Contact'` only when given, then `'---\nSent from the app, version 0.1.0'`. Type names: `Bug`, `Problem with
  a question`, `Feature request`.

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run src/report relay/src` — Expected: FAIL, modules not found.

- [ ] **Step 3: Implement both files**

`escapeText` replaces every `@` with `&#64;` and every `#` with `&#35;`. It applies to details, contact and the
user-agent. Ids, exam and version are already limited by the schema, so they go in as they are.

- [ ] **Step 4: Run them and see them pass**

Run: `npx vitest run src/report relay/src` — Expected: PASS.

- [ ] **Step 5: Commit**

`git add src/report relay/src vite.config.ts tsconfig.json && git commit -m "feat(report): shared report contract and issue format"`

### Task 2: The relay Worker

**Files:**
- Create: `relay/src/handler.ts`, `relay/src/handler.test.ts`, `relay/src/index.ts`, `relay/wrangler.toml`,
  `relay/package.json`, `relay/README.md`

**Interfaces:**
- Consumes: Task 1 (`reportRequestSchema`, `formatIssue`, `ReportReply`).
- Produces (`relay/src/handler.ts`):
  - `interface KvLike { get(key: string): Promise<string | null>; put(key: string, value: string, opts?: {
    expirationTtl?: number }): Promise<void> }`.
  - `interface Env { GITHUB_TOKEN: string; TURNSTILE_SECRET: string; RELAY_KV: KvLike; REPO?: string }` (default
    repo `ngcfells/cert-exam-trainer`).
  - `handle(req: Request, env: Env, fetchFn: typeof fetch = fetch, now: () => number = Date.now): Promise<Response>`.
- `relay/src/index.ts`: `export default { fetch: (req, env) => handle(req, env) }`.

Order inside `handle`: OPTIONS preflight (204 with CORS for an allowed origin) → origin check (403) → only
`POST /report` (else 404) → JSON and schema (400 `{ error }`) → dedupe hit on `id:<id>` (200 with the stored reply,
no counting) → rate limit on `rl:h:<ip>:<hour>` and `rl:d:<ip>:<day>` (429) → Turnstile `siteverify` with `secret`,
`response`, `remoteip` (403 on `success: false`) → `POST https://api.github.com/repos/<repo>/issues` with
`Authorization: Bearer`, `Accept: application/vnd.github+json`, `X-GitHub-Api-Version: 2022-11-28`, `User-Agent:
cert-trainer-relay` (on 422, retry once without `labels`; any other failure 502) → store `id:<id>` (TTL 86400) →
201 `{ number, url: html_url }`. Every response to an allowed origin carries `Access-Control-Allow-Origin` with that
origin and `Vary: Origin`.

- [ ] **Step 1: Write the failing tests** (fake KV backed by a `Map`; `fetchFn` stub records calls by URL)

- `'refuses a null origin'` and `'refuses an unknown origin'` → 403, no fetch calls.
- `'answers preflight for localhost:5173'` → 204, `Access-Control-Allow-Methods` includes `POST`.
- `'rejects an invalid body with 400'`.
- `'creates the issue with labels and returns 201'`: GitHub call body equals `formatIssue(req)`; reply `{ number:
  14, url }`.
- `'returns the stored reply for a repeated id without a second issue'`: two calls → one GitHub call, both reply
  number 14.
- `'rate-limits the sixth report in an hour'` → 429; `'and the 21st in a day'` (advance `now` past each hour).
- `'refuses a failed Turnstile check'` → 403, no GitHub call.
- `'retries without labels on 422'` → second GitHub call has no `labels`; 201.
- `'returns 502 when GitHub fails'`, and the reply body never contains the token.

- [ ] **Step 2: Run and see them fail** — `npx vitest run relay/src` — FAIL.

- [ ] **Step 3: Implement `handler.ts` and `index.ts`**

- [ ] **Step 4: Run and see them pass** — `npx vitest run relay/src` — PASS. Then `npm run lint && npm run typecheck`
  — exit 0.

- [ ] **Step 5: Add the deploy files**

- `relay/package.json`: `"private": true`, `"scripts": { "deploy": "wrangler deploy" }`, devDependency `wrangler`
  (current 4.x).
- `relay/wrangler.toml`: `name = "cert-trainer-relay"`, `main = "src/index.ts"`, a current `compatibility_date`,
  and `[[kv_namespaces]] binding = "RELAY_KV"` with `id = "REPLACE_WITH_KV_ID"`.
- `relay/README.md`: owner steps, in order:
  1. `cd relay && npm install && npx wrangler login`.
  2. `npx wrangler kv namespace create RELAY_KV`, then paste the printed id into `wrangler.toml`. The id is not a
     secret.
  3. `npx wrangler secret put GITHUB_TOKEN`, then `npx wrangler secret put TURNSTILE_SECRET`. Paste each value at
     the prompt; never type them anywhere else.
  4. `npx wrangler deploy`, then note the `https://cert-trainer-relay.<subdomain>.workers.dev` URL.
  5. The token expires: note its date, and repeat step 3 for `GITHUB_TOKEN` with a new token before then.

- [ ] **Step 6: Commit** — `git commit -m "feat(relay): Cloudflare Worker that files in-app reports as issues"`

### Task 3 (owner gate, runs alongside Tasks 4–8): deploy the relay and create the labels

- [ ] Run `gh label create content --description "Problem with a bundled question" --color c5def5` and
  `gh label create from-app --description "Sent from the in-app report form" --color ededed` in testingUtility.
- [ ] The owner follows `relay/README.md`. Claude commits the KV id in `wrangler.toml` and records the token expiry
  date in the handoff.
- [ ] Create a committed `.env.production` with `VITE_REPORT_URL=https://cert-trainer-relay.<subdomain>.workers.dev`
  and `VITE_TURNSTILE_SITEKEY=0x4AAAAAAF2w670muVBVNqkR`. Both are public values.
- [ ] Smoke test from `npm run dev` on localhost once Task 6 is in. Close the test issue it makes.

### Task 4: Report config, sending and the outbox store

**Files:**
- Create: `src/report/config.ts`, `src/report/send.ts`, `src/report/outbox.ts` with tests beside them
- Modify: `src/storage/repo.ts`, `src/storage/idbRepo.ts`, `src/storage/memoryRepo.ts`, `src/storage/repo.test.ts`,
  `src/storage/backup.test.ts`

**Interfaces:**
- Consumes: Task 1 contract.
- Produces:
  - `reportConfig(env = import.meta.env, protocol = location.protocol): { url: string; siteKey: string } | null`.
  - `type SendOutcome = { kind: 'sent'; reply: ReportReply } | { kind: 'offline' } | { kind: 'failed'; status:
    number; message: string }`.
  - `sendReport(url: string, req: ReportRequest, fetchFn = fetch): Promise<SendOutcome>`, which posts to
    `${url}/report`. Offline means the fetch threw, or a 5xx came back. A 4xx is `failed`, with `message` from the
    reply's `error`, and for 429 the fixed text "Too many reports from this connection. Try again in an hour."
  - `type OutboxReport = ReportDraft & { savedAt: string }`; `MAX_OUTBOX = 10`.
  - Repo gains `listOutbox(): Promise<OutboxReport[]>`, `putOutbox(r: OutboxReport): Promise<void>` (throws
    `OutboxFullError` when 10 are waiting and `r.id` is new), `deleteOutbox(id: string): Promise<void>`.
    `clearAll` also clears the outbox.

- [ ] **Step 1: Write the failing tests**
  - `config.test.ts`: null when either variable is missing; null on `'file:'`; the values on `'https:'`.
  - `send.test.ts`: 201 → sent; a fetch that throws → offline; 503 → offline; 400 `{ error: 'x' }` → failed 'x';
    429 → the fixed text.
  - `repo.test.ts` (memory and fake-indexeddb): put, list, delete; the 11th new id throws `OutboxFullError`; putting
    an existing id again replaces it; `clearAll` empties the outbox; `'a stored outbox report has no
    turnstileToken'`.
  - `idbRepo`: `'opens a version-1 database and keeps its results'`. Create a v1 database with one result, open it
    with `openIdbRepo`, and expect the result is still listed and the outbox is empty.
  - `backup.test.ts`: `'export leaves out the outbox'`.
- [ ] **Step 2: Run and see them fail** — `npx vitest run src/report src/storage` — FAIL.
- [ ] **Step 3: Implement.** In `idbRepo.ts`, `openDB(name, 2, { upgrade(db, oldVersion) { if (oldVersion < 1) {…the
  current stores…} if (oldVersion < 2) db.createObjectStore('outbox', { keyPath: 'id' }) } })`. `putOutbox` drops
  any `turnstileToken` key before storing.
- [ ] **Step 4: Run and see them pass**, then `npm run typecheck`.
- [ ] **Step 5: Commit** — `git commit -m "feat(report): config, sending and an outbox store"`

### Task 5: Turnstile token on demand

**Files:**
- Create: `src/report/turnstile.ts`, `src/report/turnstile.test.ts`

**Interfaces:**
- Produces: `useTurnstile(siteKey: string): { boxRef: RefObject<HTMLDivElement>; getToken(): Promise<string> }`.
  - On first `getToken` it loads `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit` once per
    page.
  - It renders into `boxRef` with `{ sitekey, execution: 'execute', appearance: 'interaction-only', callback,
    'error-callback', 'expired-callback' }`, then calls `execute`, and resolves with the token from `callback`.
  - Each later call does `reset` and `execute`. It rejects on the error callback, or after 60 s, with an `Error` whose
    message is "The spam check could not finish. Check your connection and try again."
  - It removes the widget on unmount.

- [ ] **Step 1: Write failing tests** with a fake `window.turnstile` (the script tag is detected by `src`, and the
  test fires its `load`): resolves the token; a second call resets and gets a new token; the error callback rejects
  with the message; the script is added once for two hooks.
- [ ] **Step 2: Fail**, **Step 3: implement**, **Step 4: pass** — `npx vitest run src/report/turnstile.test.ts`.
- [ ] **Step 5: Commit** — `git commit -m "feat(report): Turnstile token on demand"`

### Task 6: The report form and panel, the header button and the general entry points

**Files:**
- Create: `src/ui/report/ReportForm.tsx`, `src/ui/report/ReportPanel.tsx`, `src/ui/report/ReportButton.tsx`,
  `src/ui/report/report.css`, `src/ui/report/report.test.tsx`
- Modify: `src/ui/panels/PanelProvider.tsx`, `src/App.tsx` (header and panel render),
  `src/ui/panels/SettingsPanel.tsx`, `src/ui/About.tsx`, `src/ui/legal.ts`

**Interfaces:**
- Consumes: Tasks 1, 4, 5.
- Produces:
  - `type ReportContext = { questionId?: string; exam?: string; mode?: ReportMode }`.
  - `PanelKind` adds `'report'`. `PanelApi` adds `reportContext: ReportContext` and `openReport(ctx: ReportContext,
    opener: HTMLElement | null): void`, which sets the context and opens `'report'`. `NO_PANELS` gets no-op versions.
  - `ReportButton({ context, label = 'Report a problem' }: { context: ReportContext; label?: string })`. It renders
    nothing when `reportConfig()` is null or `mockDeadline !== null`, and has `aria-haspopup="dialog"`.
  - `ReportPanel({ repo }: { repo: Repo })`: the `Panel` titled "Report a problem or request a feature". It holds
    `ReportForm` and the waiting-reports list.

The form:
- Type radios. With a `questionId`: "A problem with this question" (default), "A bug in the app", "A feature
  request". Without one, the bug and feature options only.
- Title, with a characters-left count.
- Details.
- Contact (optional), hint "Email or GitHub name. Issues are public, so this will be public too."
- Checkbox "Include technical details" (on), listing app version, exam, mode and browser.
- The line "Your report becomes a public issue on GitHub."
- Send.

Validation errors use the QuestionEditor pattern: a summary of links with focus moved to it, plus `aria-invalid` and
`aria-describedby`.

What Send does:
- When `navigator.onLine` is false, it saves to the outbox without asking for a token.
- Otherwise it gets a token and sends:
  - **sent:** deletes the report from the outbox if it was there, and shows "Sent, thank you." with a link "View
    issue #N" (`target="_blank"`, `rel="noopener noreferrer"`). Focus moves to that message.
  - **offline:** saves to the outbox and shows "Saved on this device. You can send it when you are back online."
  - **failed:** shows the message and keeps the text.
- A full outbox shows "10 reports are already waiting. Send or discard one first."

The `id` is `crypto.randomUUID()`, made once per draft, so a retry keeps it.

Header: a "Report" button beside Settings, `ReportButton` with `context: {}` and label "Report". Settings panel and
About: "Report a bug or request a feature". About also gets the privacy paragraph from `legal.ts` ("A report sends
what you type, plus the app version and, if you leave it ticked, the exam, mode and browser. Your answers and saved
data are never sent."). When `location.protocol === 'file:'`, About shows the online-app line instead of the button.

- [ ] **Step 1: Write failing tests** (`report.test.tsx`, with `reportConfig` and `useTurnstile` mocked through
  `vi.mock`)
  - `'hides the button when reports are off'` and `'while a mock is running'`.
  - `'defaults to a question problem when opened from a question'`.
  - `'shows an error summary for an empty title and moves focus to it'`.
  - `'sends and shows the issue link'`: the posted body has the `questionId` and the context, and has no context
    when the box is unticked.
  - `'saves to the outbox when offline and sends later with a fresh token'`.
  - `'keeps the same id when retrying a failed send'`.
  - `'shows the full-outbox message'`.
  - `About`: `'shows the online-app line on file:'`.
- [ ] **Step 2: Fail**, **Step 3: implement**, **Step 4: pass** — `npx vitest run src/ui/report src/ui/About.test.tsx
  src/ui/panels`.
- [ ] **Step 5: Commit** — `git commit -m "feat(report): report panel, header button and general entry points"`

### Task 7: Report buttons on questions and the flagged nudge

**Files:**
- Modify: `src/ui/study/StudyRunner.tsx`, `src/ui/exam/ResultsScreen.tsx`, and their tests

**Interfaces:**
- Consumes: Task 6 `ReportButton`, `ReportContext`. `StudyRunner` takes the mode already passed to it, or adds a
  `mode: 'practice' | 'cram' | 'lesson'` prop where it does not have one. Thread it from `PracticeFlow`, `CramFlow`
  and `LearnFlow`.

Changes:
- `StudyRunner`: the current question's `ReportButton` sits beside `ToolButtons`, with `{ questionId, exam, mode }`.
  There is no button on acronym cards.
- `ResultsScreen`: each item in the Review list gets a `ReportButton` with `mode: 'results'`.
- In mock mode, when `result.flagged.length > 0`, a section headed "Questions you flagged" says "You flagged N
  questions for your review. Is anything wrong with them?" and lists each flagged question's number and its
  `ReportButton`. This shows whether or not the question was missed. `ExamRunner` gets no button.

- [ ] **Step 1: Write failing tests**
  - StudyRunner: `'shows Report a problem for the current question with its id'`.
  - ResultsScreen: `'puts a report button on each reviewed item'`; `'lists flagged questions after a mock'`; `'no
    flagged section in practice'`.
  - ExamRunner: `'shows no report button'`.
- [ ] **Step 2: Fail**, **Step 3: implement**, **Step 4: pass** — `npx vitest run src/ui/study src/ui/exam`.
- [ ] **Step 5: Commit** — `git commit -m "feat(report): report buttons on questions and flagged questions after a mock"`

### Task 8: The waiting-reports banner

**Files:**
- Create: `src/ui/report/OutboxBanner.tsx` (tests in `report.test.tsx`)
- Modify: `src/App.tsx`

**Interfaces:**
- `OutboxBanner({ repo }: { repo: Repo })` reads `listOutbox()` on mount, on the window `online` event and when the
  report panel closes. When the outbox is not empty and no mock is running, it shows a `role="status"` banner: "1
  report waiting to send" or "N reports waiting to send", with an "Open" button. The button opens the report panel,
  whose waiting list has Send and Discard for each report. Nothing sends by itself.

- [ ] **Step 1: Failing tests**: count text; hidden during a mock; refreshes on `online`; Discard asks for
  confirmation (`window.confirm`) and removes the report.
- [ ] **Step 2–4: Fail, implement, pass** — `npx vitest run src/ui/report`.
- [ ] **Step 5: Commit** — `git commit -m "feat(report): banner for reports waiting to send"`

### Task 9: End-to-end tests, docs and the final check

**Files:**
- Create: `tests/e2e/report.pwa.spec.ts`. The name matches the `pwa` project, which serves the hosted `dist/` build
  over http. The fixture build runs from `file:`, where reports are off.
- Modify: `README.md` (one paragraph on reporting), `HANDOFF.md`

The spec routes the relay URL from `.env.production` and `https://challenges.cloudflare.com/**`:
- The route serves a stub `api.js` that defines `window.turnstile` and calls `callback('test-token')` on `execute`.
- The relay answers with CORS headers and `{ number: 99, url: 'https://github.com/ngcfells/cert-exam-trainer/issues/99' }`.

- [ ] **Step 1: Write the tests**
  - `'reports a problem from a practice question and keeps the answer'`: start practice, choose an answer, open
    Report a problem, send, see "View issue #99", close, and the answer is still chosen. The posted body has
    `questionId` and `type: 'question'`.
  - `'no Report button while a mock runs, and it is back on the results'`.
  - `'an offline report waits and sends later'`: `context.setOffline(true)`, send, see the saved message and the
    banner. Go back online, Open, Send, see the link.
  - Axe has no serious or critical findings on the open panel.
- [ ] **Step 2: Run** — `npm run build && npx playwright test --project=pwa` — PASS.
- [ ] **Step 3: Full check** — `npm run check` — exit 0, all unit and e2e tests pass.
- [ ] **Step 4: Docs and commit** — update README and HANDOFF (relay URL, token expiry date, labels), then
  `git commit -m "test(report): end-to-end report flows; docs"`.
- [ ] **Step 5:** Opus whole-branch review, fix every finding (minors too), merge, push and `npm run deploy`. Then
  check one real report on the live site with the owner, and close that test issue.
