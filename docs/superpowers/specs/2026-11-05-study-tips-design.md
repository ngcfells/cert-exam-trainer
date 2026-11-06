# Study tips in practice and cram (issue #3): design

**Status:** draft, awaiting the owner's approval
**Issue:** <https://github.com/ngcfells/cert-exam-trainer/issues/3>
**Date:** 2026-11-05

## 1. Intent

The owner is a CompTIA trainer. Students drill questions in practice and cram, but nobody reminds them of the habits that win or lose an exam: reading the key word, not reading aloud, pacing, keeping calm in the test room. Issue #3 asks for a box above the question that now and then shows one helpful tip, picked at random from a large list.

Success: a student working through practice sees a short, useful tip every 10 to 20 questions, can close it or read more tips right there, and is never slowed down or blocked by it.

## 2. Goals

- A tip box shows above the question in **practice and cram** runs.
- It appears after a random gap of **10 to 20 questions** each time.
- The student can **close** it, and can **cycle** through tips (Previous / Next) to read as many as they like.
- **Settings** has a tips section: an on/off switch and a button to start the tips over.
- A list of about **100 general tips** (about half "in the test room", half "while you study") plus **5 to 10 tips per exam** (AT0-001, DA0-002, CY0-001). A student sees the general tips and the ones for the exam they are studying.
- All tips are **original wording**.

## 3. Non-goals

- No tips in **mock exams** (they mirror the real test) or in **Learn lesson checks** (only 3 to 5 questions long).
- No separate "all tips" page. Cycling in the box covers reading them all.
- Students cannot add or edit tips.

## 4. Anti-goals (a failure even if it works)

- The box **covers** or **blocks** any part of the question, or must be dealt with before answering.
- The box **steals focus** or makes a screen reader read over the question.
- A tip states something **wrong or stale** (for example, a test-centre rule that has changed).
- A tip copies or closely paraphrases someone else's tip text.

## 5. Owner decisions

- Box sits above the question, in the page flow; the question moves down and nothing is covered.
- Close button, plus the option to cycle through tips.
- Settings: turn tips on or off, and reset the cycle.
- About 100 general tips plus 5 to 10 per exam; general and per-exam split as above.
- The list is built from a review of common CompTIA tips found online, reworded to be original, plus the owner's own tips (all must be in the list):
  - **Don't make reading aloud a habit.** Talking it through can help you learn, but do some practice in silence: you can't read aloud in the test room.
  - **Silly answers.** Some options are meant to be silly; cross them off. But don't laugh out loud: noise can draw the proctor, who can end your exam.
  - **Know your acronyms.**
  - **Look for the key word** (BEST, FIRST, MOST, LEAST, NOT and so on).
  - **On long questions, read the last sentence first** (what is actually being asked), then work back through the scenario.

### Common tips found in the online review (2026-11-05)

To be reworded, never copied. Sources: CompTIA's PBQ page and blog, ASMED, CyberKraft, SimeonOnSecurity, ITU Online, CrucialExams.

- Pacing: about a minute per multiple-choice question; watch the on-screen clock.
- PBQs: CompTIA says simulation PBQs can be skipped and returned to, but virtual PBQs cannot, and a warning screen says which you have. Many guides: do the multiple-choice first, come back for hard PBQs; give each PBQ a quick look to decide.
- Read every option, even when the first looks right.
- Use the scratch paper or whiteboard; the exam does not pause for breaks.
- Study: spaced review beats cramming; timed full-length practice; review every miss and keep a log; flashcards for acronyms, ports and commands; stick to one or two main resources; hands-on practice with command-line tools.
- Get calm and rested before the exam; check CompTIA's site for format changes.

## 6. How it behaves

### When a tip shows

- The run counts **new questions reached** (moving forward to a question not reached before in this run). Going back with Previous does not count. Acronym cards in cram do not count.
- The count **carries across runs** (my call): a student who does five 5-question practice runs still gets a tip. The counter and the next gap are saved.
- When the count reaches the gap, the box opens above the question just reached, the count resets, and a new random gap of 10 to 20 is picked.
- The very first tip comes after the first gap too, not at question 1 (my call: the first few questions should feel clean).
- The box stays open while the student moves between questions, until they close it or the run ends (my call). It never reopens by itself within the gap.
- If the gap is reached while the box is still open, the open tip stays as it is, the count resets and a new gap is picked (my call: never swap a tip out from under someone reading it).
- **One counter and one seen list for the whole app,** across all exams and both modes (my call). The seen list holds tip ids; at pick time, only the tips for the current exam (general plus that exam's) are eligible, so switching exams mid-pass just skips the other exam's tips. "Start the tips over" clears it all.
- **Progress is saved as it happens** (my call): each new question reached updates the counter, and each tip shown updates the seen list, through an app-wide store like `src/ui/marks/prefs.ts` that writes to the repo. An abandoned run keeps its count.

### What the box shows

- A short heading (for example "Study tip" or "Test-room tip", by the tip's group), the tip text, a ✕ **Close** button, and **Previous tip** / **Next tip** buttons.
- **Which tip:** the app works through every eligible tip in a shuffled order before any tip repeats (my call). Tips read with Next count as seen. "Previous tip" steps back through tips shown in this box.
- Reaching the end of the list starts a new shuffled pass.

### Accessibility and look

- The box is a labelled region (`aside` or `section` with a heading). Its arrival is announced politely; focus stays where the student is. Close and the cycle buttons work by keyboard and tap.
- Uses the app's theme tokens and meets AA contrast in light and both dark themes. No animation that drops opacity (see the marks ruling: a fade lets axe read colours below AA).
- Passes the bounds rules: no text escapes the box and no word splits, at 360 px and up.
- Answering, checking and navigation work the same with the box open or closed.

### Settings

- A "Study tips" section: a checkbox **Show study tips in practice and cram** (on by default, my call), and a button **Start the tips over**, which clears the seen list and the counter. It confirms in a short status line ("Tips start over from the beginning.").
- Stored as settings like the marks (`studyTips` on/off; tip progress such as seen ids, counter and gap). They travel with the backup, as other settings do. Unknown or broken values fall back to defaults.

## 7. The tip list

- Lives in the repo as data (for example `src/content/tips.ts` or a JSON file), each tip with a stable `id`, a group (`test-room` or `study`), the text, and an optional `exam` code.
- Each tip: one to three short sentences, plain words, written for someone with no test experience. Second person ("you").
- **Accuracy:** no tip states a rule or number that can go stale unless it is true today and sourced. Test-centre rules (ID, breaks, items allowed) are phrased as "check the current rules with your test provider" rather than stated as fact. PBQ type advice says to read the warning screen, not which exams have which type, unless sourced.
- **Originality:** written fresh. Run the existing 8-word overlap check (`check-drafts --ref` method) against the review notes; no tip may share 8 words in a row with a source.
- A unit test checks: ids unique, at least 100 general tips, 5 to 10 per shipped exam, each exam code is a real exam, text length within limits, and the five owner tips are present (by id).
- Per-exam tips focus on what is special about that exam (for example Data+ math by hand, the exam's PBQ templates). **Numbers that live in the exam's metadata** (time, question count, passing score) are never typed into tip text: a tip uses a placeholder such as `{minutes}` or `{maxQuestions}`, filled from the metadata when shown (my call). A test checks every placeholder is known and every shipped exam fills it.

## 8. Left to the builder

- Component and file names, the exact storage keys, and how the counter is shared between practice and cram (one shared counter is expected).
- Exact heading wording and button labels, within the above.
- How the tips are drafted (the owner's rule: cheapest model that does the job; a review pass for accuracy and originality).
- Tests: unit tests for the picker and counter (seeded or injectable random), the component, Settings; an e2e check that the box appears, closes, cycles and stays axe-clean and in bounds at phone and tablet width, light and dark.

## 9. Constraints

- Works offline and in the single-file build (tips are bundled, no fetch).
- Existing rules hold: axe clean, bounds check, AA contrast, no GitHub Actions.
- Build, merge to `main` and deploy before #5 starts.
