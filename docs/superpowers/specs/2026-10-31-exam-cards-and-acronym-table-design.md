# Exam cards, consistent navigation, and one acronym table

Status: draft for owner review (2026-10-31). Builds on the main spec, `2026-10-30-comptia-exam-trainer-design.md`.

## Why

The app is growing from one exam to many. Today Home is a single list with every exam's buttons, and the source and theme controls sit above it. With ten exams that becomes a wall of buttons. The owner wants:

- a clean landing page where each exam is a card;
- an exam page per card that holds that exam's counts, its question-source choice and its tools;
- a Back control in the same place on every screen, plus a way home;
- app-wide settings in one Settings area, not loose at the top of Home;
- "Ours" and "Mine" renamed to **Stock** (what we ship) and **Custom** (what the user adds);
- one acronym table for the whole app, which each exam references, because the same acronym often appears in several exams and can have two or three meanings that all apply to one exam.

## Goals

1. Landing page: app title; **Settings** at the top right; a grid of exam cards; **About** at the bottom right of the page.
2. Ten exam cards, each opening an exam page with the same tools Data+ has today.
3. Every screen below the landing page shows **← Back** and **⌂ All exams** in the same spot at the top, and again at the bottom when the screen is taller than the window.
4. Stock / Custom counts and the source choice live on each exam page, chosen per exam.
5. One master acronym table; each exam lists which terms and which meanings apply to it.

## Non-goals

- New question content for the eight new exams (each gets its own content chunk later).
- Changing how scoring, SRS, assembly or the PBQ templates work.
- Changing the backup or question-pack file formats. Stored values stay `ours` / `mine` / `both`; only the words on screen change.

## Anti-goals (failure even if it works)

- A learner loses an exam in progress because Back was one click away. Leaving a mock exam, practice, cram, lesson check or quiz that has answers asks first.
- Back moves around from screen to screen, or a screen has no way home.
- A card for an exam with no questions crashes or shows a blank screen. It must open and show the same tools with honest empty states.
- An acronym shows a meaning that does not apply to that exam, or hides one that does.
- Provisional exam details are presented as official.

## Landing page

- Header: app name (as today, `APP_NAME`) on the left; a **Settings** button at the top right.
- The storage banner (when storage is not persistent) stays at the top.
- A responsive grid of exam cards. Each card is one button whose accessible name includes the exam name and code, for example "CompTIA Data+ (DA0-002)". The card shows the name, the code, and the Stock question count. A card for an exam whose details are not final shows the label "Details not final".
- Card order (owner's list first): Data+, SecAI+, AutoOps+, CySA+, Cloud+, AI Essentials, then CloudNetX, Security+, SecOT+, AI Fundamentals.
- **About** link at the bottom right of the page, replacing today's footer button. The disclaimer footer text stays.

### Settings

The Settings button opens a Settings screen (same navigation rules as every other screen) with:

- Theme: System / Light / Dark (today's `DisplaySettings`).
- Reduce motion (today's `DisplaySettings`).
- Backup: Export and Import (today's `BackupControls`).

The question-source toggle is **not** here; it moves to each exam page.

## Exam page

Opened by clicking a card. Top to bottom:

1. Navigation bar: **← Back** (to the landing page here) and **⌂ All exams**.
2. Title: "CompTIA Data+ (DA0-002)". "Details not final" label when provisional, with one line saying what is provisional (for example "Domain weights and exam format are not published yet").
3. Counts: "Stock: 657 questions · Custom: 19 questions".
4. **Questions to use**: Stock + Custom (default) / Stock only / Custom only. Saved per exam.
5. Tool buttons: Mock exam, Practice, Cram, Learn (only when the exam has lessons), Acronyms, Progress, My questions, and Review bank (dev builds only).
6. Navigation bar again at the bottom when the page is taller than the window.

For an exam with no Stock questions the page still shows every tool. Each tool shows its existing empty or short-bank message (for example the mock exam's short-bank notice, or "no questions match" in practice).

## Navigation on every other screen

- Every screen other than the landing page (exam page, Settings, About, and every tool and sub-screen) renders the same navigation bar at the top: **← Back** and **⌂ All exams**, in the same position and order.
- The same bar repeats at the bottom of the screen when the content is taller than the window (it is hidden when everything fits).
- **← Back** goes up one level. On a tool's first screen that is the exam page, and the label names it ("← Back to Data+"). Inside a tool it goes to that tool's previous level, for example lesson → lesson list → exam page. The in-screen "Back to home" / "Back to lessons" buttons that exist today are replaced by this bar so there is one way back.
- **⌂ All exams** always goes to the landing page.
- When the user is part-way through a timed or answered run (mock exam, practice, cram, lesson check, acronym quiz or flashcards), Back and All exams ask first: "Leave this exam? Your answers will be lost." Results screens do not ask.
- Focus moves to the new screen's heading after navigation, as today.

## Stock and Custom

- On screen, "Ours" becomes **Stock** and "Mine" becomes **Custom** everywhere: exam page counts, the source choice, My questions, the acronym table's source column, notices and help text.
- The setting moves from one global `sourceFilter` to one per exam, `sourceFilter:<exam code>`. If an exam has no per-exam value yet, the old global value is used, so existing users keep their choice. Values stay `both` / `ours` / `mine`.
- The source choice is one shared component; each exam page passes its exam code, and `loadPool` reads that exam's setting. (Owner: "a lookup, with the exam calling its own data", so the code is written once.)

## Exams

All ten are registered with the same metadata shape. Values come from comptia.org (checked 2026-10-31) and are recorded in `docs/sources/<code>.md` as for Data+ and SecAI+.

| Card | Key / code | Format | Domains (weight) | Objectives |
| --- | --- | --- | --- | --- |
| Data+ | DA0-002 | as today | as today | as today |
| SecAI+ | CY0-001 | as today | as today | as today |
| AutoOps+ | AT0-001 | 60 Q, 60 min, pass 600 | Automation Coding Concepts 31, System Configuration 25, Continuous Integration 24, Continuous Delivery 20 | from the objectives PDF in `_WorkingData/AutoOpsPlus/` (verified, with its acronym list) |
| CySA+ v4 | CS0-004 | 85 Q, 165 min, pass 750 | Security Operations 34, Vulnerability Management 26, Incident Response and Management 24, Reporting and Communication 16 | provisional |
| Cloud+ | CV0-004 | 90 Q, 90 min, pass 750 | Cloud Architecture 23, Deployment 19, Operations 17, Security 19, DevOps Fundamentals 10, Troubleshooting 12 | provisional |
| CloudNetX | CNX-001 | 90 Q, 165 min, pass/fail | Network Architecture Design 31, Network Security 28, Network Troubleshooting 25, Network Operations, Monitoring, and Performance 16 | provisional |
| Security+ v8 | SY0-801 | 90 Q, 90 min, pass 750 | General Security Concepts 16, Threats, Vulnerabilities, and Attacks 24, Security Architecture 19, Security Operations 27, Security Program Management and Oversight 14 | provisional until the owner supplies the v8 objectives |
| SecOT+ | SOT-001 | provisional | the 6 published domain names, weights provisional | provisional |
| AI Essentials | our key, not a CompTIA code | provisional "assessment" | the 6 published learning areas, weights provisional | provisional |
| AI Fundamentals | our key, not a CompTIA code | provisional "assessment" | focus areas from the course page, weights provisional | provisional |

Rules:

- **Provisional values are marked in data**, not only in comments: the metadata gains an optional `provisional` list naming what is not final (for example `['weights', 'format', 'objectives']`). The exam page shows "Details not final" with that list in words. Tests may assert that verified exams have no `provisional` list.
- **Provisional objectives** are one objective per domain (id `<domain>.0`, the domain title as its title) until the real objectives arrive. They are replaced, not kept, when a content chunk starts for that exam.
- **Provisional weights** are equal shares that sum to 100.
- **Provisional format**: SecOT+ uses 90 questions, 90 minutes, pass 750 (as Security+); the two course assessments use 20 questions, 30 minutes, pass 700 and are labelled "Assessment" rather than "Mock exam" on their pages.
- **CloudNetX** is pass/fail with no published scaled score. Results still show a score out of 900 for practice, with the pass line at 750 and a note that CompTIA reports pass/fail only. This is our call and is listed as provisional.
- **Security+ domain order** follows v7's numbering until the v8 objectives arrive.
- Each new exam gets an empty items folder and a small fixture (like SecAI+'s) only if a test needs it; the shipped-bank checks run on every registered exam and pass on an empty bank.
- Official acronym lists: Data+, SecAI+ and AutoOps+ have them. The others start empty and are filled when their objectives arrive.

## One acronym table

- **Master table** (one file, for example `src/acronyms/master.ts` or JSON): each term maps to a list of meanings, each with a stable id and an expansion.

  ```
  IP:  [ { id: 'ip-intellectual-property', expansion: 'Intellectual Property' },
         { id: 'ip-internet-protocol',     expansion: 'Internet Protocol' } ]
  SOC: [ { id: 'soc-security-operations-center', expansion: 'Security Operations Center' },
         { id: 'soc-system-organization-controls', expansion: 'System and Organization Controls' } ]
  ```

- **Each exam references** the terms it uses: the term, which meanings apply (one or more, the first is the primary), and the source (`official` or `community`). An expansion is written once in the master table and never repeated in an exam's metadata.
- **Display**: the primary meaning first, then the other applicable meanings as "also: …". Flashcards, the full list, the quiz's answer reveal and the results tables all use this.
- **Quiz**: a typed answer is correct if it matches any applicable meaning. A multiple-choice quiz offers the primary meaning as the right choice, and never offers another applicable meaning as a wrong choice.
- **Custom acronyms** (the user's own, today `userAcronyms:<exam>`): the user may add a new term, or a new meaning for a term that is already in the table, for one exam. Stored as today (term + expansion per exam), so backups keep working.
- **Checks**: every acronym token in an exam's questions and lessons must have at least one applicable meaning for that exam (the existing coverage checks, using `acronymCovered`). The master table is checked for repeated terms, repeated meaning ids, and meanings no exam references.
- **Migration**: Data+'s and SecAI+'s current lists become references into the master table with no change in what a learner sees. SRS records stay keyed by term per exam.

## Testing

- Unit: landing page lists ten cards in order; Settings holds theme, reduced motion and backup and not the source choice; exam page shows counts above the source choice; per-exam source setting with fallback to the old global value; Back/All exams on every screen; the leave-confirm on runs; master-table lookups (primary, alternates, any-meaning quiz match, no alternate as a distractor); provisional label.
- E2e: landing page and an exam page pass axe in light and dark at phone and desktop widths; keyboard-only path from a card to a tool and back; an empty exam (for example CloudNetX) opens every tool without errors; the bottom navigation bar appears only when the page scrolls.
- Every existing test that relies on today's Home layout is updated to the new path (card → exam page → tool), naming its exam.

## Left to the builder

- Card visual design within the existing theme tokens (no new colours outside `src/index.css` tokens).
- How the navigation bar learns a tool's inner "up one level" (for example a small context that a tool sets).
- The exact keys for AI Essentials and AI Fundamentals.
- The master table's file format (TypeScript or JSON).

## Calls made after the builder check (Claude's calls, owner to confirm)

1. **Leave-confirm** appears only after the first answer in a run (mock, practice, cram, lesson check, acronym quiz, flashcards once one is rated). Browsing with nothing answered leaves without asking. Bank review and My questions editing keep their own unsaved-change handling.
2. **One card per term** in flashcards, quiz and SRS. The learner is asked for the primary meaning. The reveal shows all applicable meanings. Multiple-choice distractors come from other terms' primary meanings and never match, by text, any applicable meaning of the term being asked.
3. **Custom meanings** are added after the master meanings as "also:" entries and never replace the primary. A custom expansion whose text matches an existing applicable meaning is dropped as a duplicate. Source is per meaning, so the source column shows each meaning's source.
4. **Exam reference replaces** today's `acronyms` field in the exam metadata schema; nothing sits beside it. A one-off script builds the master table from the current Data+ and SecAI+ lists and is checked by hand. For a term with several meanings, each exam's current expansion stays its primary, so nothing a learner sees changes. AutoOps+'s official list is read from its objectives PDF by hand and checked against it, like SecAI+'s was.
5. **Course cards** (AI Essentials, AI Fundamentals) show no parenthesised code, so our own key never looks like a CompTIA code. They read "CompTIA AI Essentials" with a "Course assessment" label. A metadata field `kind: 'exam' | 'assessment'` drives the "Assessment" wording on the button, the heading and the results screen.
6. **The old global `sourceFilter`** stays in storage untouched and is only read as the fallback. Backups already carry every setting, so per-exam keys round-trip, and an old backup with only the global key still restores and works through the fallback.
7. **"Details not final"** shows whenever `provisional` is non-empty. SecOT+ and both courses list `format` as provisional, and every exam other than Data+, SecAI+ and AutoOps+ lists `objectives`.
8. **The bottom bar** is checked live, on resize and when the content changes size. The two bars are separate `nav` landmarks labelled "Page navigation" and "Page navigation (bottom)".

## Open for the owner

- Browser and phone Back: see the question in chat. The answer is recorded here once given.
