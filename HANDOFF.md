# 2026-11-10 (night, last): #6 code built and merged to main, NOT pushed or deployed

Next session model: **Sonnet**. The learn-more code (plan `docs/superpowers/plans/2026-11-10-learn-more-search.md`) is on
main, local only. `npm run check` is green (123 e2e), the Opus review is done and every finding is fixed. Left: the
owner's OK to push, then `git push` and `npm run deploy`, then comment on #6 (the button works now on the fallback
phrase) and leave #6 OPEN.

Then the content passes, one exam per session (autoops, dataplus, secai): Haiku drafts a `searchTerm` per question
(2 to 6 words, at most 50 characters, letters, digits, spaces, hyphens, periods), then a spot check. Progress meter: the
console line "N of M questions still use the fallback" from `npx vitest run src/banks`. Today all 2122 use the fallback.

Rulings: W3Schools has no search URL (404), so it searches via DuckDuckGo `site:w3schools.com`. The button name matches
the primer's own "Learn more" (kept per spec; ours reads "Learn more about <phrase>"). No cram e2e (cram shares
StudyRunner's path, covered by practice). Not done: QuestionEditor does not show or keep `searchTerm`, so the author
tool drops it on edit (owner's call). Lesson learned: the Write tool overwrote `src/ui/learn/learn.css` once (restored);
look at `git diff --stat` before each commit.

# 2026-11-10 (night, later): #6 design approved, plan is next

Next session model: **Sonnet**. `gh issue list` first (on 2026-11-10 there were no bugs: only #11 and #6, plus the
battletech-tools enhancements). The owner picked #6 (links to in-depth explanations) and approved the design:
`docs/superpowers/specs/2026-11-10-learn-more-search-design.md` (commit bca2787, on main, not pushed).

The decision in short: a labelled "Learn more" button with the 🤔 icon under each answered explanation. It opens a small
menu of free sources (W3Schools, freeCodeCamp, Khan Academy, Professor Messer, Microsoft Learn, MDN, web search); the
choice opens that site's search page with the question's own search phrase, in a new tab. Per question, not per
objective. Optional `searchTerm` on each bank question, with a fallback of acronyms plus objective title. NOT shown in a
live mock; shown in study, practice, cram and the review of a finished exam. Ship first: code, schema and fallback
release alone; each exam's phrases (autoops = AT0-001, dataplus = DA0-002, secai = CY0-001) are separate content
sessions after it (one domain per session, Haiku drafts, spot check).

Next step: invoke superpowers:writing-plans on that design (plan covers the code and schema only), then execute it
test-first, one Opus whole-branch review, fix every finding, merge, push (ask for the push OK), `npm run deploy`.
The brainstorming and builder check are done; do not redo them.

Tools work (mordel-user-key) still waits on four owner decisions: see the top block of
`C:/repo/JBTToolsSupportFiles/handoff.md`. #11 (hashing) has not been brainstormed.

# 2026-11-10 (night): #17 done and live. Nothing outstanding in testingUtility

Next session model: **Sonnet**. #17 (install as an app) is built, pushed (main f4e68a4), deployed (gh-pages f9f8d75) and
closed. Check: lint, typecheck, builds, unit, e2e 120 passed. Not tried on a real Android phone: the reporter was asked to
check Settings > Install as an app. Code: `src/install.ts`, `src/ui/InstallApp.tsx`, PNG icons in `public/`.

Next: `gh issue list` first (bugs and `from-app` first). Open enhancements: #11 (hashing of content), #6 (links to in-depth
explanations). Then the tools work: top block of `C:/repo/JBTToolsSupportFiles/handoff.md` (owner decisions pending on
`mordel-user-key`: sandbox default, reply to Scott, optional features, merge).

# 2026-11-10 (late): tools work is next. Read this first

Next session model: **Sonnet**. The full block is at the top of `C:/repo/JBTToolsSupportFiles/handoff.md` (review patch
applied and pushed, beta deployed, Scott's API v1 docs done, sandbox key in `.env.mordel`). Start there: `gh issue list`,
then check the `mordel-user-key` branch against Scott's docs. testingUtility itself has nothing outstanding; its next
issues are #16 and #17.

# 2026-11-10 (local): #630, #18 and the primer are all DONE and live

Next session model: **Sonnet**. Everything below ran on Claude only (no astech, no Ollama), as the owner asked.

- battletech-tools #630 closed: all 7 points built, beta deployed, commented. `beta` was merged with origin/master and
  pushed to `origin/master` directly (`git push origin beta:master`). Local `master` in C:/repo/battletech-tools still
  holds one UNPUSHED docs commit (2c3a1444c, the answers from Scott); rebase it onto origin/master when ready, and the
  owner decides whether it goes public.
- testingUtility #18 closed: cram takes the 3 weakest objectives in turn (`interleave` in `src/study/session.ts`).
  The "choose a section for cram" part was NOT built; the issue comment offers it as a feature.
- Primer (#5) merged, pushed, deployed (gh-pages 1e28f6c), closed. Check: 113 files 1132 tests, e2e 119 passed.
- Next: #16 (font size on phones), #17 (install as an app / offline), both `from-app` enhancements. Then #11, #6.
- Still open for the owner: hand-check the Aces auto-answer on beta (Rekikire replays the playtest); the VERIFY items in
  `C:/repo/JBTToolsSupportFiles/handoff.md` (Weapon Hit 50 vs 25 percent).

# 2026-11-09/10 (local): primer review fixed, BUG #18 comes first

Next session model: **Sonnet**. Order of work (owner's ruling, 2026-11-10):

0. FIRST finish battletech-tools #630 (Aces, Rekikire's playtest): everything is in the first block of
   `C:/repo/JBTToolsSupportFiles/handoff.md`. The owner said: finish #630, commit, push, comment, close. Then go on here.
1. `gh issue list` in testingUtility. **#18 is a new bug (from-app): "Cram repeats the same questions over and over"**
   (DA0-002, a pool of 10 that is the same every session; the reporter also expected cram to ask which section).
   Bugs beat everything else here. Start with superpowers:systematic-debugging and a failing test in `src/study/session.test.ts`.
   Lead (a hypothesis, not proven): `assembleCram` in `src/study/session.ts` (lines ~117-126) fills `ordered` with
   due questions, then ALL MCQs of the 3 weakest objectives in order, then the rest, and slices the first
   `CRAM_SIZE - acronyms.length` (10). With nothing due, those 10 come from the single weakest objective every time
   (`byChance` only reorders within it), so the pool never changes. Fix idea: spread the draw across the weak
   objectives (round-robin or weighted by weakness), keep due items first, and add a variety rule so a session does not
   repeat the previous session's ids. The "ask which section" part is a feature request: put it on the issue as an
   answer and ask the owner.
2. Task 15 (primer release), branch `command-primer`. The Opus whole-branch review is DONE. Every finding is fixed,
   minors too (list below). `npm run check` result: see the line "CHECK" at the end of this block. Left, in order:
   commit the fixes, merge to main, push (approved in words on 2026-11-09), `npm run deploy`, close #5 with a comment.
3. #16 (font size on phones) and #17 (install as an app / offline) are `from-app` enhancements, after #18.

CHECK: on this tree, lint, typecheck, builds and unit tests passed (113 files, 1131 tests). An earlier full run had
e2e 119 passed with only a cram test I then dropped failing. The final e2e stage of the re-run was still going when
the session ended, so run `npm run check` once more before merging.

What the review fixes were (committed on `command-primer`, not pushed):
- Show-all acronym rule: the missing terms (DNS, TTL, HTTP, URL, JSON, CN, GMT, ID, PID, UTC, ICMP, CSV) were added to
  the DA0-002, CY0-001 and AT0-001 lists (Data+ community count is now 35). New `src/primer/rules.test.ts` checks
  every topic against every exam list.
- Answer leaks: the same test fails when a typed-step accepted answer appears in a topic. Examples were reworded
  (labels.txt with spaces and small letters in sed and tr, scores.txt, orders.log, web-cache, cleanup-tmp.sh,
  server.log `mode=fast`). Bare vocabulary (git fetch, echo $?, conda install pandas, and so on) and wildcard answers are
  allowed in the test, each reviewed. Removed the sentences that told learners how the app grades.
- Minors: the choice list shows for one matched topic too (`CommandHelpPanel.tsx`), cross-reference titles are full,
  `sort -k2` vs `-k2,2`, letter case on a Mac, job numbers differ in Bash and PowerShell, `head 5 days.txt` also prints
  the file, `uniq -D` may be missing, a duplicate openssl sentence, the hashing rows agree between topics, and
  "the Windows command line" now reads "which comes with Windows".
- NOT changed, on purpose: the pandas `fillna(0)` claim is right (checked with pandas 3.0.1: the column is `object`).
  No cram e2e: the fixture bank's cram set has no terminal question, and cram shares StudyRunner's tested path.
  "See <topic>" stays plain text (the reviewer suggested links; that is a feature).

# BACK ON THE HOME MACHINE (2026-11-09)

The home machine is on again, and local `C:/repo` is the main copy. Cloud work is pulled in: battletech-tools
`master` (rebased; one local docs commit, bf2c594c8 rebased, not pushed), `mordel-user-key` fast-forwarded to
13e645064 (section 2 WIP, see `docs/superpowers/plans/2026-11-07-mordel-next.md`), `beta` at origin, testingUtility
`command-primer` same as origin. ResourceLibrary pulled. The CLOUD block below is history.

Open issues (2026-11-09): cert-exam-trainer has no bugs; new `from-app` requests #16 (font size setting for phones)
and #17 (install as an app / work offline), both enhancements, plus #11, #6, #5. battletech-tools: the only bug is
#630 (Aces playtest, plan below). JBTIICRework, TechFoundry: no issues. JBTIICRework's working tree has 37 deleted,
11 changed and 154 new library files: that is the pending rename (#601, waits on the LFS budget). Leave it.

# CLOUD (2026-11-07): the home machine is off, possibly for a week or more

Work continues in Claude Code cloud sessions. Everything that was only on the home machine (unpushed branches,
git-ignored working data, Claude memory, the mordel.net mirror) is in the private repo `NGCFells2/ResourceLibrary`,
folder `Custom/cloud-handoff/`. Start with `Custom/cloud-handoff/CLOUD-START.md` there. Windows paths below
(`C:/repo/...`) mean the same repo cloned in the cloud.

What was in progress when the machine went off:

1. battletech-tools, branch `mordel-user-key` (not pushed, not merged): mordel.net user keys are built and reviewed.
   Next: `docs/superpowers/plans/2026-11-07-mordel-next.md` on that branch (alt names and tags, every unit kind,
   missing catalog items, Battle Value root causes, the report for Scott). The owner chose: assume our BV is wrong
   until the rules and errata show otherwise.
2. testingUtility, branch `command-primer`: Task 15, release (see the block below).

Both branches are in the bundles under `Custom/cloud-handoff/`. Nothing is pushed to the public repos.

# 2026-11-09 (local): Task 15 started, owner approved the links

The owner APPROVED the link list (66 links, 15 gnu.org ones now man7.org, commit 281a4e6). `npm run check` passed on
`command-primer` (e2e 119 passed). Left, in order: (1) one whole-branch review on Opus as a subagent
(superpowers:requesting-code-review, branch vs main); (2) fix ALL findings, minors too; (3) re-run `npm run check`;
(4) merge to main, push, `npm run deploy` (cert-exam-trainer is public: ask the owner for the push OK at that point
if it has not been given in words); (5) close #5 with a comment. Run it on Sonnet. The owner's account now shows a
Fable limit, so use Opus or Sonnet only, not Fable.

# 2026-11-09 (local): primer links checked

All 66 primer links checked from the home machine: the 51 that are not on gnu.org return 200. The 15 gnu.org manual
links time out in the TLS handshake (gnu.org has been up and down since August, per the owner); cat and printf
answered once, and the Wayback Machine has a 200 copy of all 15 (most from Oct 2026), so the pages exist. The GNU
download mirror the owner gave (mirror.team-cymru.com/gnu/) carries tarballs only, not the HTML manuals, so on the
owner's call all 15 now point at the man7.org man pages (bash job control, chmod, inode for permission bits,
sha256sum, cat, grep, sort, uniq, head, tail, wc, sed, gawk, tr, printf), each checked 200. All 66 links now answer.
Task 15 still needs the owner to approve the link list.

Next session model: Sonnet. Task 15 is `npm run check`, merge, push, deploy; only its one whole-branch review runs
on Opus, as a subagent.

# 2026-11-09 (cloud): link list sent, waiting on the owner

`gh issue list`: no bugs, no `from-app` issues; open #11, #6, #5 (enhancements). The Task 15 link list (66 links: the
5 "Practice safely" links in `src/primer/links.json` and every topic's `links`) went to the owner, who will check the
links themselves later. The cloud network could not reach any of the sites, so nothing was checked here, the three
gnu.org coreutils links included. Nothing changed on `command-primer`.

# START HERE (2026-11-06, after /clear): all repos in one place

The same block is at the top of `C:/repo/testingUtility/HANDOFF.md` and `C:/repo/JBTToolsSupportFiles/handoff.md`.
Older history is below it in each file.

Every session: run `gh issue list` in testingUtility first. Bugs come before everything else. Learners can now
file issues from the app (label `from-app`), so check for those too. At the end of 2026-11-06 the open issues were
#11, #6 and #5, all enhancements.

NEXT SESSION (written 2026-11-06, late evening):

1. `gh issue list`. Any bug, or any `from-app` issue, comes first.
2. testingUtility: the command primer, issue #5, branch `command-primer` (not merged). The plan is approved:
   `docs/superpowers/plans/2026-11-06-command-primer.md`. Ledger: `.superpowers/sdd/2026-11-06-command-primer/progress.md`
   (keep it). Tasks 1 to 14 are done and green. Task 14, the data group (SQL and pandas), is commit b167620, and
   `PENDING` is now empty. Next is **Task 15, release** (last bullet below). It starts with the owner approving the
   link list (Practice safely in `src/primer/links.json`, plus each topic's `links`). gnu.org still gave no answer
   at 20:30 on 2026-11-06, so recheck the three coreutils links first. Run it with superpowers:executing-plans and
   resume from the ledger.
   - The skill's task-start/task-done scripts cannot find content tasks (the plan heading is "Tasks 8 to 14"). Read
     the plan section "Tasks 8 to 14" and ledger by hand in the same format.
   - Listing the bank steps for a group: a throwaway vitest file in `src/primer/` that imports the three bank item
     files and `commandWords` and writes matching steps to the ledger folder (Task 9 wrote `t9-steps.md`). Delete it
     after.
   - Bank tests (`npx vitest run src/banks`) hold the primer acronym check. It also reads example `line` fields, so
     capital words in sample output (`PANIC`, `NR`) trip it; the drafter picked other samples.
   - Accuracy review that paid off in Task 9: run every Bash example in Git Bash and every PowerShell form in pwsh
     (both are on this machine). It caught a PowerShell `-replace` paired with a first-match-only `sed`, a false
     "No close equivalent." (`Measure-Object -Sum`), and a Bash `&&` line offered as the PowerShell form.
   - Linux tools for that review (set up 2026-11-06 at the owner's request): WSL Ubuntu now runs (its Windows
     service was Disabled; now Manual), with dnsutils and netcat added. Run a Bash file there with
     `wsl -d Ubuntu -u root -- bash -c "tr -d '\r' < /mnt/c/<path>.sh | bash"`. dig is also on Windows (winget
     ISC.Bind). Put a `timeout` on anything that may not stop (Task 10 hung on Linux `ping -n`).
   - Drafters copy the bank's own scenario (Task 10: the same TTL, addresses and JSON bodies). Swap in new values.
   - A new acronym in a topic must go in the acronym list of every exam the topic shows for (`meta.ts`); the Data+
     meta test pins its community count (now 27).
   - The copy checker (Haiku) tends to re-define "PowerShell" and "Bash" in every topic and can garble cross-reference
     titles; check every "see <title>" against the real topic titles.
   - Primer e2e: `tests/e2e/primer.spec.ts` (fixture) and `primer.responsive.spec.ts` (phone, tablet), helper in
     `tests/e2e/primerUtil.ts`. Run: `npm run build:e2e`, then `npx playwright test tests/e2e/primer.spec.ts
     tests/e2e/primer.responsive.spec.ts --project=fixture --project=phone --project=tablet` (7 tests).
   - From Task 11: www.gnu.org did not answer from this machine at commit time (it gave 200 earlier that
     session); the Task 15 link check must confirm the three coreutils links. `NET` (as in .NET) is now on
     NOT_ACRONYMS in `src/acronyms/extract.ts` as a product name.
   - From Task 12: WSL Ubuntu runs systemd (255), so services can be checked for real with a throwaway unit in
     `/run/systemd/system` (gone on reboot); clean up any `enable` symlink in `/etc/systemd/system/*.wants` and any
     test user. It caught: failed units print `×` not `●`; `systemctl start` is silent with exit 0 even when the
     program dies at once; `journalctl` as a plain user shows `-- No entries --` for system units. `FAILURE` is now
     on NOT_ACRONYMS; ID, PID, UTC are AutoOps+ community entries. gnu.org was down for everyone at Task 12 (owner, 2026-11-06); recheck the three coreutils links later.
   - From Task 13: Docker Engine 29 now runs in WSL Ubuntu (apt `docker.io`, installed 2026-11-06). The
     every-topic responsive e2e is marked `test.slow()` (axe over all open topics in two schemes passed 30 s); if it
     times out again after Task 14, raise its budget, do not drop the check.
     Python (miniconda, conda 25.11) is on Windows for checking pandas examples; sqlite3 may need checking for SQL.
   - From Task 14: miniconda's Python has pandas 3.0.1 (text dtype prints `str`, not `object`) and the sqlite3
     module (3.51). psql is not installed, so the SQL example's psql layout is hand-drawn from real sqlite rows. The
     Task 14 e2e passed in 31 s with no timeout.
   - Task 15: release. Empty `PENDING`, get the owner to approve the links, `npm run check`, one Opus whole-branch
     review, fix every finding (minors too), merge, push, `npm run deploy`, close #5.
3. Between primer tasks and while tests run: the tools work (section B in
   `C:/repo/JBTToolsSupportFiles/handoff.md`).

Both testingUtility features from 2026-11-06 are DONE and live: in-app exam tools (#14, section A) and in-app
reports (section A0 in testingUtility/HANDOFF.md).

Open items for the owner (none blocks the primer):

- Confirm one ruling from the reports review: the "reports waiting to send" banner has one "Send or discard" button
  that opens the report panel, not separate Send and Discard buttons.
- The relay GitHub token expires 2027-02-04. Renew before then: in `testingUtility/relay/` run
  `npx wrangler secret put GITHUB_TOKEN` and paste the new token only into that prompt, never in chat.
- `relay/README.md` says "Then, from this folder:" just before step 1, which is `cd relay`. Reword it if the owner
  wants.
- The local `in-app-reports` branch is merged into main and can be deleted (`git branch -d in-app-reports`).
- The hand checks listed under section A are still open.

## A0. testingUtility: in-app reports (bug, question problem, feature request). Branch `in-app-reports`

- Spec: `docs/superpowers/specs/2026-11-06-in-app-reports-design.md`. Plan:
  `docs/superpowers/plans/2026-11-06-in-app-reports.md`. Ledger (keep it):
  `.superpowers/sdd/2026-11-06-in-app-reports/progress.md`.
- Tasks 1 to 9 are built, the Opus whole-branch review is done and every finding is fixed (ledger `Final:` lines).
  DONE 2026-11-06: merged, deployed, relay live, test report #15 sent from the live app and closed.
- Labels: bug → `bug, from-app`; question → `bug, content, from-app`; feature → `enhancement, from-app`.
- Relay setup (done; kept for a rebuild): deploy the relay (`relay/README.md`) and send the workers.dev URL, the KV
  namespace id and the GitHub token expiry date. Never paste the token or the Turnstile secret in chat; they go only
  into the `wrangler secret put` prompts.
  - Then: put the KV id in `relay/wrangler.toml`, write the token expiry here, and commit `.env.production` with
    `VITE_REPORT_URL=<url>` and `VITE_TURNSTILE_SITEKEY=0x4AAAAAAF2w670muVBVNqkR`. Deploy, send one live report
    with the owner, and close that test issue.
  - Relay URL: https://cert-trainer-relay.cert-trainer-relay.workers.dev (KV id in wrangler.toml). GitHub token expiry: 2027-02-04. Renew it before then (`npx wrangler secret put
    GITHUB_TOKEN` in `relay/`). The Worker logs "GitHub refused the issue 401" once it has expired.
  - After the merge, the owner reruns `npx wrangler deploy` in `relay/` so the live Worker has the review fixes.
  - `.env.production` holds the relay URL and site key, so `npm run deploy` builds with reports on.
- The report e2e tests (`tests/e2e/report.pwa.spec.ts`) run in `npm run check`, which builds with a stand-in relay
  URL (`build:check`). They stub the relay and Turnstile, so they never send a real issue.

## A. testingUtility: in-app exam tools (issue #14). DONE: merged, pushed and deployed 2026-11-06

Status (2026-11-06, about 12:15):

- All 7 tasks are done, the Opus whole-branch review ran, and every finding is fixed, minors too.
- Merged to main (fast-forward), pushed, and deployed to gh-pages (4518342). The `exam-tools` branch is deleted.
  It was never pushed.
- Ledger (keep it): `.superpowers/sdd/2026-11-06-in-app-exam-tools/progress.md`. The decisions are its `Ruling:`
  lines.
- Final check: lint, typecheck and builds pass, unit 942/942, e2e 109/109.
  - Inside `npm run check`, the unit step twice hit a vitest worker timeout ("Timeout calling onTaskUpdate"), with
    all 942 tests passing. Run alone, it exits 0.
  - If it keeps happening, consider `--maxWorkers` in the check script.
- Calculator coverage: every approved Data+ numeric and data item needs only + − × ÷ % √ and xʸ.
- Fixes after the review:
  - The Tab exemption is replaced by Tab wrapping inside the page.
  - The app's own leave prompt no longer counts as leaving.
  - No panel opens over the results.
  - An answer given as the page hides still counts.
  - One attempt keeps one result id (keyed on its start time).
  - A bad saved record is cleared.
  - Saves after the start write only the answers.
  - Calculator: full precision, Backspace, comma, and ± after an operator.
  - The whiteboard repaints on a theme change.
- Close issue #14 if it is still open: `gh issue close 14`.
- VERIFY by hand (the owner will test these later):
  - On a real Firefox and Safari, does opening a PBQ dropdown (native select) count as leaving the mock?
  - What do Android and iOS do when you pull down the notification shade?
  - Does the calculator key set match Pearson's?
- NEXT in testingUtility: primer issue #5 (below).

- Spec (approved): `docs/superpowers/specs/2026-11-06-in-app-exam-tools-design.md` (f158a6a).
- Plan (approved, "that sounds great"): `docs/superpowers/plans/2026-11-06-in-app-exam-tools.md`. Both are on
  origin/main.
- What it builds:
  - Settings opens as a panel from any screen.
  - Calculator and Whiteboard buttons sit side by side in mock, practice and cram.
  - In a mock, leaving ends and scores the exam. Leaving means a hidden page, window blur, a refresh or close, or
    the app's own Back and All exams buttons ("Leave and score the exam now?").
  - An "I understand" warning gates Start.
  - Results say "Ended because you left the exam."
  - The timer never pauses.
- How it was built (the user's standing choice for features): natively, superpowers:executing-plans test-first,
  then one Opus whole-branch review, fix every finding (minors too), then merge, push and `npm run deploy`.
- Rules: keep `.superpowers/sdd` ledgers, no GitHub Actions, no LFS, and if a port is busy use a free one.
- AFTER #14: primer issue #5 (Bash/PowerShell). The brainstorm is partly done. Agreed so far:
  - Assume zero experience.
  - Show Bash and PowerShell side by side for every command.
  - An exam-level layer, plus a "Learn more" button for depth.
  - Include SQL and pandas where learners type them.
  - It opens directly from the question.
  - Link to safe practice sites and beginner training. No emulator.
  - The topics come from the commands the banks accept (git, curl, grep, sort, head, wc, sed, awk, dig, ping, chmod,
    sha256sum, systemctl, docker, fg/bg/nohup, conda, SQL SELECT, pandas), plus how to read a made-up tool's help
    text.
  - No bank accepts a PowerShell answer today.
  - Decided 2026-11-06: no primer link in mock exams. The primer shows in study and cram only, matching the real
    exam, which has none.
  - Next: the written design, then the builder check.

## B. Tools work (battletech-tools, JBTIICRework, ResourceLibrary, JBTToolsSupportFiles)

Scott answered (2026-11-06 evening), and the user sent two replies. Both are saved in sections 5 and 6 of
`battletech-tools/docs/superpowers/plans/2026-11-06-mordel-api-mapping.md`, with the follow-ups at the end.
- Per-user keys are agreed in principle, so option (c) leads. We asked for CORS (three origins: jeffs-bt-tools,
  heysporky and ngcfells .github.io), a "my units" list with private units, name_parts, mul_id and role in the list,
  and a removals feed. Waiting on his answer.
- The three mismatches are fixed in production. Recheck them after his next production-to-sandbox copy.
- Archive designs: build them as real designs under an archivist account with credit in the notes. We asked about
  an original-designer field, moving designs to their creators, file import, and a push API.
- Sizes measured from a sample at 21:15: all details about 530 MB (87 MB gzipped); the list about 25 MB (3.5 MB
  gzipped).
- The user is away at a conference in Utah the week of 2026-11-09 and may be fully offline.

Steps, in order:

1. **Mordel full pull (running).** At 12:05, batch 13 was done and 43,043 of 56,043 units were waiting. It does
   about 1000 every 20 minutes, so it should finish around 02:30 on 2026-11-07. Log:
   `battletech-tools/tools/mordel-sync/.mirror/full-pull.log` (a "done" line at the end). If it stopped, restart
   it detached from battletech-tools with `bash tools/mordel-sync/.mirror/full-pull.sh` (it resumes). When it is
   done:
   - Measure total size (`du -sh`), gzip size, count per type and size per type.
   - Write the user a memo with a recommendation on three options: (a) ship with the app, (b) an optional pack,
     (c) per-user keys (the user's favourite: we ship a unit list only, and each user fetches with their own key;
     it depends on Scott's answer on keys and CORS).
2. **Sort JBTIICRework `unsorted/scrapes/`: DONE 2026-11-06 (cheap subagent), working tree only, logged.**
   - 262 of the 296 are sorted: 239 moved and 23 duplicates set aside. That is on top of the 74 duplicates set aside
     earlier.
   - 34 are left in place: 10 podcasts, 4 Solaris Sentinel files, 4 ironwind files, and 16 ourbattletech,
     hpgstation and scottsgameroom files.
   - 23 battletech.com and battletech-mercenaries.com files are not sorted yet.
   - Leave `_queue.lock` and `_queue.pid` alone.
   - **Owner answers (2026-11-06) to the sorter's questions. Apply them (cheap subagent, working tree only, log
     every change in `jbtiicrework-pending.md`, never delete):**
     1. BattleSpace sheets marked WizKids 2001: the publisher is **FanPro**. Rename them to match, and file them by
        content (record sheets go in `record-sheets/`).
     2. Fan-made counters: a folder under `fan-made/`, not `battleforce/`.
     3. Years: check each one online and fix the name if it is wrong. The owner thinks the errata 2025 is likely
        right. The blank sheets "20138" are probably 2013. ForcePack Wave One is listed as 2021.
     4. Fan-made publisher tag: the author when the author is known. Otherwise use `fan-made` as the publisher.
        Never leave the tag empty.
     5. The two BattleMech Manual flowchart copies in `errata/` (0.8 MB and 8.2 MB): compare them. If they show
        the same thing, or the larger one includes everything in the smaller, set the smaller aside under
        `unsorted/_duplicates/`. Never delete it. Otherwise keep both.
     6. Shrapnel names by issue number, with no CAT number: OK as is. On the TRO3063 files, PQ means Print Quality
        and WQ means Web Quality. Keep both versions, with the PQ or WQ marker as the edition.
   - Name format (memory `library-rename-project`): `Title(Publisher-ProductNo)[CopyrightYear]-Edition.ext`,
     CamelCase, ASCII, no spaces.
     - WizKids, Topps and Microsoft are never the publisher.
     - No copyright block means fan-made.
     - Never delete: set copies aside under `unsorted/_duplicates/`.
     - Never rename the slugs in `CITE` in `library_search.py`.
   - Tools: `ResourceLibrary/rename_library.py` (CLUES, RIGHTS, `camel()`, `target()`, `actual_publisher()`) and
     `sort_batch.py`. `pdftotext` is in /ucrt64/bin; pypdf is not installed. The 2026-11-06 helper scripts were in
     the old session scratchpad (dupcheck.sh, movedups.sh, poddups.sh) and may be gone; they are easy to rewrite.
3. **Rename the whole library to the format: DONE 2026-11-06 (cheap subagent), working tree only.**
   - Results:
     - 794 renamed, 929 already correct, 4,887 left in place, each with a reason.
     - Most of the files left are not documents: images, epub, zip and similar.
     - Also left alone: fiction, languages and magazines; ambiguous names; files with no text; protected CITE slugs;
       15 names cited by other repos; 5 would-be collisions.
   - Every rename is in `ResourceLibrary/records/jbtiicrework-pending.md`.
   - The INDEX and the search index are rebuilt. ResourceLibrary is pushed (7e795b605).
   - Product numbers taken only from the old name are marked "VERIFY number" in the log. Fan-made years taken only
     from the old name are marked "VERIFY year".
   - The per-file plan (`plan.tsv`) was in the session scratchpad, so it may be gone. The pending log is the record.
   - **Owner answers (2026-11-06) to the renamer's questions. Apply them (cheap subagents, working tree only, log
     every change in `jbtiicrework-pending.md`, never delete):**
     1. Fiction (637 files in `fiction/`): rename them. Novels keep the author name in the name, as well as the
        publisher and year. Proposed form: `Title-Author(Publisher-ProductNo)[Year]`. Show the owner a sample of
        about 5 names before the whole batch.
     2. Translations and magazines (577 files in `languages/` and `magazines/`): rename them too.
        - A real publication: the publisher is its real publisher (for example Devir) when it is known, and
          `Unknown` when it is not.
        - A fanzine: the publisher is the author, else the group, else `fan-made`.
     3. Editions taken from the old name (`Alpha Strike (Corrected 2nd Printing)` showing `[2015]`): acceptable,
        no change.
     4. The fan-made author tag:
        - Novels and fiction follow answer 1.
        - Everything else follows the sourcebook and fanzine rules: the author if known, else the group, else
          `fan-made`.
     5. The 59 files with no copyright block outside `fan-made/`: move one into `fan-made/` only when you can show
        it is fan-made, for example from its text, its source site or its author. Leave the rest, with a reason.
     6. The 85 files with no usable text: OCR each one and write the result back into the PDF as a text layer (for
        example `ocrmypdf`; check whether it or tesseract is installed, and install it if needed). Then rebuild its
        `ResourceLibrary/text/` extract, rename it by the usual rules, and rebuild the INDEX and search. A changed
        PDF is a modified file in JBTIICRework, so log it as a replace in the pending list.
        **DONE 2026-11-06.** ocrmypdf is not installed. Tesseract 5.4 + PyMuPDF do it: new tool
        `ResourceLibrary/ocr_textlayer.py` (incremental save, so the original bytes stay a prefix; undo = truncate to
        `origSize`; log `records/_ocr-textlayer.jsonl`). Of the 85: 46 PDFs got a text layer, 18 terrain maps had
        no readable text (left unchanged), 1 cannot be opened by any reader (`sourcebooks/Scenarios and Campaigns/
        BattleCorps Scenario - Birth of the King (CGL)[2012].pdf`: needs a fresh copy), and 20 were Word/RTF/text
        documents. `extract_rulebooks.py` and `sync_library.py` now extract .txt/.doc/.docx/.rtf too (56 documents in
        the library; a .doc Word will not open falls back to the text runs in the file). 74 files renamed (sources:
        the OCR copyright lines and Sarna), `Map Set #3.pdf` set aside as a copy of the FASA Map Set 3 scan, a few
        left with reasons; all in the pending list. Pushed: ResourceLibrary `3404476a9`, and the 33 pure renames
        in JBTIICRework `d236f2ca`. The OCR'd files (changed content) wait for 2026-12-02.
   - **NEXT, for a cheap subagent: subsort JBTIICRework `sourcebooks/`.** The owner asked for this on 2026-11-06.
     Files loose at the top of `sourcebooks/` most likely belong in one of its existing subfolders. Same rules:
     working tree only, log every move in `jbtiicrework-pending.md`, never delete.
   - Still to do: as you check each file, read its `ResourceLibrary/text/` extract. If the text is garbled, fix it
     (re-OCR, then rebuild the INDEX and search). Commit and push ResourceLibrary in batches.
4. **Cleanup** (the full inventory is in the older START HERE block of `JBTToolsSupportFiles/handoff.md`, step 5):
   - Push battletech-tools master (ahead 2: the mordel-sync fast-forward and 9b0d70f36). Check the deploy rules
     first.
   - Remove the `battletech-tools-mordel-sync` worktree and the `mordel-sync` branch.
   - Check `layers`.
   - Delete testingUtility branches merged into main, locally and on origin. `chunk11-secai` has 34 unpushed
     commits, so check it first.
   - Delete the stale SDD workspaces outside testingUtility, after copying `scrapes_native.tsv` into ResourceLibrary
     `records/`.
   - Delete the old scratchpad leftovers.
   - Ask first before deleting any unmerged remote branch or `backup/pre-lfs-strip`.
5. **Update both handoffs and push** testingUtility and JBTToolsSupportFiles.

## Open items found at the clear (2026-11-06)

- JBTIICRework shows 3 tracked PDFs as modified. Explained 2026-11-06: the 2026-11-04 rulebook sort deliberately
  replaced each one with a better Calibre copy (record: `ResourceLibrary/records/_rulebook-sort-2026-11-04.json`,
  `op: replace`). The old copies are kept, hash-checked, under `unsorted/_duplicates/rulebooks-2026-11-04/`. They
  were never committed. They are now on the pending list for 2026-12-02. Nothing to do until then.
  - `battleforce/BattleForce (FASA).pdf`: same 82 pages, now with a text layer, 150 dpi against 100.
  - `rpg/A Time of War Companion.pdf`: same printing, later file (Oct 2012), restores text cut off on pages 30,
    182 and 223.
  - `rulebooks-legacy/Tactical Handbook (FASA 8630)[1994] - Corrected 4th Printing.pdf`: same printing and pages,
    now with a text layer.
- battletech-tools has an untracked `docs/superpowers/plans/battletech-tools.code-workspace`, and
  JBTToolsSupportFiles has an untracked `arrayPlan.md`. Both belong to the user; leave them.

## Standing rules (all repos)

- The mordel key is in `JBTToolsSupportFiles/.env.mordel` (git-ignored). Never print it or put it in a commit,
  memory note or handoff. Scripts read it by regex and scrub it from saved output.
- The mordel mirror holds member designs and stays git-ignored: battletech-tools is public.
- **JBTIICRework: anything that uploads LFS data waits until 2026-12-02.** Make every change in the working tree and
  log it in `ResourceLibrary/records/jbtiicrework-pending.md` (from, to, why).
  - Pure renames and moves may be committed and pushed any time (owner ruling 2026-11-06), because the content is
    unchanged and no LFS object is uploaded. Stage only the `R100` pairs from
    `git diff --cached -M100% -l0 --name-status`, using a temporary `GIT_INDEX_FILE` to sort them. Then check that
    `git lfs push --dry-run origin main` prints nothing before you push.
  - The first batch was 732 renames, pushed in `56d01ef2`.
  - New files, changed content (OCR included) and replaced files wait. On 2026-12-02, commit and push them, then
    clear the list.
- ResourceLibrary is the user's private repo: commit and push freely.
- `upstream/*` in battletech-tools is Jeff's repo: never touch it.
- Use the cheapest subagent models; final reviews run on Opus. Bundled testingUtility content must be original.
- Bash tool: a heredoc whose body contains an apostrophe is blocked by a hook. Write the script with the Write tool
  and run the file instead.

---

# Handoff

**Repo:** <https://github.com/ngcfells/cert-exam-trainer> (public)
**Spec (approved):** `docs/superpowers/specs/2026-10-30-comptia-exam-trainer-design.md`

## Current state

- **Chunk 1 is done and merged to `main`:** scaffold, Zod schemas, bank registry (Data+ metadata marked `VERIFY chunk 9`, 2 approved and 1 draft seed question), IndexedDB repo with memory fallback, JSON backup export/import, home screen.
- **Chunk 2 is done and merged to `main`** (2026-10-30; 100 unit tests and 8 e2e tests pass; plan: `docs/superpowers/plans/2026-10-30-chunk2-exam-ui.md`):
  - `src/exam/`: seeded RNG (`mulberry32`), assembly (`assembleExam`), scoring (`scoreExam`), result record (`examResultSchema`), question chances (`src/exam/chance.ts`, added 2026-11-04).
  - `src/ui/exam/`: setup, runner (top bar, timer, flag, Previous/Next, review grid, confirm dialog, auto-submit), results screen (score, PASS/FAIL, domain table, what to study, review of missed items with explanations).
  - Results are saved to the `results` store with their seed. Backup import validates them strictly.
  - The deferred chunk-1 items (a)–(f) are fixed. `srs` records are still only checked for `id`.
- **Decisions made in chunk 2:**
  - Scoring: unit = 900 / (MCQ count + Σw). This matches spec §7 exactly when the bank fills the exam, and keeps a small bank scored out of 900.
  - Select-all: (correct − wrong) / correct count, floored at 0.
  - ~~Recency: questions from the last 3 attempts at that exam are used only after fresh ones in the same domain.~~ **Replaced 2026-11-04 by the chance rule** (`docs/superpowers/specs/2026-11-04-question-selection-design.md`): every mode draws by a chance built from all saved answers in all modes, and mock PBQs and practice follow the domain weights.
  - PBQ count weights `[1,3,3,3,1,1]` for 1..6; Σw is capped at maxQuestions − 1.
  - The timer is announced to screen readers only at 10, 5 and 1 minutes.
  - An in-progress exam is **not** persisted; reloading loses it.
  - PBQs: assembly supports them, but `MockExamFlow` passes `pbqTypes: []`, and `scoreExam` scores PBQs 0. Chunk 3 must enable the types and plug in per-part scoring.
  - "Drill these" is a disabled button until practice mode (chunk 5).
  - The question pool is bundled + user questions (the Ours/Mine/Both toggle is chunk 6).
- **Chunk 3 is done and merged to `main`** (2026-10-30; 119 unit tests and 8 e2e tests pass; plan: `docs/superpowers/plans/2026-10-30-chunk3-pbq-templates-1-4.md`):
  - `src/domain/pbq.ts`: payload/answer schemas for `pbq-match`, `pbq-order`, `pbq-config`, `pbq-diagram`, with cross-reference checks in `questionSchema`. Helpers: `correctParts`, `partIds`, `partLabel`, `valueText`, `elementIds`, `TEMPLATE_1_4`.
  - Every template 1–4 PBQ is a set of parts (`PartMap`: partId → value id). Order parts are positions `'0'..'n-1'`.
  - Scoring: `pbqFraction` = matching parts / parts; `ItemScore.parts` carries per-part right/wrong. `Responses` values are `string[]` (MCQ) or `PartMap` (PBQ).
  - Assembly shuffles PBQ elements into `ExamItem.elementOrder`; results store `elementOrders`.
  - `src/ui/exam/pbq/`: one view per template plus `PbqView`. Each part has a labelled native `<select>` as its keyboard and tap path. HTML5 drag is a mouse-only enhancement, and the chip pool is `aria-hidden`.
  - Results show a per-part table and any `partExplanations`.
  - `?seed=N` in the URL replays an attempt. In the e2e tests, seed 1 draws all four PBQ types.
  - The Data+ bank has one original approved PBQ per template.
- **Decisions made in chunk 3:**
  - An order PBQ is unanswered until the user moves a step or chooses "Keep this order".
  - The review grid and the submit dialog count a PBQ as answered only when every part is filled (`isComplete`). Scoring still gives credit for whatever parts are filled.
  - Diagrams are structured data (nodes, edges, zones) drawn as SVG, never raw markup, plus a visually hidden text description. Below 40rem, the zone selects stack under the image.
  - Shuffling PBQ elements uses the shared RNG, so a given seed now assembles a different exam than it did in chunk 2. Old results still validate.
  - Backups from this build that contain PBQ responses won't import into older builds.
- **Chunk 4 is done and merged to `main`** (2026-10-30; 137 unit tests and 10 e2e tests pass; plan: `docs/superpowers/plans/2026-10-30-chunk4-pbq-templates-5-8.md`):
  - `src/domain/pbq.ts` covers all 8 templates (`PBQ_TEMPLATES`, `isPbqTemplate`). Templates 5–8 use the same `PartMap` model. One function, `partCorrect`, decides every part for scoring, results and the answer key.
  - `pbq-terminal`: steps are typed commands, or "choose an action" when the step has `options`. `matchesPattern` trims and collapses whitespace but keeps case. `*` matches one or more non-space characters; everything else is literal.
  - `pbq-data`: a real captioned table, plus an optional bar chart that is `aria-hidden` because the table is its text equivalent. The schema rejects rows of the wrong length and non-numeric charted cells.
  - `pbq-hotspot`: one checkbox per spot is the keyboard and tap path, and the SVG is a click enhancement. It is scored with the select-all rule, so an untouched hotspot scores 0 and shows as unanswered.
  - `pbq-buckets`: one select per item, with drag onto buckets as an enhancement. Items are shuffled per attempt.
  - The Data+ bank has one original approved PBQ per template (8 in all). The e2e tests use seeds 4 and 67, which together cover all 8 types.
- All chunk-4 review findings are fixed, minors included. Rules for writing PBQs (terminal `*` wildcard, quoting, data and hotspot rules) are in `docs/pbq-authoring.md`.
- **Chunk 5 is done and merged to `main`** (2026-10-30; 196 unit tests and 16 e2e tests pass; all review findings fixed, minors included; plan: `docs/superpowers/plans/2026-10-30-chunk5-study-modes.md`):
  - `src/study/`: `srs.ts` (SM-2, strict `srsRecordSchema`, `applyReviews`), `mastery.ts` (`computeMastery`, `weakestObjectives`, `history`, `trendPoints`), `session.ts` (`assemblePractice`, `assembleCram`).
  - `src/ui/study/`: `PracticeSetup`/`PracticeFlow`, `CramFlow`, `StudyRunner` (shared by both), `ProgressScreen` (mastery tables, due counts, history table, SVG trend line).
  - Home has Mock exam / Practice / Cram / Progress buttons per exam; `App` routes on a `Screen` union (`src/ui/screens.ts`).
  - "Drill these" (mock and practice results) and "Drill weakest objectives" (progress) open practice preset to those objectives.
  - `saveAttempt` saves a result and schedules SRS reviews for mock, practice and cram.
- **Decisions made in chunk 5:**
  - Results gain an optional `mode` (`practice` | `cram`; absent = mock). Old results still validate. Mastery counts every mode, and since 2026-11-04 so do question chances (recency once counted mock attempts only, bug #12).
  - SM-2: start ease 2.5, floor 1.3; intervals 1, 6, then interval × previous ease. Quality from score: < 50% → 1 (miss), < 100% → 3, 100% → 5; acronyms: knew 4, didn't 1. A miss is due again in 10 minutes.
  - Mock exams schedule answered questions only; practice and cram schedule only questions the user checked (instant) or answered (end feedback). Unseen items are never marked missed.
  - Cram is MCQ-only, 15 items: due questions (most overdue first), then the 3 weakest objectives in order, then anything; up to 5 acronyms (due, then new). Data+ has no acronyms yet, so cram shows none until chunk 7/9.
  - Backup import now rejects malformed `srs` records (strict schema, ISO datetimes). If an SRS field is ever added, bump the backup `version` and accept both shapes, or older builds and this one will reject each other's files.
  - Practice and cram save and score only the questions the user reached ("Finish now" or a timeout leaves the rest out), so unseen questions never count as wrong in mastery.
  - Study load failures show "Could not load your data." with a way back; after Check answer or Show answer, focus moves to the verdict or to "I knew it"; a checked PBQ ignores later drag-and-drop.
- **Chunk 6 is done and merged to `main`** (2026-10-30; 251 unit tests and 17 e2e tests pass; plan: `docs/superpowers/plans/2026-10-30-chunk6-question-adder.md`):
  - `src/storage/pack.ts`: the question pack (`cert-exam-trainer-questions` v1, `{ format, version, exportedAt, questions }`) is the one interchange format for user questions. Entries may leave out `source`, `acronyms`, `status` and `explanation`. Import always merges. Packs and backups share `validateUserQuestions` (`backup.ts`), which now also rejects an id repeated within a file.
  - `src/banks/pool.ts`: `loadPool` applies the Ours / Mine / Both setting (`sourceFilter`, default `both`) for mock, practice, cram and progress. `SourceToggle` sits on Home.
  - `src/ui/author/`: `MyQuestions` (list, edit, delete with confirm, pack import and export) and `ContentNotice` (setting `userContentNoticeAccepted`; add and import stay hidden until it is accepted). `QuestionEditor` has a structured form for MCQs and, for PBQs, the shared fields plus JSON editors for payload, answer and part explanations, seeded from `src/authoring/starters.ts`. It validates live with `questionSchema` and previews live with `McqView`/`PbqView`.
  - `npm run md-to-pack -- <in.md...> --exam DA0-002 --out <file.json>` converts the plain-text format in `docs/question-template.md` into a pack (parser: `src/authoring/mdPack.ts`). PBQs are written as a ```` ```pbq ```` JSON fence. The script can't read screenshots: a person, or Claude, turns them into a fence, and the script validates it.
- **Decisions made in chunk 6:**
  - PBQ authoring uses JSON editors seeded with a valid starter, rather than a separate structured form per template; the live preview and the error list (with paths) make this workable.
  - Generated ids: the editor uses `user-<uuid>`; md-to-pack uses `<prefix>-<FNV hash of stem>` unless an `Id:` line is given.
  - Image-only Markdown blocks are skipped with one warning.
  - Only approved user questions enter the mock, practice and cram pools, the same rule as bundled questions; the editor says so under Status.
  - Importing on a My questions screen skips questions for other exams and reports them as skipped.
  - Editor errors appear after the first save attempt: focus moves to a summary of links, and each field gets `aria-invalid` and `aria-describedby`. Each PBQ template keeps its own JSON while the author switches types, and Cancel asks before discarding changes.
  - The final review's 3 important and 8 minor findings are all fixed. One minor finding (Home shows only the "ours" count) did not apply: Home already shows a "(mine)" count.
- **Chunk 7 is done and merged to `main`** (2026-10-30; 288 unit tests and 20 e2e tests pass; all review findings fixed, minors included; plan: `docs/superpowers/plans/2026-10-30-chunk7-acronym-tester.md`):
  - `src/acronyms/`:
    - `extract.ts`: `extractAcronyms`, `questionText`, `NOT_ACRONYMS`.
    - `list.ts`: `AcronymEntry` with source `official`, `community` or `mine`; `mergeAcronyms`.
    - `quiz.ts`: `assembleDeck`, `isCorrect`, `normalizeAnswer`, `buildChoices`.
    - `userList.ts`: the user's list in the setting `userAcronyms:<exam>`; `loadAcronyms`; `unexpandedUserTerms`.
  - `content.test.ts` is the build-time check: every acronym token in a bundled question must have an expansion. The rules are in `docs/acronyms.md`.
  - `src/ui/acronyms/`:
    - The `AcronymFlow` screen, reached from the `Acronyms: <code>` button on Home.
    - The setup lists the full table, the choice of mode (flashcards or quiz), which side to show, due-and-new or all cards, the number of cards, and for quizzes typed or chosen answers with an optional time limit of 2, 5 or 10 minutes.
    - `FlashcardRunner`, `QuizRunner` (with "Count as correct" for typos), `AcronymResults` and `MyAcronyms` (add, edit, delete, plus terms found in the user's questions).
  - Cram and Progress now use the merged list and respect the source filter.
  - Data+ has 6 `community` acronyms that we wrote (API, CSV, ETL, JSON, PII, SQL). The official list comes in chunk 9.
- **Decisions made in chunk 7:**
  - The source filter applies to acronyms: `ours` gives official and community entries, `mine` gives the user's only, `both` gives all. On a repeated term, official wins over community, and community over mine. A user cannot add a term that is already in the built-in list.
  - SRS: knew or correct counts as quality 4, didn't know or wrong as 1. Unanswered cards are never graded, including after a timeout.
  - Typed answers ignore case, punctuation, `&`/`and` and parentheticals. Acronym answers ignore everything except letters and digits.
  - Quiz results are not saved to the `results` store; only SRS is updated.
  - `NOT_ACRONYMS` was seeded with SQL keywords and log levels.
- **Owner's working data:** `_WorkingData/` (gitignored) holds the owner's third-party practice questions and screenshots. They are for building and testing only: **never ship, bundle, commit or copy them into fixtures.** `_WorkingData/DataPlus/addQuestions.pack.json` (18 MCQs and 1 PBQ, built with `pbq1.md`) imports cleanly (19 imported, 0 skipped).
- **Commands:**
  - `npm run check` runs lint, typecheck, unit tests, the single-file build and e2e with axe.
  - `npm run build` writes `dist/`; `npm run build:single` writes `dist-single/index.html`.
  - On a new machine, run `npx playwright install chromium` first.
- **Open issues and notes:**
  - Tooling: a local hook blocks Bash heredocs that contain an apostrophe; write files with Write/Edit instead.
  - Manual keyboard-only pass: covered by the automated keyboard e2e; a human pass in a real screen reader is still to do.
- **Priority:** Data+ (DA0-002) first, working end to end, before any other exam.
- **Bank targets per exam:** at least 500 MCQs and at least 80 PBQs (10 of each of the 8 types).

- **Chunk 8 is done and merged to `main`** (2026-10-30; 331 unit tests and 30 e2e tests pass; all final-review findings fixed, minors included; plan: `docs/superpowers/plans/2026-10-30-chunk8-dataplus-bank.md`).
  - Data+ objectives, metadata and the official acronym list are verified (no `VERIFY chunk 9` values left; 18 objectives).
  - The shipped bank is JSON per objective in `src/banks/dataplus/items/`: 553 MCQs (552 approved, 1 draft seed) and 104 approved PBQs. Per template: match 15, buckets 14, order 13, config 13, data 13, diagram 12, hotspot 12, terminal 12.
  - Unit tests and the fixture e2e run against the fixture bank (`VITE_BANK=fixture`, build `dist-e2e`). `src/banks/dataplus/bank.test.ts` checks the shipped bank: schema, acronyms, near-duplicates, key position and length tells, no order PBQ authored in answer order, and targets (totals, per template, per-objective quotas).
  - Playwright has two projects: `fixture` (everything but `bank.spec.ts`) and `bank` (`tests/e2e/bank.spec.ts` on `dist-single`: Home count, a full mock exam, and a one-item practice per PBQ template with axe).
  - Dev-only review tool: `npm run dev` → Review bank. The write-back endpoint refuses cross-origin requests and writes the new file before trimming the old one. Nothing of it ships in `dist/` or `dist-single/`.
- **Decisions made in chunk 8:**
  - Drafting used Claude subagents, as the Ollama trial only met the bar at the margin (spec §12 note).
  - A full mock exam shows fewer than 90 items, because PBQs take their weight in slots; the bank e2e checks 75 to 90.
  - ESLint ignores `content-drafts/`, `dist-e2e/` and `_WorkingData/`.
  - Azure Data Studio (retired 2026-02-28) stays as an exam-named tool but is never keyed as the current recommendation.

- **Chunk 9 is done and merged to `main`** (2026-10-30; plan: `docs/superpowers/plans/2026-10-30-chunk9-legal-branding-deploy.md`; all final-review minors fixed):
  - **License (owner):** code is MIT + Commons Clause (`LICENSE`); bundled questions are CC BY-NC 4.0 plus an additional permission for teaching and internal training, businesses included, at no charge to learners (`CONTENT_LICENSE.md`). Summary: free to use and share, nobody may sell it or charge for access. Up to `8f4be2d` was plain MIT. The owner should check their employment IP clause, and a legal review is still recommended before a public launch.
  - `src/ui/legal.ts` holds `APP_NAME`, `DISCLAIMER_POINTS` (README must match, `legal-files.test.ts`), `LICENSE_SUMMARY`, `KOFI_URL`. The About screen (footer "About" button) shows version (`__APP_VERSION__`), disclaimer, licenses, privacy, and the owner's Ko-fi tip box (text copied from battletech-tools gh-pages; a plain link, no widget script, dark text on `#72a4f2` for contrast).
  - Theme: colour tokens in `src/index.css` (light, dark via `prefers-color-scheme`, and `data-theme`); area CSS files use tokens only (`theme.test.ts` forbids hex/rgb in `src/ui`). SVG colours come from CSS. Home has Theme (system/light/dark) and Reduce motion (`src/ui/display.ts`, settings `theme`, `reducedMotion`).
  - Playwright projects: `fixture`, `bank`, `phone` (360×780 touch), `tablet` (820×1180 touch), `pwa` (serves `dist/` at `/cert-exam-trainer/` via `vite preview`). `responsive.spec.ts` checks no horizontal overflow and axe in light and dark on every PBQ type.
  - PWA: vite-plugin-pwa 1.2.0 (`generateSW`, autoUpdate) in the `dist/` build only; `__PWA__` compiles registration out of the single file, which also skips `public/`. `npm run check` now builds `dist/` and `dist-single/` before unit tests (`pwa-build.test.ts`).
  - `npm run deploy [-- --dry-run] [-- --force]` (`scripts/deploy-lib.ts`): refuses uncommitted changes, refuses non-main without `--force`, builds `dist/`, commits it plus `.nojekyll` to `gh-pages` through a temporary worktree, pushes to origin.
- **Decisions made in chunk 9:** app name stays Cert Exam Trainer; deploy target is the `gh-pages` branch.

- **Streamline refactor merged** (2026-10-30, `refactor/streamline`; 354 unit and 45 e2e tests pass): app code down 481 lines (7,261 → 6,780, about 6.6%) with no behaviour change.
  - `src/ui/kit.tsx`: `QuestionView` (MCQ or PBQ), `useLoad` (`undefined` loading, `null` failed, `reload(showLoading)`), `useCountdown`, `useFocusLater`, `useFocusHeading`, `RunnerFrame` (study, quiz and flashcard runners), `AcronymFlip`, `metaFor`, `pct`, `toCount`, `Loading`. `src/ui/Table.tsx` is the one captioned-table component (kept separate to avoid an import cycle with the PBQ views).
  - `finishAttempt` and `acronymReview` (`src/ui/exam/saveAttempt.ts`) score and save attempts for mock, practice and cram.
  - `src/domain/pbq.ts`: one `TEMPLATES` table gives each template's parts, answer key and shuffled pool. PBQ views share `PartSelects` and `Boxes` (`pbq/parts.tsx`).
  - Mock exam now shows the load-error screen instead of hanging when loading fails.
  - Decision: the owner chose not to collapse formatting just to reach a 25% line cut.

- **Chunk 10 is done and merged to `main`** (2026-10-31; 392 unit and 45 e2e tests pass; all final-review findings fixed, minors included; plan: `docs/superpowers/plans/2026-10-30-chunk10-acronym-harvester.md`):
  - `src/acronyms/harvest.ts`: sources schema, robots.txt rules (RFC 9309-style: prefix agent match, merged groups, longest match, Allow on ties, `*`/`$`, percent-encoding), `htmlToText`, `tallyTokens`, `buildReport`.
  - `scripts/harvest-lib.ts` + `npm run harvest-acronyms`: one request at a time, ≥ 5 s per site (or Crawl-delay; over 60 s the site is skipped), robots checked on every redirect hop, robots 4xx other than 404/410 or 5xx skips the site, 20 s timeout, 2 MB cap. Page text never reaches the report, logs or disk.
  - `scripts/expand-lib.ts` + `npm run expand-acronyms`: local Ollama (`qwen3.6:27b`) drafts expansions and flags off-topic or doubtful terms; `checkExpansion` flags expansions whose initials do not spell the term (strict: no trailing extra words, no one-word expansions).
  - Workflow in `docs/acronyms.md`. Real source list: `_WorkingData/DataPlus/harvest-sources.json` (18 sources, 8 dump). Reports: `_WorkingData/harvest-DA0-002.json`, `_WorkingData/expand-DA0-002.json`.
- **Decisions made in chunk 10:**
  - Owner override: dump sources are **on by default** (`--no-dumps` turns them off). Expansions are drafted by Ollama and checked by Claude, not written by hand.
  - The DA0-002 harvest found 576 unlisted terms, mostly cert/exam codes from dump-site menus. Ollama passed 62; 17 on-topic ones were added as `community` (CBA, CDP, CRM, DAMA, DAS, DB, DBA, IT, MB, ML, OS, PDF, PSV, SKU, SSL, TCP, WAN).
  - **Flagged acronyms (not shipped; owner to decide):** SD (Standard Deviation vs Secure Digital), CAP (CAP theorem vs Corrective Action Plan), MQ (usually the IBM MQ product), PBQ (exam-format term), GCP (vendor product), IO (written "I/O", never tokenised), DC (Data Center, ambiguous), SOC (System and Organization Controls vs Security Operations Center), SSE (Server-Side Encryption vs Server-Sent Events), CIS, APM, SOA, DBS, DSP, CEP, CPE (ambiguous or marginal), XSIAM and DEVOPS (wrong expansion or not an acronym), GENAI (not a standard acronym). Off-topic but real: OCI, ITIL, SIEM, CNCF, CAPA, SCADA, SCOR, CLF, COBIT, FSM, HCM, OMG, RSS, AIX, ANSI, BSD, CSS3, DMCA, ECMS, HIT, HTML5, ISM, PMO, PST, TOGAF, ZT.

## Next session

- **START HERE (2026-11-05, latest): #3 study tips is DONE, merged to `main` (16e5eda), deployed (gh-pages 9ab8ba5); issue closed.** Check issues first, as always. **Next: #5 Bash and PowerShell primer** (design first with superpowers:brainstorming; check first whether the Learn lessons engine can hold it).
  - **Opus whole-branch review:** 0 critical, 1 important, 4 minor; all fixed (95b48ec), each with a failing test first. Three test-room tips that an online proctor could flag were reworded (looking away, covering the screen, naming the feeling "quietly"); a `list.test` banned-phrase guard keeps them out. Previous tip moves focus to Next tip before it disables itself. `StudyRunner` keeps a polite `tip-announcer` live region mounted whenever `tipsFor` is set, and fills it with "`heading: text`" when a tip opens (TipBox's mount-delay trick is gone). `{passingScore}` tips must say "scaled score". The Git workflow order and data-poisoning timing were fixed. Overlap recheck: 130 tips, 13 sources, 0 hits.
  - `legal-files.test.ts` now expects `Licensor: Christopher Fells` / `Copyright (c) 2026 Christopher Fells`, following the owner's LICENSE edit (890e917).
  - **Test-runner note:** when a heavy app (a game) runs alongside, `vitest run` at the default worker count can end with `[vitest-worker]: Timeout calling "onTaskUpdate"` (exit 1) even though every test passes; that is CPU starvation, not a bug. Rerun with `npx vitest run --maxWorkers=4` (green: 861 unit) and then `npm run build:e2e && npm run test:e2e` (green: 103 e2e).
  - Fixed during the build: Playwright matches button names by substring, so `'Next'` also hit "Next tip" once a tip fell due in a long run; every e2e `Next` locator is now `exact: true`. New e2e locators must use `exact: true` for Next/Previous.
  - The 2026-11-05 LICENSE headings commit (890e917, owner's edit) rides on this branch.
  - Spec: `docs/superpowers/specs/2026-11-05-study-tips-design.md`; plan: `docs/superpowers/plans/2026-11-05-study-tips.md`; ledger with every ruling: `.superpowers/sdd/2026-11-05-study-tips/progress.md` (keep; it also holds `tip-overlap.ts`, the overlap checker, and `apply-review.py`).
  - **What shipped:** `src/tips/` (`types.ts`, `picker.ts`: `randomGap` 10–20, `reach`, `eligible`, `pickTip` (no repeat until every eligible tip is shown, then a new pass), `fillTip` with `{minutes}` `{maxQuestions}` `{passingScore}`; `list.ts`: 104 general tips (52 test-room, 52 study, the 5 owner tips included) plus 7 each for DA0-002, CY0-001, AT0-001). `src/ui/tips/`: `prefs.ts` (app-wide store like the marks; settings `studyTips` and `tipProgress` `{count, gap, seen}`, cleaned on load, written through as it happens, a failed write keeps it working in memory), `TipBox.tsx` (region "Study tip" / "Test-room tip", polite live text, never takes focus, Previous tip / Next tip / Close tip), `TipSettings.tsx` (Settings "Study tips": on/off checkbox, "Start the tips over"). `StudyRunner` prop `tipsFor` (practice and cram pass the exam meta; lesson checks do not); it counts each new question reached by furthest index, never acronym cards, and an open tip is never swapped. Closing moves focus to the item heading.
  - **Content:** drafted by Sonnet from the spec topic list (no source reading), reviewed by Sonnet (accuracy) and Haiku (copy), 8 near-duplicates dropped, 18 reworded, changed tips re-reviewed. Overlap check: 0 hits against 10 saved pages (CompTIA PBQ and prep pages, ASMED x2, CyberKraft, SimeonOnSecurity, CrucialExams x3); ITU Online blocks automated fetches.
  - **Tests:** `src/tips/picker.test.ts`, `src/tips/list.test.ts` (counts, ids, lengths, placeholders), `src/ui/tips/*.test.ts(x)`, tip cases in `StudyRunner.test.tsx` (StrictMode, back and forth, acronyms, off), `flows.test.tsx`, `SettingsScreen.test.tsx` (backup import with tips off). e2e `tests/e2e/tips.responsive.spec.ts` (phone and tablet: above the question, focus stays, axe clean light and dark, every DA0-002 tip in bounds, off switch) with fixture `tests/e2e/fixtures/backup-tip-due.json`.
- **#10 answer marks is DONE, merged to `main` and deployed; issue closed.**
  - Spec: `docs/superpowers/specs/2026-11-05-answer-marks-design.md`; plan: `docs/superpowers/plans/2026-11-05-answer-marks.md`; ledger with every ruling: `.superpowers/sdd/2026-11-05-answer-marks/progress.md` (keep).
  - **What shipped:** `src/ui/marks/`: `prefs.ts` (style + sound store, `useMarks()`, settings `answerMarks` / `answerSound`, unknown values fall back to the banner), `AnswerMark.tsx` (7 styles, large and small, plain word first for screen readers, `levelOf`), `marks.css`, `sound.ts` (`playMark`, Web Audio, one context, recovers from suspended/interrupted/closed), `MarkSettings.tsx` (Settings radios with static previews, two columns when wide, plus the sound checkbox). Tokens `--mark-ok/-warn/-bad`, `-bg`, `--mark-on-*`, `--mark-face(-fg)` in all three theme blocks of `src/index.css`. Used in `StudyRunner` (practice, cram, lessons; status is now a `div`), `QuizRunner` ("The answer is: …" on a miss), the results review and the Parts table (`ItemReview` `marks={false}` keeps plain words on the dev bank review).
  - **Rulings worth knowing:** the pop-in scales only (a fade let axe read colours below AA mid-animation; `markContrast.test.ts` now bans opacity in `marks.css`). Light `--mark-warn` is `#7a4f00` (darker than `--warn`). Settings no longer fits an 800 px window, so `nav.spec.ts`'s "no bottom bar" test uses 1280×1200.
  - **Tests:** `src/content/markContrast.test.ts` (AA for every token pair in light and both dark blocks), `tests/e2e/marks.responsive.spec.ts` (every style: partly right check and results review, axe clean and in bounds at phone and tablet width, light and dark). Test helper `src/ui/marks/fakeAudio.ts`.
  - **Opus whole-branch review:** 0 critical, 0 important, 6 minor; all fixed. `npm run check` green: 800 unit, 99 e2e (bounds included).
- **CHUNK 12 (AUTOOPS+) IS DONE, MERGED AND DEPLOYED** (see "Chunk 12 close-out" below). Next session: check GitHub issues first (bugs still beat everything).
- **Owner decision (2026-11-05): all five enhancements will be done, in order of biggest gain for least work.** Each one gets its own design (superpowers:brainstorming), then a plan, then the build, merged and deployed before the next one starts. Order:
  1. **#10 right/wrong markers:** a visual right/wrong mark after answering, with at least 5 styles chosen in Settings (check and X, smiley and frowny, and so on). Each style needs a text alternative for screen readers and must meet the theme contrast rules. Small to medium code.
  2. **#3 test-taking tips:** a pop-up above the question in practice and cram, with a random tip once every 10 to 20 questions, from a large list of original tips. Small code plus writing the list.
  3. **#5 Bash and PowerShell primer:** a study primer for exams with typed commands, assuming no experience, with links to safe practice tools and beginner training (no emulator). Check first whether the Learn lessons engine (Data+ math module) can hold it. Mostly writing.
  4. **#11 content hashing:** SHA-512/256 hashes of questions and answers on a locked `Security` branch, plus a Settings button that verifies the content and checks for the latest release. Needs design first: whether branch protection works on the owner's GitHub plan, offline and single-file builds, and where the hashes are fetched from.
  5. **#6 in-depth links:** one or more links per question to a verified, reputable source, behind a "ponder" style icon. Largest job: about 2,000 questions across three exams, and every link must be checked.
- Later (owner's call): Security+ SY0-801 (launches about 2026-11-17; the owner supplies the v8 objectives), and the exam-cards spec's later parts (further exams, one master acronym table).
- Open issues on 2026-11-05 (rechecked at the #3 merge): enhancements #11 (hashing of content), #6 (links to in-depth explanations), #5 (Linux Bash and Windows PowerShell primer); #3 closed; no bugs.
- The BattleTech work is parked: Scott's mordel reply is recorded and a reply drafted for the owner to send, and the Solaris7 review is partly done (see `C:\repo\JBTToolsSupportFiles\handoff.md`, "START HERE").

- **FIRST, EVERY SESSION (owner rule, 2026-11-03): check GitHub issues before any other work** (`gh issue list --state open`). **Open bugs take priority over every other task, content batches included:** fix what we have before adding new things that could break. Also review the open enhancement requests, so the owner can weigh them against adding more questions. See "Standing rules".
- **Bugs #12, #13 and enhancement #8: FIXED, merged to `main` and deployed (2026-11-04); issues closed.** Spec: `docs/superpowers/specs/2026-11-04-question-selection-design.md`; plan: `docs/superpowers/plans/2026-11-04-question-selection.md`; ledger with every ruling: `.superpowers/sdd/2026-11-04-question-selection/progress.md` (keep).
  - **What changed:** `src/exam/chance.ts` builds one chance per question from every saved result of every mode (`buildChances`; right x0.5, miss x0.75, floor 0.15 once missed, 0.01 after 5+ views with no miss, time rise from day 30 only when the latest answer was right). `weightedOrder` is a seeded Efraimidis-Spirakis draw. `splitByDomain` / `drawByDomain` in `src/exam/assemble.ts` split a count across domains by weight. Mock MCQs and practice use largest remainder; **mock PBQs give each slot to a domain picked at random by weight** (review finding: with 1 to 6 slots, fixed rounding always favoured the big domains). Practice is fully shuffled (PBQs no longer first); mock PBQs stay first; cram keeps due SRS reviews first, and its weak-objective and fill-in lists draw by chance. `recentQuestionIds`, `RECENT_ATTEMPTS` and `freshFirst` are gone.
  - **Opus whole-branch review:** 0 critical, 2 important, 5 minor; all fixed (random PBQ split; a garbled `finishedAt` no longer gives a NaN chance; zero or NaN weights sort last; a zero-weight domain fills as a last resort so a run is never short; tighter PBQ share test).
  - **e2e seed change:** under the new draw, seed 4 no longer draws a hotspot, so the phone/tablet "tap path" test now uses seed 67. Seeds 4 and 67 still cover all 8 PBQ templates; the new unit test "e2e seeds" in `src/exam/assemble.test.ts` checks this, so a later draw change cannot silently drop coverage.
  - **Checks before merge:** lint, typecheck, both builds, 706 unit and all 83 e2e tests pass (`pwa` included).
  - **Port clash fixed:** another Claude session (`C:\repo\battletech-tools-master`) starts `vite preview --port 4173` on and off. Test servers now fall back to a free port the OS picks when their default is taken (`scripts/port.ts` `serverPort`, using `scripts/free-port.mjs`): `playwright.config.ts` (4173, env `PWA_PORT`) and `playwright.dev.config.ts` (5199, env `DEV_E2E_PORT`). The run prints "Port 4173 is in use; using port N for this run." `npm run check` and `ship.sh` need no workaround now; `d2/pw-alt-port.config.ts` is no longer needed (kept as ledger). **Follow-up fix (2026-11-04, batch 28, c03db67):** the probe listened on all addresses, which Windows allows beside another app's listen on `127.0.0.1` or `::1`, while `vite preview` listens on `localhost`; so 4173 read as free and the ship's bounds step still failed. `scripts/free-port.mjs` now checks `127.0.0.1`, `::1`, `0.0.0.0` and `::` one by one (test: `scripts/free-port.test.ts`).
  - **Next:** content resumes at batch 28 (2.4 mcq-001..025).
- **Open issues as of 2026-11-05:** no open bugs. Enhancements #3, #5, #6, #10, #11 still open (below).
  - **Bugs #4 and #7: FIXED (2026-11-03, session 14), merged to `main` and deployed.** `npm run check` green: 681 unit, 83 e2e (Vitest `--maxWorkers=8`, Playwright `--workers=2`). No open bugs. Next: batch 24.
    - **#4 (table words split, "Re/sul/t"):** the cause was `body { overflow-wrap: anywhere }`, which lets a table column (or a flex item, button or legend) shrink below its longest word. The body now uses `break-word` (a word splits only when it alone is wider than its whole line), and `th`/`td` never split words. `Table` sits in a `.table-scroll` wrapper; when the table is wider than the screen it scrolls sideways and the wrapper becomes a focusable region named by the caption (`useScrolls` hook, `src/ui/useScrolls.ts`). Code blocks wrap at spaces and never split a token: a token too long for the line scrolls inside the block, which then takes focus. `legend` is capped at 100% and `dd` indents 1rem.
    - **#7 (diagram labels escaping their boxes):** `Boxes` in `src/ui/exam/pbq/parts.tsx` drew one-line SVG `<text>`; the bug #1 fix had only covered hotspot spots. Box labels are now wrapping HTML in a `<foreignObject>` (`.box-label`). SecAI+ `cy1-4-3-diagram-001`: the two second-row boxes are now 80 tall (y 110) so the four-line label fits; keys unchanged.
    - **Standing check:** `tests/e2e/bounds.spec.ts` (Playwright project `bounds`, helper `tests/e2e/bounds.ts`). It opens every approved question of every exam and the results review (Parts tables included) at 360 and 1280 px, plus every other screen (Home, Settings, About, each exam page and tool, the mock exam grid and results, every lesson, the acronym full list). It fails on a word cut between two letters, an overflowing box label, text off screen outside a focusable scroll box, SVG text outside its picture, an unfocusable sideways-scrolling box, or a page that scrolls sideways. Failing items get a screenshot in the report (`npx playwright show-report`). `npm run check-bounds` builds and runs it; `BOUNDS_EXAM=<code>` limits it to one exam. `npm run check` includes it (about 3.5 minutes with 4 workers). Checked against the old CSS: it catches both bugs (and showed the old rule also split "Previous"/"Next" on every question at 360 px).
    - `d2/ship.sh` now runs `BOUNDS_EXAM=AT0-001 npm run check-bounds` before it commits; a failure stops the ship. Copy this step into each later workspace's `ship.sh`.
  - **Enhancements (owner to prioritize against more questions):** #3 test-taking tips pop-up in practice/cram (a random tip every 10–20 questions); #5 Bash and PowerShell primer for exams with typed commands (assume no experience; links to safe practice tools); #6 a link per question to an in-depth explanation from a reputable source (a "ponder" style icon); #8 better question shuffling (seen and missed questions weighted, owner gives the percentages in the issue); #10 a visual right/wrong marker with at least five styles chosen in Settings; #11 SHA-512/256 hashes of questions and answers on a locked-down `Security` branch, with a Settings button to verify content and check for the latest release.

- **START HERE (2026-10-31, latest): the exam-cards UI (part 1) is done, merged to `main` and deployed live** (last code commit d2467f4; gh-pages 88e73a5). Spec: `docs/superpowers/specs/2026-10-31-exam-cards-and-acronym-table-design.md`; plan: `docs/superpowers/plans/2026-10-31-exam-cards-layout.md`.
  - **Verified:** `npm run check` green (567 unit, 73 e2e), `npm run test:e2e-dev` green (2). The Opus whole-branch review's findings are all fixed, minors included.
  - **What shipped:**
    - Home: one card per exam (Stock and Custom counts), Settings at top right in the app header, About at bottom right. No footer About.
    - Exam page (`src/ui/ExamPage.tsx`): counts, the per-exam source toggle, and tools in study order: Mock, Practice, Cram, Learn, Acronyms, Progress, My questions (+ dev Review).
    - One way back: the nav bar (`NavBar` in `src/ui/nav.tsx`) with "← Back to *exam*" and "⌂ All exams" on every screen but Home, repeated at the bottom when the page is taller than the window (`useTallPage`). Screens carry no Back/Cancel of their own (QuestionEditor keeps Cancel). Learn and Acronyms register inner levels with `useNavUp` ("← Back to lessons", "← Back to lesson", "← Back to acronyms").
    - Browser Back does what the bar's Back does, via a single trap history entry (`src/ui/history.ts`); on Home it leaves the app.
    - Leave guard (`useLeaveGuard`): mock exams (always until submitted), timed or started practice/cram/acronym runs, and the editor with unsaved changes ask before leaving by the bar, "All exams" or browser Back.
    - Focus moves to each screen's h2 on arrival. Importing a backup on Settings applies its theme and motion settings.
    - Test helpers `TestNav` and `LeaveGuardProvider` live in `src/ui/testNav.tsx`.
  - **Left as is (with reason):** Home and the exam page each count custom questions (two small reads, one per screen; sharing them would need a cache for no visible gain). The spec showed only the Stock count on cards; the MVP shows Stock and Custom, which the owner saw in the deployed MVP.
  - **Still to do from the spec (later parts, owner-scoped out of part 1):** the eight further exams with provisional metadata, and the one master acronym table.
  - **Chunk 11 (SecAI+) is done (2026-11-01, session 8).** See "Chunk 11 close-out" below.

- **Deployed 2026-10-30:** <https://ngcfells.github.io/cert-exam-trainer/> is live from `gh-pages` (Pages already configured). Redeploy with `npm run deploy` after merging to `main`.
- **Owner reprioritised (2026-10-31): the Data+ Math & Data Concepts module comes before SecAI+.** Design (approved): `docs/superpowers/specs/2026-10-31-dataplus-math-module-design.md`. It is homework-style: a Learn area of lessons (meaning, formula, worked example, exam trap) with a check per lesson, a new `numeric` typed-answer question type, and more join PBQs. The owner is a trainer, not an analyst, so lessons must assume no stats background.
  - Six sections, **each its own session with a `/clear` and a handoff update between** (design §8 and §8a): (1) engine: `numeric` type, lesson schema, Learn screens, status, one sample lesson; (2) content A+B; (3) content C+D; (4) content E; (5) content F (joins); (6) final audit, Opus whole-branch review, redeploy.
  - **Section 1 (engine) is done on branch `math-engine`** (2026-10-31; 472 unit and 50 e2e tests pass; plan: `docs/superpowers/plans/2026-10-31-math-section1-engine.md`; Opus final review findings all fixed). Not yet merged to `main`.
    - `numeric` type: one scoring unit like an MCQ; response is `[rawText]` (`[]` = blank). `parseNumeric` accepts typographic minus signs and thousands-group commas only; `numericCorrect` is inclusive with a relative float slack. Authored in the editor (JSON) and in Markdown (`Correct Number:` line).
    - Lessons: strict Zod schema in `src/domain/lesson.ts`, files in `src/banks/dataplus/lessons/*.json` (one per area). Formula markup: `^{}` and `_{}`, plus a spoken form for screen readers. 3 to 5 check items per lesson; a lesson with a formula must link a numeric item.
    - Lesson status lives in the setting `lessonStatus:<exam>` (backup format unchanged); done at a check score of 80% or more. Check attempts save with `mode: 'lesson'` (count for mastery and SRS, not mock recency).
    - Numeric answers are recomputed in `bank.test.ts` from `src/banks/dataplus/numericChecks.ts`: **every new numeric item needs an entry there.**
    - The fixture bank gained a numeric item, so fixture mock exams have 9 items (e2e `TOTAL = 9`).
  - **Owner decision (2026-10-31): do not merge `math-engine` until the whole math module is complete** (after section 6). Keep committing every section to `math-engine`; merge to `main` and redeploy only at the end.
  - **Section 2 (content A+B) is done on `math-engine`** (2026-10-31; 473 unit and 50 e2e tests pass; plan: `docs/superpowers/plans/2026-10-31-math-section2-content-ab.md`; Opus review found no math errors; its 3 important and 12 minor findings are all fixed).
    - 10 lessons in all: area A has 6 (percent change, percentage points, growth ratios, CAGR, Rule of 72, weighted average) and area B has 4 in `B-descriptive-stats.json` (mean/median/mode, range/variance/SD, outliers/IQR/z, distribution shape).
    - New items in `3.2.json`: `da2-3-2-num-003..022` (20 numeric, 22 in the bank) and `da2-3-2-math-mcq-001..011`. Community acronyms CAGR and IQR were added (23 community).
    - Symbol names in lessons render as plain text. `bank.test.ts` now rejects `^{}`/`_{}` there; use Unicode (², "to the power 1/n").
    - Tally toward §7: 10 of 30 lessons and 22 of 60 numeric items.
  - **Section 3 (content C+D) is done on `math-engine`** (2026-10-31; 473 unit and 50 e2e tests pass; plan: `docs/superpowers/plans/2026-10-31-math-section3-content-cd.md`; the Opus review's 1 critical, 3 important and 16 minor findings are all fixed).
    - 10 lessons: `C-inferential-stats.json` has 6 (population vs. sample, hypotheses, Type I/II, p-values, confidence intervals, choosing a test) and `D-correlation-regression.json` has 4 (correlation, linear regression, logistic regression, time series).
    - New items: `da2-3-2-num-023..033`, `da2-3-2-math-mcq-012..032` and `da2-1-5-math-mcq-001..002`. ANOVA was added as a community acronym (24 community). `II` and `III` are in `NOT_ACRONYMS`.
    - Numeric items always carry `payload` (use `{}` when it has no unit). Dollar amounts use `prefix: "$"`.
    - Tally toward §7: 20 of 30 lessons and 33 of 60 numeric items.
  - **Section 4 (content E) is done on `math-engine`** (2026-10-31; all of `npm run check` passes; plan: `docs/superpowers/plans/2026-10-31-math-section4-content-e.md`; the Opus review found no math errors, and its 3 important and 5 minor findings are all fixed).
    - 5 lessons in `E-data-math.json`: units and precision, normalization (min-max, z-score), binning, derived fields, aggregation pitfalls.
    - New items: `da2-2-3-num-001..012`, `da2-2-3-math-mcq-001..004` (2.3), `da2-2-2-num-001..003`, `da2-2-2-math-mcq-001..002` (2.2). Links to existing `da2-2-3-mcq-008`, `-009`, `-040`.
    - Rule learned: check items must not reuse the lesson example's numbers (the review caught this); use different numbers so the check tests skill, not recall.
    - Tally toward §7: 25 of 30 lessons and 48 of 60 numeric items.
  - **Section 5 (content F) is done on `math-engine`** (2026-10-31; 473 unit and 50 e2e tests pass; plan: `docs/superpowers/plans/2026-10-31-math-section5-content-f.md`; the Opus review found no wrong answers, and its 5 important and 8 minor findings are all fixed).
    - 5 lessons in `F-joins-keys.json`: keys, join types, cross join, bad joins, union/pivot/unpivot.
    - New items: `da2-1-1-num-001..002`, `da2-1-1-math-mcq-001..002`, `da2-2-3-num-013..023`, `da2-2-3-math-mcq-005..009`, and 11 join PBQs (`da2-1-1-buckets-002`, `-match-002`, `-hotspot-002`; `da2-2-3-config-002..003`, `-data-002..003`, `-match-001`, `-order-002`, `-terminal-003`, `-diagram-001`).
    - `numericChecks.ts` has a `joinRows(left, right, kind)` helper; join counts are recomputed from key lists. `USING` was added to `NOT_ACRONYMS`.
    - Terminology: lessons and items say "null" for a missing key (a null never matches, even another null).
    - Tally toward §7: 30 of 30 lessons, 61 of 60 numeric items, 11 of 10 join PBQs.
  - **Section 6 (final) is done on `math-engine`** (2026-10-31; 487 unit and 52 e2e tests pass; plan: `docs/superpowers/plans/2026-10-31-math-section6-final.md`; the Opus whole-branch review found no wrong answers, and its 2 important and 7 minor findings are all fixed).
    - `bank.test.ts` locks the §7 targets (30 lessons with 3 to 5 checks, at least 60 numeric items, at least 10 join PBQs), checks that select keys do not cluster at one option index, and fails if a numeric check reuses its lesson example's numbers. That last test found 10 such items, now rewritten (`da2-3-2-num-003/004/010/023/026/028/030/032`, `da2-2-3-num-004`), plus 6 MCQ near-repeats.
    - Bug #2 fixed: hotspot spots shuffle into the authored boxes per attempt (`hotspotLayout`, via `elementOrder`). Select options in config, data and terminal PBQs also shuffle per attempt (`ExamItem.partOrders`, saved as the optional `partOrders` in results). Lesson checks use a new seed on every attempt.
    - Bug #1 fixed: hotspot labels are wrapping HTML in a `<foreignObject>`, scaled with the image width. The bank e2e checks that every shipped label fits at 360 and 1280 px.
    - Hotspot authoring rules (enforced by the validator, documented in `docs/pbq-authoring.md`): all spots are the same size; a node matches a spot box exactly or overlaps none.
    - `parseNumeric` now treats inner spaces as thousands separators only ("1 250" works; "5 3" is unanswered).
  - **Merged to `main` (201bcd0) and deployed 2026-10-31; issues #1 and #2 closed. The math module is complete.** Next: chunk 11 (SecAI+).
  - The owner's practice-exam screenshots (std dev by hand, percent change, join fields) guide the topics only and are never copied.
- **Fix deployed 2026-10-31 (`5ad42c7`, deploy `86890e9`):** drag-and-drop chips (match, order, diagram) showed the keys in answer order by plain chance (3 keys: 1 time in 6). `itemFor` now reshuffles up to 3 times when that happens, so it is rare but never impossible.
- **Next: chunk 11, SecAI+ (CY0-001).** Plan (awaiting the owner's review): `docs/superpowers/plans/2026-10-31-chunk11-secai.md`. Objectives are published (v4.0, launched 2026-02-17). Start with Session 1 (Tasks 1–6, including 4a) on branch `chunk11-secai`; content follows one slice per session; do not merge or deploy until Task 9.
  - **Owner decision (2026-10-31):** the CompTIA instructor slide decks in `_WorkingData/SecAIPlus/` may be used as reference and supporting documentation only (topics, depth, fact checks). Never copy or paraphrase their wording, examples, questions or diagrams; every draft passes the 8-word overlap check. Other `_WorkingData/` material stays off limits.
  - **Session 1 done (2026-10-31), branch `chunk11-secai`, commits ee04475..af928b6.** Tasks 1, 2, 3, 4, 4a, 5 and 6 are complete. `npm run check` passes: 523 unit tests (2 skipped) and 53 e2e tests (9 skipped). The ledger is `.superpowers/sdd/2026-10-31-chunk11-secai/progress.md`; read its `Ruling:` lines before Task 9.
    - What the session built:
      - Exam-aware bank paths (`src/banks/paths.ts`) and a SecAI+ bank (empty items plus a 3-item fixture).
      - `--exam` flags on `check-drafts` and `draft-ollama`.
      - Shared shipped-bank checks (`src/banks/shippedChecks.ts`); 59 legacy Data+ ids are exempt.
      - Verified CY0-001 metadata with 63 official acronyms; sources are in `docs/sources/CY0-001.md`.
      - The 8-word deck overlap check (`check-drafts --ref`).
      - The deck notes and objective map in `_WorkingData/SecAIPlus/notes/index.md` (git-ignored).
    - Acronym harvest: 6 kept as community (BC, CBA, CIS, CUI, DMCA, SSL). The rest are flagged and not added:
      - On topic but ambiguous: CSA (Cloud Security Alliance), DSA (EU Digital Services Act vs Digital Signature Algorithm), SSE (Server-Side Encryption vs Security Service Edge), CI, IA, SAM.
      - GenAI (initials do not spell it).
      - Vendor names XSOAR and XSIAM.
      - Everything else was cert or exam codes, product names, plain words or page text.
  - **Session 2 done (2026-10-31), slice (a) domain 1, commits 9f5a934..8c538a7.** `npm run check` passes: 528 unit tests and 62 e2e tests. The CY0-001 e2e block now runs, so nothing is skipped.
    - Each of 1.1, 1.2 and 1.3 has 38 approved items: 32 MCQ (26 single, 6 multi) and 6 PBQ, against a quota of 29 + 5. All spares were kept because every item passed review.
    - PBQ templates so far: buckets 3, match 4, order 3, config 2, diagram 2, hotspot 2, data 1, terminal 1. Each template needs 10, so the rest of the exam needs at least buckets 7, match 6, order 7, config 8, diagram 8, hotspot 8, data 9 and terminal 9. That is 62 of the 75 PBQs left in the quotas, so lean on data, terminal, config, diagram and hotspot in slices (b)–(e).
    - Fix: `check-drafts` reported a file already in `items/` as a duplicate of itself. `scripts/check-drafts-lib.ts` (`bankWithoutDrafts`, tested) fixes this.
    - How the session ran:
      - Extract the objective's v4.0 sub-bullets and deck slides into scratchpad text files, and give the agents those paths (never `_WorkingData`). The PDF text came from `pypdf`, installed with `pip --target` into the scratchpad.
      - Keep the `--ref` notes in a folder that holds only deck notes. A stray file containing our own items flags every item.
      - Drafters: one Sonnet agent per objective. Then one blind Sonnet security reviewer and one Haiku copywriter per objective. Send the fixes back to the same agents and re-review until clean.
    - Watch in later slices:
      - Fixing length tells over-corrects. The key became the shortest option in 11 of 26 singles in 1.1, and across domain 1 it is the longest in only 3%. Ask drafters for a natural mix: key longest and key shortest each about 15–25%.
      - Do not rerun the drafters' generator scripts (in the scratchpad). Some final edits were made to the JSON directly.
    - **Owner decision (2026-10-31): merged to `main` early (faf0737) and deployed (gh-pages 04b69f5) to see domain 1 live.** This overrides the plan's "no merge or deploy until Task 9" rule for this slice. The live SecAI+ exam draws only from domain 1 until the other slices land.
    - Keep working on `chunk11-secai`, which stays alive. Merge it to `main` and redeploy whenever the owner asks, and in full at Task 9.
  - **Session 3 done (2026-10-31), slice (b) 2.1–2.3, commit 04c3c85.** `npm run check` passes: 528 unit tests and 62 e2e tests. (Correction, session 4: this commit did reach `main` and the live site, because the exam-cards UI work was built on top of it and deployed as `d2467f4`.)
    - Each of 2.1, 2.2 and 2.3 has 45 approved items: 38 MCQ (31 single, 7 multi) and 7 PBQ, against a quota of 34 + 6. All spares were kept.
    - Bank so far: 210 MCQ, 39 PBQ. PBQ templates: buckets 4, match 5, order 4, config 6, diagram 5, hotspot 6, data 4, terminal 5. To reach 10 each, the rest of the exam needs buckets 6, match 5, order 6, config 4, diagram 5, hotspot 4, data 6 and terminal 5 (41 of the 57 PBQs left in the quotas). Lean on buckets, order and data.
    - Same method as session 2, with these lessons:
      - First drafts follow slides closely (about 40 of 135 flagged). Drafters must be told to invent their own scenarios, not just to avoid copying words; the 8-word check alone does not catch this.
      - Terminal PBQs keep hitting ambiguity (risks on both OWASP lists, duration and id formats). Brief drafters to show formats in the help output and to pick list-unique risks.
      - Copywriter fixes ping-pong between length tells and stem/key word repeats. After round 3, apply the copywriter's own one-line wording yourself (keys unchanged).
      - Reviewers sometimes report writing a file that does not exist (a Bash heredoc was blocked). Tell them to use the Write tool and confirm the file exists.
    - Scratchpad tools from this session (not in the repo): `strip.mjs`, `subset.mjs`, `approve.mjs`, and `compare.mjs`, which now accepts bare-value answers and checks terminal answers against the accept lists. Do not rerun the drafters' generators: the last edits were made to the JSON directly.
  - **Session 4 done (2026-10-31), slice (c) 2.4–2.6.** `main` (exam-cards UI, 438e1e4) was fast-forwarded into `chunk11-secai` first. `npm run check` passes: 567 unit tests and 73 e2e tests. Slice (c) is not merged to `main` or deployed; the live site has SecAI+ 1.1–2.3 (slice b went out with the exam-cards deploy).
    - Each of 2.4, 2.5 and 2.6 has 45 approved items: 38 MCQ (31 single, 7 multi) and 7 PBQ, against a quota of 34 + 6. All spares were kept. The blind reviewer matched every key in every round.
    - Bank so far: 324 MCQ, 60 PBQ. PBQ templates: buckets 8, match 7, order 6, config 8, diagram 7, hotspot 8, data 8, terminal 8. To reach 10 each, the rest of the exam needs buckets 2, match 3, order 4, config 2, diagram 3, hotspot 2, data 2 and terminal 2 (20 of the 39 PBQs left in the quotas). Lean on order (3.1 incident workflow), match (4.1 roles, 4.3 regulations) and diagram.
    - Same method as session 3 (scratchpad `2d701005-…/scratchpad`: `render.mjs` fills the brief templates in `d3/`, plus `strip`, `subset`, `compare`, `approve`, `dropflag`, `drift`, `term`, `peek`). Lessons:
      - The copywriter (Haiku) twice asked to rekey order-PBQ `partExplanations` from positions to step ids. That is wrong (order parts are positions); drop the flag before the fix pass, and tell it in re-review prompts.
      - Blind reviewers never see terminal `accept` lists; check them by hand (`term.mjs`).
      - Drafters that regenerate from their generator can touch unflagged items; `drift.mjs` confirms only the listed ids changed.
      - With only 8 compensating controls in 2.6, match/diagram PBQs reuse a control from some MCQ; accepted when the attack and scenario differ.
      - Round-3 copy fixes for 2.6 were applied by hand from the reviewers' own wording (keys unchanged), as session 3 did.
  - **Sessions 5–6 (2026-10-31), slice (d) 3.1–3.3: DONE, approved and committed.** Each objective has 52 items: 36 single + 8 multi MCQ and 8 PBQs, keys a/b/c/d 9 each. `check-drafts` and `npm run check` are clean.
    - PBQs by template: 3.1 terminal 1, config 1, data 1, hotspot 1, match 2, order 1, buckets 1. 3.2 match 1, buckets 2, diagram 1, hotspot 1, order 1, data 1, terminal 1. 3.3 order 2, diagram 2, config 1, terminal 1, data 1, match 1.
    - Bank now: 456 MCQ, 84 PBQ.
    - Reviews: 3.3 had three rounds plus a blind re-check of `order-002`. 3.1 and 3.2 had a round 2 (16 and 18 items fixed by a Sonnet drafter), then a blind-only round 3 on the changed items. The round-3 reviewers matched every key, and session 6 fixed their few remaining wording flags by hand.
    - Terminal PBQs were checked by hand: mixed `=`/space flag forms were added to the accept lists, and `weblog summary` was added to the 3.2 help text.
    - Scratchpad with briefs and tools: `b7ffd162-…/scratchpad` (`d4/` holds the briefs, and the root holds `compare`, `keepflagged`, `subset`, `drift`, `term` and `approve`). The round-N briefs are made by `sed` from the 3.3 templates.
    - Lessons:
      - First drafts followed the slides heavily again (3.1: 36 of 52 flagged).
      - A reviewer's "the stem prescribes the order" flag on an order PBQ invites ping-pong. State one discriminating rule rather than the full order.
      - 3.1's drafter keyed order `partExplanations` by step id; this is now fixed to positions.
      - Low-budget flow that worked: copy and sec reviews in round 2, then a sec-only blind recheck of the changed items, with the last few flags fixed by hand. If quota is tight, skip a second copy round.
      - Order PBQs need a rule for every adjacent pair that could swap. One rule still left SCA vs unit tests open in 3.3 `order-002`.
  - **Session 7 (2026-11-01), slice (e) 4.1–4.3: DONE, approved and committed.** Each objective has 42 items: 29 single + 6 multi MCQ and 7 PBQs (quota 32 + 6; all spares kept). `check-drafts` and `npm run check` are clean (567 unit, 73 e2e).
    - PBQs by template: 4.1 match 2, buckets, order, diagram, config, data. 4.2 buckets 2, match, data, hotspot, terminal, config. 4.3 match 2, buckets, config, data, diagram, order.
    - **SecAI+ bank now: 561 MCQ, 105 PBQ** (buckets 15, match 16, config 13, order 12, diagram 12, data 14, hotspot 11, terminal 12). Every template is at 10 or more, so Task 8's targets should pass with no new items.
    - Reviews: round 1 sec + copy on all items, round 2 sec + copy on the 99 changed items, round 3 blind sec only on the 47 changed again. The blind reviewer matched every key in every round. Round-2 copy fixes were not copy-reviewed again (the low-budget flow from session 6).
    - Scratchpad: `ff96b377-…/scratchpad` (`d5/` holds briefs, reviews and snapshots; the root holds the tools plus `round.mjs`, which renders round-N briefs from the session-6 templates, and `diffitems.mjs`).
    - Lessons:
      - First drafts followed the slides heavily again (4.1: 32 of 42 flagged, mostly the role-duty slides). Domain 4 slides are definitions and lists, so the fix is an invented situation per item, not new wording for the duty.
      - Overlapping roles (MLOps vs ML engineer vs platform engineer, governance engineer vs risk analyst) need one clue in the stem that rules out the neighbour.
      - `render.mjs` mangles `\\$o` inside double quotes in Bash; the round-1 copy briefs got `items$o.json` (reviewers recovered). Pass paths with no `$` next to a backslash.
      - Acronyms written out rather than added: IT ("information technology"), CoE, CASB, DNS, IEC, AIMS, HR.
- **Pick counts for multi-answer questions: DONE (2026-11-01) on `chunk11-secai`, commits f131926..HEAD (design, plan, 8 tasks, review fixes).** Spec: `docs/superpowers/specs/2026-11-01-multi-answer-pick-counts-design.md`; plan: `docs/superpowers/plans/2026-11-01-multi-answer-pick-counts.md`. `npm run check` is green (631 unit, 73 e2e). The Opus whole-branch review found no critical or important issues; its minors are fixed except the one the owner decided (below).
  - **Owner scope:** applies to Data+, SecAI+ and every future exam unless that exam's design says otherwise. The rules live in `src/domain/pick.ts`.
  - **What shipped:**
    - `mcq-multi` has an optional `pick` (a number equal to the correct count, or `"all"`). Missing = the number of correct answers, never select all. No shipped JSON was edited.
    - Answer screen: "Select N." hint; extra boxes are disabled once N are picked. A stem that doesn't state its count shows "(Choose two.)" etc.
    - Scoring (`mcqFraction`): select N = right ÷ N, more than N picks = 0; select all = (right − wrong) ÷ correct, never below 0, and picking every choice = 0 unless all are correct. Repeated or stale ids in saved responses are ignored. Hotspots keep the old formula (`selectAllFraction`).
    - Mock exam: the submit dialog no longer counts unanswered items; the review grid keeps ✓/○/⚑, and a select-N item is ✓ only with N picks.
    - Practice and cram: Finish asks "You have N unanswered or partly answered questions. Finish anyway?" (Finish / Keep going). Lesson checks and timeouts don't ask.
    - Editor: type label "Multiple choice (more than one answer)" and a "How many to pick" control with only Select two / three / all. **Owner decision:** a question with 4+ correct answers shows and saves as Select all (no "Select four").
    - Markdown packs: optional `Pick: all|2|3` line at the top of a block (documented in `docs/question-template.md`).
    - Bank test and `check-drafts` require every multi-answer stem to state its count. All 228 shipped items pass.
  - Also fixed: a flaky focus assertion in `src/ui/noBackButtons.test.tsx` (it failed before this work too).
  - **UI redesign (separate from chunk 11), awaiting the owner:**
    - Design doc: `docs/superpowers/specs/2026-10-31-exam-cards-and-acronym-table-design.md`. It covers exam cards on the landing page, a page per exam, Back/All exams on every screen, Settings, Stock/Custom, ten exams and one master acronym table. The builder check is done.
    - Open question to the owner: should the phone/browser Back gesture step back inside the app (history integration), or only the on-screen buttons? Then owner approval, then superpowers:writing-plans.
    - No product code before approval.
    - Branch: its own branch from `main`, so it is not blocked by chunk 11's content. This is my call; the owner can override it.
    - Security+ is SY0-801 (launching about 2026-11-17). The owner will supply the v8 objectives at the next TTT class.
- Write the plan with superpowers:writing-plans, then execute it. Fix every review finding, minors included, before closing the chunk.
- **Execution method (owner's choice):** Native. Use superpowers:executing-plans and implement every task inline, then dispatch one final whole-branch reviewer.
- **Owner rules for sessions:**
  - Content work runs one domain at a time, with a `/clear` between.
  - Subagents use the cheapest model that does the job; final whole-branch reviews of a large content chunk run on Opus.
  - Inline `node -e` with a multi-line script fails silently in the Bash tool here. Write a script file instead.

## Chunk 11 close-out (2026-11-01, session 8)

- **Done on `chunk11-secai`** (Tasks 8 and 9). `npm run check` passes: 642 unit and 73 e2e tests.
- **Task 8:** `src/banks/secai/bank.test.ts` locks the targets with `describeBankTargets`. They passed with no new items.
- **SecAI+ bank:** 666 approved items: 561 MCQs and 105 PBQs (buckets 15, match 16, config 13, order 12, diagram 12, data 14, hotspot 11, terminal 12). The deck-overlap check over all 15 files reports no flags.
- **Opus whole-branch review:** it answered 81 sampled items blind and matched every key. It found 1 important issue and 5 minors, all fixed in `d76736c`:
  - **Reverse length tell:** in 1.2 and 1.3 the key was never the longest option. Twelve distractors were trimmed, and the key is now the longest in 15–19% of singles in each domain-1 objective. A new per-objective floor in `shippedChecks` (at least 10% for an objective with 20 or more singles) guards this.
  - Four order PBQ stems gained a rule for each pair of steps that could swap. `cy1-1-2-mcq-020` got its own scenario, away from the deck example. Two terminal accept lists now take the full path and `--flag=value` forms. Two unit tests now name their exam.
  - `draft-ollama` now uses an example for the chosen exam (`scripts/draft-ollama-lib.ts`). It reads `content-drafts/topics.md` only when the file's heading names that exam: before this, a CY0-001 run would have been given Data+ topics.
- **Merged to `main` (4d14ec6) and deployed (gh-pages 66adc1e).** The live bundle holds all 666 SecAI+ items and the Data+ bank.
- **Flagged acronyms (not shipped):** see Session 1 above (CSA, DSA, SSE, CI, IA, SAM, GenAI, XSOAR, XSIAM).
- **Data+ length-tell fix: done and deployed** (see below).
- **After that:** chunk 12, AutoOps+.

## Data+ 2.1 and 4.1 length tell: DONE (2026-11-01, session 9)

- Branch `dataplus-length-tell`, commit 28868c2, fast-forwarded into `main`. `npm run check` passes: 642 unit and 73 e2e tests.
- The `longestFloorExempt` exemption is gone from `src/banks/dataplus/bank.test.ts` (RED first: `2.1: 6%`, `4.1: 4%`).
- Eight distractors were trimmed (keys, stems and explanations unchanged; none of these items is linked from a lesson):
  - 2.1: `mcq-010` a, `mcq-012` a, `mcq-022` d, `mcq-024` b. Key longest now 6 of 31 (19%).
  - 4.1: `mcq-014` a, `mcq-022` c, `mcq-015` b, `mcq-005` c. Key longest now 5 of 28 (18%).
- **Deployed 2026-11-01** (gh-pages `8094385`). The live bundle's asset hash (`index-CqHHIIRQ.js`) matches gh-pages.
- **SecAI+ +5 MCQs (2026-11-01, owner request to move off 666):** `cy1-1-3-mcq-033`, `cy1-2-1-mcq-039`, `cy1-2-3-mcq-039`, `cy1-4-2-mcq-036`, `cy1-4-3-mcq-036` (random objectives; keys c/d/d/c/c to even out key positions). Bank now **671: 566 MCQs, 105 PBQs**. `check-drafts --ref` clean, `npm run check` green (642 unit, 73 e2e). Written and checked inline, without the subagent review rounds. Not yet deployed.
- **AutoOps+ MVP (2026-11-01, owner request; deployed):** branch `chunk12-autoops`, fast-forwarded into `main`. AT0-001 is registered (`src/banks/autoops/`: meta with 4 domains, 14 objectives, 33 official acronyms, passing score 600 (verified); `docs/sources/AT0-001.md`). The home card and exam page appear automatically. The bank holds **one** approved MCQ (`at1-1-1-mcq-001`, Bash variable scope) and a one-item fixture. `npm run check` green (645 unit, 73 e2e). The owner is measuring the quota this used.
  - No `bank.test.ts` until Task 4 (targets would fail).

## Chunk 12 close-out (2026-11-05, session 6): Tasks 4 to 6 done

- **Task 4 (1ef2fd8):** `src/banks/autoops/bank.test.ts` runs `describeShippedBank` and `describeBankTargets` on AT0-001 (14 checks). All passed with no new items: 562 MCQ, 112 PBQ, 14 of each template, every objective quota met.
- **Task 5 (fc10ddb):** the Opus whole-branch reviewer blind-answered 84 items (6 per objective, all 8 templates) and **matched all 84 keys**. Git and HTTP items were accurate, the bank was vendor-neutral, and code formatting was clean. It found 0 critical, 1 important and 10 minor issues. All were fixed except one (ruling below):
  - **Important:** terminal accept lists rejected valid forms. 1.2 push now takes trailing `-u`/`--set-upstream` and `HEAD:`/branch refspecs. 2.3 now takes the URL bare, double- or single-quoted, and `Content-Type` or `content-type` in every step (create 672, update 576, read 9, delete 6). 1.1 find gained quoted-flag, `--regexp ERROR` and `./payments.log` forms. Checked with the app's matcher (`final/termtest-final.mjs`: 14 forms rejected before, all accepted after, wrong forms still rejected).
  - **Minors fixed:** 1.3 mcq-012 is now an application item (`count = 3` to `5` preview, key d, difficulty 2), so it no longer repeats 016/039's "declarative = end state". 2.2 mcq-028's stem no longer defines its answer. 2.3 hotspot-001: `Server` names the software. 2.3 mcq-036: `304` is in the `3XX` class. 4.1 buckets-001 i4 runs "before traffic is switched". Distractors were lengthened in 2.1 mcq-001/006/008 and 3.2 mcq-007/010/026 (key longest: 2.1 23%, 3.2 24%; whole bank 17%). The 1.3 terminal part explanations and the AT0-001 fixture are backticked. `parseAlternateArgs` rejects an empty `--terms` (test added).
  - **Ruling (not applied):** the reviewer asked to drop the `POST` tag on 2.3 config/order/data/buckets-001. `check-drafts` then reports the bare `POST` in plain PBQ text as untagged (batch 27 found the same), so the tags stay. `docs/content-drafting.md` now states this rule. Tags are never shown to learners.
  - `npm run check`: lint, typecheck, builds, 725 unit and 83 e2e pass. `check-drafts --ref` over all 14 files: no problems.
  - Review files: `.superpowers/sdd/2026-11-01-chunk12-autoops/final/` (`opus-review.md`, `opus-answers.json`, `blind.json`/`keyed.json` from `sample.mjs`, `ref/` with all decks and notes, `fix-final.mjs`, `longest.mjs`, `dump.mjs`). Keep, per the ledger rule.
- **Task 6:** `chunk12-autoops` fast-forwarded into `main` (f9c742e) and deployed (gh-pages f6a3d24). The live bundle `assets/index-94V42cHS.js` matches gh-pages and serves the new 2.3 accept forms.

## Chunk 12 session 1 (2026-11-01, sessions 10–11): Tasks 1 and 2 done

- **Branch `chunk12-autoops`** (not merged, not deployed). Commits 385703a and f0c0236. 664 unit tests pass (`npx vitest run`); `npm run check` (e2e) not yet run this session. Ledger: `.superpowers/sdd/2026-11-01-chunk12-autoops/progress.md` (read its `Ruling:` lines).
- **Task 1 done:** `meta.test.ts`; passing score **600** (CompTIA's exam page lists it, so no VERIFY); **14 objectives, not 15** (the plan's count was a slip); fixture now 4 items (2 single incl. a YAML code block, 1 multi, 1 buckets PBQ); AT0-001 in the exam-listing tests; `draft-ollama` AT0-001 example.
- **New engine piece (needed for Review Focus 1):** backticks in question text. `` `inline` `` and ```` ``` ```` fenced blocks render as code in stems, MCQ options, explanations and part explanations (`src/domain/richText.ts`, `src/ui/RichText.tsx`, `.code-block` in `src/index.css`). Blocks keep indentation and wrap (no sideways scroll). The acronym check skips code. Documented in `docs/content-drafting.md` (Style) and `docs/acronyms.md`. Drafters for AutoOps+ must use this for code.
- HTTP methods GET, PUT, PATCH, HEAD, OPTIONS are in `NOT_ACRONYMS`. POST stays a token because AT0-001 lists it (as "Power-on Self-test"); **do not tag `POST` on items that mean the HTTP method.**
- **Task 2 done (2026-11-01, session 11), commit 1baa16a.** `npm run check` green: 664 unit, 75 e2e.
  - Harvest: `_WorkingData/harvest-AT0-001.json` (16 sources; certificationpractice and both Udemy pages refused). Expansion: `_WorkingData/expand-AT0-001.json` (477 terms, 49 `ok`).
  - **Expander fix (owner request "expand if you can, Ollama primary"):** the prompt was hard-coded to data analytics. It now names the exam's domain titles, and `--terms A,B` reruns chosen terms. The first run also lost whole batches to `no answer` (bad JSON). A rerun of 164 terms (`_WorkingData/expand-AT0-001-rerun.json`) marked 32 more `ok`.
  - **37 community acronyms (all Ollama-expanded, checked by Claude):** ASCII, CA, CPU, CRL, CRLF, CSRF, DAG, DB, HTML, IP, IT, ITSM, LF, MD5, MIME, MTTR ("Mean Time to Recovery"), NIST, OWASP (corrected to "Open Worldwide…"), PR, QPS, RBAC, RC, RFC, RPC, SAST, SCM ("Source Control Management"), SHA, SOA, SQL, SRE, TCP, TLS, UA, UDP, URI, WAN, XML.
    - MTTR and SCM have common variant meanings (Repair/Restore; Source Code/Software Configuration Management). Drafters use the shipped expansions.
  - **Flagged, not shipped (owner to decide):**
    - Ambiguous: BCP (Business Continuity Plan vs Best Current Practice), SAM, CPE, DC, ADS, CR, ML, SD, TE, ID.
    - Vendor names: GCP.
    - Marginal or off-topic: IV, CGI, WEBDAV, BREACH, ALTSVC, IESG, IETF, IANA, ABNF, ISO, WWW, DOI, ITIL, COBIT, CNCF, ANSI, BSD, SCOR, SDSI, HTB, PCA, BI, DAS, DBA, FAQ, GZIP, UTF, CEU, CBT.
    - Not acronyms for us: PBQ (exam term), CICD (the official list has CI/CD), DEVOPS and GENAI.
    - Drafters write flagged terms out in full.
  - **Alternate meanings (owner rule, 2026-11-01):** CompTIA never asks learners to type an expansion, but for practice the typed quiz accepts any alternate that fits the exam's intent. Every exam is covered (rules in `docs/acronyms.md`, "Alternate meanings").
    - Entries take an optional `alternates`. Typed answers also ignore spacing inside words, so "multi-factor" matches "multifactor" and "lifecycle" matches "life cycle". The full list, flashcards, cram, quiz feedback and results show "Expansion (also: A; B)". Choice quizzes use the main expansion, and distractors never read as one of the answer's alternates. User acronyms have none.
    - `npm run alternate-acronyms -- --exam <code>` asks Ollama to draft alternates. `--suggest <file.json>` instead has Ollama judge alternates that someone suggests. Ollama stays the judge, and Claude checks what it keeps.
    - `checkExpansion` now ignores `/` and spaces in a term (CI/CD, SOC 2).
    - Shipped on this branch: 24 alternates across the three exams. AT0-001: CI/CD (Continuous Deployment), FaaS, MTBF, SDK, CA (Certification Authority), CRLF, ITSM, MD5, MTTR (Repair, Restore), SCM (Source Code Management). DA0-002: GUID, OLAP, PHI (Protected Health Information), PII, RegEx, SDLC (Systems…), UAT, ID, SAS, DBA. CY0-001: AIRMF, CI/CD (Continuous Delivery), GRC, SOC (Centre).
    - Rejected by Ollama: CD as Continuous Deployment (a different practice from Delivery), SRE as "Engineer", MTTR as "Resolve", SCM as "Software Configuration Management", EDR as "Remediation", SOC 2 as "Service Organization Control 2" (an outdated name), and others.
    - Rejected by Claude although Ollama accepted them: "Machine Learning Ops" and "Network ACL" (abbreviated, not spelled out).
    - The Data+ and SecAI+ changes reach the live site only when this branch is merged and deployed.
  - Deck notes: `_WorkingData/AutoOpsPlus/notes/` (6 decks + `index.md` objective map). The decks are thin topic lists; drafters should work from the objectives PDF sub-bullets. Text extracts were in session 10's scratchpad (`2b5018bd-…/scratchpad/src/`); regenerate with `scratchpad/tools/extract.py` if gone.
  - e2e: AT0-001 card and exam page (`home.spec.ts`), official terms CI/CD, FaaS, WinRM, IaC (`acronyms.spec.ts`), and the Review Focus 1 check in `study.spec.ts` (practice on domain 3 alone at 360 px: `.code-block` visible, no sideways scroll, axe clean).

## Chunk 12 session 2 (2026-11-01, session 12): domain 1 drafted, review half done (PAUSED: weekly quota ran out)

- **OWNER RULE (2026-11-01, batch size raised to 25 on 2026-11-03): review in batches of 25 questions, and ship after every batch. One batch per session: after shipping, update "Batch progress" and stop so the owner can `/clear`.** A batch stops at the end of an objective, so it may hold fewer than 25 (1.1's last batch is mcq-031..051 and the rest of 1.1, 21 items). No batch may leave work half done. Work through the batch 5 items at a time (`peek.mjs <obj> 5`, `approve-ids.mjs` after each 5), but run `ship.sh` once, at the end. For each batch, in file order (1.3 first, since its round 1 fixes are in; then 1.1, 1.2, 1.4):
  1. Review the items inline (no subagents): answer each yourself, then apply its round 1 flags from `d1/work1-<obj>.json` (1.3: check that its round 1 fixes hold). Edit the JSON directly. For a terminal PBQ, check the accept list by hand (`node d1/term.mjs`).
  2. `npm run check-drafts -- --exam AT0-001 --ref .superpowers/sdd/2026-11-01-chunk12-autoops/d1/ref src/banks/autoops/items/<obj>.json`: no problems.
  3. `node .superpowers/sdd/2026-11-01-chunk12-autoops/d1/approve-ids.mjs <obj> <id> ...` (it prints progress and the next 5 drafts).
  4. Update the "Batch progress" line below, then `bash .superpowers/sdd/2026-11-01-chunk12-autoops/d1/ship.sh "content(autoops): approve <obj> <ids>"`. This runs the bank tests and the AT0-001 bounds check (every question at 360 and 1280 px; a failure stops the ship), commits, fast-forwards `main`, deploys, and pushes both branches.
  - If quota runs out mid-batch, `git stash` or discard that batch; everything shipped is already complete.
  - When an objective is fully approved, run `npm run check` once.
- **Batch progress: DOMAINS 1, 2 AND 3 COMPLETE (2.1–2.4 at 44/44 each; 3.1–3.3 at 52/52 each). **Approved bank (2026-11-05): 448 MCQ and 88 PBQ, 11 of each of the 8 PBQ templates.** Targets: at least 500 MCQ (domain 4 must add 52 or more, which its quotas cover), at least 80 PBQ (met) and at least 10 per template (met), so domain 4 needs only its quotas. **Domain 4 is drafted and round 1 reviewed (session 5, see "Chunk 12 session 5"). Batch 36 (2026-11-05, short, owner low on quota) approved 4.1 mcq-001..005 (4.1 at 5/46): 001 "Rolling replacement" became "Rolling update" and 003 "Canary deployment" became "Canary release" (one term per method across 4.1), and 005 key became "The pool still in service fails..." (copy flag: "live pool" echoed the stem). Batch 37 (2026-11-05, short) approved 4.1 mcq-006..010 (4.1 at 10/46): 006 key now ends "before monitoring flags it" ("check" echoed the stem), 007 distractors lengthened to match the key's qualifier; 008 to 010 unchanged. Batch 38 (2026-11-05) approved 4.1 mcq-011..030 (4.1 at 30/46): 014 d now names "the production site"; 016 key says "failure" ("bug" echoed the stem); 017's explanation now says why a and c are wrong; 018 key is "Give each run its own disposable test environment" with distractors lengthened to match; 025 key "Ship the fix alone..." and `3.8.0` in backticks; 026 key "...that keeps the essential checks" (no "only"); 028 key "Roll back to the earlier build"; 030 d "...on the database host instead". The other 12 unchanged; key longest now 16%. Batch 39 (2026-11-05) approved the rest of 4.1 (mcq-031..038 and the 8 PBQs, 16 items; 4.1 at 46/46, `npm run check` green: 711 unit, 83 e2e): 034's stem now describes a staging copy of production with real databases, partner services and production-sized hardware (integration tests no longer have a CI-only reading; option b kept since integration testing is an objective bullet); 035 f is now "Each batch briefly takes a few instances out of rotation while they drain"; 036 distractors lengthened; match-001 explanation clarified; buckets-001 i4 is now "The two-minute critical-path check that runs as the deploy finishes fails at sign-in" and i6 says "simulated requests"; diagram-001 stem says "Place each label in the zone it belongs to. Some labels are not used."; terminal-001 already accepted all 8 flag orders (checked by hand), its code and ids are now in backticks and its start part says `v1.9.0` (was 1.9.0); data-001 math rechecked, service names backticked. Key longest 16%. Batch 40 (2026-11-05) approved 4.2 mcq-001..025 (4.2 at 25/46), with these judgment calls: **004 was rewritten** (it repeated 033 option b, an announced database upgrade as planned downtime): it now gives 30 minutes of announced maintenance plus a 20-minute failed-deploy outage and asks how many minutes count (key c, 20); **007 was rewritten** (a third plain definition beside 008 SLI and 014 SLA; the first rewrite, "where to set the SLO", clashed with 015, so it now asks what follows an SLO miss while the SLA is met: review and reprioritise, no credits; d1 became d2; SLA stays tagged, both tokens are in the text); 006, 013 and 015 distractors lengthened as the copy flags said, and 015 key no longer says "a slide"; 008 dropped its give-away sentence; 011 stem now asks about "a typical error-budget policy"; 012 options are all decimals; 017 key is "It does not count as provider downtime"; 019 key now says "repair ... and bring service back" (matches the stem's expansion) and starts with "The"; 020 and 025 explanations now say where 15 and 98.5% come from; 024 explanation gives a reason per wrong option; 025 formula is in backticks. Key longest 19%. **Watch in batch 41:** 033 (unplanned downtime) and 030 (policy not stated) have round 1 flags; 004 now overlaps 017 only loosely (both are contract exclusions, different causes). Batch 41 (2026-11-05) approved the rest of 4.2 (mcq-026..038 and the 8 PBQs, 21 items; 4.2 at 46/46; shipped as 324310d, gh-pages 7b8d52f; `npm run check` green: 711 unit, 83 e2e). **Approved bank now: 524 MCQ and 104 PBQ, 13 of each template.** Judgment calls: 030's stem asks what fits "a typical error-budget policy" (it is the unspent-budget twin of 011, which covers a spent budget); 029 says "on-call team" (not "rota"); 031's key is "...aged out of the measurement period"; 034's key b is "A number of failed requests the target tolerates" so the two keys no longer share "allowed in the window"; 035's stem is "reasons to keep incident reviews blameless"; 036's keys lost "only"; 027, 030 and 035 distractors lengthened; 026, 028, 032, 033, 037 and 038 unchanged. PBQs: terminal-001's accept lists already had both `--window` spellings, both orders and the explicit `--window 30` forms (checked by hand), and its meaning part now says why each wrong option fails; **config-001's stem no longer echoes the keys** ("must reflect what users receive", "lines up with the contract's monthly period") and is split into sentences, with window and burn parts naming why each distractor fails; **order-001 gained the rule "the on-call engineer is paged before anyone restores service"**; data-001's parts explain every distractor (60% is the inverted ratio, 83% fits a 99.0% objective); diagram-001's stem no longer claims arrows that are not drawn; match-001 says "Match each description to the term it defines."; buckets-001's i6 is "Internal target that pages on-call when its budget burns fast". **Fix across banks:** data PBQ captions render as plain text, so the backticks in 4.2 data-001's caption and in the live 3.2 data-001 caption (`ledger-api`) were removed; a scan of every PBQ payload in every bank found no other backticks. Key longest 22%. Batch 42 (2026-11-05) approved 4.3 mcq-001..025 (4.3 at 25/46; **approved bank now: 549 MCQ and 104 PBQ**). Every key held. Changes: 007 d puts `export` in backticks; **011's snippet now imports `PartnerClient`** (`from partner_sdk import PartnerClient`), so the stem asks about "the line that sets `key`" instead of "the second line"; 015's explanation now says why "CLI for both" is wrong; 016's stem says the client "waits at most 5 seconds per attempt"; 018 d is "a shared login owned by one engineer" (explanation to match); 020's distractors lengthened (key no longer the longest) and its explanation updated for the new c and d; 022 a and d now say "deploy credentials"; 023 a and c now say "read and write role". The other 17 unchanged. Key longest 16% across 4.3. Batch 43 (2026-11-05) approved the rest of 4.3 (mcq-026..038 and the 8 PBQs, 21 items; 4.3 at 46/46, **domain 4 and all four domains complete; approved bank: 562 MCQ and 112 PBQ, 14 of each template**). Every key held and every round 1 flag was applied: 026 stem "stores" (not "caches"); 027 key "A scope that allows reading the invoices the job needs and nothing more" with longer distractors; 028, 029 and 035 distractors lengthened (029 d now says URL, so URL was tagged); 030 asks "What is uploaded"; 032 "must be protected"; 033 a is "...to `.gitignore`"; 036 "Which THREE of these checks". **The lengthened distractors dropped 4.3 key longest to 9%, so one distractor was trimmed in 026, 028 and 031 (keys unchanged): back to 19%.** PBQs (scripts `d4/fix-b43-*.mjs`): **terminal-001's accept lists were regenerated** (add 432 forms: every flag order, name first or last, `=` or space, each value plain, single- or double-quoted; use 3; login 6), tested with `d4/termtest43.mjs`, and its part explanations backtick the commands; config-001 backticks `payments-api`, two store distractors are longer, and every part says why the wrong options fail; **data-001 gained a "Used by" column** (r5 now follows from the table, not the key name); diagram-001 z1 is "Signs a token for the repository and branch"; **hotspot-001's stem says the lines come from the role's trust policy and permission policy together** (so `principal` belongs) and each wildcard line has its own reason; **match-001's p2, p3 and p4 were reworded** so each has one deciding clue (a script exports the values; the code must not name its credential source; an identity is attached to the VM); buckets-001's bucket is "CLI use and configuration" and i3 says "when building the client in code"; order-001 unchanged. Shipped as 282382a (gh-pages cce558e); bank tests (134) and the AT0-001 bounds check passed. `npm run check` after 4.3: lint, typecheck, builds, 711 unit and 83 e2e pass, with no worker split needed. (Done in session 5:) domain 4, plan Task 3 (`docs/superpowers/plans/2026-11-01-chunk12-autoops.md`): print the quotas, make a `d4/` workspace by copying the `d3/` tools and pointing their paths at `d4/` (`peek.mjs`, `approve-ids.mjs`, `rep.mjs`, `setopt.mjs`, `term.mjs`, `ship.sh` and the rest), draft with one Sonnet drafter per objective, run round 1 (blind Sonnet subject reviewer and Haiku copywriter per objective), commit as `status: "draft"`, then review in batches of 25 as above. **Brief the drafters and copywriters on key length:** in domain 3 the copy flags kept asking for shorter keys, and 3.3 fell to key longest 3% before batch 35 fixed it. **Lesson from batch 35:** `check-drafts ... | tail` hides its exit status, so read its last line ("no problems") before you run `approve-ids.mjs`; never chain them with `&&` after a `tail`. Batch 35 (2026-11-05) approved the rest of 3.3 (mcq-026..044 and all 8 PBQs, 27 items), applied every round 1 flag and ran `npm run check` once (3.3 and domain 3 complete), with these judgment calls: **039's stem now says "without any push to the repository"** (a tag push is a push, so it is no longer a third answer), its distractors are longer, and "README" became "a docs file" (it read as an acronym); 030 says "a commit whose hash starts" (the hash shown is 16 characters); 032's key is "After the stages, when the run ends in error"; 043's `ChatOps` is no longer in backticks; 041's explanation names each wrong pairing; 034, 035, 037, 040, 043 and 044 had distractors lengthened or keys trimmed; **to lift 3.3 key longest from 3% to 16%, one long distractor was trimmed in 026, 027, 033, 034 and 036** (keys unchanged). PBQs: **terminal-001's tag accept list was regenerated** (`d3/fix-b35-terminal.mjs`, 360 forms: `-a`, `--annotate` or no flag, since `-m` alone makes an annotated tag; `-m`/`-mX`/`--message`/`--message=` with the message plain or quoted; `-am`; optional `HEAD`; every order), and the explanation says `-m` alone also annotates; **hotspot-001's branch line is now `on: { push: { branches: [main] } }`** (`d3/fix-b35-hotspot.mjs`), so its parent key is shown; config-001 and data-001 have short one-rule sentences in the stem; diagram-001's stem is "Place each component in the zone below the trigger flow whose role it fills."; code names are in backticks in config, order, data, match and buckets. `d3/tally-at.mjs` counts the approved AutoOps+ bank (the old `tally.mjs` counts SecAI+). Batch 34 (2026-11-05) approved 3.3 mcq-001..025 and applied every round 1 flag, with these judgment calls: `ChatOps` is no longer in backticks in 001, 006, 007 and 008 (it is a word, not code, and the acronym check passes); **one more backticked `ChatOps` is left in a later 3.3 stem ("Which TWO details should the audit trail..."): unwrap it in batch 35**; 006's options are now plain names (ChatOps, GitOps, Canary release, Drift detection) and its explanation says what GitOps does; 004's key is "Remember which deliveries it has handled and skip repeats" (no "ID"); 017's key is "A scheduled (cron) trigger"; **020's explanation now says why each wrong time is wrong** (09:00 needs a midnight start); 021's stem names GitHub Actions and the key is "Schedules take effect only on the default branch" (it still says "branch", which is the point of the item); 024 keeps its key "The commit hash of the build" and distractor a now also says "commit"; 003, 009, 011, 013, 015, 022, 023 and 025 had keys reworded per the copy flags. Batch 33 (2026-11-05) approved the rest of 3.2 (mcq-026..044 and all 8 PBQs, 27 items) and applied every round 1 flag, with these judgment calls: 028's key is "The step gets the same pinned tools on each runner"; 031's options are all about the same length (key "Copy `package.json`, install, then copy the source"); **034's explanation now says cyclomatic complexity is the number of decision points plus one** (it said "counts decision points"); 036, 038, 039, 040, 043 and 044 had their keys shortened or distractors lengthened; 041's keys no longer say "secret" (key b "Mount the token for one build step so no layer stores it", no "never"); 043's explanation says why each distractor is wrong. PBQs: **terminal-001's job file now says `workdir: /work (already set in the image)`**, the stem and status label say Bash, and the run accept list was regenerated (`d3/fix-b33-terminal.mjs`, 120 forms: `--rm`, `-v`/`--volume`/`--volume=` with the mount plain or double-quoted, and an optional `-w`/`--workdir`/`--workdir=` `/work`, in any order); status also accepts `echo ${?}`; config-001's scheduling options share one shape ("Waits for compile to finish", "Starts at once; waits for no job"); data-001 and hotspot-001 backtick job names; **diagram-001's boxes are now "Stage 1" to "Stage 4"** (the old Compile/Test stage names contradicted the placements) and each zone fits one job only (z2 "Checks how the compiled code behaves", z4 "Stores the bundle for later deploys", which rules out Rollback); match-001's c4 is "Vulnerable packages baked into the built container image"; **buckets-001's i1 is "A failed test is retried twice" and i4 is "Pipeline carries on when the link checker fails"** (the always-run cleanup and the timeout each fitted two buckets). order-001 had no flags. Edit files `d3/opts-b33a..d.json`, `d3/edits-b33b,d.json`, scripts `d3/fix-b33-*.mjs`. Shipped as 2c71438 (gh-pages c843c9f); bank tests (134) and the AT0-001 bounds check passed. `npm run check` after 3.2: lint, typecheck, builds, 711 unit and 83 e2e pass. Batch 32 (2026-11-05) approved 3.2 mcq-001..025 and applied every round 1 flag in that range, with these judgment calls: 003's key is "Give each job its own copy of the test data"; 004's difficulty is 2; 005 and 009 lost "only" from the key; 007 backticks `.bin`; 010's key is "A path filter that skips the job when no code files changed" and option d is shortened; 011's key is "No; `refs/tags/v1.4.0` does not start with `refs/heads/release/`"; **012's stem says "a required manual job"** and its explanation notes that GitLab lets a pipeline carry on past an optional manual job (the product-specific flag); 013's key is "A health check that fails on the running service"; 015's key is "…backward compatible with the older release"; 016 says "resource metrics"; 018's key is "To run only when an earlier job has failed"; 019's key is "A repeat run must leave the target in the same end state"; 024's key is "Fail on new top-severity findings and report the rest"; 025's key is "Revoke and replace the credential, because old commits keep it". Edit files `d3/edits-b32a..e.json`; new helper `d3/setdiff.mjs <obj> <id> <n>` sets an item's difficulty. Shipped as dda78d9 (gh-pages f3f284e); bank tests (134) and the AT0-001 bounds check passed. Batch 31 (2026-11-05) approved the rest of 3.1 (mcq-026..044 and all 8 PBQs, 27 items) and applied every round 1 flag, with these judgment calls: 026's stem is three sentences ("the same name and a higher version, `99.0.0`") and its key drops "alone"; 028's key is "At build time, from the same dependency resolution"; 030 says "call by name"; 033's key says "the script's return code of zero"; 035's key is "Run each job in a fresh, disposable container" (its VM tag dropped, since VM no longer appears); 037's key is "Give each run its own isolated instance or schema"; 040's key says "build machine"; **041's short distractors became `preinstall` and `postinstall`, now defined in the `package.json`** (install hooks, which a build does not trigger) plus `test`; 043's distractors are longer. PBQs (one script, `d3/fix-b31.mjs`): terminal-001 identifiers backticked (accept lists unchanged: both `--extend` spellings were already in, checked by hand); **config-001's stem says the job cannot renew a lease** (the 5-minute lease was a second defensible answer), shorter store and delivery keys, "30 minutes, longer than the job", and rotation/jobend parts say why each distractor fails; data-001's explanation says the pre-release sorts below its own release (`2.0.0`, not listed) but above every `1.x`, versions backticked; **diagram-001 uses 2.2's spacing** (vault box at y 20 with its zone at y 80; external repo, runner and registry at y 150 with zones at y 210), shorter zone names, and the stem says each target area sits under the box it names; hotspot-001's stem says "hard-codes a secret value, such as a password" (the user name line is clearly out); **match-001 was reworked** to artifact-registry situations (authentication, authorization, revocation, immutability, semantic versioning, SBOM; Tokenization is the spare), so it no longer repeats the four secrets MCQs; buckets-001's i3 says "build agents". Edit files `d3/edits-b31a..d.json`, `d3/opts-b31d.json`. Shipped as 4c481d3 (gh-pages 3da3ce4); bank tests (134) and the AT0-001 bounds check passed. The first `gh-pages` push was refused by GitHub ("fatal error in commit_refs_rules", a server-side error, no rulesets on the repo); `npm run deploy` from `main` worked on a plain retry, then both branches were pushed by hand. `npm run check` after 3.1: lint, typecheck, builds, 711 unit and 83 e2e pass. Batch 30 (2026-11-05) approved 3.1 mcq-001..025 and applied every round 1 copy flag in that range, with these judgment calls: 001's key is "An encrypted vault with per-caller access rules"; 003's key is "A small set of keys is re-wrapped; stored secrets stay as they are" (no "Only", no "data keys" echo); 006's options all end "…the secret"/"…bad secrets" (key "A lease on the secret"); 010's options all share one frame (key "Every request is checked for identity and permission, wherever it comes from"; distractors "…are trusted"); 012's key is "A static password kept in pipeline settings"; **025's option b is now "Copy the dependencies by hand onto each runner machine"** (vendoring into the repo was a second defensible answer) and its key is "Route downloads through a caching internal registry". Edit files `d3/opts-b30a..e.json`, `d3/edits-b30a..e.json`. Note: `rep.mjs` fails when the old text also appears in the explanation; use `setopt.mjs` for whole options. Shipped as f5e9561 (gh-pages 79404ec); bank tests (134) and the AT0-001 bounds check passed. Batch 29 (2026-11-05) approved the rest of 2.4 (mcq-026..036 and all 8 PBQs, 19 items) and applied every round 1 flag, all in one script (`d2/fix-b29.mjs`), with these judgment calls: **026 was rewritten** (its unclosed `[` header was the hotspot's fact): a strict parser rejects a section with `host` set twice; key (still c) "`host` is set twice in the same section", difficulty 2; 027's key is "Move `timeout = 30` under the `[service]` line"; 029's distractors are `wc -l` and `ls -l` (no GNU-only long options); 030's distractors all run after the file is live (smoke test, error-rate alert, weekly log review); 031's option c names the server; 032's key c is "…passed at launch is wrong" and its distractors are plausible (debug log level, old log files, deploy time); 033's key is shortened and its distractors are plausible traps (issued under a day ago, several host names, 2048-bit key); 035's option a is "Ending a line with a space and a `#` comment"; terminal-001: stray backtick removed from the grep line, dates agree (Mon 2026-11-02, journal Nov 02), the check label says "uses only the include flag", code backticked in stem, explanation and parts (accept lists unchanged, checked by hand); config-001 backticks `labels.env` and `production: eu`; **order-001's stem no longer gives the full order**: two rules only (service before log, network before clock); data-001 says "no more than 300 seconds" and "versions compare part by part as numbers"; **diagram-001 was redrawn**: Client → Proxy → App server only (no CA node or edge), and the symptom zones sit at y 170, beyond the 80 px `zoneNear` reach, so no box is announced as labelled by a symptom; hotspot-001's `pbqWeight` is 2 and its stem says shuffled positions; **match-001 was reworked**: messages p1–p3 come from a Go service (stem says so) and are now privileged port (`bind: permission denied`), `connection refused` and unknown authority, p4–p6 name PyYAML, Python's json module and configparser, the choices are causes rather than format names, and a firewall-drop distractor (timeout vs refusal) was added; buckets-001's bucket is "API or agent communication failure". Shipped as db76c9d (gh-pages 70e609c). `npm run check` after 2.4 (domain 2 complete): lint, typecheck, builds, 711 unit and 83 e2e pass (`pwa` included), with no worker split needed. Batch 28 (2026-11-04) approved 2.4 mcq-001..025 and applied every round 1 flag in that range, with these judgment calls: 002 and 007 say the agent is "a Go program" (the messages are Go's); 002's key is "A firewall rule on the host's network path…"; 003's key is "Reissue the agents' client certificates and restart them"; **006's key now honours the header** ("Wait the `Retry-After` delay, then poll less often with jitter"), its HTTPS distractor became "Split each agent's calls across several parallel connections", and its HTTP/HTTPS tags were dropped (new helper `d2/setacr.mjs <obj> <id> <ACR,..|->`); 009's stem starts "Run as root,"; 010's key is "Use `/etc/appd/app.yml`, the file that exists on disk"; 011's key is "Add a `DATABASE_URL` entry under `environment`" and the port distractor became "Add a `DATABASE_HOST=db` entry…"; 013's key is "Add `After=` and `Requires=` lines for the dependency" (Requires kept: acceptable, and the race fix holds) with longer distractors; 014 names cron, its key is "Jobs get a shorter `PATH` than a user's terminal session has", and the explanation says why each distractor is wrong; 016's output uses curl's real wording ("no alternative certificate subject name matches target host name") and the stem says "trimmed; exact wording varies by version"; 017's key is "Have the server send the intermediate with its certificate"; 018's key is "Install the signing authority's root certificate on the new agent"; 019's stem asks "when … becomes valid and when it expires" (no `-dates` echo); 022 names PyYAML and its key is "Indent the lines with spaces instead"; 023's semicolon distractor became "`5432` must be quoted because a port is a string". Edit files `d2/edits-b28a..e.json`. Batch 27 (2026-11-04) approved the rest of 2.3 (mcq-026..036 and all 8 PBQs, 19 items) and applied every round 1 flag, with these judgment calls: **035 was rewritten** (its "collection" key did not switch hosts, and it repeated 025's base-URL fact): a nightly job sends every saved request and fails on a wrong status; keys are a collection and test scripts (a, c); 028's key is "Send a unique idempotency key with each call"; 031's stem says "so a repeat cannot change the outcome beyond the first call" (idempotent is not "safe"); 032's distractors are `Location: /v1/orders/981`, `Retry-After: 86400` and a longer `ETag`; 036's stem no longer says "temporary"; **terminal-001's accept lists were regenerated** (`d2/fix-b27-terminal.mjs`): the notes now name the header (`Content-Type: application/json`) and say "Write the address last, and add no option a step does not need", and the lists cover every flag order, short or long options and either header quote style (create 112, update 96, read 3, delete 2; `d2/termtest.mjs` tests typed forms); `-i` is no longer accepted. **`POST` tags kept** on config, order, data and buckets: PBQ payload text is plain (no code spans), so the checker needs the tag for a bare `POST`, and tags are metadata never shown to learners (only terminal-001 lost the tag). PBQ field labels render as plain text, so never backtick them; explanations and part explanations do render code. data-001's options have unique ids (`k3..k5`, `c2..c4`, `s2..s4`); diagram-001's stem says the service decides which orders exist and a database behind it stores them (z4 "Stores the order record on disk after a 201"); hotspot-001's `pbqWeight` is 2 and its stem says the lines are in shuffled positions; buckets-001's stem says "with no extra safeguard such as an idempotency key". One-off scripts `d2/fix-b27-*.mjs`; viewer `d2/peekpbq.mjs <obj> <id>` cuts long accept lists. Shipped as 123ad2e (gh-pages 918b0b5). `npm run check` after 2.3: lint, typecheck, builds, 683 unit and 81 e2e pass; the `pwa` project was not run (see the port note). **Port 4173 note:** another local app (`C:\repo\battletech-tools-master`, `vite preview --port 4173`) held port 4173, so `ship.sh`'s bounds step failed with "Port 4173 is already in use". Workaround used: `d2/pw-alt-port.config.ts` (same config on port 4174) via `npx playwright test -c <it> --project=bounds`, then the rest of `ship.sh` by hand. The `pwa` tests hard-code 4173 (`PWA_PORT` in `tests/e2e/util.ts`), so stop that app before a full `npm run check`. Batch 26 (2026-11-04) approved 2.3 mcq-001..025 and applied every round 1 flag in that range, with these judgment calls: 004's key is "Set `Content-Type: application/json`"; 007's key is "The caller is known but lacks permission"; 008's status classes are backticked and its key is "`5XX`, error on the server side"; 010's subject flag (422/400 also used for duplicates) was not applied, since no other option is plausible and "conflicts" in the stem would give the key away; 013's key is "The upstream service did not reply in time"; 014's stem says the redirect reply has an empty body; 016's stem joins its first two sentences with a semicolon; 017's key is "Nothing, because the body is empty"; 022's explanation now says `--include` adds the headers to the output (not "only prints headers"); 024's stem says "the standard `wget` on most Linux hosts" (GNU is not a listed acronym, so it is not written); 025's key is "A `{{base_url}}` variable set per environment". Edit files `d2/edits-b26a..f.json`. **The first ship was stopped by the bounds check:** 021's and 023's options (`curl`/`wget` with a full URL) ran off the screen at 360 px, and the results review split `v|1` inside a URL. Fix in the app (all exams): `RichText` now renders inline code through `InlineCode`, which puts a `<wbr>` after each `/` (not inside `//` or at the end), so URLs and paths wrap at slashes (tests in `src/ui/RichText.test.tsx`; rule added to `docs/content-drafting.md`). Note: `check-drafts … | tail` hides its exit code, so read its last line before approving. Batch 25 (2026-11-04) approved the rest of 2.2 (mcq-026..036 and all 8 PBQs, 19 items) and applied every round 1 flag, with these judgment calls: **036 was rewritten** so it no longer repeats 029's topic-vs-queue fact: an audit service misses topic events during an outage, and the key (still b) is "Subscribe a queue to the topic and have the service read from it" (difficulty 3); 031's explanation names at-least-once delivery; 034's key is plain "Function as a service" (FaaS is spelled out in the explanation, so the tag stays and the key is no longer the only option with an acronym); terminal-001 already accepted bare `fg`/`bg`, and gained `%2`, `%+`, `%%` (and `… &` for bg) forms; config-001's web label says the servers "may change only when the release manager starts the run", and the tmp label says the build server is "managed by no control node"; hotspot-001's `pbqWeight` is 3 (3 correct spots); match-001's p3 says "only their built-in remoting service" (PowerShell over SSH would need OpenSSH) and p1 is "A file of saved commands…" (so c4 keeps the objective's "command-line script"); **diagram-001 was redrawn** like 2.1's: a two-row flow Build finished → topic → queue → function → control node → Hosts updated, with unlabelled boxes and a zone under each; "Agent on the host" and "Remote desktop session" are the unused labels. One-off script `d2/fix-b25.mjs` did the PBQ rewrites. `npm run check` after 2.2: 681 unit and 83 e2e pass (same `--maxWorkers=8` / `--workers=2` split). Batch 24 (2026-11-04) approved 2.2 mcq-001..025 and applied every round 1 flag in that range, with these judgment calls: 001's distractor d is "A Windows remote desktop session…" (so "Windows" is not a key tell); 003 backticks `web01`; 004's tag flag was not applied (HTTP and SSH are in its explanation); 006's key is "Extra software must be installed…"; 007's options all carry a short description (SSH and WinRM spelled out, distractors lengthened); 010's stem says "from a Bash prompt"; **012 was reworked** to stop repeating 005/025 (outbound through firewalls): its keys are now "The server needs no login credential for each managed host" and "Each host can report whether it matches its desired state"; 014's stem says "After the third release"; 016's stem says the tool checks live servers against its definition on every run; 018's key is "Add a new, higher-numbered migration for the change"; **021 was rewritten** so it no longer repeats 020's ephemeral definition: it now asks what grows when per-pull-request environments are never removed (key: idle environments pile up cost); 023's key is "Push, started by the central controller"; 024's key is "Drift is corrected without anyone starting a run". 025 was kept although it shares the firewall setting with 005 (it tests pull vs push, 005 tests agent vs remote). New helper `d2/setopt.mjs <obj> <opts.json>` replaces whole option texts (use it when the text also appears in tags or explanations, which `rep.mjs` would hit too). Batch 23 (2026-11-03) approved the rest of 2.1 (mcq-026..036 and all 8 PBQs, 19 items) and applied every round 1 flag, with these judgment calls: 026's key is "Fewest active connections first"; 029's stem is three sentences; 030's stem says the resolver cache was flushed (rules out a stale OS cache) and the key is "A stale entry in the local `hosts` file overrides DNS"; 034's stem no longer states rule a verbatim ("runs PostgreSQL on port 5432, and its only clients are the app servers in `10.0.2.0/24`"); 036's key is "Each tier can have its own route table"; terminal-001's stem names the new address `10.1.4.20`, its s1 distractors are longer, and s3 reads "before a future move"; order-001's stem keeps only the two rules for pairs that could swap (check before install, retire the old key last); **diagram-001 was redrawn:** zones within 80 px under a node are announced as that node's label (`zoneNear` in `DiagramView.tsx`), so the old layout read "Web servers, labelled by Subnet with no route to the gateway". It now has unlabelled boxes for the load balancer and router in the path, and each subnet zone sits under its own tier; its DNS tag was kept (the explanation uses DNS); **hotspot-001 was reworked** so it no longer repeats mcq-015's deny-first case: a broad allow (rule 20, `10.6.0.0/16`) shadows a newer deny for host `10.6.3.21`, the stem says positions are shuffled, and `pbqWeight` is 2; buckets-001's i5 (a near-repeat of i1) is now the bastion host; backticks in config, data and terminal part explanations. `npm run check` after 2.1: 677 unit and 75 e2e pass (same `--maxWorkers=8` / `--workers=2` split). One-off scripts `d2/fix-b23-diagram.mjs` and `d2/fix-b23-hotspot.mjs` did the payload rewrites. Batch 22 (2026-11-03) approved 2.1 mcq-001..025 and applied every round 1 flag in that range: 007's explanation backticks the resource names and says why option a is wrong; 010's key is "Revoke the certificate and reissue it on a new key pair"; 014's key is "In a secrets store or a file with tight permissions"; 019's key starts "It has", like the distractors; 022's key is "Add a default route to an address-translating gateway"; 023's stem says the platform's route tables "are managed by hand" (some clouds add peer routes automatically); 024's key says "the endpoint" (no `/healthz` echo); 025 asks "about how long at most" and its explanation gives 20 to 30 seconds. 023's DNS tag was kept: the explanation uses DNS. Edit helper: `d2/rep.mjs <obj> <edits.json>` (exact-once replace within one item's strings). 1.1, 1.2, 1.3 and 1.4 are all approved (51/51 each, 204 items) and deployed. Batch 21 (2026-11-03) approved the rest of 1.4 (mcq-026..043 and all 8 PBQs, 26 items) and applied every round 1 flag, with these judgment calls: 026's stem paraphrases the error ("the two sets of commits share no common ancestor") and the key is "`--allow-unrelated-histories` to permit the join"; 029 keeps "merge" in the stem (removing it would make `rebase --abort` defensible), and instead option b became `git merge --continue`, so the word no longer gives the key away; 034's "token expired" distractor (an expired token gives 401, not 403) became "The local branch is behind the remote branch"; 040's option d now says "TLS certificate verification"; 042's distractors d and e became `git restore --staged .` and `git checkout 3f9a2c1`; terminal-001's push list gained `origin -u HEAD`, `origin --set-upstream HEAD` and the trailing-flag `HEAD` forms, and create gained `@` forms; config-001's free-mark `keep` part was replaced by a `check` part ("Command that checks the script for syntax errors without running it": `bash -n`, key o2), its version distractors carry the same message, and the place options are "Directly after the tar line" / "Anywhere before the tar line"; order-001's test step became "Run git diff --check on the edited files" (git-documented, and the stem says "checks for leftover markers before staging"); data-001's stem defines a syntax error as "the parser rejects the code" (true for Bash too) and names the authentication-failure option; hotspot-001's stem says the lines are shuffled (spots really are shuffled per attempt) and identifies the raising line as "the one that reads the missing key"; backticks in config, order, diagram, hotspot, match and buckets explanations. 040's and match-001's acronym flags were not applied: TLS and SSH appear in their explanations. Scratchpad helpers: `rep.mjs` (exact-once replace within one item's strings, from an edits JSON), `acc.mjs` (append terminal accept forms). In the Bash tool, a heredoc with an apostrophe is blocked by a hook; write edit files with the Write tool. `npm run check` after 1.4: 677 unit and 75 e2e pass (same `--maxWorkers=8` / `--workers=2` split). Batch 20 (2026-11-03) approved 1.4 mcq-001..025 and applied every round 1 flag in that range: 001's key is "A closing `fi` line after the block"; 002's stem says "On Python 3.12" (the quoted message is 3.10+); 003's key is "`IndentationError`, since the `if` body is not indented"; 004's key says "has no closing `)`"; 005's tool is "written in Python" (the message is Python's `json` wording); 006's key is "make the line run as a command" and the stem ends "Why does Bash print this?"; 007's stem no longer quotes the exact message; 010's key is "`count` is local to the `report` function"; 011's stem now says the script "assigns `$dst` but reads `$dest`"; 013's key ends "because `+=` makes it local"; 020's key no longer repeats `requests`; 021's explanation reworded; 023's key matches the distractors' shape; 024's key says "resolve any conflicts" and the stem no longer says "pull". Also, 025's explanation no longer claims deleting the index corrupts the repository. A scratchpad helper `rep.mjs` (exact-once string replace on the JSON) did the edits; recreate it if needed. Batch 19 (2026-11-03) approved the rest of 1.2 (mcq-026..043 and all 8 PBQs, 26 items, so the objective finished in one batch). It applied every round 1 flag but one: 026's stem says "prints" (no "lists" echo); 030's key is now "Fix it on `release/3.2`, then port the fix to `main` as well" (merge or cherry-pick, per the subject flag; also shorter); 031's explanation names how each wrong name breaks the convention; 033's stem is "After she rebases…, her `git push` is rejected"; 041's private-repository option became "A note in the `README` asking contributors not to commit secrets" (`README` in backticks, or the acronym check flags it), with backticked `pre-commit`; terminal-001's stem backticks the branch, repo and message and says "with no final period", its push accept list gained `git push origin -u HEAD` and `--set-upstream HEAD`, and its explanations are backticked; config-001's stem says "a current Git release", its pull label is "Make a pull of diverged history fail, rather than merge or rebase", and its push part notes Git 2.37+; diagram-001's z1 is "Short-lived branch for one planned ticket in the next version" (rules out the hotfix distractor) and the stem says "this team's release flow"; buckets-001 i5 now ends "to match the documented behavior"; backticks in order, data, hotspot and match. Not applied: 028's flag (it called `versionsort.suffix` the old name, but `versionsort.prereleaseSuffix` is the deprecated alias). The terminal-001 `git push -h` output was kept, as help text that shows formats is the house rule. `npm run check` after 1.2: 677 unit and 75 e2e pass (same `--maxWorkers=8` / `--workers=2` split). Batch 18 (2026-11-03) approved 1.2 mcq-001..025. It applied every round 1 flag in that range: 006's stem now says "in the index" (no "staged" echo); 008's key trimmed to "…, as the repository setting wins" and option c lengthened; 015's key is now "The hook does not stage the files it reformatted, so their edits are left out"; 016's stem now starts "By default," and backticks `pre-commit`; 017 backticks `pre-commit` and its key is now "Move the key into the environment and stage the corrected file"; 023 and 024 backtick their identifiers and versions (ASCII is a community acronym, so 023's tag stays). Batch 17 (2026-11-03) approved the rest of 1.1 (mcq-031..043 and all 8 PBQs). It applied every round 1 flag: copy lengths on 032, 034, 038, 039 and the terminal key; 037 lost its "In most languages" hedge and got longer collections; 042's explanation now names the extra `.1`; backticks in the terminal, config, diagram, hotspot, match and buckets explanations; diagram label "Raises a NameError" became "Not readable there: raises NameError", with a matching "…raises TypeError" distractor; buckets-001's two primitive items no longer read as JSON types (now "Holds one single value and no nested values" and "A category that covers booleans, integers and floats"); terminal-001's count step gained `-e`, `-ce`, `--count` and `./` forms. `npm run check` after 1.1: 677 unit and 75 e2e pass, but on this machine the full run needs `--maxWorkers=8` for Vitest and `--workers=2` for `responsive.spec.ts` (otherwise worker and axe timeouts under load). Next: 1.2 mcq-001..025 (`node .superpowers/sdd/2026-11-01-chunk12-autoops/d1/peek.mjs 1.2 5`); its round 1 flags are in `work1-1.2.json`. Older notes: 1.1 mcq-001..030 were batches 12–16. Batch 16 applied the copy flag on 026 (explanation now says "The third option" for the no-substitution answer); 027–030 had no flags. Batch 15 applied the copy flag on 021 (key trimmed to "The number `3.1`, zero dropped"); 022–025 had no flags. Batch 14 applied the copy flags on 018 (key now "It raises `TypeError`"; explanation now names JavaScript for `80801` and `print(port, 1)` for `8080 1`) and 020 (explanation now says why "A single string" is wrong). Batch 12 applied the copy flags on 007–010 (008 options now all "x, y and z"; 010's `[]` distractor became `['b', 'a']`). 006's copy flag was not applied: it was wrong, since option a also repeats a literal from the code. Batch 13 applied the copy flags on 012 (explanation now says why "`WARN` entries alone" is wrong) and 013 (key reworded to "Scripts can read fields such as the level by name"). Note: `node -e` writes silently failed in the Bash tool this session; use the Edit tool or a script file. Next: a 25-item batch, which here means the rest of 1.1 (21 items from mcq-031), then `npm run check` (`node .superpowers/sdd/2026-11-01-chunk12-autoops/d1/peek.mjs 1.1 5`).

- **(Historical, session 12; domain 1 is now approved, see "Batch progress" above.)** Branch `chunk12-autoops`. Domain 1 items were committed as `status: "draft"`, so they did not show in the app (`registry.ts` serves approved items only).
- **Drafted:** 1.1, 1.2, 1.3 and 1.4 each hold 51 items: 36 single + 7 multi MCQ and 8 PBQs (one of each template), against a quota of 39 + 7. Keys a/b/c/d are 9 each per objective; key longest about 19% and shortest 17–25%. `check-drafts --ref` is clean on all four. 1.1 keeps the approved `mcq-001` (its code is now in backticks).
- **Round 1 review done for all four.** The blind Sonnet reviewer matched every key in all 204 items. Flags still to fix:
  - 1.1: 3 subject flags (`buckets-001`: booleans and numbers are also valid JSON; `mcq-037` hedge; `terminal-001` accept list). The copy review result (`copy1-1.1.json`) may be missing; rerun the Haiku copy review if so.
  - 1.2: 21 items (9 subject, 19 copy) in `work1-1.2.json`.
  - 1.4: 36 items (12 subject, 31 copy) in `work1-1.4.json`.
  - 1.3: round 1 fixes are DONE (31 items changed, check clean). Next is a blind-only round 2 on those 31: `ids2-1.3.json`, brief `sub-r2-1.3.md` (already rendered). `terminal-001`'s key changed (apply step now `-f db.cfg`); check its accept list by hand with `term.mjs`.
- **Where the files are:** `.superpowers/sdd/2026-11-01-chunk12-autoops/d1/` (git-ignored; keep). It holds the briefs (`drafter-at.md`, `subject-brief.md`, `copy-at.md`), objective text (`obj-1.x.txt`), deck notes (`ref/`, the `--ref` folder), the round 1 snapshots (`full1-`, `blind1-`, `sub1-`, `copy1-`, `work1-`), and the tools: `rr.mjs` (renders round-N inputs and briefs), `changed.mjs` (changed ids between rounds), `compare.mjs`, `term.mjs`, `approve.mjs`. **`rr.mjs` and `changed.mjs` hard-code session 12's scratchpad path in `D`;** point `D` (and the brief paths) at the new scratchpad or at the workspace folder before you use them.
- **To finish domain 1:** send each objective's `work1` list to a Sonnet fixer (do not rerun the drafters' generators in `d1/`; the JSON has hand edits). Then a blind-only round 2 on the changed ids, fix the last few flags by hand, check terminal accept lists with `term.mjs`, `approve.mjs`, `npm run check`, commit `content(autoops): domain 1`. Then domain 2 in its own session.
- **Added this session:** an "AT0-001 rules" section and PBQ plan in `docs/content-drafting.md`, plus the AT0-001 row in its bank table.
- **Note for later:** Dockerfile keywords (`RUN`, `COPY`, `CMD`) in PBQ part text are read as unlisted acronyms, so the 1.1 config PBQ uses plain-English options. If later config PBQs need literal lines, add these keywords to `NOT_ACRONYMS`.
- Plan: `docs/superpowers/plans/2026-11-01-chunk12-autoops.md`. One domain per session. Owner rule: an unknown passing score is assumed to be 750 of 900, marked `VERIFY`.

## Chunk 12 session 3 (2026-11-03): domain 2 drafted and round 1 reviewed

- **2.1, 2.2, 2.3 and 2.4 each hold 44 draft items:** 30 single + 6 multi MCQ and 8 PBQs (one of each template), against a quota of 32 + 5. Committed as `status: "draft"`, so nothing shows in the app yet. `check-drafts --ref` over all 176: no problems (keys 27/25/24/24%, key longest 22%). Bank tests pass.
- After domain 2 is approved, each PBQ template has 8, so domains 3 and 4 need at least 2 more of each (16 of their 39 PBQ quota).
- **Round 1:** one blind Sonnet subject reviewer and one Haiku copywriter per objective. The blind reviewers matched every key (0 mismatches in 176). Items with flags: 2.1 21, 2.2 31, 2.3 32, 2.4 32, in `d2/work1-<obj>.json`. **No fixer pass was run:** the flags are applied inline in the batch flow, as 1.1, 1.2 and 1.4 were.
- **Workspace:** `.superpowers/sdd/2026-11-01-chunk12-autoops/d2/` (git-ignored; keep). It has the same tools as `d1/` with the paths pointed at `d2/` (`peek.mjs` reads `d2/work1-*`; `ship.sh` writes its logs into `d2/`), plus the objective text (`obj-2.x.txt`), the `--ref` folder `d2/ref/`, the briefs and the drafters' generators (`gen-2.x.*`; **do not rerun them**, since batch edits go into the JSON directly).
- **Batch flow for domain 2:** the same as the owner rule above, with `d2/` in place of `d1/`. Order: 2.1, 2.2, 2.3, 2.4. Each objective takes two batches: mcq-001..025, then mcq-026..036 plus the 8 PBQs (19 items). Commands: `node .superpowers/sdd/2026-11-01-chunk12-autoops/d2/peek.mjs 2.1 5`, `npm run check-drafts -- --exam AT0-001 --ref .superpowers/sdd/2026-11-01-chunk12-autoops/d2/ref src/banks/autoops/items/<obj>.json`, `node .superpowers/sdd/2026-11-01-chunk12-autoops/d2/approve-ids.mjs <obj> <ids>`, `bash .superpowers/sdd/2026-11-01-chunk12-autoops/d2/ship.sh "<msg>"`.
- **Recurring flags to watch:**
  - Hotspot `pbqWeight` is 6 on the 2.1, 2.3 and 2.4 hotspots, but 2.1's has only one correct spot. Set the weight to about the number of correct spots, as 1.4 does (2).
  - 2.3: five PBQs tag `POST` as an acronym. Remove the tag (on this exam it means Power-on Self-test).
  - 2.4: error messages are quoted from specific tools (PyYAML, Go, `curl`, `configparser`) without naming them. Name the tool or paraphrase.
  - 2.2: topic vs queue and the ephemeral definitions repeat across MCQs (mcq-020/021, 028/029/036).
  - 2.1: hotspot-001 and mcq-015 both test first-match ACL rules.
  - Terminal accept lists (all four objectives): check them by hand with `node .superpowers/sdd/2026-11-01-chunk12-autoops/d2/term.mjs src/banks/autoops/items/<obj>.json`. 2.3's has about 225 generated `curl` forms, and the 2.2 reviewer notes that a bare `fg`/`bg` also works there (job 2 is the current job), so add those forms or change the job setup.
- Acronyms the drafters spelled out instead of adding: CNAME, MX, NS, PTR, TXT, AAAA, NAT, TTL, CSR, CIDR, OCSP, NTP, SAN, CN, PEM, SSL, CSV, ID.

## Chunk 12 session 4 (2026-11-05): domain 3 drafted and round 1 reviewed

- **3.1, 3.2 and 3.3 each hold 52 draft items:** 37 single + 7 multi MCQ and 8 PBQs (one of each template), against a quota of 40 + 7. Committed as `status: "draft"` (8e4ba3e), so nothing shows in the app yet. `check-drafts --ref` over all 156: no problems (keys 24/24/26/25%, key longest 21%). Bank tests pass (74). After domain 3 is approved, each PBQ template has 11 (target 10), so domain 4 needs only its quotas.
- **Round 1:** one blind Sonnet subject reviewer and one Haiku copywriter per objective. The blind reviewers matched every key (156 of 156; the one "mismatch", 3.1 diagram-001, is the reviewer keying node ids instead of the zone ids under them, with the same labels). Items with flags: 3.1 31 (12 subject, 28 copy), 3.2 31 (9 subject, 25 copy), 3.3 30 (3 subject, 30 copy), in `d3/work1-<obj>.json`. No fixer pass: flags are applied inline in the batch flow, as for domain 2.
- **Workspace:** `.superpowers/sdd/2026-11-01-chunk12-autoops/d3/` (git-ignored; keep). Tools copied from `d2/` with paths pointed at `d3/` (`peek.mjs`, `peekpbq.mjs`, `approve-ids.mjs`, `rep.mjs`, `setopt.mjs`, `setacr.mjs`, `term.mjs`, `rr.mjs`, `compare.mjs`, `ship.sh` with the bounds step). Also: `obj-3.x.txt` (from the PDF), `ref/` (6 decks + `notes-3.x.txt`; the `--ref` folder), the briefs (`render-draft.mjs` adds the domain 2 lessons as "Domain 3 notes"), and the drafters' generators (`gen-3.*`, `pbqs-3.1.cjs`; **do not rerun them**). `termtest.mjs`, `lens.cjs` and `stats.cjs` still point at domain 2 files; edit their paths before use.
- **Batch flow for domain 3:** the same as the owner rule above, with `d3/` in place of `d1/`. Order: 3.1, 3.2, 3.3. Each objective takes two batches: mcq-001..025, then mcq-026..044 plus the 8 PBQs (27 items, allowed since a batch ends at the end of an objective, as 1.4's 26-item batch did). Commands: `node .superpowers/sdd/2026-11-01-chunk12-autoops/d3/peek.mjs 3.1 5`, `npm run check-drafts -- --exam AT0-001 --ref .superpowers/sdd/2026-11-01-chunk12-autoops/d3/ref src/banks/autoops/items/<obj>.json`, `node .superpowers/sdd/2026-11-01-chunk12-autoops/d3/approve-ids.mjs <obj> <ids>`, `bash .superpowers/sdd/2026-11-01-chunk12-autoops/d3/ship.sh "<msg>"`.
- **Recurring flags to watch:**
  - 3.1: match-001 repeats the lease, tokenization, Zero Trust and dynamic-secret facts of mcq-006, 008, 010 and 013 (rework the match or those MCQs); mcq-025 and config-001 (5-minute lease) have a second defensible answer; diagram-001's zone z4 sits between two nodes (y 74, between n4 at y 8 and n2 at y 120) and its zone texts are long.
  - 3.2: terminal-001 needs `-w /work` (or the stem must fix the working directory) and assumes Bash for the exit status; diagram-001 puts unit tests under Compile and Package under the test stage; buckets-001 has a cleanup item that fits two buckets; mcq-012 describes manual-job behavior that differs by CI product.
  - 3.3: mcq-039 (a pushed tag is a third "no new code" trigger); hotspot-001's `branches: [main]` line needs its parent key shown; terminal-001's `git tag -a` / `git push` accept list needs every quoting and order form (check with `term.mjs`).
  - All three: the copywriters flagged key length tells in about half the flagged items, plus code outside backticks in explanations and part explanations.
  - Terminal accept lists: check all three by hand with `node .superpowers/sdd/2026-11-01-chunk12-autoops/d3/term.mjs src/banks/autoops/items/<obj>.json`.
- Terms the drafters spelled out or backticked instead of adding: HSM, KMS, TTL, JWT, OIDC, MFA, SSO, PII, CVE, SPDX, UTC. Help text in the 3.1 and 3.2 terminal PBQs uses lowercase column headers and placeholders so they are not read as unlisted acronyms.

## Chunk 12 session 5 (2026-11-05): domain 4 drafted and round 1 reviewed

- **4.1, 4.2 and 4.3 each hold 46 draft items:** 32 single + 6 multi MCQ and 8 PBQs (one of each template), against a quota of 34 + 6 (20% ÷ 3). Committed as `status: "draft"`, so nothing shows in the app yet. `check-drafts --ref` over all 138: no problems (keys 25/25/25/25%, key longest 19%; key shortest 5, 8 and 7 of 32). Bank tests pass (134). After domain 4 is approved: 562 MCQ (target 500) and 112 PBQ, 14 of each template.
- **Round 1:** one blind Sonnet subject reviewer and one Haiku copywriter per objective. **The blind reviewers matched every key (138 of 138).** Items with flags: 4.1 19 (4 subject, 16 copy), 4.2 30 (18 subject, 21 copy; 4 of the subject "flags" are notes that the arithmetic checks out), 4.3 24 (11 subject, 16 copy), in `d4/work1-<obj>.json`. No fixer pass: flags are applied inline in the batch flow, as for domains 2 and 3.
- **Workspace:** `.superpowers/sdd/2026-11-01-chunk12-autoops/d4/` (git-ignored; keep). Tools copied from `d3/` with paths pointed at `d4/` (`peek.mjs`, `peekpbq.mjs`, `approve-ids.mjs`, `rep.mjs`, `setopt.mjs`, `setacr.mjs`, `term.mjs`, `rr.mjs`, `compare.mjs`, `changed.mjs`, `ship.sh` with the bounds step); d3's per-batch `fix-b*`/`handoff-b*` scripts were not copied. Also: `obj-4.x.txt` (from the PDF, by `mkref.cjs`), `ref/` (6 decks + `notes-4.x.txt`; the `--ref` folder), the briefs (`render-draft.mjs` adds "Domain 4 notes": deciding clues between neighbouring terms, service-level math, AWS facts, a firmer key-length rule) and the drafters' generators (`gen41.cjs`, `patch41.cjs`, `gen-4.2.mjs`, `patch1.mjs`, `gen-4.3.py`; **do not rerun them**). The copy brief (`copy-at.md`) now says to judge key length across the objective and to prefer lengthening distractors over cutting the key.
- **Batch flow for domain 4:** the same as the owner rule above, with `d4/` in place of `d1/`. Order: 4.1, 4.2, 4.3. Each objective takes two batches: mcq-001..025, then mcq-026..038 plus the 8 PBQs (21 items). Commands: `node .superpowers/sdd/2026-11-01-chunk12-autoops/d4/peek.mjs 4.1 5`, `npm run check-drafts -- --exam AT0-001 --ref .superpowers/sdd/2026-11-01-chunk12-autoops/d4/ref src/banks/autoops/items/<obj>.json`, `node .superpowers/sdd/2026-11-01-chunk12-autoops/d4/approve-ids.mjs <obj> <ids>`, `bash .superpowers/sdd/2026-11-01-chunk12-autoops/d4/ship.sh "<msg>"`. **After 4.3's last batch, all four domains are approved: go on to plan Task 4 (lock the targets), Task 5 (Opus whole-branch review) and Task 6.**
- **Recurring flags to watch:**
  - 4.1: mcq-034 and 035 each have a second defensible reading; buckets-001 has a smoke-test item that also fits post-deployment testing; terminal-001 needs every flag order in its accept list.
  - 4.2: order-001 has no rule putting detection before restoration; mcq-030 asks what "fits the policy" without stating it; SLO vs SLA definitions repeat across mcq-007, 014, match-001 and buckets-001, and planned maintenance across mcq-004 and 033; mcq-007, 011 and 034 tag acronyms their text does not use; terminal-001 needs the explicit `--window 30` and `--window=30` forms; diagram-001 draws no feedback edge.
  - 4.3: match-001 parts p2–p4 each fit more than one choice; data-001 r5 rests on a key name (the table has no "used by" column); hotspot-001's `principal` line; mcq-011 uses `PartnerClient` without an import; terminal-001 needs both flag orders.
  - All three: copy flags are mostly stem words repeated only in the key, "only" in keys, and code outside backticks in PBQ explanations. Key-length flags are fewer than in domain 3; check `check-drafts` still shows key longest 15–25% after each batch.
  - Terminal accept lists: check all three by hand with `node .superpowers/sdd/2026-11-01-chunk12-autoops/d4/term.mjs src/banks/autoops/items/<obj>.json`.

## Standing rules

- **Check GitHub issues at the start of every session (owner rule, 2026-11-03).** Run `gh issue list --state open` before any other work. Bugs always come first: fix open bugs before content batches or new features. List the open enhancement requests too, so the owner can decide whether they beat adding more questions. Update the open-issues list under "Next session".
- **Text stays in bounds (owner rule, 2026-11-03, issues #4 and #7).** No text escapes its box and no word is cut between letters, at any width. Anything too wide scrolls inside its own keyboard-focusable box. Every batch of new questions passes the Playwright bounds check for its exam before it ships (`BOUNDS_EXAM=<code> npm run check-bounds`; `ship.sh` runs it). Rules in `docs/content-drafting.md`, "Text stays in bounds".
- **Busy port → free port (owner rule, 2026-11-04).** Any server or script that needs a port uses its default when free, and otherwise a free port the OS picks, for that run only. Never fail on "port in use", and never stop another app to free its port. New servers use `serverPort()` from `scripts/port.ts` (or `vite` without `--strictPort`).
- Do not use GitHub Actions workflows or Git LFS; the owner's quota is low. Deploy to Pages locally from a branch.
- Bundled content must be original. Never ingest dump questions. The acronym harvester keeps only acronym tokens.
- Accessibility is enforced: axe must show no serious or critical violations, and every drag interaction needs a keyboard and tap alternative.
- Update this file at the end of every chunk.
- **Keep the SDD ledgers (owner rule, 2026-11-01).** Do not delete the plan workspaces in `.superpowers/sdd/` (ledgers, rulings, logs) when a plan finishes, even where a skill says to. They are the reference for rulings while we build and test. Clear them all at once, and only after every current CompTIA exam is in the engine.
- Finish each chunk in full before moving on. Fix review minors too; never defer them.
