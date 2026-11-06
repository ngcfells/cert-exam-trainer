# In-app bug reports and feature requests: design

Status: draft for owner review, 2026-11-06. Builder check done; no owner questions left.

## Intent

Learners should be able to report a bug, a problem with a question, or a feature request from inside the app,
without a GitHub account and without leaving the app. The report becomes a GitHub issue on
`ngcfells/cert-exam-trainer` with the right label (owner, 2026-11-06).

The same day, the mock exam's flag button was renamed "Flag for my review" (f7a9888). The owner's point: flagging is
the learner's own reminder, not a report. This design keeps the two separate.

## Goals

- Report from anywhere in the app, except during a mock exam (owner).
- Two entry points (owner: "both"):
  - **On a question:** a "Report a problem" button next to any question in practice, cram and lesson checks, and on
    the results and review screens of every mode, mock included. It fills in the exam code, the question id and the
    app version.
  - **General:** a "Report a bug or request a feature" button reachable in one click from every other screen.
- The learner fills in the details in the app and sends. No GitHub sign-in (owner).
- After a mock exam ends, the results say how many questions were flagged for the learner's review and offer a
  report link on each one. Flagging itself never sends anything (owner approved this playback).
- An optional contact field, with a note that issues are public (owner approved this playback).
- Offline: keep the report and offer to send it once back online (owner approved this playback).
- On success, show "Sent, thank you" with a link to the new issue.

## Non-goals

- No reading or listing issues in the app, no comments, no status tracking.
- No attachments or screenshots in this version.
- No change to flagging behaviour.

## Anti-goals

- **A GitHub token anywhere in the app's code or build.** The page is public, and anyone could pull the token out
  of it. The token lives only in the relay (below).
- Any report button, panel or reminder during a running mock exam.
- A report that silently fails. The learner always sees sent, saved for later, or the error and their text kept.
- Losing the learner's place or answers in practice or cram when they open the report form.

## Architecture (owner chose this, 2026-11-06)

- **Relay:** a Cloudflare Worker on the owner's free Cloudflare account, at a `*.workers.dev` address.
  - It holds a fine-grained GitHub token, set as a Worker secret. The token covers only cert-exam-trainer, with
    Issues: Read and write and nothing else.
  - It checks the request, then creates the issue through the GitHub REST API (`POST /repos/{owner}/{repo}/issues`).
  - It returns the issue number and URL.
- The owner creates the token and pastes it into Cloudflare. It is never shown to Claude, committed or logged.
- No GitHub Actions (standing rule). The Worker is deployed from the owner's machine with `wrangler`.

## Calls made in this design (the owner can overturn any)

1. **Report types and labels.** The repo already has `bug` and `enhancement`.
   - Bug → `bug`.
   - Feature request → `enhancement`.
   - Problem with a question → `bug` plus a new `content` label. The Worker setup steps create that label.
   - Every report also gets a `from-app` label, so in-app reports can be told apart. The relay sets the labels, so
     the app cannot add others.
2. **Spam protection.**
   - **Turnstile:** Cloudflare's free bot check, in its invisible or managed mode. The Worker verifies the token.
   - **Rate limit:** per IP, 5 reports an hour and 20 a day, kept in Workers KV or the Workers rate-limit binding.
   - **Size caps:** title 120 characters, details 5000, contact 200.
   - **Body escaping:** the Worker escapes `@` mentions and `#` references, so a report cannot ping people or
     cross-link issues. The issue text is otherwise plain Markdown.
3. **Allowed origins.** The Worker accepts the GitHub Pages origin and localhost. (The `null` origin is refused: see call 13.)
   A missing or other origin is refused. This is a courtesy check, not security; Turnstile and the rate limit are the protection.
4. **What the app sends.**
   - The type, title, details and optional contact.
   - The context, filled in by the app and shown to the learner before sending, with a way to remove it: app version,
     exam code, question id, mode (practice, cram, lesson, results), and the browser's user-agent string.
   - Answers, scores and saved data are never sent.
5. **Issue format.** The title is the learner's title, and the prefix `Question <id>:` is added for question
   problems. The body has the details, then a "Context" list, then "Contact" if one was given, then a footer line:
   "Sent from the app, version X".
6. **The form.**
   - It opens in a panel, using the #14 panel system, so nothing underneath unmounts.
   - The general button sits in the settings panel and on the About screen. A small "Report" button in the app's
     header makes it one click from every screen except a running mock, where it is hidden.
7. **Offline queue.** An unsent report is saved in the app's IndexedDB as a new `outbox` store.
   - The app tries again when it comes back online or starts. It never sends without the learner seeing it: a banner
     says "1 report waiting to send" with Send and Discard buttons.
   - Outbox reports are not part of backups.
8. **Config.** The Worker URL and Turnstile site key are build-time settings (`VITE_REPORT_URL`,
   `VITE_TURNSTILE_SITEKEY`). Both are public values. If either is missing, the report buttons are hidden, so test
   and fixture builds work without them.
9. **Where the Worker code lives:** `relay/` in this repo, with its own `package.json`, tests (Miniflare or vitest
   with the Workers pool), a `wrangler.toml` and a `relay/README.md` of owner setup steps. `npm run check` does not
   deploy it.
10. **Privacy note.** The form says, in one line, that the report becomes a public GitHub issue. The About screen's
    legal text gets a short paragraph saying what is sent.

11. **"During a mock" means before it ends.** A mock ends by submitting, by the timer, or by leaving, and since #14
    leaving always ends and scores it. The results screen appears only after it ends. The builder uses one shared
    "mock running" signal (the panel system already knows the mock deadline) for the header button and the panel.
12. **The report form is a fourth panel kind** (`report`), modal like Settings. One panel opens at a time (the
    existing rule). The per-question button is rendered by the runner or review screen with the current question's
    id, next to the Calculator and Whiteboard buttons. Panels do not unmount the screen underneath (#14), so the
    learner keeps their place; an e2e test checks a half-answered practice question survives a report.
13. **No reporting from the single-file build.** Turnstile cannot run from a page opened from disk, so in that build
    the report buttons are replaced by one line on the About screen: "To report a problem, use the online app", with
    its link. The relay therefore does not accept the `null` origin (this replaces that part of call 3).
14. **Turnstile runs at send time only.** The form opens and fills offline. A token is fetched when the learner
    presses Send (from the form or the outbox banner) and is never stored.
15. **Outbox storage.** The IndexedDB version goes from 1 to 2 with an `oldVersion` check, so existing data is kept.
    `Repo` and the memory repo gain outbox methods. Backup export leaves the store out, and backup import ignores it.
    At most 10 waiting reports; past that, the app asks the learner to send or discard first.
16. **No duplicate issues on retry.** Each report has a client id. The Worker remembers ids for 24 hours (KV) and
    returns the existing issue for a repeat.
17. **Labels exist before the first deploy.** The setup creates `content` and `from-app` (`gh label create`). If
    GitHub still rejects the labels, the Worker creates the issue without them, so the report is not lost.
18. **The rate limit can be approximate.** KV counters keyed on `CF-Connecting-IP`. Eventual consistency is fine for
    a spam brake.
19. **Context removal is one checkbox.** "Include technical details", on by default, with the details listed under
    it.
20. **Version and settings.** The version is the existing `__APP_VERSION__`. The Worker URL and site key are public
    values, so they go in a committed `.env.production`. Deploys run from the owner's machine (`npm run deploy`), so
    no secret is involved. The e2e build sets a fake URL and key, and Playwright intercepts both the relay and the
    Turnstile script.

## Owner setup steps (the builder writes these out in full)

1. The fine-grained token (done or in progress, 2026-11-06): cert-exam-trainer only, Issues: Read and write. Note its
   expiry date in the handoff.
2. Create a Turnstile widget in the Cloudflare dashboard for the Pages domain and localhost, and note the site key.
   Done 2026-11-06: widget "cert-trainer reports", managed mode, site key `0x4AAAAAAF2w670muVBVNqkR` (public). The
   secret key stays with the owner.
3. `npx wrangler login`, then `npx wrangler secret put GITHUB_TOKEN` and `npx wrangler secret put TURNSTILE_SECRET`
   (the owner pastes these values; Claude never sees them), then `npx wrangler deploy`.
4. Give Claude the `workers.dev` URL and the site key (both public) for the build settings.

## Constraints

- Accessibility as elsewhere: labelled fields, an error summary with links on a failed send (like the question
  editor), focus moves to the result, and the panel traps and returns focus.
- Tests: unit tests for the form, payload building and outbox. Worker tests for validation, labels, escaping, the
  rate limit, origins and Turnstile failure, with the GitHub API and Turnstile mocked. E2E for a report from a
  practice question with the relay mocked by Playwright route interception, and for no report button in a running
  mock.
- Repo rules: keep `.superpowers/sdd` ledgers, no GitHub Actions, no LFS, a busy port means use a free one.

## Left to the builder

- Form layout and wording, within the rules above.
- Worker code structure and the rate-limit storage choice.
- The exact header button placement and style.
