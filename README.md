# Cert Exam Trainer

An offline practice-exam trainer for CompTIA certifications. CompTIA Data+ (DA0-002) comes first. The app runs from a single `index.html` that you can double-click, and it makes no network requests.

## Commands

```sh
npm install
npx playwright install chromium   # once, for e2e tests
npm run dev            # dev server
npm run build          # normal build to dist/
npm run build:single   # one self-contained file at dist-single/index.html
npm run check          # lint, typecheck, unit tests, single build, e2e + axe
```

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
