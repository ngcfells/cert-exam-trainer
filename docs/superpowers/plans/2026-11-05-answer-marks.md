# Answer Marks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a coloured right / partly right / wrong mark (six styles plus Plain text, chosen in Settings) on every revealed answer, with an optional synthesised sound (issue #10).

**Architecture:** A small preferences store (`src/ui/marks/prefs.ts`) holds the chosen style and sound flag; App and Settings load and apply it, as they do the theme, and components read it with a `useMarks()` hook (`useSyncExternalStore`), so no props are threaded through flows. One `AnswerMark` component draws every style in two sizes from inline SVG and CSS classes that use new `--mark-*` tokens. A `playMark(level)` helper synthesises tones with Web Audio. The runners and results screen swap their plain status words for `AnswerMark`.

**Tech Stack:** React 18 + TypeScript, Vitest + Testing Library, Playwright + axe, plain CSS tokens in `src/index.css`.

**Spec:** `docs/superpowers/specs/2026-11-05-answer-marks-design.md`

## Global Constraints

- No new dependencies; no bundled image or audio files (inline SVG, synthesised tones).
- No raw colours in `src/ui` (`src/content/theme.test.ts`): SVG uses `currentColor` or CSS classes; every colour is a token in all three theme blocks of `src/index.css`.
- Contrast: text ≥ 4.5:1, icon shapes ≥ 3:1 against their own background, light and dark.
- Never colour alone: each level has its own icon shape; icons are `aria-hidden`.
- Screen readers hear the plain word ("Correct" / "Partly correct" / "Incorrect") first, then the style's words when they differ.
- Default style: Check and X banner. Sound: off by default. Settings keys `answerMarks`, `answerSound`.
- No marks in a running mock exam, on acronym flip cards, or on the dev review screen.
- Animation is off under Reduce motion (existing global rules already do this; nothing extra).
- `npm run check` stays green, bounds included.

## Review Focus

1. A stored `answerMarks` value that is unknown, old or not a string (a hand-edited or future backup) → the banner, no crash. Test in Task 2.
2. Importing a backup on Settings changes marks at once in the next run, without a reload. Test in Task 5.
3. No `AudioContext`, a constructor that throws, or a suspended context → silent, no error; one context reused across many checks (no leak). Tests in Task 4.
4. Previous/Next back to a checked item, and the results screen, never play a sound. Tests in Tasks 6 and 8.
5. Long style words ("Not this time", the tilted stamp) at 360 px stay in bounds. Covered by Task 9's e2e over every style.

---

### Task 1: Mark colour tokens and the contrast test

**Files:**
- Modify: `src/index.css` (all three theme blocks)
- Create: `src/content/markContrast.test.ts`

**Interfaces:**
- Produces tokens, for `X` in `ok`, `warn`, `bad`: `--mark-X` (text/icon/border), `--mark-X-bg` (banner tint), `--mark-on-X` (text and glyph on a solid `--mark-X` block), plus `--mark-face` (smiley fill) and `--mark-face-fg` (eyes and mouth).

- [ ] **Step 1: Write the failing test** `src/content/markContrast.test.ts`. It reads `src/index.css`, extracts the custom properties of each block (light `:root {…}` at the top; dark `:root:not([data-theme='light'])` inside the media query; `:root[data-theme='dark']`), resolves dark blocks over light (a dark block may omit a token and inherit it), and computes the WCAG ratio from hex `#rrggbb`. Tests:
  - `it('every mark token is defined in light and both dark blocks match')`: each of the 11 tokens exists in the light block; the two dark blocks give the same value for each.
  - `it.each(themes × ['ok','warn','bad'])('%s %s meets AA')`: `ratio(--mark-X, --bg) >= 4.5`, `ratio(--mark-X, --mark-X-bg) >= 4.5`, `ratio(--mark-on-X, --mark-X) >= 4.5`.
  - `it.each(themes)('%s smiley face features')`: `ratio(--mark-face-fg, --mark-face) >= 3`.
  - Use exact helper names `tokens(block: string): Record<string, string>`, `ratio(a: string, b: string): number`.
- [ ] **Step 2: Run** `npx vitest run src/content/markContrast.test.ts` → FAIL (tokens missing).
- [ ] **Step 3: Add the tokens** to all three blocks. Start light from `--ok/--warn/--bad`, `-bg` from light tints (e.g. `#e8f5e9`, `#fff4e0`, `#fdecea`), `--mark-on-X: #ffffff`, `--mark-face: #fdd835`, `--mark-face-fg: #1a1a1a`. Dark: start from the dark `--ok/--warn/--bad`, deep tints for `-bg`, `--mark-on-X` dark (e.g. `#0b1a33`), face `#fdd835` / `#1a1a1a`. Adjust values until the test passes.
- [ ] **Step 4: Run** the test → PASS. Run `npx vitest run src/content` → PASS.
- [ ] **Step 5: Commit** `feat(marks): mark colour tokens with a contrast test`.

### Task 2: Mark preferences store

**Files:**
- Create: `src/ui/marks/prefs.ts`, `src/ui/marks/prefs.test.ts`
- Modify: `src/App.tsx` (startup load), `src/ui/SettingsScreen.tsx` (`onImported`)

**Interfaces:**
- Produces:
  - `type MarkStyle = 'banner' | 'smiley' | 'thumbs' | 'stamp' | 'shapes' | 'edge' | 'plain'`
  - `const MARK_STYLES: readonly MarkStyle[]` (that order, banner first), `const MARK_NAMES: Record<MarkStyle, string>` (Settings names, verbatim from the spec table: "Check and X banner", "Smiley and frowny", "Thumbs up and down", "Grader's stamp", "Circle, triangle, cross", "Quiet edge", "Plain text")
  - `const MARKS_SETTING = 'answerMarks'`, `const SOUND_SETTING = 'answerSound'`
  - `interface MarkPrefs { style: MarkStyle; sound: boolean }`, `DEFAULT_MARKS: MarkPrefs = { style: 'banner', sound: false }`
  - `loadMarks(repo: Repo): Promise<MarkPrefs>`, `applyMarks(p: MarkPrefs): void`, `useMarks(): MarkPrefs`

- [ ] **Step 1: Write failing tests** in `prefs.test.ts`:
  - `loadMarks` on an empty repo → `DEFAULT_MARKS`.
  - `loadMarks` with `answerMarks: 'neon'`, `42`, `null`, and `answerSound: 'yes'` → `DEFAULT_MARKS` (Review Focus 1).
  - `loadMarks` with `'stamp'` and `true` → `{ style: 'stamp', sound: true }`.
  - `useMarks` (via `renderHook`) returns `DEFAULT_MARKS`, then after `act(() => applyMarks({ style: 'edge', sound: true }))` returns the new value. `afterEach(() => applyMarks(DEFAULT_MARKS))`.
- [ ] **Step 2: Run** `npx vitest run src/ui/marks/prefs.test.ts` → FAIL.
- [ ] **Step 3: Implement** a module-level value plus a listener set; `useMarks` uses `useSyncExternalStore(subscribe, get)`.
- [ ] **Step 4: Wire it:** in `App.tsx`'s startup block, inside the same `try`, `applyMarks(await loadMarks(s.repo))`. In `SettingsScreen.onImported`, also `applyMarks(await loadMarks(repo))`.
- [ ] **Step 5: Run** the test and `npx vitest run src/App.test.tsx src/ui/SettingsScreen.test.tsx` → PASS.
- [ ] **Step 6: Commit** `feat(marks): answer mark preferences store`.

### Task 3: AnswerMark component

**Files:**
- Create: `src/ui/marks/AnswerMark.tsx`, `src/ui/marks/marks.css`, `src/ui/marks/AnswerMark.test.tsx`

**Interfaces:**
- Consumes: `useMarks`, `MarkStyle` (Task 2); tokens (Task 1).
- Produces:
  - `type MarkLevel = 'right' | 'partly' | 'wrong'`
  - `levelOf(fraction: number): MarkLevel` (≥ 1 right, > 0 partly, else wrong)
  - `PLAIN_WORDS: Record<MarkLevel, string>` = Correct / Partly correct / Incorrect
  - `AnswerMark({ level, size = 'large', markStyle, unanswered = false }: { level: MarkLevel; size?: 'large' | 'small'; markStyle?: MarkStyle; unanswered?: boolean })` — `markStyle` defaults to `useMarks().style`. Renders no role; the caller owns `role="status"`.

Words per style (verbatim from the spec): smiley Nice one! / Almost / Not this time; stamp Correct / Partial / Missed; all others Correct / Partly correct / Incorrect. `unanswered` (wrong only) replaces the visible style word with "Not answered".

Rendering rules:
- Large: root `span.mark.mark-{style}.mark-{level}.mark-pop` (block display in CSS). If the visible word ≠ plain word, emit `<span class="visually-hidden">{plain}. </span>` before it. Icon `<svg aria-hidden="true" focusable="false">`.
- Small (Parts table): plain word only ("Correct"/"Incorrect"), with the style's icon at `1em` before it, in `--mark-X`; stamp: the word coloured, no icon, no tilt; plain: the word alone, no colour.
- Icons, by style: banner = filled circle with check / half-filled circle / X; smiley = face (fill `--mark-face`, ring `currentColor`, features `--mark-face-fg`) with smile / flat / frown; thumbs = thumb up / sideways (rotate −90°) / down (rotate 180°); shapes = open circle / open triangle / cross; edge = ✓ / ◐ / ✗ text glyphs inside `aria-hidden` span; stamp and plain have no icon in large. Geometry: copy the paths from the approved mockup `.superpowers/brainstorm/9794-1793916734/content/mark-styles.html`, replacing every `#fff` / `#fdd835` / `#1a1a1a` with a class (`.mark-glyph`, `.mark-face`, `.mark-face-fg`) whose CSS uses tokens.
- CSS (`marks.css`, imported by `AnswerMark.tsx`): banner tinted `--mark-X-bg` with 2px `--mark-X` border, text `--mark-X`; thumbs solid `--mark-X` with `--mark-on-X` text and glyph; stamp tilted (−4°) double border, uppercase serif, `--mark-X`; edge 6px left bar `--mark-X`; smiley face above the words; plain: bold `--fg`, no box. Glyph inside banner circles uses `--mark-on-X`. Everything wraps (`flex-wrap`, `max-width: 100%`). `@keyframes mark-pop` ~200 ms scale/fade; stamp uses a `mark-thunk` keyframe.

- [ ] **Step 1: Write failing tests** in `AnswerMark.test.tsx`:
  - `it.each(MARK_STYLES × levels)` large: `container.textContent` starts with the plain word; it contains the style word; there is exactly one `svg` for banner/smiley/thumbs/shapes and none for stamp/plain; every `svg` has `aria-hidden="true"`.
  - Smiley right: visible text "Nice one!", hidden text "Correct. " (`.visually-hidden`).
  - Banner right: no `.visually-hidden` element (plain word is visible, not repeated).
  - `unanswered` on smiley: text is "Incorrect. Not answered"; on banner: "Incorrect. Not answered" too (visible word "Not answered" ≠ "Incorrect").
  - Small: thumbs right text is exactly "Correct"; stamp small has no `svg` and no tilt class; smiley small wrong text is "Incorrect" (never "Not this time").
  - With no `markStyle` prop and `applyMarks({ style: 'stamp', sound: false })`, the root has class `mark-stamp`.
  - `levelOf(1) === 'right'`, `levelOf(0.5) === 'partly'`, `levelOf(0) === 'wrong'`.
- [ ] **Step 2: Run** `npx vitest run src/ui/marks` → FAIL.
- [ ] **Step 3: Implement** `AnswerMark.tsx` and `marks.css`.
- [ ] **Step 4: Run** `npx vitest run src/ui/marks src/content/theme.test.ts` → PASS.
- [ ] **Step 5: Commit** `feat(marks): AnswerMark with six styles and plain text`.

### Task 4: Synthesised sound

**Files:**
- Create: `src/ui/marks/sound.ts`, `src/ui/marks/sound.test.ts`

**Interfaces:**
- Produces: `playMark(level: MarkLevel): void` — plays only when `useMarks`'s current value has `sound: true` (read the store directly with an exported `getMarks(): MarkPrefs` from `prefs.ts`). Callers call it only on a reveal the learner caused.

Tones (one shared lazily created `AudioContext`, `resume()` if suspended; oscillator + gain envelope, peak gain 0.15, total < 0.5 s): right = sine 660 Hz then 880 Hz, 0.12 s each; partly = triangle 520 Hz, 0.2 s; wrong = sine 220 Hz, 0.25 s.

- [ ] **Step 1: Write failing tests** with a fake `AudioContext` class on `globalThis` that records `createOscillator` calls and frequencies:
  - Sound off → no context is created.
  - Sound on, `playMark('right')` → two oscillators at 660 and 880; `'wrong'` → one at 220.
  - Three calls → the constructor ran once (Review Focus 3).
  - `AudioContext` undefined → `playMark` does not throw; a constructor that throws → does not throw; `state: 'suspended'` → `resume` called.
- [ ] **Step 2: Run** `npx vitest run src/ui/marks/sound.test.ts` → FAIL.
- [ ] **Step 3: Implement** with `window.AudioContext ?? window.webkitAudioContext`, everything in `try/catch`. Add `webkitAudioContext?` to `src/globals.d.ts` if typecheck needs it.
- [ ] **Step 4: Run** the test → PASS.
- [ ] **Step 5: Commit** `feat(marks): optional synthesised answer sound`.

### Task 5: Settings controls

**Files:**
- Create: `src/ui/marks/MarkSettings.tsx`, `src/ui/marks/MarkSettings.test.tsx`
- Modify: `src/ui/SettingsScreen.tsx` (render `<MarkSettings key={imports} repo={repo} />` right after `DisplaySettings`), `src/ui/SettingsScreen.test.tsx`

**Interfaces:**
- Consumes: `loadMarks`, `applyMarks`, `MARK_STYLES`, `MARK_NAMES`, settings keys (Task 2); `AnswerMark` (Task 3).

UI: `<fieldset><legend>Answer marks</legend>` with seven radios, each label = `MARK_NAMES[s]` then an `aria-hidden` preview `<AnswerMark level="right" markStyle={s} />` wrapped in `span.mark-preview` (CSS: `animation: none`). Then a checkbox "Play a sound when an answer is checked". Saves at once like Theme; on failure `<p role="alert">Could not save this choice.</p>`. Uses `.display-settings` layout classes.

- [ ] **Step 1: Write failing tests:**
  - Group "Answer marks" has 7 radios named exactly the `MARK_NAMES` values; "Check and X banner" is checked by default; the checkbox is unchecked.
  - Clicking "Grader's stamp" stores `answerMarks: 'stamp'` and `getMarks().style === 'stamp'`.
  - Ticking the checkbox stores `answerSound: true`.
  - No `role="status"` inside the group (previews are decoration).
  - `SettingsScreen.test.tsx`: importing a backup with `settings: { answerMarks: 'edge' }` → `getMarks().style === 'edge'` and the "Quiet edge" radio is checked (Review Focus 2). Follow that file's existing import test pattern.
- [ ] **Step 2: Run** `npx vitest run src/ui/marks/MarkSettings.test.tsx src/ui/SettingsScreen.test.tsx` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the same → PASS.
- [ ] **Step 5: Commit** `feat(marks): answer mark and sound settings`.

### Task 6: Practice, cram and lesson checks (StudyRunner)

**Files:**
- Modify: `src/ui/study/StudyRunner.tsx`, its tests (find with `grep -rl StudyRunner src --include=*.test.tsx`)

**Interfaces:**
- Consumes: `AnswerMark`, `levelOf` (Task 3), `playMark` (Task 4).

Changes: remove `verdict`; the status element becomes `<div role="status" className="study-status" ref={statusRef} tabIndex={-1}>` (`useFocusLater<HTMLDivElement>`). For a checked question it holds `<AnswerMark key={key} level={levelOf(itemFraction(...))} />`; for acronym cards, `knownStatus(...)` text as now. The Check answer handler also calls `playMark(level)`. Nothing else plays sound.

- [ ] **Step 1: Write failing tests** (StudyRunner test file):
  - After Check on a right answer, `getByRole('status')` contains a `.mark-banner.mark-right` and text "Correct".
  - With `applyMarks({ style: 'smiley', sound: true })` and a fake `AudioContext`: Check plays once; Next then Previous back to the checked item shows the mark again and creates no new oscillator (Review Focus 4).
  - Acronym card graded → status text "Marked as known", no `.mark`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npx vitest run src/ui/study src/ui/learn` → PASS.
- [ ] **Step 5: Commit** `feat(marks): marks and sound in practice, cram and lessons`.

### Task 7: Acronym quiz (QuizRunner)

**Files:**
- Modify: `src/ui/acronyms/QuizRunner.tsx`, `src/ui/acronyms/runners.test.tsx` (lines ~104, ~113), `tests/e2e/acronyms.spec.ts:112`

Changes: status becomes a `div` (as Task 6). Graded right → `<AnswerMark level="right" />`; wrong → `<AnswerMark level="wrong" />` then `<p>The answer is: {backText(card, show)}</p>`, both inside the status. `grade()` calls `playMark(g.correct ? 'right' : 'wrong')`, so "Count as correct" plays the right sound. "Not quite:" goes.

- [ ] **Step 1: Update tests:** the two unit asserts become `toHaveTextContent('IncorrectThe answer is: Mean Time to Recovery (also: Mean Time to Repair)')` style (use `toHaveTextContent(/Incorrect.*The answer is: Extract, Transform, Load/)`); add: "Count as correct" → status has `.mark-right` and no "The answer is". e2e regex → `/^(Correct|Incorrect\s*The answer is: .+)$/`.
- [ ] **Step 2: Run** `npx vitest run src/ui/acronyms` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(marks): marks in the acronym quiz`.

### Task 8: Results review and the Parts table

**Files:**
- Modify: `src/ui/exam/ResultsScreen.tsx`, `src/ui/exam/ItemReview.tsx`, `src/ui/exam/ResultsScreen.test.tsx`, `src/ui/exam/components.test.tsx`

Changes: in the Review list, each `<li>` starts with `<AnswerMark level={levelOf(report.items[i].fraction)} unanswered={!hasAnswer(q, result.responses[q.id])} />` (keep the item index when filtering `missed`). `PartsReview`'s Result cell becomes `<AnswerMark size="small" level={partCorrect(...) ? 'right' : 'wrong'} />`. `ItemReview` never renders a large mark. The results screen never calls `playMark`.

- [ ] **Step 1: Write failing tests:**
  - ResultsScreen: a partly right multi-answer item's review shows `.mark-partly` and text "Partly correct"; an unanswered item shows "Not answered" with `.mark-wrong`; a fake `AudioContext` with sound on records no oscillator (Review Focus 4).
  - components.test: a PBQ review's Parts table Result cells contain "Correct"/"Incorrect" and, with banner, one `svg[aria-hidden="true"]` each.
- [ ] **Step 2: Run** `npx vitest run src/ui/exam` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npx vitest run` (full unit suite) → PASS.
- [ ] **Step 5: Commit** `feat(marks): marks on the results review and Parts table`.

### Task 9: Every style in the browser, full check, docs

**Files:**
- Create: `tests/e2e/marks.spec.ts`
- Modify: `HANDOFF.md`

- [ ] **Step 1: Write** `tests/e2e/marks.spec.ts` (runs in the phone project like `responsive.spec.ts`; helpers from `./util`): for each of the 7 style names, open Settings, pick the style, open practice for DA0-002 on the fixture bank with feedback instant, answer and Check the first question, then in light and dark: `expectNoSeriousAxe(page)`, no horizontal overflow, and the status contains the plain word. One test also answers a question wrong, finishes, and checks the results review mark is visible.
- [ ] **Step 2: Run** `npm run build:e2e && npx playwright test tests/e2e/marks.spec.ts` → PASS (fix CSS until it does).
- [ ] **Step 3: Run** `npm run check` → all green (lint, typecheck, builds, unit, e2e, bounds).
- [ ] **Step 4: Update** `HANDOFF.md` "Next session": #10 built on `answer-marks`, what shipped, test counts, next step (Opus review, merge, deploy, close #10, then #3 brainstorm).
- [ ] **Step 5: Commit** `test(marks): every mark style axe-clean and in bounds` and `docs(handoff): answer marks built`.

After Task 9: Opus whole-branch review, fix every finding (minors too), `npm run check`, merge to `main`, `npm run deploy`, close #10.
