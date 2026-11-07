# Command Primer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Bash/PowerShell command primer (issue #5) that opens as a "Command help" panel from typed-command questions in practice, cram and results, and as a standalone screen from the exam page, never inside a running mock.

**Architecture:** One shared topic set (JSON, Zod-validated on load, like lessons) in `src/primer/`. A pure matcher reads command words out of a question at runtime and maps them to topics through each topic's explicit aliases. One `TopicView` component renders in two hosts: an app-level panel (#14 panel system, so nothing underneath unmounts) and a standalone screen. A coverage test, with an allowance list that shrinks as content lands, gates the release.

**Tech Stack:** React 18, TypeScript, Zod 3, Vitest + Testing Library, Playwright + axe.

**Spec:** `docs/superpowers/specs/2026-11-06-command-primer-design.md`

## Global Constraints

- No emulator, sandbox or "run this command" box. No progress, check questions or done marks. Opening the primer changes no score, SRS schedule, mastery or chance.
- No "Command help" button or primer link anywhere inside a running mock exam. Results after a mock may show it.
- Opening and closing the panel never loses the learner's place, typed text or timer.
- No bank question or accepted answer changes. No PowerShell answers are added to any bank.
- A PowerShell cell is a command in backticks, exactly `Same command`, or starts `No close equivalent.` followed by one sentence on why. Never a made-up equivalent.
- Original writing only. Reference notes are read, never copied; the 8-word overlap check runs on primer prose (code stripped).
- Primer prose passes the acronym rules (`docs/acronyms.md`); command names in backticks are exempt.
- Links: free, reputable, no install needed to try commands, open in a new tab, marked external, with a note that they need a connection. The owner approves the final list once, before the final review.
- Accessibility: real `<table>` with a `<caption>`, code in `<code>`, the forms table stacks below 40rem, the panel traps focus and returns it to the opener, Learn more is a `<button>` with `aria-expanded` and `aria-controls`.
- Works offline except the external links.
- Repo rules: keep the `.superpowers/sdd` ledger, no GitHub Actions, no LFS, a busy port means use a free one, content work one group per session with Sonnet drafters and Haiku copy checks (never Opus between tasks).
- Branch `command-primer` from main. Merge only after the coverage test passes with an empty allowance list (Task 15).

## Decisions this plan makes (owner can overturn; each is cheap to change)

1. **Coverage rule, refined from spec call 8.** Every command word in every typed-step accepted answer must map to a topic, be a made-up tool, or be on a short reviewed `NOT_COMMANDS` list with a reason each. Measured today, that list is exactly: `df` (the assignment target in `df = df.astype(...)`), `loans.` and `members.` (the `table.column` start of an alternate ON answer), and `source` (the legacy `source activate` alternate, accepted but not taught). Without it, the literal rule would make table names into topics.
2. **`df` is disambiguated by the next character.** A command word keeps one following character when it is `[`, `.` or `(`. Pandas aliases are `df[`, `df.`, `pd.`; plain `df` (disk free, in the AutoOps option `` `df -h /var` ``) maps to nothing.
3. **Shell commands match case-sensitively; SQL matches any case.** So `HEAD`, `PATH`, `GET` in code spans never raise a button, while `ON`, `On`, `on` all reach SQL.
4. **`sudo` maps to the "Running as administrator" topic** and the matcher also reads the command after it (the spec's "sudo skipped" still holds).
5. **Exams per topic are computed**, not hand-listed in the JSON, so they cannot drift from the banks.
6. **Acronym check:** a topic's prose is checked against the list of every exam it is shown for (basics: every exam that shows the primer).
7. **Groups:** background jobs stays in Shell basics (spec Topics list); the `services` group is titled "Services".
8. **The panel lists the matched topics first, then the Shell basics topics** under their own heading, so a zero-experience learner can start from basics without leaving the question.

## Review Focus

1. Quotes that contain `|`, `;`, `&&` or `&` (awk programs, sed scripts, curl JSON bodies) must not split into fake commands: `awk '{ print $1; exit }' f` yields only `awk`. Test in Task 2.
2. Upper-case words and paths in MCQ code spans (`HEAD`, `PATH`, `./deploy.sh`, `~/.bashrc`, `9f3c2ab`) and `` `df -h /var` `` raise no button. Test in Task 2.
3. User-authored questions with odd content (empty output, an unclosed quote, a step id with no accept entry, a payload that is not a terminal payload) never throw; they just match nothing. Test in Task 2.
4. In timed practice, time running out while the panel is open closes the panel and finishes normally; text half-typed in a terminal step is still there after Close. Test in Task 5.
5. At 320px wide the primer screen and panel have no horizontal page scroll, including a long `curl` command in a forms cell. Test in Task 6.

---

## File structure

- `src/domain/primer.ts`: topic schema, groups, `primerText()` (prose for acronym and overlap checks).
- `src/primer/topics/<group>.json`: content, one file per group, topics in display order.
- `src/primer/topics.ts`: loader (validates, names the failing topic), `PRIMER_TOPICS`, `topicById`.
- `src/primer/links.json`: the "Practice safely" links.
- `src/primer/match.ts`: command-word extraction and topic matching.
- `src/primer/coverage.test.ts`: coverage test with the shrinking allowance list.
- `src/ui/primer/TopicView.tsx`, `FormsTable.tsx`, `ExternalLink.tsx`: one topic, two depths.
- `src/ui/primer/CommandHelpButton.tsx`, `CommandHelpPanel.tsx`: the panel host.
- `src/ui/primer/PrimerScreen.tsx`: the standalone host.
- `src/ui/primer/primer.css`, `src/ui/primer/primer.test.tsx`.
- `scripts/check-primer.ts`: overlap check and link check (manual, needs a network).
- Modified: `PanelProvider.tsx`, `App.tsx`, `StudyRunner.tsx`, `ResultsScreen.tsx`, `ExamPage.tsx`, `screens.ts`, `src/acronyms/content.test.ts`, `package.json`.
- e2e: `tests/e2e/primer.spec.ts` (fixture project), `tests/e2e/primer.responsive.spec.ts` (phone and tablet).

Ledger: `.superpowers/sdd/2026-11-06-command-primer/progress.md` (rulings, task completions, final review lines; keep it).

---

### Task 1: Topic schema and loader

**Files:**
- Create: `src/domain/primer.ts`, `src/domain/primer.test.ts`, `src/primer/topics.ts`, `src/primer/topics/basics.json` (one stub topic, `terminal`, replaced in Task 8)
- Test: `src/domain/primer.test.ts`

**Interfaces:**
- Produces:
  - `PRIMER_GROUPS = ['basics', 'text', 'network', 'files', 'services', 'dev', 'data'] as const`; `type PrimerGroup`
  - `GROUP_TITLES: Record<PrimerGroup, string>` = Shell basics, Working with text, Network checks, Files and security, Services, Developer tools, Data (SQL and pandas)
  - `topicSchema` (Zod) and `type PrimerTopic`
  - `primerText(t: PrimerTopic): string` (every prose string joined by `\n`, code left in; the acronym extractor strips code)
  - `parseTopics(raw: unknown[]): PrimerTopic[]` throws `primer topic <id> is invalid: <path>: <message>`
  - `PRIMER_TOPICS: PrimerTopic[]` (group order, then file order), `topicById(id: string): PrimerTopic | undefined`

Topic shape (strict objects; `rich` = non-empty string that may use backtick code):

```ts
row  = { bash: rich, powershell?: rich, does: rich }
topic = {
  id: /^[a-z0-9-]+$/, group: PrimerGroup, title: text, purpose: text,
  aliases: string[],            // command words; two words for a subcommand ('git push')
  anyCase?: true,               // SQL: aliases match ignoring case
  where?: rich,                 // set for SQL and pandas: where it is typed; then rows have no powershell
  what: rich[] (min 1),
  forms: row[] (min 1),
  example: { intro: rich, lines: { line: string (min 1), note: rich }[] (min 1) },
  trap: { wrong: rich, why: rich },
  more: { heading: text, paragraphs: rich[] (min 1), forms?: row[] }[] (min 1),
  links: { label: text, url: https URL }[] (default [])
}
```

- [ ] **Step 1: Write the failing tests** in `src/domain/primer.test.ts`:
  - `accepts a full shell topic` and `accepts a single-column topic with where and no powershell`.
  - `rejects a shell topic row without powershell` (path `forms.0.powershell`), `rejects powershell on a topic with where`.
  - `rejects a powershell cell that is not code, "Same command" or "No close equivalent. <why>"`: `'icacls'` fails; `` '`icacls`' ``, `'Same command'`, `'No close equivalent. Windows uses access lists, not mode bits.'` pass; `'No close equivalent.'` alone fails. Applies to `more[].forms` too.
  - `rejects a repeated alias within a topic`, `rejects an http link`.
  - `parseTopics names the failing topic`: `expect(() => parseTopics([{ id: 'grep' }])).toThrow(/^primer topic grep is invalid: /)`.
  - `primerText includes title, purpose, what, forms, example notes, trap, more and link labels`.
- [ ] **Step 2: Run** `npx vitest run src/domain/primer.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement** `src/domain/primer.ts` and `src/primer/topics.ts` (`import.meta.glob('./topics/*.json', { eager: true, import: 'default' })`, ordered by `PRIMER_GROUPS` index of the file name, then array order). Topic ids must be unique across files: `parseTopics` throws `primer topic <id> is repeated`.
- [ ] **Step 4: Run** the test again. Expected: PASS. Also `npx tsc --noEmit`.
- [ ] **Step 5: Commit** `feat(primer): topic schema and loader`.

### Task 2: Command-word matcher

**Files:**
- Create: `src/primer/match.ts`, `src/primer/match.test.ts`

**Interfaces:**
- Consumes: `PRIMER_TOPICS`, `PrimerTopic`, `Question` (`src/domain/types.ts`), `parseRich` (`src/domain/richText.ts`), `getBundledQuestions` (`src/banks`).
- Produces:
  - `type CommandWord = { word: string; sub?: string }`
  - `commandWords(line: string): CommandWord[]`
  - `questionCommandWords(q: Question): CommandWord[]` (deduped, first-seen order)
  - `MADE_UP_TOOLS: ReadonlySet<string>` = weblog, vulnai, proxyq, gr-suite, pipectl, logscrub, agentctl, gwctl, netpol, cloudctl, iacctl, rolloutctl, svcstat, secretctl, lintcheck, providerctl
  - `MADE_UP_TOPIC = 'made-up-tools'`
  - `wordTopic(w: CommandWord, topics?: PrimerTopic[]): PrimerTopic | undefined`
  - `topicsFor(q: Question, topics?: PrimerTopic[]): PrimerTopic[]` (topic order, unique)
  - `examTopics(exam: string, topics?: PrimerTopic[]): PrimerTopic[]` (union over `getBundledQuestions(exam)`)
  - `basicsTopics(topics?: PrimerTopic[]): PrimerTopic[]`

The `topics` parameter defaults to `PRIMER_TOPICS`; tests pass small inline topic lists.

Rules for `commandWords` (spec call 12, plus decisions 2 to 4):
1. Split into segments on `|`, `||`, `&&`, `;` and `&`, never inside single or double quotes. An unclosed quote runs to the end of the line.
2. In each segment, split on whitespace; skip leading `NAME=value` tokens (`/^[A-Za-z_]\w*=/`).
3. Token → word: a token starting with `%` gives `%` (job spec). Otherwise take `/^[A-Za-z_][A-Za-z0-9_-]*/`, plus the next character if it is `[`, `.` or `(`. No match (paths, `$VAR`, numbers, `*`) gives no word for the segment.
4. `sudo` emits `{ word: 'sudo' }` and the next token is read as the command.
5. For `git`, `docker`, `conda`, `systemctl`, the next token's word (rule 3, without the suffix) is `sub`.

Sources for `questionCommandWords`: for `pbq-terminal`, every accepted answer of a step without `options`, and every output line that starts with `$ ` (the text after it); for every question, the inline and block code spans (`parseRich`) of the stem, MCQ option texts, terminal step labels and terminal step option texts. Read the payload defensively (`Array.isArray`, `typeof === 'string'`); never throw.

`wordTopic`: try `"word sub"` against aliases first, then `word`. Aliases compare exactly, or lower-cased on both sides when the topic has `anyCase`. A word in `MADE_UP_TOOLS` gives `topicById(MADE_UP_TOPIC)`.

- [ ] **Step 1: Write the failing tests** in `src/primer/match.test.ts` (each `expect(commandWords(x)).toEqual(...)`):
  - `cat payments.log | grep ERROR | wc -l` → `[{word:'cat'},{word:'grep'},{word:'wc'}]`
  - `sudo systemctl restart invoice-api` → `[{word:'sudo'},{word:'systemctl',sub:'restart'}]`
  - `git push -u origin HEAD` → `[{word:'git',sub:'push'}]`
  - `nohup ./prune-cache.sh &` → `[{word:'nohup'}]`; `%2&` and `%+ &` → `[{word:'%'}]`
  - Review Focus 1: `awk '{ print $1; exit }' f` → `[{word:'awk'}]`; `curl --data '{"a":1}' -H "X: a|b" u && echo ok` → `[{word:'curl'},{word:'echo'}]`; `awk '{print` (unclosed) → `[{word:'awk'}]`
  - `df['order_date'] = pd.to_datetime(df['order_date'])` → `[{word:'df['}]`; `df.order_date = x` → `[{word:'df.'}]`; `df -h /var` → `[{word:'df'}]`; `using(member_id)` → `[{word:'using('}]`
  - `AWS_PROFILE=dev aws s3 ls` → `[{word:'aws'}]`; `./deploy.sh`, `$HOME`, `9f3c2ab`, `*` → `[]`
  - `wordTopic`: with inline topics `grep` (aliases `['grep']`), `git` (`['git']`), `sql` (`['select','on','using','using(']`, anyCase), `pandas` (`['df[','df.','pd.']`), `made-up-tools`: `{word:'git',sub:'push'}` → git; `{word:'ON'}` → sql; `{word:'df'}` → undefined; `{word:'df['}` → pandas; `{word:'Grep'}` → undefined; `{word:'weblog'}` → made-up-tools; `{word:'HEAD'}` → undefined.
  - `topicsFor`: a terminal question whose answers use grep and whose stem has `` `git status` `` → `[grep, git]` in topic order; an MCQ with `` `HEAD` ``, `` `PATH` ``, `` `df -h /var` `` → `[]` (Review Focus 2); a choice step's accepted ids (`'o1'`) are ignored.
  - Review Focus 3: `topicsFor` returns `[]` and does not throw for a `pbq-terminal` with `payload: {}`, with `answer: { accept: {} }`, with `output: ['$ awk \'{print']`, and for `payload: null`.
- [ ] **Step 2: Run** `npx vitest run src/primer/match.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `src/primer/match.ts`.
- [ ] **Step 4: Run** again. Expected: PASS.
- [ ] **Step 5: Commit** `feat(primer): match command words to topics`.

### Task 3: Coverage and acronym checks

**Files:**
- Create: `src/primer/coverage.test.ts`
- Modify: `src/acronyms/content.test.ts` (add one `it` per exam)

**Interfaces:**
- Consumes: `questionCommandWords` is not used here; the test re-reads typed-step answers with `commandWords` so drafts are included (`getBundledQuestions(code, { includeDrafts: true })` for every `listExams()` exam). Also `wordTopic`, `MADE_UP_TOOLS`, `PRIMER_TOPICS`, `examTopics`, `basicsTopics`, `primerText`.
- Produces: `NOT_COMMANDS` and `PENDING` constants inside the test file (not exported).

Word key for lists: `sub ? "word sub" : word`.

```ts
// Accepted-answer words that are not commands, each reviewed. Never add a real command here.
const NOT_COMMANDS = new Map([
  ['df', 'assignment target in df = df.astype(...)'],
  ['loans.', 'table.column start of an ON answer'],
  ['members.', 'table.column start of an ON answer'],
  ['source', 'legacy `source activate`, accepted but not taught'],
]);
// Words whose topic is not written yet. Each content task removes its words. Empty at release (Task 15).
const PENDING = [/* filled in Step 3 from the test's own output */];
```

- [ ] **Step 1: Write the failing tests:**
  - `every typed-step command word maps to a topic, a made-up tool or a reviewed non-command`: the sorted unmapped keys (not mapped, not in `MADE_UP_TOOLS`, not in `NOT_COMMANDS`) `toEqual([...PENDING].sort())`. Equality, not subset, so a word that gains a topic must leave `PENDING`.
  - `every NOT_COMMANDS word still occurs` (a stale entry fails).
  - `no alias is claimed by two topics, and no alias is a made-up tool or a NOT_COMMANDS word` (compare lower-cased for anyCase topics).
  - (No separate made-up-topic test: until Task 8 writes `made-up-tools`, `wordTopic` returns undefined for those words, so they sit in `PENDING` like any other uncovered word, and Task 8 removes them.) So the made-up words count as unmapped here: unmapped means "no topic found", and a made-up word only counts as covered when `topicById(MADE_UP_TOPIC)` exists.
  - In `src/acronyms/content.test.ts`: `every token in the command primer shown for this exam has an expansion`: topics = `examTopics(code)` plus `basicsTopics()` when `examTopics(code)` is non-empty; same assertion shape as the lesson test.
- [ ] **Step 2: Run** `npx vitest run src/primer/coverage.test.ts src/acronyms/content.test.ts`. Expected: the first coverage test FAILS and prints the unmapped list.
- [ ] **Step 3: Paste the printed list into `PENDING`** (with only the stub `terminal` topic it is every command word, about 40 keys, including the made-up tools). Run again. Expected: PASS.
- [ ] **Step 4: Commit** `test(primer): coverage check with a shrinking allowance list`.

### Task 4: Topic view and the Command help panel

**Files:**
- Create: `src/ui/primer/TopicView.tsx`, `FormsTable.tsx`, `ExternalLink.tsx`, `CommandHelpButton.tsx`, `CommandHelpPanel.tsx`, `primer.css`, `primer.test.tsx`
- Modify: `src/ui/panels/PanelProvider.tsx`, `src/App.tsx` (render the panel next to `ReportPanel`)

**Interfaces:**
- Consumes: `PrimerTopic`, `topicsFor`, `basicsTopics`, `topicById`, `Panel`, `usePanels`, `RichText`.
- Produces:
  - `PanelKind` gains `'command-help'`; `PanelApi` gains `helpTopics: string[]` and `openCommandHelp(topicIds: string[], opener: HTMLElement | null): void` (same pattern as `openReport`; `NO_PANELS` gets no-ops).
  - `TopicView({ topic, level }: { topic: PrimerTopic; level: 3 | 4 })`
  - `CommandHelpButton({ question }: { question: Question })`: `null` when `topicsFor(question)` is empty or `mockDeadline !== null`; otherwise a button labelled `Command help`, `aria-haspopup="dialog"`.
  - `CommandHelpPanel()`: renders when `current === 'command-help'`.

TopicView layout, in order: heading (level `level`) = title; purpose; "What it does" paragraphs; `FormsTable` with caption `<title>: Bash and PowerShell` (head Bash | PowerShell | What it does) or, with `where`, the `where` line then caption `<title>: what to type` (head Type this | What it does); "Worked example": intro, then an `<ol>` with `<code>{line}</code>` and the note per item; "Exam trap": wrong in `<strong>`, then why; a `Learn more` button (`aria-expanded`, `aria-controls` the section id) that shows the `more` sections (each heading one level below the title) with their own `FormsTable`; links via `ExternalLink` plus the line `Links open in a new tab and need an internet connection.` (only when there are links). Learn more state is local `useState(false)`.

`FormsTable` sets `data-label` on each `<td>` so CSS below 40rem stacks each row as label: value blocks. `ExternalLink` = `<a href target="_blank" rel="noopener noreferrer">{label}<span aria-hidden="true"> ↗</span><span className="visually-hidden"> (opens in a new tab)</span></a>`.

CommandHelpPanel: `<Panel kind="command-help" title="Command help">`. If more than one matched topic, a list of buttons (one per matched topic, `aria-pressed` on the shown one); then a "Shell basics" heading (level 3) with a button per basics topic not already matched; then the shown `TopicView level={3}` keyed by topic id (so Learn more resets on switch). First matched topic shows first.

- [ ] **Step 1: Write the failing tests** in `src/ui/primer/primer.test.tsx` (inline topic fixtures passed as props where possible; panel tests use `WithPanels`):
  - `TopicView shows the exam layer and hides Learn more until pressed`: button `Learn more` has `aria-expanded="false"`, a `more` heading is absent; after click `aria-expanded="true"` and the heading is present.
  - `FormsTable is a table with a caption and labelled cells`: `getByRole('table', { name: 'grep: Bash and PowerShell' })`, each `td` has `data-label`.
  - `a single-column topic shows where and two columns`.
  - `external links open in a new tab and say so`: `target="_blank"`, `rel` contains `noopener`, accessible name ends `(opens in a new tab)`; offline note present.
  - `CommandHelpButton renders nothing for a question with no topic`, `renders nothing while a mock deadline is set` (set via `setMockDeadline` in a probe), `opens the panel with the first matched topic shown and returns focus to the button on Close`.
  - `the panel offers the other matched topics and the shell basics; choosing one shows it with Learn more closed`.
- [ ] **Step 2: Run** `npx vitest run src/ui/primer`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above and the `PanelProvider` additions. `primer.css`: `.primer-forms` normal table; `@media (max-width: 40rem)` rows and cells `display: block`, `td::before { content: attr(data-label); font-weight: bold; display: block; }`, `thead` visually hidden; code in cells `overflow-wrap: anywhere`.
- [ ] **Step 4: Run** `npx vitest run src/ui/primer src/ui/panels`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(primer): topic view and Command help panel`.

### Task 5: Command help in practice, cram and results

**Files:**
- Modify: `src/ui/study/StudyRunner.tsx`, `src/ui/exam/ResultsScreen.tsx`
- Test: `src/ui/study/StudyRunner.test.tsx`, `src/ui/exam/ResultsScreen.test.tsx`, `src/ui/exam/ExamRunner.test.tsx`, `tests/e2e/primer.spec.ts`

**Interfaces:**
- Consumes: `CommandHelpButton`, `CommandHelpPanel` (rendered by App).

Placement: in `StudyRunner`, inside the `tools` fragment after `<ToolButtons />`, only when `tools && current.kind === 'question'`: `<CommandHelpButton question={current.item.question} />`. Lesson checks (`tools` false) never show it. In `ResultsScreen`, in each missed item's `<li>`, before the report button. `ExamRunner` is not touched.

- [ ] **Step 1: Write the failing tests:**
  - StudyRunner: `shows Command help on a terminal question in practice` (fixture `da2-pbq-terminal-001`, `tools`), `not on an MCQ without command code`, `not in a lesson check (tools off)`.
  - Review Focus 4 (StudyRunner, fake clock): open the panel in a timed run, advance past the limit: the dialog is gone and `onFinish` was called once with `timedOut: true`.
  - ExamRunner: `never shows Command help, even on a terminal question`.
  - ResultsScreen: `a missed terminal question has Command help; mode mock results too`.
  - Unit tests that need a match use `vi.mock('../../primer/match', ...)` so `topicsFor` returns an inline topic; real content is not there until Task 9.
  - e2e `tests/e2e/primer.spec.ts` (fixture project):
    - `mock: no Command help on any item`: as `submitEmptyMock` in `study.spec.ts`, assert `getByRole('button', { name: 'Command help' })` has count 0 on each of the 9 items.
    - The practice e2e (half-typed answer kept, focus returns, axe with the panel open) needs the real `grep` topic, so Task 9 Step 5 writes it. Record this in the ledger.
- [ ] **Step 2: Run** `npx vitest run src/ui/study src/ui/exam`, then `npm run build:e2e && npx playwright test tests/e2e/primer.spec.ts --project=fixture`. Expected: FAIL.
- [ ] **Step 3: Implement** the two placements.
- [ ] **Step 4: Run** the same commands. Expected: PASS.
- [ ] **Step 5: Commit** `feat(primer): Command help in practice, cram and results`.

### Task 6: The standalone primer screen

**Files:**
- Create: `src/ui/primer/PrimerScreen.tsx`, `tests/e2e/primer.responsive.spec.ts`
- Modify: `src/ui/screens.ts` (`| { name: 'primer'; exam: string }`), `src/App.tsx` (case `'primer'`), `src/ui/ExamPage.tsx`, `src/ui/noBackButtons.test.tsx` (add the screen), `src/ui/screens.test.ts`, `src/ui/ExamPage.test.tsx`, `src/ui/primer/primer.test.tsx`, `tests/e2e/primer.spec.ts`

**Interfaces:**
- Consumes: `examTopics`, `basicsTopics`, `PRIMER_TOPICS`, `GROUP_TITLES`, `TopicView`, `ExternalLink`, `src/primer/links.json` (`{ label, url, what }[]`, validated by a small Zod schema in `src/primer/topics.ts`, exported as `PRACTICE_LINKS`).
- Produces: `PrimerScreen({ examCode }: { examCode: string })`.

Layout: `h2` `Command primer: <code>` (focused on mount via `useFocusHeading`); one intro paragraph (nothing is run here; read Shell basics first); "Practice safely" `h3` with the links (each `ExternalLink` plus its `what` line) and the connection note; a contents list of buttons that move focus to each topic heading (headings get `tabIndex={-1}`); `h3` Shell basics with its topics at `level={4}`; then one `h3` per group (in `PRIMER_GROUPS` order) holding that exam's topics; a toggle button `Show all topics` / `Show only <code> topics` (`aria-pressed`) that switches between `examTopics(code)` and every non-basics topic. Groups with no topics are not rendered.

ExamPage: after the Learn button, `{examTopics(e).length > 0 && <button onClick={go('primer')}>Command primer: {e}</button>}` (memoised per exam).

- [ ] **Step 1: Write the failing tests:**
  - `ExamPage shows Command primer only when the bank uses a topic` (inline topics through a mocked `examTopics`, or the fixture bank, whichever the existing ExamPage tests use).
  - `parentOf({ name: 'primer', exam }) is the exam page`; noBackButtons row for `primer`.
  - PrimerScreen: `lists Shell basics first, then the exam's groups`, `Show all topics adds topics this exam does not use`, `a contents button moves focus to the topic heading`, `practice links are external`.
  - e2e (fixture): `the primer screen opens from the exam page and passes axe`, Learn more toggles, Back returns to the exam page.
  - Review Focus 5, `primer.responsive.spec.ts` (phone and tablet projects, light and dark): primer screen with Learn more open on every topic, and the practice Command help panel: `expectNoOverflow` and `expectNoSeriousAxe` (copy the two helpers' pattern from `responsive.spec.ts`).
- [ ] **Step 2: Run** `npx vitest run src/ui` and the e2e files (`--project=fixture`, `--project=phone`, `--project=tablet`). Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the same. Expected: PASS.
- [ ] **Step 5: Commit** `feat(primer): standalone primer screen`.

### Task 7: Overlap and link checks

**Files:**
- Create: `scripts/check-primer.ts`
- Modify: `package.json` (`"check-primer": "vite-node scripts/check-primer.ts --"`)

**Interfaces:**
- Consumes: `PRIMER_TOPICS`, `PRACTICE_LINKS`, `primerText`, `stripCode`, `sharedRuns`, `parseArgs`.

Usage: `npm run check-primer -- --ref <dir>[,<dir>...] [--group <group>] [--links yes]`.
- `--ref`: every `.txt` in each folder; for each topic (or only `--group`), print `<topic id>: shares "<run>" with <file>` for each `sharedRuns(stripCode(primerText(t)), ref)`. Exit 1 if any.
- `--links yes`: GET every topic link and practice link (follow redirects, 15 s timeout, one at a time, `User-Agent: cert-trainer-link-check`), print `<status> <url>`, exit 1 on any non-2xx or error. Not part of `npm run check` (spec call 17).

- [ ] **Step 1:** Run the script with `--ref _WorkingData/AutoOpsPlus/notes,_WorkingData/SecAIPlus/notes` on the stub content. Expected: `0 problems`, exit 0. Run `--links yes`. Expected: lists nothing (no links yet), exit 0.
- [ ] **Step 2: Commit** `chore(primer): overlap and link check script`.

### Tasks 8 to 14: Content, one group per session

Each content task is one session (memory: one-domain-per-session): draft with a Sonnet subagent, copy check with a Haiku subagent, then the main session reviews for accuracy, fixes, runs the checks, commits, updates HANDOFF.md and stops for `/clear`.

Every content task follows the same steps:

- [ ] **Step 1: Draft.** Give the Sonnet drafter: the spec's Topic shape and Anti-goals, Task 1's schema, the topic list and aliases below, every bank step label and canonical answer that uses those words (from `npx vitest run src/primer/coverage.test.ts` output or a one-off listing), and the rule "assume the reader has never opened a terminal; Bash and PowerShell side by side; say `No close equivalent.` plainly when there is none". Reference notes (`_WorkingData/AutoOpsPlus/notes`, `_WorkingData/SecAIPlus/notes`) are labelled reference only.
- [ ] **Step 2: Copy check** (Haiku): plain words, short sentences, no undefined jargon, acronyms written out once.
- [ ] **Step 3: Accuracy review** (main session): every Bash and PowerShell form is correct as written (check `--help` or official docs where unsure), each worked example's output is what the command really prints, the trap matches how the bank's questions are graded.
- [ ] **Step 4: Remove this group's words from `PENDING`.** Run `npx vitest run src/primer src/acronyms src/domain/primer.test.ts` and `npm run check-primer -- --ref _WorkingData/AutoOpsPlus/notes,_WorkingData/SecAIPlus/notes --group <group>`. Expected: PASS and `0 problems`. Fix acronym gaps per `docs/acronyms.md`.
- [ ] **Step 5: Commit** `content(primer): <group> topics`, add a ledger line, update HANDOFF.md.

Topic list (id: aliases). The builder may split or merge within a group if coverage still passes.

- **Task 8, basics** (also replaces the stub; also writes `src/primer/links.json`, 4 to 6 candidates per the spec's link rules): `terminal`: none · `command-line`: none · `paths`: `cd`, `pwd`, `ls`, `Set-Location`, `Get-Location`, `Get-ChildItem` · `pipes`: `tee` · `quoting`: none · `admin`: `sudo` · `help`: `man`, `Get-Help` · `made-up-tools`: none (matched through `MADE_UP_TOOLS`; a fully invented help text read line by line) · `jobs`: `%`, `fg`, `bg`, `jobs`, `nohup`, `Start-Job`, `Get-Job`, `Receive-Job`, `Wait-Job`
- **Task 9, text:** `cat`: `cat`, `Get-Content` · `grep`: `grep`, `Select-String` · `sort-uniq`: `sort`, `uniq`, `Sort-Object` · `head-tail`: `head`, `tail` · `wc`: `wc`, `Measure-Object` · `sed`: `sed` · `awk`: `awk` · `tr`: `tr` · `echo-printf`: `echo`, `printf`, `Write-Output` (covers `$?`). Also add the practice e2e to `tests/e2e/primer.spec.ts`: `practice: Command help keeps the half-typed answer`. Practice DA0-002 with only "Logs and terminal" checked, type `grep ERR` in the first typed step, click `Command help`. The dialog `Command help` shows heading `grep`, and `Learn more` toggles. After Close, the textbox still holds `grep ERR` and focus is on the `Command help` button. Run `expectNoSeriousAxe` with the panel open.
- **Task 10, network:** `ping`: `ping`, `Test-Connection` · `dig`: `dig`, `nslookup`, `Resolve-DnsName` · `curl`: `curl`, `Invoke-WebRequest`, `Invoke-RestMethod` (note `curl.exe` vs the old PowerShell `curl` alias)
- **Task 11, files:** `chmod`: `chmod`, `icacls` (PowerShell cells: `No close equivalent.`) · `hashing`: `sha256sum`, `shasum`, `Get-FileHash` · `openssl`: `openssl`
- **Task 12, services:** `systemctl`: `systemctl`, `journalctl`, `Get-Service`, `Start-Service`, `Stop-Service`, `Restart-Service`
- **Task 13, dev:** `git`: `git` · `docker`: `docker` · `conda`: `conda`
- **Task 14, data** (single column, `where` set): `sql` (anyCase): `select`, `on`, `using`, `using(` · `pandas`: `df[`, `df.`, `pd.`

### Task 15: Release

- [ ] **Step 1:** `PENDING` is empty: delete the constant and its equality test's allowance; the test now asserts `unmapped` `toEqual([])`. Run `npx vitest run src/primer`. Expected: PASS.
- [ ] **Step 2: Links.** `npm run check-primer -- --links yes`. Expected: every link 2xx. Bring the list (label, URL, what it is, why it fits the rules) to the owner; record the approval in the ledger. Remove any link the owner rejects.
- [ ] **Step 3:** `npm run check`. Expected: exit 0 (lint, typecheck, builds, unit, e2e). If the vitest worker timeout from #14 recurs, rerun the unit step alone and note it.
- [ ] **Step 4: Whole-branch review** on Opus (one reviewer, the standing way), against the spec and this plan's Review Focus. Fix every finding, minors too, each test-first; ledger `Final:` lines.
- [ ] **Step 5:** Merge `command-primer` into main (fast-forward), push, `npm run deploy`. Close issue #5 with a comment naming what shipped. Update HANDOFF.md.
