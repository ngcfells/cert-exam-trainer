# Everything in the app: Settings anywhere, exam tools, leaving ends the mock (design)

**Date:** 2026-11-06. **Status:** approved by the owner in chat, 2026-11-06.
**Related:** issue #5 (the Bash/PowerShell primer) comes after this work and gets its own design.

## Why

The owner wants the mock exam to behave like the real proctored exam: if the learner leaves the app, the exam
stops. That only works if everything a learner needs while answering is inside the app, as it is on the real
exam: Settings, a calculator and a whiteboard. CompTIA's online-proctored rules say looking off-screen may end an
exam, and they allow the built-in digital whiteboard only
(<https://www.comptia.org/en-us/resources/test-policies/online-proctored-exam-guidelines/>).

## Goals

1. **Settings from anywhere.** A Settings button in the app header on every screen (today it shows on Home only,
   `src/App.tsx`). It opens Settings as a panel over the current screen. Closing it returns to the same place with
   nothing lost (answers, flags, place in a run, unsaved editor text), and focus goes back to the Settings button.
   Theme, answer marks, tips and other display settings take effect on the screen underneath at once.
2. **Exam tools.** Calculator and Whiteboard buttons, side by side in the exam top bar (owner's memory of the real
   Pearson VUE exam screen). Both open as panels over the question.
   - **Calculator:** + − × ÷, %, ±, square root, x^y, memory (M+, M−, MR, MC), clear. Keyboard, tap and screen
     reader. The basic layout is the owner's memory; the extra keys are our call so Data+ math (standard deviation,
     CAGR with a fractional power) can be done. **VERIFY** the real key set; if the real exam has a basic calculator
     only, remove the extra keys and flag the questions that need them.
   - **Whiteboard:** a typing area and a drawing area, as on Pearson's OnVUE whiteboard
     (<https://www.pearsonvue.com/us/en/onvue/whiteboard.html>). Drawing works with mouse, trackpad and touch (touch
     is our call; Pearson's is mouse/trackpad only). Cleared when the exam ends.
   - Shown in mock exams, practice and cram (our call: learners get used to them before a mock).
3. **Leaving ends the mock exam.**
   - Before Start, the mock setup shows this warning, and Start stays disabled until "I understand" is ticked:
     "Leaving the app ends this exam and scores it as it stands. That includes switching tabs or apps, locking your
     phone, and notifications or alarms that take over the screen. Silence notifications before you start."
   - During the exam, leaving = the page becomes hidden or the window loses focus to another app. The exam is then
     submitted at once with what is answered, the same path as a timeout. The results screen says
     "Ended because you left the exam."
   - Mock exams only. Practice, cram, lessons and acronym runs are not affected.
   - Settings, the calculator, the whiteboard, the review grid and the submit dialog are inside the app and never
     count as leaving.
   - **The app's own Back and All exams buttons during a mock** (owner, 2026-11-06): they now end and score the
     exam, the same as leaving the app. Their prompt becomes "Leave and score the exam now?". Cancel stays on the
     exam. There is no way left to throw away a started mock unscored.
   - **Refresh or closing the page during a mock** (owner, 2026-11-06) counts as leaving. The exam in progress is
     saved as the learner goes (answers, flags, start time). The next time the app opens, that exam is scored as it
     stood and saved with the "left" reason, and the learner sees its results. A refresh is never a do-over.
   - The "I understand" box starts unticked for every mock exam (our call: the warning is read each time).
   - Detection is strict, with no grace period (our call, in line with "no backdoors"): the page going hidden, or
     the window losing focus to anything outside the page (another app, devtools, a phone's notification shade),
     ends the exam. Focus moving between parts of the page, or a native select list opening, does not.
   - The attempt stores why it ended (`endedBy: 'left'`; timeout and submit as today). The field is optional, so
     older attempts and backups still load (our call).

## Rules that do not bend

- **The timer never pauses.** It keeps running while Settings, the calculator or the whiteboard is open, and it can
  still auto-submit. No panel hides it; the time left shows at the top of the Settings panel during a mock exam.
  No pause, no backdoor (owner, 2026-11-06).
- The leave guard does not fire when a panel opens, since nothing is left.
- **Backup import stays off the panel** (our call): it replaces saved data, so it lives on the full Settings page,
  reached from Home. Every other setting is in the panel.
- Accessibility as everywhere: keyboard and screen reader, focus trapped in an open panel and returned on close,
  axe clean (no serious or critical), light and dark. Text stays in bounds at 360 px and 1280 px (bounds check).

## Non-goals

- No pause of any kind.
- No calculator or whiteboard in lessons or the acronym tools.
- The primer (#5) is not part of this work.

## Our calls (from the builder check, 2026-11-06)

- **Panels are overlays**, not a new screen, so nothing underneath is unmounted. Settings, the calculator and the
  whiteboard share one dialog component. The Settings panel shows the same settings as the full page, minus
  backup.
- **One panel at a time.** Opening one closes another. The submit dialog, an auto-submit or the results screen
  closes any open panel first.
- **Answer marks and tips during a mock:** they can be changed in the panel, but a mock shows no answers until
  results, so they take effect in practice, cram and on the results screen. The panel can't reveal an answer.
- **Practice and cram:** the Calculator and Whiteboard buttons sit in the run's header next to the progress line
  (those screens have no exam top bar).
- **The whiteboard and the calculator memory** last for one run (one mock, practice or cram session), across
  questions, and are cleared when it ends.
- **Whiteboard accessibility:** the typing area is the keyboard and screen-reader path. The drawing area is
  labelled and has a Clear button, but nothing requires drawing.
- **Calculator logic:** it runs each key as you press it, like a basic desk calculator (2 + 3 × 4 = 20). % divides
  the shown number by 100. Divide by zero shows "Can't divide by zero", and an impossible power or root shows "Not
  a number". The next key clears the message.

## Left to the builder

- How the in-progress mock is stored for the refresh rule (IndexedDB, next to attempts, is expected).
- How focus-loss is detected without false alarms from our own panels (for example, ignore `blur` when focus moves
  inside the document; use `visibilitychange` plus window `blur`).
- Calculator number display and rounding (show enough digits for Data+ answers; no locale surprises).
- A list of Data+ items that cannot be done with these keys goes in the ledger for the owner.
