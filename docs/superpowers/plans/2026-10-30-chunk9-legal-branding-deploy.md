# Chunk 9: Legal, Branding and Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Relicense the code as noncommercial, add the About page, give the app a real themed stylesheet that works on phones and tablets, make the hosted build an offline PWA, and add a local deploy script for GitHub Pages.

**Architecture:** Legal text lives in one module (`src/ui/legal.ts`) used by the footer, the About screen and a README sync test. Theme and reduced motion are repo settings applied as `data-theme` / `data-motion` on `<html>`, and all colours are CSS custom properties. The PWA (vite-plugin-pwa, `generateSW`) is added only to the normal `dist/` build; the single-file build never contains service-worker code. `scripts/deploy.ts` builds `dist/` and pushes it to a `gh-pages` branch through a temporary git worktree.

**Tech Stack:** React 18 + TypeScript + Vite 6, vite-plugin-pwa 1.x/2.x (whichever supports Vite 6), Vitest, Playwright + @axe-core/playwright.

**Spec:** `docs/superpowers/specs/2026-10-30-comptia-exam-trainer-design.md` (§4, §10, §10a, §11, §13 item 9)

## Owner decisions (2026-10-30, this session)

- App name stays **Cert Exam Trainer**.
- Deploy goes to a **`gh-pages` branch**; `main` stays source-only.
- Licensing goal: anyone, businesses included, may use and share the app for free (for example, a corporate trainer giving students access), but nobody may sell it or charge for access.
  - Code: **MIT + Commons Clause** (Commons Clause License Condition v1.0, Licensor: ngcfells).
  - Content: **CC BY-NC 4.0 plus an additional permission** (exact text in Task 1) allowing organisations, including businesses, to use it for teaching and internal training at no charge to learners.
  - Copies taken under plain MIT before the switch keep MIT; the README says the license changed and from which commit.

## Global Constraints

- No GitHub Actions workflows and no Git LFS. Build locally; Pages serves the `gh-pages` branch.
- The single `index.html` runs from `file://` with no server and no network requests; it must contain no external `src`/`href` URLs and no service-worker registration.
- No CompTIA or Pearson logos, names in branding or copied assets. Icons are our own SVG.
- WCAG 2.2 AA: axe shows no serious or critical violations, in light and dark themes; visible focus; a reduced-motion option; touch targets at least 2.75rem (44px).
- Disclaimer (spec §11), shown in the app and README, exactly these five points: not affiliated with or endorsed by CompTIA; CompTIA and its exam names are trademarks of CompTIA, Inc.; content is original and written from publicly available exam objectives; no exam content is included; not a guarantee of passing.
- Bash heredocs containing an apostrophe are blocked by a local hook; write files with Write/Edit. Multi-line `node -e` fails silently; use script files.

## Review Focus

1. **Stale service worker after a deploy:** a returning PWA user must get the new build on next load, not a mix of old and new chunks. `registerType: 'autoUpdate'` plus a test that the generated `sw.js` precaches `index.html` and every hashed asset (Task 5).
2. **Pages subpath:** the site is served at `/cert-exam-trainer/`, not `/`. Manifest `start_url`/`scope` and SW scope must be relative (`./`). Test: manifest values (Task 5) and the PWA e2e serves `dist/` under a subpath (Task 5).
3. **Dirty or wrong-branch deploy:** deploying uncommitted work would publish code that is not in `main`. The script refuses a dirty tree or a branch other than `main` unless `--force` (Task 6 tests).
4. **Narrow screens:** PBQ tables, terminal output, diagrams and the review grid must not force horizontal page scroll at 360px wide. Test: no document overflow per PBQ type at phone size (Task 4).
5. **Dark theme contrast in exam and PBQ views:** colours added in Task 3 must pass axe in dark mode on every PBQ type, not only Home (Task 4 runs axe in both schemes).

---

### Task 1: Relicense: MIT + Commons Clause, content extra permission

**Files:**
- Modify: `LICENSE`: the official Commons Clause License Condition v1.0 text (from `https://commonsclause.com/`) at the top with `Software: Cert Exam Trainer`, `License: MIT`, `Licensor: ngcfells`, followed by the existing MIT text with `Copyright (c) 2026 ngcfells`.
- Modify: `CONTENT_LICENSE.md`: add an "Additional permission" section with exactly: "As an additional permission under section 2(a) of CC BY-NC 4.0, organisations, including businesses, may use, copy and share the bundled questions and the app for teaching and internal training, provided that nobody is charged for access to the app or its questions. Selling the questions or the app, or charging for access to them, remains prohibited."
- Modify: `package.json` (`"license": "SEE LICENSE IN LICENSE"`)
- Modify: `README.md` License section; spec §11 "Code:" and "Bundled original question content:" lines
- Test: `src/content/legal-files.test.ts`

- [ ] **Step 1: Write the failing test** `legal-files.test.ts`:
  - `LICENSE` contains `Commons Clause` License Condition v1.0, `Licensor: ngcfells`, `MIT License` and `Copyright (c) 2026 ngcfells`.
  - `package.json` `license === 'SEE LICENSE IN LICENSE'`.
  - `CONTENT_LICENSE.md` contains `CC BY-NC 4.0` and `including businesses, may use`.
- [ ] **Step 2: Run** `npx vitest run src/content/legal-files.test.ts`. Expected: FAIL on LICENSE.
- [ ] **Step 3: Replace files.** README License section, in plain words: "Free to use and share, including by businesses and trainers. You may not sell it or charge for access to it. Code: MIT with the Commons Clause (see `LICENSE`). Questions: CC BY-NC 4.0 with an extra permission for teaching and internal training (see `CONTENT_LICENSE.md`). Versions up to commit `8f4be2d` were released under plain MIT." Spec §11 lines record the change (owner, 2026-10-30; was MIT).
- [ ] **Step 4: Run test.** Expected: PASS.
- [ ] **Step 5: Commit** `chore: relicense as MIT + Commons Clause; content training permission`.

### Task 2: Legal module, About screen, footer

**Files:**
- Create: `src/ui/legal.ts`, `src/ui/About.tsx`, `src/ui/About.test.tsx`, `tests/e2e/about.spec.ts`
- Modify: `src/ui/Disclaimer.tsx` (uses `DISCLAIMER_POINTS`; footer gets an "About" button), `src/ui/screens.ts` (add `{ name: 'about' }`), `src/App.tsx`, `vite.config.ts` (`define: { __APP_VERSION__: JSON.stringify(pkg.version) }`), `src/vite-env.d.ts` or a `globals.d.ts` (`declare const __APP_VERSION__: string`)
- Test: `src/content/legal-files.test.ts` (add README sync)

**Interfaces:**
- Produces: `APP_NAME = 'Cert Exam Trainer'`, `DISCLAIMER_POINTS: readonly string[]` (5 strings, spec order), `DISCLAIMER: string` (points joined by spaces, kept for existing imports), `About({ onExit }: { onExit: () => void })`, `Disclaimer({ onAbout }: { onAbout?: () => void })`.

- [ ] **Step 1: Failing tests.**
  - `legal-files.test.ts`: every `DISCLAIMER_POINTS` string appears verbatim as a `- ` bullet in the README Disclaimer section.
  - `About.test.tsx`: renders heading `About Cert Exam Trainer`; a list with 5 items equal to `DISCLAIMER_POINTS`; text `Free to use and share, including by businesses and trainers. You may not sell it or charge for access to it.`, plus `MIT with the Commons Clause` and `CC BY-NC 4.0`; text containing `Version ` + `__APP_VERSION__`; a privacy line `Your progress and questions stay in this browser. The app sends nothing over the network.`; a user-content line `Questions you add or import are yours; do not add copyrighted exam content.`; "Back" calls `onExit`; a Ko-fi tip box (`.kofi-tip`, copied from the battletech-tools gh-pages About page) with the note `If you would like to help cover costs of development please click here.` and a link named `Tips` (also says it opens Ko-fi in a new tab) with `href="https://ko-fi.com/M5K429C47U"`, `target="_blank"`, `rel="noopener noreferrer"`.
  - The Ko-fi widget script is **not** loaded (the single file must make no network requests); the button is a plain styled link. Style: `.kofi-tip` box with a 1px `#72a4f2` border, 0.5rem radius, centred; the link uses a `#72a4f2` background with **dark text (`#0b1a33`)** for AA contrast (white on `#72a4f2` fails), min height 2.75rem.
  - `about.spec.ts` (fixture project): footer "About" button opens the About heading, axe clean, Back returns to Home.
- [ ] **Step 2: Run** unit tests. Expected: FAIL (module missing).
- [ ] **Step 3: Implement.** README bullets get rewritten to match `DISCLAIMER_POINTS` exactly. `App` routes `about` and passes `onAbout={() => go({ name: 'about' })}` to the footer; the `<h1>` uses `APP_NAME`. About moves focus to its heading on mount (same pattern as other screens).
- [ ] **Step 4: Run** `npm run test` and `npm run build:e2e && npx playwright test about`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: About page and shared legal text`.

### Task 3: Themed stylesheet, display settings

**Files:**
- Modify: `src/index.css` (rewrite), `index.html` (`<meta name="color-scheme" content="light dark">`, `<meta name="theme-color">`, description meta)
- Create: `src/ui/DisplaySettings.tsx`, `src/ui/display.ts`, `src/ui/DisplaySettings.test.tsx`
- Modify: `src/ui/Home.tsx` (render `DisplaySettings` under the source toggle), `src/App.tsx` (apply saved display settings once the repo opens)

**Interfaces:**
- Produces (`display.ts`): `THEME_SETTING = 'theme'`, `MOTION_SETTING = 'reducedMotion'`, `type Theme = 'system' | 'light' | 'dark'`, `applyDisplay(theme: Theme, reducedMotion: boolean): void` (sets `document.documentElement.dataset.theme` to the theme, or deletes it for `system`; sets `dataset.motion = 'reduce'` or deletes it), `loadDisplay(repo: Repo): Promise<{ theme: Theme; reducedMotion: boolean }>` (unknown stored values fall back to `system` / `false`).

- [ ] **Step 1: Failing tests** (`DisplaySettings.test.tsx`, memory repo):
  - Choosing "Dark" sets `document.documentElement.dataset.theme === 'dark'` and stores `theme: 'dark'`; choosing "Match system" removes the attribute.
  - Checking "Reduce motion" sets `dataset.motion === 'reduce'` and stores `true`.
  - `loadDisplay` returns `{ theme: 'system', reducedMotion: false }` when the stored theme is `'purple'`.
  - Controls are a labelled radio group (`Theme`) and a labelled checkbox.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** `display.ts` and `DisplaySettings` (fieldset/legend, native radios).
- [ ] **Step 4: Rewrite `index.css`.** Rules that decide things:
  - Tokens on `:root`: `--bg --fg --muted --surface --border --accent --accent-fg --focus --ok --bad --flag`. Light values must give at least 4.5:1 text contrast (e.g. fg `#1a1a1a` on `#fff`, accent `#0b57d0`). Dark set under `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {…} }` and again under `:root[data-theme="dark"]`. `body` sets `background: var(--bg); color: var(--fg)`.
  - Motion: `@media (prefers-reduced-motion: reduce)` and `:root[data-motion="reduce"]` set `* { animation: none !important; transition: none !important; scroll-behavior: auto !important; }`.
  - Layout: `main` max-width 60rem, centred, 1rem gutter; buttons, selects, inputs, checkbox/radio labels min 2.75rem tall; `button.primary` uses accent.
  - Exam shell (`.exam-topbar` sticky top with surface background, number / timer / flag; `.exam-nav` sticky bottom; plain high-contrast `font-family: Arial, Helvetica, sans-serif` and 1.0625rem inside `.exam`); `.review-cell` grid of 2.75rem squares with distinct `answered` (filled) and `flagged` (border + "⚑" already in text — colour must not be the only cue); `.result-pass`/`.result-fail` use `--ok`/`--bad` plus the existing PASS/FAIL text.
  - Wide content: `.data-table`, `.terminal`, `.diagram`, `.chart` sit in `overflow-x: auto` wrappers with `max-width: 100%`; `svg { max-width: 100%; height: auto; }`.
  - Chips, drop targets, buckets, hotspot spots, study and acronym cards get surface/border styling; `.drop-target` hover/active state uses `--accent`.
- [ ] **Step 5: Run** `npm run check`. Expected: all pass (axe now checks the new colours in light mode).
- [ ] **Step 6: Commit** `feat: themed stylesheet with dark mode and reduced-motion option`.

### Task 4: Phone and tablet checks

**Files:**
- Modify: `playwright.config.ts` (add projects `phone`: `devices['Pixel 7']` with `browserName: 'chromium'`, and `tablet`: viewport 820×1180, `hasTouch: true`, `isMobile: true`; both `testMatch: /responsive\.spec\.ts$/`; exclude `responsive.spec.ts` from `fixture`)
- Create: `tests/e2e/responsive.spec.ts`
- Modify: `src/index.css` for any failure found

**Interfaces:**
- Consumes: `singleUrl`, `expectNoSeriousAxe` (`tests/e2e/util.ts`); seeds 4 and 67 cover all 8 PBQ types in the fixture bank (chunk 4).

- [ ] **Step 1: Write `responsive.spec.ts`:**
  - helper `expectNoOverflow(page)`: `document.documentElement.scrollWidth <= window.innerWidth`.
  - `home fits and is axe clean in light and dark`: for `colorScheme` of `light`, `dark` (`page.emulateMedia`), check overflow and axe.
  - `every PBQ type fits and is axe clean`: for seeds 4 and 67, start a mock exam, step through every item; on each PBQ check overflow and axe in both schemes.
  - `tap path works`: on the first PBQ with a select, `tap()` it and choose an option with `selectOption`; on a hotspot, `tap()` a checkbox label and expect it checked.
  - `results and review grid fit`: submit, check overflow on results and the review grid.
- [ ] **Step 2: Run** `npm run build:e2e && npx playwright test --project=phone --project=tablet`. Expected: failures point at the CSS to fix (or PASS).
- [ ] **Step 3: Fix CSS** until both projects pass. Do not hide content to pass the overflow check; wrap it in a scroll container instead.
- [ ] **Step 4: Run** `npm run check`. Expected: PASS.
- [ ] **Step 5: Commit** `test: phone and tablet layout and touch checks`.

### Task 5: PWA service worker

**Files:**
- Modify: `package.json` (dev dep `vite-plugin-pwa`; script `"preview:pwa": "vite preview --port 4173 --strictPort"`), `vite.config.ts`, `src/main.tsx`
- Create: `public/icon.svg` (our own simple mark: a checkmark in a rounded square, accent colour), `src/pwa.ts`, `tests/e2e/pwa.spec.ts`, `src/content/pwa-build.test.ts`
- Modify: `playwright.config.ts` (project `pwa`, `testMatch: /pwa\.spec\.ts$/`, `webServer` running `npm run build && npx vite preview --port 4173 --strictPort --base /cert-exam-trainer/`, `url: http://localhost:4173/cert-exam-trainer/`; exclude from `fixture`). If `preview --base` does not serve the subpath, serve `dist/` from a tiny static server script that mounts it at `/cert-exam-trainer/`.

**Interfaces:**
- Produces: `registerPwa(): void` in `src/pwa.ts` (calls `registerSW({ immediate: true })` from `virtual:pwa-register`); `main.tsx` does `if (__PWA__) void import('./pwa').then((m) => m.registerPwa())`, with `define: { __PWA__: JSON.stringify(!single) }`, so the single build drops it.

- [ ] **Step 1: Failing tests.**
  - `pwa-build.test.ts` (skips with a clear message if `dist/` is missing; `npm run check` builds it first — add `npm run build` to `check` before tests that need it, or run this test file from a post-build step): `dist/manifest.webmanifest` has `name: 'Cert Exam Trainer'`, `short_name: 'Exam Trainer'`, `start_url: './'`, `scope: './'`, `display: 'standalone'`, an icon with `type: 'image/svg+xml'` and `sizes: 'any'`; `dist/sw.js` exists and mentions `index.html`; `dist-single/index.html` does not contain `serviceWorker` or `registerSW`.
  - `pwa.spec.ts`: load the subpath URL, wait for `navigator.serviceWorker.ready`, reload once (so the SW controls the page), `context.setOffline(true)`, reload, expect heading `Cert Exam Trainer` visible; start practice to prove the bank loaded offline.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Configure** `VitePWA({ registerType: 'autoUpdate', injectRegister: false, manifest: {...above, theme_color, background_color matching light tokens}, workbox: { globPatterns: ['**/*.{js,css,html,svg,webmanifest}'], navigateFallback: 'index.html', cleanupOutdatedCaches: true } })` only when `!single`. Keep the review plugin dev-only as today. Check that no bundle chunk exceeds workbox's 2 MiB default precache limit; if the bank chunk does, raise `maximumFileSizeToCacheInBytes` to 5 MiB rather than splitting.
- [ ] **Step 4: Run** `npm run check` and `npx playwright test --project=pwa`. Expected: PASS. Add `--project=pwa` runs to `check`.
- [ ] **Step 5: Commit** `feat: offline PWA build for GitHub Pages`.

### Task 6: Local deploy script

**Files:**
- Create: `scripts/deploy-lib.ts`, `scripts/deploy-lib.test.ts`, `scripts/deploy.ts`
- Modify: `package.json` (`"deploy": "vite-node scripts/deploy.ts --"`), `vite.config.ts` test `include` adds `scripts/**/*.test.ts`, `README.md` (Deploy section)

**Interfaces:**
- Produces: `deploy(opts: { cwd: string; remote: string; branch: string; distDir: string; dryRun: boolean; force: boolean; run?: (cmd: string, args: string[], cwd: string) => string }): Promise<{ commit: string | null; pushed: boolean }>`. Steps: check `git status --porcelain` is empty and current branch is `main` (else throw `Refusing to deploy: working tree has uncommitted changes` / `Refusing to deploy from branch <b>; use main or --force`); read source sha; create a temp worktree on `branch` (fetch it from `remote` if it exists, else orphan); replace its contents with `distDir` plus an empty `.nojekyll`; commit `deploy: <short sha>` (return `commit: null` if nothing changed); push unless `dryRun`; always remove the worktree, even on error.
- `deploy.ts`: parses `--dry-run`, `--force`; runs `npm run build` first (never `build:single`); defaults `remote: 'origin'`, `branch: 'gh-pages'`, `distDir: 'dist'`.

- [ ] **Step 1: Failing tests** (`deploy-lib.test.ts`, real git in a temp dir with a local bare repo as `remote`):
  - dirty tree → rejects with the uncommitted-changes message.
  - on branch `feature` → rejects; with `force: true` → succeeds.
  - first deploy creates `gh-pages` on the bare remote containing `index.html` and `.nojekyll` and no source files; commit message `deploy: <sha>`.
  - second deploy with an unchanged dist → `{ commit: null, pushed: false }`.
  - `dryRun: true` → commit made locally, remote branch unchanged.
  - after a thrown error mid-run, `git worktree list` shows only the main worktree.
- [ ] **Step 2: Run** `npx vitest run scripts/deploy-lib.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** tests, then `npm run deploy -- --dry-run` on the real repo. Expected: PASS; dry run reports a commit and no push.
- [ ] **Step 5: README Deploy section:** `npm run deploy` builds and pushes `dist/` to `gh-pages`; one-time setup: repo Settings → Pages → Source "Deploy from a branch", branch `gh-pages`, folder `/ (root)`; site URL `https://ngcfells.github.io/cert-exam-trainer/`.
- [ ] **Step 6: Commit** `feat: local deploy script for GitHub Pages`.
- [ ] **Step 7: Ask the owner before the first real `npm run deploy`** (it publishes publicly), then confirm the site loads and works offline.

### Task 7: Close the chunk

- [ ] Run `npm run check`; all pass.
- [ ] Dispatch one final whole-branch reviewer (Opus). Fix every finding, minors included.
- [ ] Update `HANDOFF.md` (chunk 9 state, decisions above, next: chunk 10) and merge to `main`.
