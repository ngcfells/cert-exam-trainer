# Acronyms

Each exam's acronym list lives in its metadata (`src/banks/<exam>/meta.ts`, field `acronyms`). Each entry has a `term`, an `expansion` and a `source`:

- `official`: from the exam objectives PDF (added in chunk 9).
- `community`: written or verified by us. These cover acronyms found in our questions or in public study resources.

A term may appear only once per exam; the schema rejects repeats.

The user's own list (`mine`) is stored locally in the setting `userAcronyms:<exam>`. It is never bundled. Terms are stored trimmed and upper-cased, one entry per term. A term the built-in list already has is refused. Deleting a term keeps its review history, so adding it again picks up its old schedule. The acronym screen suggests terms found in the user's questions that the list does not cover yet.

## Content check

`src/acronyms/content.test.ts` runs with `npm run test`, and therefore with `npm run check`. For every registered exam it fails if:

- any token found in a bundled question (stem, explanation, part explanations, or any string in the payload) has no entry, or
- any term in a question's `acronyms` tag has no entry.

The failure lists the missing terms.

## Token rule

`extractAcronyms` (in `src/acronyms/extract.ts`) counts a word as a token when it:

- is 2–8 characters long, made of `A–Z` and `0–9`, and starts with a letter
- has at least two capital letters

A trailing lower-case `s` is treated as a plural and dropped, so `APIs` counts as `API`.

Mixed-case terms such as `IPv4` are not picked up automatically, but they can be listed by hand.

## Fixing a failing check

- **The token is a real acronym:** add a `community` entry with an expansion we have written or verified.
- **The token is not an acronym:** add it to `NOT_ACRONYMS` in `src/acronyms/extract.ts`. Examples are a SQL keyword, a log level, or a word in capitals for emphasis.

## Harvester (dev-only)

Two scripts find acronyms that the exam list is missing. Neither ships in the app, and neither edits the bank.

1. `npm run harvest-acronyms -- --sources <file.json> [--out <report.json>] [--no-dumps] [--delay-ms 5000]`
   - The sources file is `{ "exam": "DA0-002", "sources": [{ "id", "url", "kind": "study" | "discussion" | "dump" }] }`. See `docs/sources/harvest-sources.example.json`.
   - Dump sources are included by default (owner decision); `--no-dumps` skips them.
   - It fetches one page at a time, waits at least 5 seconds (or the Crawl-delay in robots.txt) between requests to a site, obeys robots.txt, and skips a site whose robots.txt cannot be read.
   - Page text is discarded as soon as its tokens are counted. The report (default `_WorkingData/harvest-<exam>.json`) holds terms, counts and source ids only.
2. `npm run expand-acronyms -- --report <harvest.json> [--out <file.json>] [--model qwen3.6:27b] [--min-count 1]`
   - Asks the local Ollama model for each missing term's expansion. It marks a term `flag` when it is off-topic (cert codes, vendors, site names) or unsure.
   - A local check flags any expansion whose initials cannot spell the term.
3. A person (or Claude) reviews the `ok` rows and adds the sensible, on-topic ones to the exam `meta.ts` as `community`. Doubtful terms are listed in HANDOFF.

Results:

- CY0-001 (2026-10-31): 17 sources (11 study, 6 dump; ISO skipped by robots.txt), 396 unlisted terms. Ollama marked 45 `ok` and 351 `flag`. Kept 6 as `community`: BC, CBA, CIS, CUI, DMCA, SSL. Most of the rest were cert or exam codes, vendor and product names, plain words and page text.

Keep real source lists and reports in `_WorkingData/` (gitignored). Never commit them.
