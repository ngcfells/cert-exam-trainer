# "Learn more" search links on every question (issue #6)

## Intent

After a learner answers a question, they can click a 🤔 button to look the topic up on a free learning site. The owner
wants free resources (W3Schools, free courses and similar), and wants the learner to choose which one. A search page
does this: it never goes stale, and it needs no hand-checked link list.

## Goals

- Every question has a 🤔 "Learn more" button next to its explanation, shown after answering.
- The button opens a small menu of free sources. Choosing one opens that source's search page, filled in with the
  question's own search phrase, in a new tab.
- Each question has its own short search phrase (for example `DNS TTL`, `bash local variable`).
- Works in study and cram (and wherever the explanation shows after answering, such as review).

## Non-goals

- No hand-picked per-question URLs, no embedded content, no URL checking (a search page cannot go stale).
- No tracking: the app sends nothing about the learner. Links use `rel="noopener noreferrer"`.
- Not shown in a mock exam (matches the real exam and the primer rule), nor before the answer is given.

## Anti-goals

- A phrase so vague it returns junk (an exam name alone). A phrase that leaks the answer before the learner answers
  (it appears only after answering, so this only matters for quality, not for cheating).
- A menu that offers a source that does not fit the exam (pandas docs on a security exam).

## Constraints

- The three banks (AT0-001, DA0-002, CY0-001) hold thousands of questions. Phrases are content: do one exam per
  session, with a cheap model drafting and a spot check, per the owner's one-domain-per-session rule.
- Existing rules hold: tests first, `npm run check` green, one Opus whole-branch review, fix every finding (minors
  too), merge, push, `npm run deploy`.
- Same accessible-name, keyboard and phone-width standards as the rest of the app (axe tests exist).

## Decided by the owner

- Per-question links, not per-objective. Search pages so the learner chooses the resource. Free sources only.
  The 🤔 icon (or similar) as the anchor.

## My calls (owner can override)

- Source menu, about 5 to 8, in a data file, each with a per-exam "applies to" list: W3Schools, freeCodeCamp,
  Khan Academy, Professor Messer, Microsoft Learn, MDN, and a general web search. The exact list and each search URL
  pattern are checked by hand once.
- Phrase storage: an optional `searchTerm` string on each bank question, authored in the bank JSON. If a question has
  none, fall back to its acronyms plus its objective title, so the button always works while content is filled in.
- The schema and validation (non-empty, short, no URL characters) get a bank test. A coverage test reports how many
  questions still use the fallback.
- Phrases are drafted by a Haiku subagent per exam, then spot-checked by me; the owner can review a sample.
- The button is hidden in mock mode and while a question is unanswered.

## Added after the builder check (my calls unless noted)

- Exam folders: `autoops` = AT0-001, `dataplus` = DA0-002, `secai` = CY0-001 (confirmed from the bank files).
- All question types share one bank schema, so `searchTerm` is one optional field. The button goes wherever an
  answered explanation shows: study, practice, cram, and the review of a finished exam (the exam is over by then).
  It never shows during a live mock.
- Source-to-exam mapping is mine to draft (programming and web sources for AT0-001 and DA0-002; security and
  networking sources for CY0-001; general search for all), and I check each source search URL pattern by hand once.
- Button: a labelled button reading "Learn more" with the 🤔 icon, placed under the explanation. The phrase is
  URL-encoded at click time. The app logs and sends nothing; the service worker does not touch outbound links.
- Phrase limits: 2 to 6 words, at most 50 characters, letters, digits, spaces, hyphens and periods only.

- Decided by the owner (2026-11-10): ship first. The code, schema and fallback phrase release on their own, and each
  exam's better phrases go live as its content session finishes. This plan covers the code and schema; the three
  content passes are separate sessions after it.

## Left to the builder

Component shape, menu behaviour (popover vs inline), icon implementation (React icon set vs emoji), the exact
fallback wording, test layout, and the batching of the content passes.
