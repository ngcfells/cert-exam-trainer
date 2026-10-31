# Drafting the shipped bank

This brief is given word for word to every drafter and reviewer of bundled questions. It applies to every exam; the examples use Data+ (DA0-002).

## Sources

- Write from the public exam objectives and your own knowledge of the field. Every question must be original.
- Never read `_WorkingData/`, any question dump, practice-test site or vendor courseware. Do not reproduce wording from any exam or training product.

## Where items go

- One JSON file per objective: `src/banks/<exam>/items/<objective id>.json`, holding a `Question[]` (see `src/domain/types.ts`).
- Ids: `da2-<objective with the dot as a dash>-<type>-<nnn>`, where `<type>` is `mcq` for both MCQ kinds or the PBQ short name (`match`, `order`, `config`, `diagram`, `terminal`, `data`, `hotspot`, `buckets`). Example: `da2-2-3-mcq-007`, `da2-4-1-hotspot-002`. Numbers are three digits and never reused.
- Every item has `exam`, `source: "ours"`, `objectiveIds` (first one is the objective the file is for), `difficulty` 1–3, `stem`, `payload`, `answer`, `explanation`, `acronyms` and `status`. New drafts are `status: "draft"`.
- `acronyms` lists every acronym token the item uses (stem, options, explanations). Each must be in the exam's acronym list in `meta.ts`; if it is not, say so and propose an expansion.

## Multiple choice

- `mcq-single`: exactly 4 options with ids `a`–`d`, one correct.
- `mcq-multi`: 5 or 6 options with ids `a`–`f`; the stem says how many to pick ("Which TWO…?"); 2 or 3 correct.
- One clearly best answer that a practitioner would not dispute. Rotate the correct position: across a batch, each of `a`–`d` is correct about a quarter of the time.
- Distractors come from the same concept family, are plausible to someone who half-knows the topic, and are about the same length and grammatical shape as the key. The key must not be the longest option more than about a third of the time.
- Never use "all of the above", "none of the above", "both A and B", or absolutes ("always", "never") as a giveaway.
- Prefer short scenarios ("An analyst…", "A retail company…") at difficulty 2–3; a direct definition question is difficulty 1. Aim for roughly 25% difficulty 1, 50% difficulty 2, 25% difficulty 3.
- Stems are one to three sentences, plain English, no trick wording, no negative stems unless the word NOT is capitalised.

## Explanations

- `explanation` says why the key is right **and** why each distractor is wrong, in 2–4 sentences.
- PBQs also have `partExplanations`: one short sentence per part, keyed by part id.

## PBQs

- Follow the shapes in `src/banks/dataplus/fixture.ts` (one worked example per template) and the rules in `docs/pbq-authoring.md`.
- 3–6 parts each; `pbqWeight` equals the number of parts, capped at 6.
- Diagrams and hotspots use the coordinate system in the examples (about 600 × 260); boxes must not overlap and must lie inside the image.
- Terminal items use realistic but invented file names, hosts and output; list every reasonable equivalent command in `accept`.
- Data items must have numbers that make the answers exactly right; show your working in `partExplanations`.

## Style

- US English. Product names spelled as their vendors do (Power BI, Tableau, pandas, tidyverse).
- Invented company and person names only; no real customers or data.
- No two items in the bank may test the same fact the same way.

## Review (two independent reviewers)

- **Data analyst reviewer:** gets the items with `answer` removed. Answers each item, then flags factual errors, outdated practice, more than one defensible answer, and misalignment with the objective.
- **Copywriter reviewer:** gets the full items. Flags unclear or wordy stems, ambiguity, grammar, inconsistent terms, answer tells (length, grammar cues, absolutes, repeated words between stem and key), and explanations that do not cover each distractor.
- An item is approved only when the analyst's answers match the key and neither reviewer has an unresolved flag. Approved items get `status: "approved"`.

## Drafting trial

Run 2026-10-30: `npm run draft:ollama -- --objective 2.1 --count 10` with `qwen3.6:27b` (thinking off).

| Measure | Result |
| --- | --- |
| Schema-valid | 10 / 10 |
| Factual or key errors | 1 (a "choose TWO" item whose key was disputable; it also used an acronym, CDC, that is not on the list) |
| Correct-answer position | `b` in 8 of 10, despite the brief asking for rotation |
| Time | 13 minutes for 10 MCQs, so about 13 hours for 500 MCQs before any PBQs |

The decision rule (at least 8 of 10 valid, at most 1 error) was met only at the margin. The position bias would need fixing on every item, and at this speed a full bank takes most of a day without PBQs. **Decision: Claude subagents draft the bank**, as spec §12 allows. `scripts/draft-ollama.ts` stays for future exams or a faster local model.
