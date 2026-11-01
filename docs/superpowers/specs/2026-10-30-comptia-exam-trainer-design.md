# CompTIA Exam Trainer — Design

Date: 2026-10-30 · Owner: ngcfells · Status: draft for approval

## 1. Intent

An offline, serverless study app for **all current CompTIA certification exams**. It mimics the real exam experience as closely as is legally allowed. It is used for two things:

- **Cram sessions** right before the exam.
- **Long-term learning** that adapts to the learner's performance.

The owner tests it first and may later release it publicly. The project must therefore stay within CompTIA's candidate agreement, trademark rules and copyright law.

## 2. Goals

- Support every current CompTIA exam. The pilot covers **Data+, SecAI+ and AutoOps+**; the other exams follow.
- Support MCQs (single-answer and select-all-that-apply) and **interactive PBQs** of 8 types (§6).
- Offer timed (real-exam rules) and untimed modes for MCQs and PBQs.
- Provide an acronym tester for each exam, with a complete acronym list (§8).
- Explain every question after the test is complete.
- Let users add their own questions at their own risk, with a toggle between **Ours / Mine / Both**.
- Look as close to the real CompTIA (Pearson VUE) exam UI as possible without copying protected assets.

## 3. Non-goals and anti-goals

- **Anti-goal:** shipping or ingesting real exam questions (braindumps), or copying third-party question text word for word, including legitimate samples. All bundled content is original.
- **Anti-goal:** scraping behind a login, or using the owner's examtopics.com credentials for scraping.
- **Anti-goal:** using CompTIA or Pearson logos, trade dress or any claim of affiliation.
- **Non-goal:** a server, accounts, cloud sync or multi-user features. A single local user per browser is fine.
- **Non-goal:** a real shell or real execution in terminal PBQs. They are simulated.

## 4. Constraints

- The app is a **responsive single-page app** for phones, tablets, laptops and desktops. It ships two ways from one build:
  1. **A single self-contained `index.html`**, with all JS, CSS and question data inlined using `vite-plugin-singlefile`. It runs by double-click (the `file://` protocol) with no server, no install and no network access.
  2. **An offline-capable, installable PWA hosted on GitHub Pages**, for phones and tablets.
- **GitHub limits (owner):**
  - **No GitHub Actions workflows and no Git LFS.** The build runs locally, and the built output is committed to a `gh-pages` branch, or to `/docs` on main, which Pages serves directly.
  - Pages' own branch deploy job is free on public repos, so **the repo must be public**. If it has to stay private, raise this before deploying.
  - All assets stay small text or SVG, so LFS is never needed.
- Question banks are **bundled into the build**, so the `file://` restriction on fetching JSON doesn't apply. For the PWA, a service worker caches everything for offline use.
- Touch support is required for every PBQ, with tap-to-select alongside drag-and-drop.
- Saved state (progress, spaced-repetition history, results history, user questions) lives in browser storage, using IndexedDB, with localStorage as a fallback. **Export and import** go through a JSON file for backup and moving between machines.
- **Stack (Claude's call, owner can override):**
  - **React + TypeScript + Vite.**
  - **dnd-kit** for drag-and-drop, chosen for its built-in keyboard and screen-reader support.
  - **vite-plugin-pwa** for the PWA build.
  - **Vitest** for unit tests, and **Playwright with @axe-core/playwright** for end-to-end and accessibility tests.
  - The build step exists only on our side; users get static files.
  - Java was considered and rejected, because it can't run in a browser or on a phone without a runtime install. Target browsers are current Chrome, Edge and Firefox.

## 5. Exam catalog and data model

### Exam metadata

Each exam has a metadata record containing:

- Code and version (for example DA0-002)
- Name
- Domains, with an id, title and weighting %
- Objectives, with an id (such as "2.3") and title
- Maximum question count
- Time limit
- Passing score (out of 900)
- Official acronym list

These details are verified against CompTIA's published objectives PDF and exam page at content time, and the exact codes are confirmed in the content chunk.

### Question records

Every question carries:

- `id`
- `exam`
- `source` (`ours` or `user`)
- `type` (`mcq-single`, `mcq-multi`, or a PBQ type)
- `objectiveIds[]`
- `difficulty` (1–3)
- `stem`
- type-specific `payload`
- `answer`
- `explanation` (overall, plus one per part for PBQs)
- `acronyms[]` (auto-extracted)
- `status` (`draft`, `reviewed` or `approved`; only `approved` appears in our bank)

## 6. PBQ engine

PBQs are **templates plus data**. Each template renders, collects the response and scores each part. The 8 types, all required, with at least 5 of each per exam:

1. Drag-and-drop match
2. Order the steps
3. Configure fields and dropdowns
4. Label or place on a diagram (using an SVG or HTML diagram with drop zones)
5. Logs or a simulated terminal, where the user reads output and types a command or chooses an action. Answers are matched against accepted patterns.
6. Data table or chart analysis
7. Select-all hotspot
8. Sort into buckets

Every part is scored independently to give **partial credit**. The same templates power user-authored PBQs through the add-question form.

## 7. Exam modes and scoring

### Mock exam (timed, real rules)

1. Pick the number of PBQs: 1–6, weighted toward 2–4.
2. Each PBQ has an **MCQ-equivalent weight `w` from 1 to 6**, based on its difficulty and the number of responses it needs (1 for extremely simple, 6 for extremely hard with many parts). The weight is stored on the question; for our questions it's set at authoring time and confirmed in review.
3. **MCQ count = the exam's maximum question count − Σw.** For example, with a maximum of 90 and three PBQs weighted 6, 6 and 6, the exam has 72 MCQs. MCQs are sampled across domains by weighting.
4. **PBQs come first, then MCQs.**
4a. **Randomness (owner requirement):**
   - Each mock exam draws a *different random set* of questions from the bank, not just a reshuffled order, while still honouring the domain weighting.
   - Questions seen in the user's recent exams are deprioritized, so repeat attempts see fresh items until the bank is exhausted.
   - The order of MCQ answer options and of PBQ elements (draggable items, steps, buckets) is shuffled per attempt.
   - The random generator is seedable, so tests are deterministic. The seed is stored with each result so the attempt can be reproduced.
5. The user can **flag for review**, use a review screen to jump back, and submit at any time. The exam submits automatically when the timer hits zero.

### Scoring (owner's model)

- Each MCQ is worth **10 points**. Select-all MCQs give proportional partial credit; scoring rule settled by the builder: correct picks minus wrong picks, floored at 0.
- The **PBQ pool is 900 − (MCQ count × 10)**, split across the PBQs in proportion to their weight `w`. Example: 72 MCQs give 720 points, leaving 180 points across 3 PBQs. Because the MCQ count is the maximum minus Σw, the pool is always positive.
- Each PBQ awards its share in proportion to the parts it got right.
- The result is a pass or fail against the exam's real passing score. The UI notes that CompTIA's real score is scaled, so ours is an approximation.

### Untimed practice

- The user chooses the exam, the domains or objectives, the question types and the count.
- Feedback can be instant or shown at the end.
- PBQs still come first when they're included.

### Cram mode

A fast, short session that combines:

- the user's weakest objectives
- questions that are due for review
- acronyms

There is an optional countdown.

### Learning over time

- **Spaced repetition** (SM-2 or similar) for questions and acronyms, with missed items resurfacing sooner.
- A **domain and objective mastery** dashboard.
- A history of results with a trend line.

### Results screen

- The score out of 900 and **PASS or FAIL**.
- A score breakdown by domain.
- A review of every incorrect or partially incorrect item: the user's answer next to the correct one, an explanation, and the right or wrong state of each PBQ part.
- **What to study:** the weakest objectives listed with their titles, plus a "drill these" button.
- Each result is saved to history.

## 8. Acronym tester and acronym completeness

### Modes

- Flashcards in both directions.
- A timed quiz, by typing the answer or choosing from options.
- Spaced repetition.

### Sources for each exam's list, merged and deduplicated

Each entry is tagged with its source (`official` or `community`):

1. The official acronym list from the objectives PDF.
2. Auto-extraction from all of our questions and explanations. This is a check that runs at content build time, and it fails if an acronym has no expansion.
3. Extraction from user-added questions into that user's local list.
4. Public, non-login discussion pages for the exam code, **including dump sites**. The harvester extracts **only acronym tokens**, discards the question text right away and stores nothing else. It runs at a slow, polite rate and respects robots.txt.
5. Public study resources (such as the Professor Messer acronym lists) as a cross-check.

Expansions for non-official acronyms are written or verified by us.

## 9. User-added questions

- An add/edit form covers every question type, including all 8 PBQ templates. Questions can also be imported and exported as JSON.
- Before the first add, a notice states that the user is solely responsible for their content and must not add NDA-protected or braindump material.
- User questions are stored locally only and are **never bundled** with the app.
- A source toggle offers Ours, Mine or Both, and applies to every mode.

## 10. Look and feel

- The layout mirrors the real testing interface:
  - a top bar with the question number out of the total, a timer and a flag control
  - Previous and Next buttons at the bottom
  - a review screen with a grid of answered, unanswered and flagged items
  - a plain, high-contrast exam font and style
- The app uses **no CompTIA or Pearson logos, names in the branding, or copied assets**. It uses our own neutral app name and styling that evokes the real interface without copying it.
- Outside the exam, the dashboard and study modes can be friendlier and more modern.

## 10a. Accessibility (owner requirement)

- The target is **WCAG 2.2 AA** across the whole app, including the exam shell, all 8 PBQ templates, the question adder and the review tool.
- **Every drag-and-drop interaction has a keyboard alternative.** For example, the user selects an item, then selects a target, using arrow keys and Enter/Space. These alternatives are also announced to screen readers through ARIA live regions.
- Visible focus is required, along with correct roles and labels, a full screen-reader experience for the timer and the flag and review state, sufficient colour contrast in both themes, and a reduced-motion option.
- **Enforcement:**
  - **axe-core** runs in automated tests through Playwright (`@axe-core/playwright`) on every screen and every PBQ type, and any serious or critical violation fails the build.
  - **eslint-plugin-jsx-a11y** runs static checks on all components.
  - Each UI chunk includes a manual keyboard-only pass.
- Every UI chunk's definition of done includes axe passing.

## 11. Legal and licensing

- **Code:** MIT with the Commons Clause: free to use and share, including by businesses, but not to sell (owner, 2026-10-30; was MIT).
- **Bundled original question content:** CC BY-NC 4.0, plus an additional permission for organisations, businesses included, to use it for teaching and internal training at no charge to learners (owner, 2026-10-30).
- **DISCLAIMER**, shown in the app and in the README:
  - The app is not affiliated with or endorsed by CompTIA.
  - CompTIA and its exam names are trademarks of CompTIA, Inc.
  - Content is original and written from publicly available exam objectives.
  - No exam content is included.
  - It is not a guarantee of passing.
- **User-content notice** (see §9).
- A legal review is recommended before public release.

## 12. Content pipeline (per exam)

1. **Objectives:** fetch CompTIA's public objectives page and PDF, then extract domains, objectives, weightings, exam facts and the acronym list into exam metadata.
2. **Drafting:** a local **Ollama** model drafts MCQs and PBQs per objective in our JSON schema. *This step is trialled on about 10 items first. If the quality is poor, drafting moves to Claude subagents using the strongest current model.* **Trial outcome (chunk 8):** the Ollama trial met the bar only at the margin (8 of 10 keys acceptable, about 13 minutes per 10 items), so the Data+ bank was drafted by Claude subagents, then reviewed by two independent reviewers per domain.
3. **Review:** Claude reviews every draft for accuracy and alignment with its objective, and writes or fixes the explanations. Our answers are determined independently.
4. **Approval:** the owner approves or edits each item in the **review tool**. This is a dev-only page that is never shipped. It shows each draft rendered as in the exam, with Approve, Edit and Reject buttons, and writes the results back to the bank files through a small Node helper script. The status moves from draft to reviewed to approved.
5. **Automated checks:**
   - the schema is valid
   - every acronym has an expansion
   - objective coverage meets the targets
   - no near-duplicate questions
   - there are at least 5 PBQs of each type
6. **Pilot volume targets for each exam (doubled by the owner):** at least **80 PBQs (8 types × 10)** and at least **500 MCQs**. Each objective gets a minimum number of questions in proportion to its domain weighting.

## 13. Work chunks (one session each, `/clear` + handoff between)

**Owner priority:** Data+ (DA0-002) comes first. Get the whole app working end to end on Data+, which is why its content is chunk 8, before any other exam is added. SecAI+ and AutoOps+ follow after that.

Each chunk ends with a `HANDOFF.md` update that records what's done, what's next and any open issues.

1. **Scaffold and engine core:**
   - folder layout and the exam and question schema
   - the bank loader and storage layer
   - export and import
   - a seed exam with 3 dummy questions
   - a test harness
2. **Exam UI:** exam-style shell, MCQ rendering, timer, flag and review, submit, scoring and the results screen.
3. **PBQ templates 1–4**, with tests.
4. **PBQ templates 5–8**, with tests.
5. **Study modes:** untimed practice, cram mode, spaced repetition, the mastery dashboard and history.
6. **Question adder:** an authoring form for every question type, including all 8 PBQ templates with a live preview. It also covers editing and deleting questions, the Ours / Mine / Both source toggle, JSON import and export, and the user-content notice.
7. **Acronym tester.**
*Reordered by the owner on 2026-10-30: the shipped Data+ bank comes straight after the acronym tester, ahead of legal, branding and deploy.*

8. **Data+ shipped question bank:** generate the original MCQs and PBQs we ship for DA0-002 and load them into the bundled bank, meeting the §12 targets. This chunk includes the content tooling it needs:
   - an objectives extractor, which resolves every placeholder value, the real objectives and the official acronym list
   - drafting and review (§12 steps 2–4)
   - the validation checks (§12 step 5)
9. **Legal, branding and deploy:**
   - licenses, disclaimers and the About page
   - look-and-feel polish
   - responsive and touch checks on phone and tablet sizes
   - the PWA service worker
   - a local `deploy` script that pushes the build to GitHub Pages without using Actions
10. **Remaining tooling:**
    - the acronym harvester, with the dump-site source off by default
    - the dev-only review tool, which reuses the question adder's preview, unless chunk 8 already needed it
11. **SecAI+ content.** *Done 2026-11-01: CY0-001 with 561 MCQs and 105 PBQs.*
12. **AutoOps+ content.**
13. Each remaining exam gets its own content chunk.

**Builder's calls (owner can override):**

- "Current" means active exams only, excluding beta and retiring versions. If a pilot exam's objectives aren't published yet, that exam's content chunk flags it and a substitute exam is chosen.
- Claude's drafting and review happen inside Claude Code sessions using subagents. No Anthropic API tooling is built.

## 14. Left to the builder

- Internal code structure, file naming, the test framework and the spaced-repetition algorithm details.
- The exact weighting formula, as long as it matches §7.
- Diagram rendering approach.
- The app's name: propose 2–3 options to the owner.
