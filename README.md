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

## Disclaimer

- This app is not affiliated with or endorsed by CompTIA.
- CompTIA and its exam names are trademarks of CompTIA, Inc.
- All content is original and written from publicly available exam objectives. No exam content is included.
- This app is not a guarantee of passing.

## License

- Code: MIT (see `LICENSE`).
- Bundled original question content: CC BY-NC 4.0 (see `CONTENT_LICENSE.md`).
