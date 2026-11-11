# Cert Exam Trainer

An offline practice-exam trainer for CompTIA certifications. CompTIA Data+ (DA0-002) comes first. The app runs from a single `index.html` that you can double-click, and it makes no network requests. The exceptions are in the online app, where a learner can choose to send a report or to check the content.

The online app at <https://ngcfells.github.io/cert-exam-trainer/> is the only official copy. Any other copy says in its footer that it is not official.

## Commands

```sh
npm install
npx playwright install chromium   # once, for e2e tests
npm run dev            # dev server
npm run build          # normal build to dist/
npm run build:single   # one self-contained file at dist-single/index.html
npm run check          # lint, typecheck, unit tests, single build, e2e + axe
```

## Reporting a problem

In the online app, learners can report a bug, a problem with a question, or a feature request from the header, Settings, About, any practice, cram or lesson question, and the results of a mock. There is no button while a mock runs. Each report becomes a GitHub issue on this repo, labelled `from-app` plus `bug`, `bug` + `content`, or `enhancement`. Nobody signs in. The report goes through a small Cloudflare Worker in `relay/`, which checks a Turnstile token and keeps the GitHub token secret (setup in `relay/README.md`). Reports made offline wait on the device until the learner sends them. The build turns reporting on only when `VITE_REPORT_URL` and `VITE_TURNSTILE_SITEKEY` are set (in `.env.production`). The double-click file never sends anything.

The report end-to-end tests stub the relay and Turnstile, so they never send a real issue. `npm run check` builds with a stand-in relay URL (`npm run build:check`) so they always run; to run them alone, `npm run build:check && npx playwright test --project=pwa`. On a build with reports off they skip. `npm run deploy` rebuilds with the real values.

## Content check (hashes)

Every release publishes SHA-512/256 hashes of the shipped content to the `Security` branch, in `content-hashes.json`: one hash for each stock question, each lesson and each exam's details (name, passing score, objectives, acronym list), one per exam, and one release id over all of them. Imported and learner-written questions are not covered. Only the repository owner may change that branch.

In the online app, Settings has a "Check content" button. It hashes the stock content the app holds, fetches the published file and says one of: verified; official but out of date (with an "Update now" button); does not match any official release (with how much differs, and the official address); or could not reach the list. The one-file copy has no such button.

The limit: a person who changes the questions in a copy can also change what that copy's check says, or remove the "not the official copy" line. The check proves the official app is current and intact. It cannot make a copy from elsewhere trustworthy; only using the official address does that.

```sh
npm run hashes             # release id, counts, and what differs from the published file
npm run hashes -- --check  # the same; exits 1 when main's content is not the published release
```

Code: `src/integrity/` (the hash, the published file's shape, the verdict), `scripts/hashes-lib.ts` (reading the bank files, publishing).

## Deploy (GitHub Pages)

`npm run deploy` builds the offline-capable PWA into `dist/` and pushes it to the `gh-pages` branch. No GitHub Actions are used. It refuses to run with uncommitted changes or from a branch other than `main` (`--force` overrides the branch check). `npm run deploy -- --dry-run` does everything except the push.

When the shipped content changed since the last release, deploy first lists the changed, added and removed questions and lessons and asks for a yes (`--yes` answers when nobody can type). It then pushes the new hashes to `Security`, waits until their public address serves them (up to 7 minutes), and only then pushes the site, so a freshly updated app never meets a list that does not know it yet.

One-time setup: in the repo's Settings → Pages, set Source to "Deploy from a branch", branch `gh-pages`, folder `/ (root)`. The site is then at <https://ngcfells.github.io/cert-exam-trainer/>.

## Disclaimer

- This app is not affiliated with or endorsed by CompTIA.
- CompTIA and its exam names are trademarks of CompTIA, Inc.
- All content is original and written from publicly available exam objectives.
- No exam content is included.
- This app is not a guarantee of passing.

## License

Free to use and share, including by businesses and trainers. You may not sell it or charge for access to it.

- Code: MIT with the Commons Clause (see `LICENSE`).
- Bundled original question content: CC BY-NC 4.0 with an extra permission for teaching and internal training (see `CONTENT_LICENSE.md`).
- Versions up to commit `8f4be2d` were released under plain MIT.
