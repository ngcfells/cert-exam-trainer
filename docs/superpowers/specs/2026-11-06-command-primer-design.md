# Command primer (issue #5): design

Status: draft for owner review, 2026-11-06. Builder check done; its one owner question is answered (call 7).

## Intent

Some exams ask the learner to type commands: shell commands (git, curl, grep, chmod, systemctl, docker, conda and
others), SQL and pandas. Issue #5 asks for a primer that teaches these commands, and why and how they are used, to
someone who has never opened a terminal, plus links to safe places to practice and to beginner training. No emulator.

Success: a learner with zero shell experience meets a typed-command question in practice, opens the primer from that
question, learns enough to answer it and to understand why the answer works, and goes back to the question with
their place and answers intact.

## Goals

- Assume no experience. Start from "what is a terminal and a prompt" (owner).
- Show Bash and PowerShell side by side for every command (owner).
- Two depths per topic: an exam-level layer, and a "Learn more" button that opens more depth (owner).
- Cover SQL and pandas where the learner types them (owner).
- Open directly from the question (owner), in practice and cram only. Never in a mock exam, to match the real exam,
  which has no primer (owner, 2026-11-06).
- Link to safe practice sites and beginner training (owner).
- Cover how to read a made-up tool's help text, because many questions use invented tools (owner).

## Non-goals

- No emulator, sandbox or "run this command" box (owner).
- No progress tracking, check questions or "done" marks for primer topics (builder's call, see below). The Learn
  lessons have those; the primer is reference material.
- No PowerShell answers in the banks. No bank accepts one today (owner, recorded as fact), and this work does not
  change any question or accepted answer.
- Not a full shell course. Depth stops at what helps on these exams plus one "Learn more" layer.

## Anti-goals (a failure even if it works)

- A primer link or button anywhere inside a running mock exam.
- Opening the primer loses the learner's place, typed text or timer in practice or cram.
- Copied text. Bundled content must be original (standing rule); reference sources may be read, never copied.
- A PowerShell column that pretends an equivalent exists when it does not. When there is no close equivalent, say so
  plainly (for example `chmod` has none; `icacls` is a different model).
- Links to sites that are unsafe for beginners, need payment, or ask the learner to run untrusted scripts.

## Current state (what exists)

- Typed-command questions are `pbq-terminal` PBQs: Data+ (DA0-002) 13, SecAI 12, AutoOps 14, all approved, with 76
  typed steps. Accepted answers are patterns (`*` = one non-space run).
- Commands in the accepted answers: git (switch, checkout, add, commit, tag, push, fetch, remote), curl, grep, cat,
  sort, head, wc, sed, awk, tr, dig, ping, chmod, sha256sum, shasum, openssl, systemctl, docker run, fg, bg, nohup,
  job specs (`%1`, `%+`), echo, printf, sudo, conda (activate, install), SQL (SELECT, JOIN … ON, USING), pandas
  (`df['col']`, `pd.to_datetime`).
- Made-up tools in the accepted answers: weblog, vulnai, proxyq, gr-suite, pipectl, logscrub, agentctl, gwctl,
  netpol, cloudctl, iacctl, rolloutctl, svcstat, secretctl.
- MCQ text uses inline code spans with commands too (git, set, pip, grep, chmod, jq, curl, mkdir, awk, wget,
  systemctl and more). Cram is MCQ-only, so this is the only way the primer shows in cram.
- The Learn lessons engine (`src/domain/lesson.ts`, `src/ui/learn/`) is shaped for math: formula or rule, worked
  example, trap, and 3 to 5 required check questions. Only Data+ has lessons.
- Issue #14 added modal panels (`src/ui/panels/`) that open over any screen without unmounting it, used by Settings.

## Decided by the owner

Everything in Goals, Non-goals marked (owner), and Anti-goals 1 and 3 above.

## Calls made in this design (the owner can overturn any)

1. **A new content type, not Learn lessons.** A primer topic needs two Bash/PowerShell columns, two depths and no
   required check questions, which the lesson schema does not fit. Sharing the Learn screen styles is fine.
2. **One shared topic set for all exams.** `grep` is the same on every exam. Each topic lists which exams use it.
3. **Opens as a panel over the question**, reusing the #14 panel system, so nothing underneath unmounts.
4. **Topics are found automatically**, not hand-tagged. For a question, the app takes the command words from:
   typed-step accepted answers, terminal output lines that start with a prompt (`$` and a space), and inline code spans in the
   stem, options and step labels. It maps them to topics. Unknown words that look like a tool name (a word
   followed by options or a subcommand) map to the "reading a made-up tool's help" topic.
5. **The button shows only when at least one topic matches.** Label: "Command help". Placed with the Calculator and
   Whiteboard buttons in practice and cram. Hidden in mock exams.
6. **A standalone primer screen** from the exam page: "Command primer: <code>", shown for exams whose bank uses any
   topic. It lists the shell basics first, then that exam's topics grouped (text, network, files and security,
   services and jobs, developer tools, data). An "All topics" link shows every topic.
7. **Results and review screens** (after a mock, practice or cram) also show "Command help" on a missed or reviewed
   question. The exam is over by then, so this does not break the mock rule. Owner confirmed 2026-11-06: yes, after any session.
8. **Coverage test**, like the acronym test: every command word in a bundled typed-step accepted answer must map to a
   topic, or be on an explicit list of made-up tools. Code spans in MCQs link when a topic exists but are not
   required to have one.
9. **Not tied to SRS, mastery or chances.** Opening the primer does not change any score or schedule.
10. **Links open in a new tab**, marked as external, and the app says they need a connection (it is an offline PWA).
11. **The mock rule needs no new state.** The standalone primer screen is reached only from the exam page, and since
    #14 the app's own Back and All exams buttons end and score a running mock ("Leave and score the exam now?").
    So the primer can never be open during a mock. The button is simply not rendered by the mock runner.
12. **Matching rule.** A command word is the first token of an accepted answer, of an output line after its `$` prompt, of a code
    span, or of any segment after `|`, `&&` or `;`, with `sudo` skipped; a `*` wildcard is never a command. For git,
    docker, conda and systemctl the next token (the subcommand) is kept too. A word maps to a topic only through that
    topic's explicit alias list (for example `shasum` → the hashing topic, `SELECT`/`ON`/`USING` → SQL, `df`/`pd` →
    pandas). The made-up-tool topic is matched only for words on the explicit made-up-tool list, never by guessing,
    so MCQ code spans with plain words (`set`, a file name) never raise a button.
13. **Matches are computed at runtime** from the question being shown. Bundled questions are already loaded
    synchronously (`getBundledQuestions`), so the exam page can tell whether its bank uses any topic without a
    generated index.
14. **One topic component, two hosts.** The standalone screen renders topics inline; the panel renders the same
    component. Learn more state is local and resets when the panel closes.
15. **Typed text survives the panel** because panels do not unmount the screen underneath (#14). An e2e test checks
    a half-typed terminal step is still there after closing the panel; if it is not, fixing it is in scope.
16. **Build in slices.** First the code, schema, matcher, coverage test (with an allowance list that shrinks), the
    panel and screen, with the shell basics topics. Then content in tranches by group, one group per session with
    cheap models (standing rule), each reviewed. Release when the coverage test passes with an empty allowance list.
17. **Links are approved before merge.** The builder brings the checked link list to the owner once, before the final
    review. A manual `npm` script checks the links are live; it is not part of the test run (links need a network,
    and the repo has no CI).
18. **Command names are exempt from the acronym rule** because they are written in code (`awk`, `sed`, `tr`), and
    text in backticks is already skipped (`docs/acronyms.md`). Primer prose that uses a real acronym (SSH, HTTP)
    follows the rule. The overlap check runs on prose only, not on code.

## Content

### Topic shape (each topic)

- Title and a one-line "what it is for".
- **Exam layer** (always shown):
  - What it does and why someone would use it, in plain words, assuming no experience.
  - The forms the exams use, each as a row: Bash | PowerShell | what it does. A PowerShell cell may say "No close
    equivalent" with one line on why, or "Same command" when the tool is the same in both (git, docker, conda,
    curl.exe).
  - One worked example that reads a short terminal session line by line.
  - One exam trap.
- **Learn more** (a button that expands in place): more options, more examples, common mistakes, how the command
  combines with others. Still Bash and PowerShell side by side where it applies.
- Links: zero or more topic-specific links (official docs first).

### Topics

Shell basics (shown first, everyone should read them):

- What a terminal, a shell and a prompt are; Bash on Linux and macOS, PowerShell on Windows; how to open each.
- Reading a command line: command, subcommand, options (short `-n`, long `--name`), arguments.
- Files and paths: current folder, absolute and relative paths, `~`, `.` and `..`.
- Pipes and redirection: `|`, `>`, `>>`, and that PowerShell pipes objects, not text.
- Quoting and special characters: single vs double quotes, spaces, `$`, wildcards.
- Running as administrator: `sudo` vs "Run as administrator".
- Getting help: `man`, `--help`, `Get-Help`; and reading a made-up tool's help text (usage line, brackets for
  optional parts, `<value>` placeholders, subcommands, flags), with a fully invented example.
- Background jobs: `&`, `fg`, `bg`, `%1`, `%+`, `nohup`, and the PowerShell job commands.

Command topics (grouped): text (cat, grep, sort, head, wc, sed, awk, tr, echo, printf); network (ping, dig, curl);
files and security (chmod, sha256sum and shasum, openssl); services (systemctl); developer tools (git, docker,
conda); data (SQL SELECT with WHERE, JOIN … ON, USING; pandas column access and `pd.to_datetime`). SQL and pandas
are not shell commands: their topics say where they are typed (a SQL client, a Python session or notebook) and show
one column, not two.

The builder may split or merge topics (for example git as one topic or several) as long as every command above is
covered and the coverage test passes.

### Practice and training links

A "Practice safely" section on the primer screen, plus topic links. Each link must be free to use, from a reputable
source, and must not ask the learner to install anything to try commands. Candidate kinds: an in-browser Linux (for
example a JSLinux-style page), official PowerShell beginner training (Microsoft Learn), an interactive SQL tutorial,
official pandas getting-started docs, official git docs or a git in-browser tutorial. The builder checks each link is
live and fits these rules, and lists the final set for the owner to approve before release.

## Constraints

- Original writing only. The owner's instructor decks and other sources are for reference; run the existing overlap
  check (`src/content/overlap.ts`) on the primer text.
- Acronyms in primer text must pass the acronym-completeness rules (`docs/acronyms.md`), as lesson text does.
- Accessibility as elsewhere in the app: real tables with captions, code in `<code>`, the side-by-side table stacks
  below 40rem, the panel traps focus and returns it to the opener, Learn more is a real button with
  `aria-expanded`.
- Works offline, except the external links.
- Content validated by a Zod schema on load, naming the failing topic, like lessons.
- Tests: unit tests for topic matching and the schema, the coverage test, component tests for the panel and screen,
  and e2e for opening the primer from a practice question and returning with answers intact, and for its absence in
  a mock exam.
- Repo rules: keep `.superpowers/sdd` ledgers, no GitHub Actions, no LFS, a busy port means use a free one.

## Left to the builder

- File layout for the content and code (follow the lessons layout).
- The exact topic split, word mapping and the made-up-tool heuristic, within the coverage rule.
- Panel layout, and how the matched topics are shown when a question has several (a list of topics with the first
  one open is a sensible default).
- Wording of every topic, within the rules above.
