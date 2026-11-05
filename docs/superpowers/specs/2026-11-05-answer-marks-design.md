# Right/wrong answer marks (issue #10)

Status: draft for owner approval (2026-11-05).

## Intent

When an answer is revealed, the result must hit the learner at a glance. Today it is the plain word "Correct", "Partly correct" or "Incorrect" in a status line, which is easy to miss. The owner wants colour and an icon ("from blah to something more intuitive and modern"), with the style chosen in Settings, and an optional sound.

## Goals

- A coloured mark with an icon for every revealed result: **right**, **partly right** and **wrong**.
- Six visual styles, chosen in Settings, plus a "Plain text" choice that keeps today's look. **Default: the check and X banner.**
- Optional sound on a reveal: on/off in Settings.
- Fully accessible: never colour alone, AA contrast in light and dark, text for screen readers, motion respects Reduce motion.

## Non-goals

- No marks during a mock exam (answers stay hidden until submit; the review grid's ✓/○/⚑ is unchanged).
- No change to scoring, saved results or the explanations shown below the mark.
- No marks on acronym flip cards in study runs: the learner grades those themselves ("knew it"), so there is no verdict to mark (builder's call, see below).

## Anti-goals

- The meaning must never depend on red vs green. Each result has its own icon shape.
- No sound unless the learner turned it on.
- No bundled image or audio files. Icons are inline SVG and tones are synthesised, so the single-file build and offline PWA keep working.

## Where marks show

| Place | What changes |
| --- | --- |
| Practice and cram (`StudyRunner`, instant feedback) | The `study-status` verdict becomes the mark. |
| Lesson checks (`LearnFlow` uses `StudyRunner`) | Same as above. |
| Acronym quiz (`QuizRunner`) | "Correct" / "Not quite: …" becomes a right/wrong mark; the "Not quite" answer text stays beside it. "Count as correct" re-marks it as right. |
| Results screen review (`ResultsScreen`, after mock, practice, cram, lesson) | A large mark at the top of each reviewed item, and a small mark in the "Result" column of the PBQ "Parts" table (`ItemReview`). |

The dev-only bank review screen (`src/ui/review/`) is unchanged.

Result levels: right = fraction ≥ 1, partly right = 0 < fraction < 1, wrong = 0 (the existing `verdict` rule in `StudyRunner`). The acronym quiz and PBQ parts have only right and wrong.

Placement details (builder's calls, settled after the builder check):

- **StudyRunner:** the mark renders inside the existing status element, which becomes a `div` with `role="status"`, the same `ref` and `tabIndex={-1}` (a banner is block content, so it cannot sit in a `p`). Acronym flip text (`knownStatus`) still renders there as plain text with no mark.
- **ResultsScreen:** `ResultsScreen` (not `ItemReview`) adds the large mark above each reviewed item's stem. `ItemReview` never shows the large mark, so the in-run view after Check does not show it twice. `ItemReview` only gains the small mark in the Parts table's Result cell.
- **Unanswered items** on the results review get the wrong mark (they scored zero), with the words "Not answered" in place of the style's wrong word.
- **Acronym quiz:** the mark shows the result (plain word "Correct" or "Incorrect", plus the style's words), and the correct answer follows it as plain text: "The answer is: …". The "Not quite:" wording goes. "Count as correct" swaps the mark to right and plays the right sound if sound is on.
- **Revisits:** going back to an already-checked item with Previous/Next shows its mark again (the pop-in may replay) but never plays a sound.

## Styles (owner picked all six; mockup approved in the browser companion)

| # | Name in Settings | Look | Words (right / partly / wrong) |
| --- | --- | --- | --- |
| 1 | Check and X banner (default) | Tinted full-width banner with a 2px border in the result colour; round filled icon (check, half-filled circle, X) and the word beside it. | Correct / Partly correct / Incorrect |
| 2 | Smiley and frowny | Large face (smile, flat mouth, frown) with a ring in the result colour; friendly words under it. | Nice one! / Almost / Not this time |
| 3 | Thumbs up and down | Solid block in the result colour, white thumb (up, sideways, down) and white text. | Correct / Partly correct / Incorrect |
| 4 | Grader's stamp | Tilted double-ruled ink stamp, uppercase serif. | Correct / Partial / Missed |
| 5 | Circle, triangle, cross | Paper-test marks: open circle, open triangle, cross, with the word. | Correct / Partly correct / Incorrect |
| 6 | Quiet edge | Thick left bar in the result colour, small ✓ / ◐ / ✗ and the word. | Correct / Partly correct / Incorrect |
| 7 | Plain text | Today's look: the word only. | Correct / Partly correct / Incorrect |

The small Parts-table mark is the chosen style's icon at text size plus the plain word "Correct" or "Incorrect" (never the style's friendly words in a table cell). Plain text: the word only. Grader's stamp: the plain word in its colour, no tilt.

Colours: the app has two themes (light and dark), written in three CSS blocks (light `:root`, dark by `prefers-color-scheme`, dark by `data-theme`); there is no high-contrast theme. Marks get **their own new tokens** (for example `--mark-ok`, `--mark-ok-bg`, `--mark-on-ok`, and the same for `warn` and `bad`, plus the smiley face fill), added to all three blocks. The shared `--ok`, `--warn` and `--bad` tokens are not changed, so other screens are untouched. The new tokens may start from those values and are adjusted until the contrast test passes. `theme.test.ts` already forbids raw colours in `src/ui`, and inline SVG must use `currentColor` or CSS classes. The smiley's yellow face fill is a token too.

## Accessibility

- Each mark is text plus decoration: the word is real text in the status line (already `role="status"`, which focus moves to after Check). Icons are `aria-hidden`. Screen readers always hear the plain result word ("Correct", "Partly correct" or "Incorrect"), followed by the style's own words when they differ (for example "Correct. Nice one!"). One way to build it: a visually hidden plain word, then the visible style words. In styles whose words are the plain word, the plain word is visible and not repeated. Tests can keep finding the plain word in the status.
- Text and icon contrast: at least 4.5:1 for text and 3:1 for icon shapes against their own background, in light and dark themes. A unit or e2e test checks every style × result × theme.
- axe has no serious or critical violations on every style (extend `responsive.spec.ts` or add a small spec).
- Animation: a short pop-in (about 200 ms scale/fade; the stamp "thunks" in). The existing Reduce motion rules (OS setting and in-app) already switch off all animation.
- Bounds rule: marks wrap and stay in bounds at 360 px (the bounds e2e covers the results review and every screen).

## Sound

- Setting "Play a sound when an answer is checked", **off by default** (builder's call: people often study in shared spaces).
- Web Audio API, synthesised: a short rising two-note chime for right, a single soft mid tone for partly right, a short low tone for wrong. Under half a second, moderate volume.
- Plays only on a reveal the learner caused (Check answer, quiz Check, "Count as correct"), never on the results screen, which lists many items.
- If the browser has no `AudioContext` or blocks it, nothing happens and nothing breaks.

## Settings

- On the Settings screen, beside Theme and Reduce motion (`DisplaySettings`): an "Answer marks" radio group with the seven choices, each showing a small static preview of its right mark (no animation, no sound), and the sound checkbox. A choice applies and saves at once, as Theme does.
- Settings keys (stored like `theme`): `answerMarks` (one of the seven ids; unknown or missing means the banner) and `answerSound` (boolean; missing means off). They travel in backups with no format change, and importing a backup applies them as it does Theme.

## Constraints

- React + TypeScript, existing CSS-token theming, no new dependencies.
- `npm run check` stays green (lint, typecheck, builds, unit, e2e, bounds).
- Built through the usual flow: plan (superpowers:writing-plans), build, Opus whole-branch review with every finding fixed, then merge to `main` and deploy.

## Left to the builder

- Component shape (a single `AnswerMark` component with `level`, `style` and `size` props is the obvious fit), how the setting reaches the runners (context or load-on-mount), CSS details, exact tone frequencies, and how the contrast test computes ratios.

## Builder's calls (owner to check)

1. Sound off by default.
2. A seventh "Plain text" choice.
3. No marks during a mock exam or on self-graded acronym flip cards.
4. Pop-in animation, skipped under Reduce motion.
5. Large mark on each reviewed item plus a small mark (icon and plain word) in the PBQ Parts table.
6. Unanswered items on the results review show the wrong mark with "Not answered".
7. The acronym quiz drops "Not quite:" and shows "The answer is: …" after the mark.
