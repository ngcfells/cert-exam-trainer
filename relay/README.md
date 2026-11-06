# Report relay

A Cloudflare Worker that turns in-app reports (bugs, problems with a question, feature requests) into GitHub issues
on `ngcfells/cert-exam-trainer`. It holds the GitHub token and the Turnstile secret, so neither is ever in the app.

What it does with each report: checks the origin, validates the report, returns the existing issue for a repeated
report id (24 hours), limits each connection to 5 reports an hour and 20 a day, checks Turnstile, then creates the
issue with the right labels.

The tests run with the app's tests (`npm test` at the repo root). `npm run check` never deploys the Worker.

## Owner setup (once)

Before you start, run `npm install` at the repo root (the Worker shares the app's report contract and `zod`), and
create the two labels the Worker uses:

```sh
gh label create content --repo ngcfells/cert-exam-trainer --description "Problem with a question" --color 5319e7
gh label create from-app --repo ngcfells/cert-exam-trainer --description "Sent from the in-app report form" --color 0e8a16
```

Then, from this folder:

1. `cd relay`, `npm install`, then `npx wrangler login` (opens the browser to sign in to Cloudflare).
2. `npx wrangler kv namespace create RELAY_KV`. Copy the printed `id` into `wrangler.toml` in place of
   `REPLACE_WITH_KV_ID`. The id is not a secret, so it is committed.
3. `npx wrangler secret put GITHUB_TOKEN`, then `npx wrangler secret put TURNSTILE_SECRET`. Paste each value at the
   prompt. Never type them anywhere else: not in a file, a commit, a chat or the handoff.
   - `GITHUB_TOKEN`: a fine-grained token for `cert-exam-trainer` only, with Issues: Read and write and nothing else.
   - `TURNSTILE_SECRET`: the secret key of the "cert-trainer reports" Turnstile widget.
4. `npx wrangler deploy`. Note the `https://cert-trainer-relay.<subdomain>.workers.dev` address it prints. It is
   public, and goes in the app's `.env.production` as `VITE_REPORT_URL` (with `/report` on the end).
5. The token expires. Note its expiry date in the handoff, and before then make a new token and repeat step 3 for
   `GITHUB_TOKEN` only. No redeploy is needed.

## Changing the Worker later

Edit `src/`, run the tests at the repo root, then `npx wrangler deploy` from this folder.
