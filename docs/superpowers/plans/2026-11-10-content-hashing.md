# Content Hashing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish SHA-512/256 hashes of the shipped content to a locked `Security` branch at deploy time, and let a learner check and update their content from Settings.

**Architecture:** A pure `src/integrity/` module (hash, canonical form, manifest schema, verdict) shared by the app and the Node scripts. The scripts read the bank JSON from disk; the app hashes what it loaded. Deploy publishes `content-hashes.json` to `Security` before `gh-pages`. The hosted build fetches that file from raw.githubusercontent.com on request.

**Tech Stack:** TypeScript, React 18, zod, Vitest, Playwright, vite-node scripts, git worktrees for publishing. No new dependency.

**Spec:** `docs/superpowers/specs/2026-11-10-content-hashing-design.md`

## Global Constraints

- No new runtime dependency.
- Hash: SHA-512/256, lower-case hex. Canonical form: keys sorted by code unit at every depth, arrays in order, no whitespace, `undefined` properties left out, UTF-8, no Unicode normalisation.
- Official address: `ONLINE_APP_URL` in `src/ui/legal.ts` (`https://ngcfells.github.io/cert-exam-trainer/`).
- Hashes address: `https://raw.githubusercontent.com/ngcfells/cert-exam-trainer/Security/content-hashes.json`.
- The one-file build (`SINGLE=1`) has no check button and must not contain the hashes address.
- A failed or invalid fetch is "could not check", never "verified".
- Messages use the exact wording in the spec's "What the learner sees".
- `npm run check` stays green.

## Review Focus

1. A published file that is valid JSON but the wrong shape (or `format: 2`): the app says "could not check".
2. A question whose text has non-ASCII characters (×, ε, curly quotes) or astral characters: app and script hashes agree.
3. Local content has an exam the published file lacks, or the reverse: the verdict is "does not match" with that exam listed, no crash.
4. "Update now" when no service worker is registered or no newer version exists: the "No newer version" message, no reload loop.
5. Deploy when the `Security` branch does not exist yet (first release) and when the content did not change (no push to `Security`).

---

### Task 1: SHA-512/256

**Files:** Create `src/integrity/sha512_256.ts`, `src/integrity/sha512_256.test.ts`

**Interfaces:** Produces `sha512_256(bytes: Uint8Array): string` (64 hex chars) and `hashText(text: string): string` (UTF-8 encodes, then hashes).

- [ ] Test: `sha512_256(utf8(''))` is `c672b8d1ef56ed28ab87c3622c5114069bdd3ad7b8f9737498d0c01ecef0967a`; `'abc'` is `53048e2681941ef99b2e29b76b4c7dabe4c2d0c634fc6d46e0e2f13107e7af23`; for lengths 0 to 300 and 5 random buffers up to 100 kB, the result equals `createHash('sha512-256')` from `node:crypto`; `hashText('ε × “q” 😀')` equals Node's hash of the same UTF-8 bytes.
- [ ] Run, see it fail; implement with 32-bit high/low word pairs (`Uint32Array`), FIPS 180-4 initial values for SHA-512/256, output truncated to 256 bits; run, see it pass; commit.

### Task 2: Canonical form, content hashes, manifest and verdict

**Files:** Create `src/integrity/hashes.ts`, `src/integrity/manifest.ts`, and a test for each.

**Interfaces:**
- `canonical(value: unknown): string`
- `interface ExamContent { meta: ExamMeta; questions: Question[]; lessons: Lesson[] }`
- `interface ExamHashes { hash: string; meta: string; questions: Record<string, string>; lessons: Record<string, string> }`
- `hashExam(c: ExamContent): ExamHashes`, `hashRelease(exams: Record<string, ExamHashes>): string` (the release id)
- `manifestSchema` (zod, `format: z.literal(1)`, `algorithm: z.literal('SHA-512/256')`), `type Manifest`, `type Release = Manifest['current']`
- `interface ExamDiff { exam: string; changed: string[]; missing: string[]; extra: string[]; metaDiffers: boolean; lessonsChanged: string[]; lessonsMissing: string[]; lessonsExtra: string[] }` (`missing`: published but not local; `extra`: local but not published; an exam absent on one side lists every id)
- `diffExams(local: Record<string, ExamHashes>, published: Record<string, ExamHashes>): ExamDiff[]` (only exams that differ)
- `type Verdict = { kind: 'verified'; release: Release } | { kind: 'outdated'; current: Release } | { kind: 'mismatch'; diffs: ExamDiff[] }`
- `verdict(local: Record<string, ExamHashes>, manifest: Manifest): Verdict`
- `nextManifest(prev: Manifest | null, local: Record<string, ExamHashes>, info: { date: string; commit: string; appVersion: string }): Manifest | null` (null when `prev.current.id` already equals the local id; otherwise the old `current`, cut to exam hashes, goes to the head of `history`)

- [ ] Tests: `canonical({ b: 1, a: [2, { d: undefined, c: 'x' }] })` is `{"a":[2,{"c":"x"}],"b":1}`; key order of the input never changes a hash; changing one option's text changes that question's hash, the exam hash and the release id, and nothing else; `verdict` gives each of the three kinds (current, a history id, neither); Review Focus 3 (exam on one side only); `manifestSchema` rejects `format: 2` and a missing `current`; `nextManifest` returns null on no change, builds a first manifest from null, and moves the old release into `history` newest first.
- [ ] Run, fail, implement, pass, commit.

### Task 3: The app's content and the disk reader agree

**Files:** Create `src/integrity/local.ts`, `scripts/hashes-lib.ts`, `scripts/hashes-lib.test.ts`

**Interfaces:**
- `localHashes(): Record<string, ExamHashes>` in `local.ts`: for each `listExams()` entry, `getBundledQuestions(code, { includeDrafts: true })` and `getLessons(code)`.
- `readShippedContent(root: string): Record<string, ExamContent>` in `hashes-lib.ts`: for each `EXAM_METAS` entry, `parseExamMeta`, every `src/banks/<BANKS[code].dir>/items/*.json` through `parseQuestion`, and every `src/banks/*/lessons/*.json` through `lessonSchema.parse`, grouped by the lesson's `exam`.
- `shippedHashes(root: string): Record<string, ExamHashes>`.

- [ ] Test (`hashes-lib.test.ts`): for each exam, `hashExam` over the glob-loaded items (`dataPlusItems`, `secAiItems`, `autoOpsItems`), `shippedLessons` and the meta equals `shippedHashes(process.cwd())[code]`; the question count per exam equals the item array length; `localHashes()` (fixture bank under test) returns one entry per `listExams()` code.
- [ ] Run, fail, implement, pass, commit.

### Task 4: `npm run hashes` and the deploy step

**Files:** Create `scripts/hashes.ts`; modify `scripts/hashes-lib.ts`, `scripts/hashes-lib.test.ts`, `scripts/deploy.ts`, `scripts/deploy-lib.ts`, `scripts/deploy-lib.test.ts`, `package.json` (`"hashes": "vite-node scripts/hashes.ts --"`)

**Interfaces:**
- `HASHES_BRANCH = 'Security'`, `HASHES_FILE = 'content-hashes.json'` and `HASHES_URL` in `src/integrity/manifest.ts`.
- `readPublished(run: Run, cwd: string, remote: string): Manifest | null` (fetches `Security`, `git show`; null when the branch is missing).
- `describeChanges(diffs: ExamDiff[]): string[]` (one line per exam with counts, then the ids, at most 20 per group and "and N more").
- `publishHashes(opts: { cwd: string; remote: string; manifest: Manifest; commit: string; dryRun: boolean; run?: Run }): { commit: string | null; pushed: boolean }` (temporary worktree as in `deploy`, orphan branch when `Security` is missing, writes the file and `README.md`, commit message `hashes: <commit>`).
- `waitForPublished(id: string, opts?: { fetchFn?: typeof fetch; sleep?: (ms: number) => Promise<void>; timeoutMs?: number; everyMs?: number }): Promise<boolean>` (defaults 7 minutes, every 15 seconds; cache-busting query).
- `scripts/hashes.ts`: prints the release id and per-exam counts, then the changes against the published file; `--check` exits 1 when they differ or nothing is published.
- `scripts/deploy.ts` order: build, `shippedHashes`, `readPublished`, `nextManifest`; when not null: print `describeChanges`, confirm (`--yes`, or a y/N prompt on a TTY; refuse without either), `publishHashes`, `waitForPublished` (warn and go on when false); then `deploy` as before. `--dry-run` skips the confirmation and pushes nothing.

- [ ] Tests, in a temporary git repo with a bare remote as `deploy-lib.test.ts` already does: `publishHashes` creates `Security` with the file and README; a second publish adds one commit and keeps history; `dryRun` pushes nothing; `readPublished` returns null before the first publish and the manifest after (Review Focus 5); `waitForPublished` resolves true when a fake fetch returns the id on the third try and false at the timeout; `describeChanges` caps a list of 25 ids at 20 "and 5 more".
- [ ] Run, fail, implement, pass. Run `npm run hashes` by hand: it prints three exams and "nothing published yet". Commit.

### Task 5: The content check in the app

**Files:** Create `src/integrity/check.ts`, `src/integrity/check.test.ts`, `src/integrity/official.ts`, `src/integrity/official.test.ts`, `src/ui/ContentCheck.tsx`, `src/ui/ContentCheck.test.tsx`, `tests/e2e/contentCheck.pwa.spec.ts`; modify `src/ui/SettingsForm.tsx`, `src/ui/Disclaimer.tsx`, `src/ui/About.tsx`, `src/index.css`, `src/content/pwa-build.test.ts`

**Interfaces:**
- `isOfficial(href?: string, pwa?: boolean): boolean` (defaults `location.href`, `__PWA__`): true only for a PWA build whose address starts with `ONLINE_APP_URL`.
- `type CheckResult = Verdict | { kind: 'error' }`
- `checkContent(deps?: { fetchFn?: typeof fetch; local?: () => Record<string, ExamHashes>; timeoutMs?: number }): Promise<CheckResult>` (10 second timeout, `cache: 'no-store'`, `?t=<now>`, zod-validated; any failure is `{ kind: 'error' }`).
- `updateApp(sw?: Pick<ServiceWorkerContainer, 'getRegistration' | 'addEventListener'>, reload?: () => void): Promise<'reloading' | 'none'>` (`registration.update()`; `'none'` when there is no registration or nothing installing or waiting; otherwise reload on `controllerchange`).
- `<ContentCheck enabled? check? update? />` (defaults `__PWA__`, `checkContent`, `updateApp`); renders nothing when not enabled. Heading "Check the content", button "Check content".
- `Disclaimer({ official = isOfficial() })`: adds the unofficial line with a link to `ONLINE_APP_URL` when false.

- [ ] Unit tests: `isOfficial` true for the official address with `pwa` true; false for `file:///x/index.html`, `http://localhost:4173/cert-exam-trainer/`, `https://evil.example/cert-exam-trainer/`, and the official address with `pwa` false. `checkContent`: verified, outdated, mismatch; fetch rejects, HTTP 404, wrong-shape JSON, `format: 2` and a timeout all give `error` (Review Focus 1). `updateApp`: no registration and no waiting worker give `'none'` and never call `reload` (Review Focus 4). `ContentCheck`: each of the four results shows the spec's exact sentence in a `role="status"` region; the mismatch text has the counts and the official link; "Update now" shows only for outdated and shows "No newer version is available yet. Try again in a few minutes." on `'none'`; nothing renders with `enabled={false}`. `Disclaimer`: the line shows only when `official` is false. `pwa-build.test.ts`: `dist-single/index.html` does not contain `raw.githubusercontent.com`; a `dist/assets` script does.
- [ ] e2e (`pwa` project, `page.route` on the hashes address): a fixture reply whose `current.id` cannot match shows "does not match any official release" and passes axe; an aborted route shows "Could not reach the official list"; the footer shows the unofficial line on localhost.
- [ ] Run, fail, implement (gate the import so the one-file build drops the address: `__PWA__ ? <ContentCheck /> : null` with the address referenced only inside `check.ts`), pass, commit.

### Task 6: Documents and release

**Files:** Modify `README.md` (a "Content check" section: what is hashed, the two commands, the limit), `HANDOFF.md`

- [ ] `npm run check` green.
- [ ] One whole-branch review on the most capable model; fix every finding, minors too; `npm run check` again.
- [ ] Merge to `main`, push, `npm run deploy -- --yes` (first release: creates `Security`).
- [ ] Create the ruleset on `Security` (no update, deletion or force-push; admin bypass). Confirm the owner can still push from the ruleset read-back (`current_user_can_bypass` is `always`). If the bypass is refused, remove the ruleset, soften the "only the owner may change this branch" lines in both READMEs, and report.
- [ ] Check the live app: Settings, "Check content" says verified.
- [ ] Comment on #11 and close it; update `HANDOFF.md`.
