# Acronyms

Each exam's acronym list lives in its metadata (`src/banks/<exam>/meta.ts`, field `acronyms`). Each entry has a `term`, an `expansion` and a `source`:

- `official`: from the exam objectives PDF (added in chunk 9).
- `community`: written or verified by us. These cover acronyms found in our questions or in public study resources.

A term may appear only once per exam; the schema rejects repeats.

The user's own list (`mine`) is stored locally in the setting `userAcronyms:<exam>`. It is never bundled. The acronym screen suggests terms found in the user's questions that the list does not cover yet.

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
