# Cert Exam Trainer

An offline practice-exam trainer for CompTIA certifications. CompTIA Data+ (DA0-002) comes first. The app runs from a single `index.html` that you can double-click, and it makes no network requests. The one exception is the online app, where a learner can choose to send a report.

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

## Deploy (GitHub Pages)

`npm run deploy` builds the offline-capable PWA into `dist/` and pushes it to the `gh-pages` branch. No GitHub Actions are used. It refuses to run with uncommitted changes or from a branch other than `main` (`--force` overrides the branch check). `npm run deploy -- --dry-run` does everything except the push.

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
