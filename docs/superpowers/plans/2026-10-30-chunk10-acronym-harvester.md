# Chunk 10: Acronym Harvester Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A dev-only CLI, `npm run harvest-acronyms`, that fetches public pages about an exam code, keeps only acronym tokens, and reports which tokens the exam's acronym list is missing, so we can write expansions by hand.

**Architecture:** Pure logic in `src/acronyms/harvest.ts` (source config schema, robots.txt rules, HTML-to-text, token tally, report) is unit-tested with no network. `scripts/harvest-acronyms.ts` is a thin shell: reads the sources file, does polite sequential fetches through an injectable `fetch`, and writes a JSON report. Page text lives only inside one function call and is never written, logged or returned.

**Tech Stack:** TypeScript, Zod, Vitest, vite-node, Node 20 global `fetch`.

**Spec:** `docs/superpowers/specs/2026-10-30-comptia-exam-trainer-design.md` §8 items 4–5, §13 item 10.

## Global Constraints

- "The harvester extracts **only acronym tokens**, discards the question text right away and stores nothing else. It runs at a slow, polite rate and respects robots.txt."
- **Owner override (2026-10-30):** dump sources are **on by default**; `--no-dumps` turns them off. (Spec said off by default; the owner overrode it.)
- **Owner override:** expansions are drafted by local Ollama (`qwen3.6:27b`, `http://localhost:11434/api/chat`, as in `scripts/draft-ollama.ts`), then checked by Claude. Sensible ones (e.g. SQL → Structured Query Language) are written into `meta.ts` as `community`; doubtful ones are flagged in the report and in the handoff, not shipped.
- Use local Ollama for as much of the bulk work as possible; scraping is done by the scripts, never by hand.
- Never ingest dump questions; nothing harvested is bundled, committed or put in fixtures. Reports go to `_WorkingData/` (gitignored) by default.
- Dev-only: nothing from this chunk is imported by `src/main.tsx` or ships in `dist/` / `dist-single/`.
- No GitHub Actions. Accessibility rules unaffected (no UI).
- Tooling: write files with Write/Edit, not Bash heredocs containing apostrophes; no multi-line `node -e`.

## Review Focus

1. `--no-dumps` given → `dump` sources skipped and reported as skipped; default includes them (Task 1 test `includes dump sources unless turned off`).
2. robots.txt disallows the path, or robots.txt returns 404/500/network error → disallowed path is skipped; 404 means allowed; 5xx or network error means skip that host (conservative) (Task 1 robots tests, Task 2 test `skips host when robots.txt fails`).
3. A page that errors, times out, returns non-HTML or is huge → recorded as a failed source, run continues; bodies over 2 MB are cut off (Task 2 test `records a failed page and continues`).
4. Report must contain no page text: only terms, counts and source ids (Task 1 test `report holds tokens only`).
5. Tokens already known for the exam (official, community) and `NOT_ACRONYMS` words are not reported as missing; known ones are listed separately with counts so the owner can see coverage (Task 1 test `splits missing from known`).

---

### Task 1: Harvest core (`src/acronyms/harvest.ts`)

**Files:**
- Create: `src/acronyms/harvest.ts`
- Test: `src/acronyms/harvest.test.ts`

**Interfaces:**
- Consumes: `extractAcronyms(text): string[]` from `src/acronyms/extract.ts`.
- Produces:
  - `sourceSchema` (Zod): `{ id: string (min 1), url: string (http/https URL), kind: 'study' | 'discussion' | 'dump' }`; `sourcesFileSchema = z.object({ exam: z.string(), sources: z.array(sourceSchema) })` with unique ids. `type HarvestSource`.
  - `selectSources(sources, includeDumps: boolean): { use: HarvestSource[]; skipped: { id: string; reason: 'dump-off' }[] }`
  - `parseRobots(txt: string): RobotsRules` and `isAllowed(rules: RobotsRules, path: string): boolean`. Rules for user-agent `*` and `cert-exam-trainer` (specific group wins over `*`); `Allow`/`Disallow` by longest matching prefix, `Allow` wins ties; empty `Disallow:` allows all; `*` and `$` in paths supported. Also exposes `crawlDelay(rules): number | undefined` (seconds).
  - `htmlToText(html: string): string` — drops `<script>`, `<style>`, `<noscript>` with contents, strips tags, decodes `&amp; &lt; &gt; &quot; &#39; &nbsp;` and numeric entities.
  - `tallyTokens(html: string): Map<string, number>` — `extractAcronyms` per line of `htmlToText`, counts pages-lines containing the term. Text is a local only.
  - `buildReport(input: { exam: string; known: ReadonlySet<string>; perSource: { id: string; tokens: Map<string, number> }[]; skipped: {id: string; reason: string}[]; failed: {id: string; reason: string}[]; at: string }): HarvestReport`
  - `HarvestReport = { format: 'cert-exam-trainer-acronym-harvest'; version: 1; exam; harvestedAt; missing: TermRow[]; known: TermRow[]; skipped; failed }`, `TermRow = { term: string; count: number; sources: string[] }`, rows sorted by count desc then term.

- [ ] **Step 1: Write failing tests** in `harvest.test.ts`:
  - `rejects a sources file with a repeated id or a non-http url`.
  - `includes dump sources unless turned off`: with `includeDumps=false`, a `dump` source lands in `skipped` with reason `dump-off`; with `true`, it is in `use`.
  - `robots: disallow prefix, allow override, empty disallow, wildcard and $`: e.g. `Disallow: /forum/` blocks `/forum/x`; `Allow: /forum/public` allows `/forum/public/1`; `Disallow: /*.pdf$` blocks `/a.pdf` not `/a.pdf?x`; specific `User-agent: cert-exam-trainer` group overrides `*`; `Crawl-delay: 10` → 10.
  - `htmlToText drops script and style and decodes entities`: `<p>ETL &amp; ELT</p><script>var API=1</script>` → contains `ETL & ELT`, not `API`.
  - `tallyTokens counts acronyms and ignores NOT_ACRONYMS`: `<p>Use SQL SELECT</p><p>SQL and KPI</p>` → `{SQL:2, KPI:1}`, no `SELECT`.
  - `splits missing from known`: known `{SQL}`; tokens SQL, KPI → `missing=[KPI]`, `known=[SQL]`, sources merged across ids.
  - `report holds tokens only`: build a report from a page whose text includes the sentence `Which tool loads the warehouse nightly?`; `JSON.stringify(report)` does not contain `warehouse` or `nightly`.
- [ ] **Step 2: Run** `npx vitest run src/acronyms/harvest.test.ts` → FAIL (module missing).
- [ ] **Step 3: Implement** the interfaces above. Regex-based tag stripping is fine (no HTML parser dependency).
- [ ] **Step 4: Run** the same command → PASS.
- [ ] **Step 5: Commit** `feat: acronym harvest core (robots, html to tokens, report)`.

### Task 2: Polite fetch runner (`scripts/harvest-lib.ts`)

**Files:**
- Create: `scripts/harvest-lib.ts`
- Test: `scripts/harvest-lib.test.ts`

**Interfaces:**
- Consumes: everything from Task 1.
- Produces: `runHarvest(opts: { sources: HarvestSource[]; fetch: typeof fetch; sleep: (ms: number) => Promise<void>; delayMs?: number /* default 5000 */; timeoutMs?: number /* default 20000 */; log?: (msg: string) => void }): Promise<{ perSource; skipped; failed }>` (shapes as `buildReport` input).

Behaviour: sequential, one request at a time. robots.txt fetched once per origin and cached; wait = max(`delayMs`, crawl-delay × 1000) between any two requests to the same origin (robots fetch counts). User-Agent header `cert-exam-trainer-acronym-harvester (+https://github.com/ngcfells/cert-exam-trainer)`. robots 404/410 → allow all; other non-2xx or throw → every source on that origin fails with reason `robots unavailable`. Disallowed → skipped, reason `robots`. Page: non-2xx, non-`text/html`, abort by timeout or throw → failed with a short reason (status or error name, never body). Read at most 2 MB of body. `log` prints only ids, statuses and token counts.

- [ ] **Step 1: Write failing tests** with a fake `fetch` (Map of url → Response) and a recording `sleep`:
  - `respects robots and records skips`.
  - `skips host when robots.txt fails` (500 → all that host's sources failed; 404 → fetched).
  - `waits between requests to one origin, honouring crawl-delay` (sleep called with ≥ 5000, and 10000 when `Crawl-delay: 10`).
  - `records a failed page and continues` (one 503, one `application/pdf`, one OK → two failed, one tallied).
  - `sends the harvester user agent`.
- [ ] **Step 2: Run** `npx vitest run scripts/harvest-lib.test.ts` → FAIL. Confirm vitest config includes `scripts/**/*.test.ts` (deploy-lib.test.ts already lives there).
- [ ] **Step 3: Implement `runHarvest`.**
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: polite sequential harvest runner`.

### Task 3: CLI, sample sources, docs

**Files:**
- Create: `scripts/harvest-acronyms.ts`, `docs/sources/harvest-sources.example.json`
- Modify: `package.json` (script `"harvest-acronyms": "vite-node scripts/harvest-acronyms.ts --"`), `docs/acronyms.md` (new "Harvester" section), `HANDOFF.md`
- Test: `scripts/harvest-lib.test.ts` (arg parsing)

**Interfaces:**
- Consumes: Tasks 1–2; `listExams()` from `src/banks` to get the exam's `acronyms` (known set = all terms of that exam's built-in list).
- Produces: `parseHarvestArgs(argv: string[]): { sources: string; out: string; includeDumps: boolean; delayMs: number }` in `harvest-lib.ts`. Usage: `npm run harvest-acronyms -- --sources <file.json> [--out _WorkingData/harvest-<exam>.json] [--no-dumps] [--delay-ms 5000]`. `--delay-ms` below 2000 is an error. Unknown exam code in the file → error naming it.

- [ ] **Step 1: Failing tests** `parseHarvestArgs`: defaults (`includeDumps` true, `--no-dumps` → false, delay 5000, out `_WorkingData/harvest-<exam>.json` resolved later from exam so the default is `''` here), `--delay-ms 500` throws, missing `--sources` throws, unknown flag throws.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** parser and the CLI (read + validate file, `selectSources`, `runHarvest` with real `fetch` and `setTimeout` sleep, `buildReport`, write JSON, print missing terms one per line with counts). Example sources file: two `study` entries (Professor Messer-style acronym list page placeholder URL on `example.com`), one `dump` entry on `example.com` showing that it is off by default — no real dump-site URLs committed.
- [ ] **Step 4:** Run `npx vitest run scripts` → PASS; then `npm run harvest-acronyms -- --sources docs/sources/harvest-sources.example.json --out <scratch>/r.json` runs end to end (example.com pages fetch fine, dump entry reported skipped, no crash).
- [ ] **Step 5:** `docs/acronyms.md`: how to run harvest and expand, that dump sources are on by default (`--no-dumps` to skip) and real source lists stay in `_WorkingData/`.
- [ ] **Step 6: Commit** `feat: harvest-acronyms CLI and docs`.

### Task 4: Ollama expander (`scripts/expand-acronyms.ts`)

**Files:**
- Create: `scripts/expand-lib.ts`, `scripts/expand-acronyms.ts`
- Test: `scripts/expand-lib.test.ts`
- Modify: `package.json` (`"expand-acronyms": "vite-node scripts/expand-acronyms.ts --"`)

**Interfaces:**
- Consumes: `HarvestReport` (Task 1).
- Produces:
  - `expansionSchema` (Zod): `{ term: string; expansion: string; verdict: 'ok' | 'flag'; reason: string }`.
  - `expandTerms(opts: { terms: string[]; exam: string; examTitle: string; chat: (prompt: string) => Promise<string>; batch?: number /* 25 */ }): Promise<Expansion[]>` — batches terms; prompt asks for the standard expansion in the exam's field, `verdict: 'flag'` when the term is not a real acronym, is ambiguous, or the model is unsure; JSON output (`format: 'json'`, `think: false`, temperature 0.2). Rows the model drops or returns invalid come back as `flag` with reason `no answer`.
  - `checkExpansion(term, expansion): string | null` — local sanity check, returns a flag reason or null: initials of the expansion's significant words must be able to spell the term in order (skip `of/and/the/for/to/in/a/&`, allow a word to contribute its first 1–2 letters, digits must appear literally). Failures turn `ok` into `flag`.
  - `ollamaChat(model = 'qwen3.6:27b'): (prompt) => Promise<string>` — streamed, as in `draft-ollama.ts`.
  - CLI: `npm run expand-acronyms -- --report <harvest.json> [--out _WorkingData/expand-<exam>.json] [--model qwen3.6:27b]`.

- [ ] **Step 1: Failing tests** with a fake `chat`: `SQL → Structured Query Language passes checkExpansion`; `KPI → Key Performance Indicator passes`; `JSON → JavaScript Object Notation passes` (two letters from one word); `SQL → Data Warehouse is flagged`; `term dropped by the model is flagged "no answer"`; `invalid JSON from the model flags the whole batch, does not throw`; `batches of 25`.
- [ ] **Step 2: Run** `npx vitest run scripts/expand-lib.test.ts` → FAIL. **Step 3: Implement.** **Step 4:** → PASS.
- [ ] **Step 5: Commit** `feat: ollama acronym expander with initials check`.

### Task 5: Run it on Data+ and ship the results

- [ ] **Step 1:** Write `_WorkingData/DataPlus/harvest-sources.json` (gitignored): public non-login pages about DA0-002 — study resources (e.g. Professor Messer acronym pages, CompTIA's own pages), discussion pages (Reddit threads, forums), and dump sites, found by web search. 10–30 sources.
- [ ] **Step 2:** `npm run harvest-acronyms -- --sources _WorkingData/DataPlus/harvest-sources.json` (runs in the background; slow on purpose). Then `npm run expand-acronyms -- --report _WorkingData/harvest-DA0-002.json`.
- [ ] **Step 3:** Claude reviews every row. Data-field terms with a correct, standard expansion are added to `src/banks/dataplus/meta.ts` as `community` (and any `NOT_ACRONYMS` words found are added to `extract.ts`). Off-topic noise (site names, page chrome) is dropped. Doubtful rows are listed in HANDOFF under "Flagged acronyms" with the reason.
- [ ] **Step 4:** Update the `meta.test.ts` counts; `npm run check` passes. Confirm `dist-single/index.html` does not contain `acronym-harvest`. HANDOFF: chunk 10 summary, flagged list, next = chunk 11 (SecAI+ content).
- [ ] **Step 5: Commit** `content: Data+ community acronyms from harvest`.

### Task 6: Final review

- [ ] Dispatch one whole-branch reviewer (Opus). Fix every finding, minors included; rerun `npm run check`; merge to `main`; update HANDOFF.
