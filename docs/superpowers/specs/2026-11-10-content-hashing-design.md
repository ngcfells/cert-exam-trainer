# Content hashing and the content check (issue #11)

Date: 2026-11-10. Status: approved by the owner in chat ("plan it, write it, and do it").

## Why

A copy of the app could be passed around after someone changed the questions, answers or explanations to teach
wrong things. The owner wants a way to certify that the shipped content is the content the owner released, and a
button a learner can press to check their copy and bring it up to date.

## What the owner decided

- The threat is a maliciously modified copy that is passed around.
- Only what we ship is covered. Imported packs, backups and a learner's own questions are out of scope.
- The online app (`https://ngcfells.github.io/cert-exam-trainer/`) is the only official form. Any one-file copy,
  and the app at any other address, is unofficial.
- The hash is SHA-512/256. The official hashes live on a branch named `Security`, locked down.
- Settings gets a button that checks the content and can update it.

## Goals

1. Every release publishes the hashes of its shipped content to the `Security` branch, automatically, with the
   owner confirming the list of changed items first.
2. A learner can press "Check content" in Settings and get one of: verified, official but out of date (with an
   update button), does not match any official release (with a count of what differs and the official address).
3. A copy that is not running from the official address says so on every page.
4. The owner can check at any time that the content on `main` matches the last published hashes.

## Non-goals

- Imported or user-written content.
- A downloadable official one-file copy, or a page that checks an uploaded file.
- Hashing app code, primer topics or tips. They are code, and a hash of code checked by that same code proves
  nothing.
- Signing (public-key signatures). The trust anchor is the GitHub repository address.

## Anti-goal, and the honest limit

The app must never claim more than it can prove. A person who changes the questions can also change the check
button or remove the "not the official copy" notice. Nothing inside a copy can prevent that. So:

- The check, run in the official app, proves that the official app's content is current and intact.
- The check, run in an unmodified unofficial copy, proves its stock content matches a release, and the notice
  still says the copy is unofficial.
- A deliberately modified copy can lie. The only defence is to use the official address. About says this in
  plain words.

## What is hashed

Per exam, after the same schema parsing the app does on load:

- every bundled question (the whole object: stem, options, answer, explanations, objective ids, search term,
  acronym tags, status), drafts included;
- every lesson of that exam (the whole object);
- the exam's metadata (the whole `ExamMeta`: name, passing score, time, domains, objectives, acronym list).

Canonical form: JSON with object keys sorted by code unit at every depth, arrays in their own order, no
whitespace, properties whose value is `undefined` left out, encoded as UTF-8. No Unicode normalisation.

- item hash = lower-case hex of SHA-512/256 over the canonical form of the item
- exam hash = hash of the canonical form of `{ meta: <hash>, questions: { id: hash }, lessons: { id: hash } }`
- release id = hash of the canonical form of `{ <exam code>: <exam hash> }`

SHA-512/256 is not in the browser's Web Crypto, so the app carries its own implementation (`src/integrity/`),
tested against Node's `sha512-256` and the published test vectors. (Builder's call: 32-bit word pairs, not
BigInt, so 3.5 MB of content hashes quickly on a phone.)

## The published file

`content-hashes.json` at the root of the `Security` branch, beside a short `README.md`:

```json
{
  "format": 1,
  "algorithm": "SHA-512/256",
  "current": {
    "id": "<release id>", "date": "2026-11-10", "commit": "<short sha of main>", "appVersion": "0.1.0",
    "exams": { "DA0-002": { "hash": "…", "meta": "…", "questions": { "da2-1-1-mcq-001": "…" }, "lessons": { "b-outliers-iqr": "…" } } }
  },
  "history": [ { "id": "…", "date": "…", "commit": "…", "appVersion": "…", "exams": { "DA0-002": "<exam hash>" } } ]
}
```

`history` holds earlier releases, newest first, with exam hashes only. When a release changes the content, the
old `current` is cut down to that shape and put at the head of `history`. A release that does not change the
content leaves the file alone.

The app reads it from `https://raw.githubusercontent.com/ngcfells/cert-exam-trainer/Security/content-hashes.json`
(checked 2026-11-10: served with `Access-Control-Allow-Origin: *`, cached for 5 minutes), with a cache-busting
query, `cache: 'no-store'` and a 10 second timeout, and validates it with a zod schema.

## The verdict

1. Compute the local release id. Equal to `current.id`: **verified**.
2. Equal to the id of a `history` entry: **out of date**.
3. Otherwise **does not match**. Against `current`, per exam, count the questions and lessons that are changed,
   missing or extra, and whether the exam details differ.
4. The file cannot be fetched or is not valid: **could not check**, never "verified".

## What the learner sees

A "Check the content" section in Settings (page and panel), in the hosted build only (`__PWA__`). The one-file
build has no check button and no reference to the hashes address, so it still makes no network requests.

- Button: "Check content". While it runs: "Checking…". The result is announced (`role="status"`).
- Verified: "Verified. The stock content matches the current official release (10 Nov 2026)."
- Out of date: "This content is official but out of date." and an "Update now" button. Update asks the service
  worker for the new version and reloads when it takes over. If none is there yet: "No newer version is
  available yet. Try again in a few minutes."
- Does not match: "This content does not match any official release." then the counts, then "Do not rely on
  this copy. Use the official app at <address>."
- Could not check: "Could not reach the official list. Check your connection and try again."

The footer, on every page, in any copy not served from the official address (one-file copy, another site,
localhost): "This is not the official copy of Cert Exam Trainer. The official app is at <address>." (Builder's
call: the footer, because it is already on every page.)

About gains a short "Checking the content" section with the limit above, and the "sends nothing over the
network" sentence now names the check as the second exception (it sends no data; it fetches one public file
from GitHub).

## What the owner gets

- `npm run hashes`: prints the release id, the counts per exam and what differs from the published file.
  `npm run hashes -- --check` exits 1 when `main`'s content differs from the published `current` (the "has
  anyone changed the questions" check).
- `npm run deploy` now: builds; computes the hashes; fetches the published file; if the content changed, lists
  the changed, added and removed ids per exam and asks for confirmation (`--yes` answers for a non-interactive
  run); pushes the new file to `Security`; waits until the raw address serves it (up to 7 minutes, then goes on
  with a warning); then pushes `gh-pages` as before. Hashes go first so a freshly updated app never meets a list
  that does not know it yet. `--dry-run` pushes nothing.
- The `Security` branch is created by the first deploy. It is then locked with a repository ruleset: no
  updates, deletion or force-push except by the repository admin. The repository is on a personal account with
  one collaborator (the owner), so "owner only" is what GitHub offers there; named collaborators would need an
  organisation. VERIFY at build time that the ruleset accepts the admin bypass on a personal repository; if it
  does not, report to the owner and leave the branch unlocked rather than lock the owner out.

## Constraints

- No new runtime dependency.
- The script side reads the bank JSON files from disk and parses them with the same schemas; a unit test proves
  it yields the same hashes as the app's own (glob-loaded) content.
- All existing checks stay green (`npm run check`), including axe and the bounds checks with the new footer line.
- Plain words in every message, as elsewhere in the app.

## Left to the builder

File and function names, the exact layout of the Settings section, test structure, and the wording of the
`Security` branch README.
