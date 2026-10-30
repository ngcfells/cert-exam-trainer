# Writing PBQs

Each PBQ is a template plus data. `questionSchema` (`src/domain/schema.ts`) checks every question, so a bad cross-reference fails at load time, not mid-exam. This guide covers the rules you can't see from the shape of the data alone.

## All templates

- IDs must be unique within each list (prompts, options, steps, spots, buckets, items, columns).
- `pbqWeight` is 1–6. It sets the PBQ's share of the score.
- Every part is scored on its own, and partial credit is given.
- `partExplanations` is keyed by part ID and shown on the results screen.

## Terminal (`pbq-terminal`)

- `payload.output` holds the lines shown in the terminal. Nothing is ever run.
- A step with `options` is a "choose an action" step. Its `answer.accept[stepId]` lists the option IDs that count as correct.
- A step without `options` is a typed command. Its `answer.accept[stepId]` lists the accepted patterns.
  - Before comparing, the typed text and each pattern are trimmed and runs of whitespace become one space.
  - **Case matters.** `LS -l` does not match `ls -l`.
  - `*` matches **one word**: one or more characters with no spaces. `**` is treated the same as `*`. A `*` never matches across a space, so `grep ERROR *` accepts `grep ERROR a.log` but not `grep ERROR a.log b.log`.
  - Every other character is literal. Quotes count, so list `grep ERROR f`, `grep "ERROR" f` and `grep 'ERROR' f` as separate patterns.
  - List every reasonable equivalent: flags like `-n` or `-i`, `./file`, and a pipe such as `cat f | grep ERROR`. A learner who types a working command shouldn't lose the mark.
  - The results screen shows every accepted pattern, with `*` written as `<any word>`.

## Data (`pbq-data`)

- Every row has exactly one cell per column, and column names are unique.
- `chart` (optional) draws a bar chart from `labelColumn` and `valueColumn`. Every value in `valueColumn` must be a plain number: no thousands separators, units or blanks.
- The table is always shown, and it is what screen readers use. The chart is visual only.

## Hotspot (`pbq-hotspot`)

- Spots must lie inside the `width` × `height` image. `answer.selected` lists the correct spot IDs, at least one, with no duplicates.
- Scoring follows the select-all rule: (right picks − wrong picks) / number of correct spots, never below 0.

## Buckets (`pbq-buckets`)

- `answer.placements` maps **every** item to exactly one bucket. Items are shuffled for each attempt.
