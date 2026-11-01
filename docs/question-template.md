# Question template

Write your questions in a Markdown file, then convert the file into a question pack and import the pack on the **My questions** screen:

```sh
npm run md-to-pack -- my-questions.md --exam DA0-002 --out my-questions.pack.json
```

Options: `--prefix <text>` sets the start of generated ids (default `user-<exam>`), and `--objective <id>` sets the objective for questions that have no `Objective:` line (default: the exam's first objective). You can list several `.md` files. If any question is invalid, the script names it and writes nothing.

Packs are your own content. Keep them out of the repository: `_WorkingData/` is gitignored for this. Never add NDA-protected or braindump material.

## Layout

- Separate questions with a line holding only `---`.
- Optional metadata lines go at the top of a question, before the stem (later lines that look like metadata stay part of the text):
  - `Id: my-sql-01` gives the question a fixed id. Without one, the id comes from a hash of the stem, so editing the stem gives the question a new id. That orphans its progress history.
  - `Objective: 1.1` (comma-separated for several)
  - `Difficulty: 1`, `2` or `3` (default 2)
  - `Pick: all` (or `Pick: 2`, `Pick: 3`) for a question with more than one correct answer. See "How many to pick" below.
- Image lines (`![...](...)`) are ignored with a warning. Questions can't show images, so describe what an image shows in the text, or use a PBQ block.

## Multiple choice

The stem comes first, then the options, then the answer, then the explanation.

```text
Id: my-keys-01
Objective: 1.1
Difficulty: 1
Which column type uniquely identifies each row in a table?

A - Foreign key
B - Primary key
C - Index
D - View

Correct Answer: B

Explanation
A primary key is unique and never empty. A foreign key points at a key in another table.
---
Which TWO of the following measure spread? (Select two.)

A. Variance
B. Mean
C. Range
D. Mode

Correct Answer(s): A, C

Explanation
Variance and range describe spread. Mean and mode describe the center.
---
Pick: all
Which of these are measures of center? (Select all that apply.)

A. Mean
B. Range
C. Median
D. Variance

Correct Answer(s): A, C

Explanation
Mean and median describe the center. Range and variance describe spread.
```

- Options can be written `A - text`, `A. text`, `A) text`, or as a letter alone on its own line with the text on the next line. A line directly under an option, with no blank line between, continues that option.
- The answer is either:
  - a `Correct Answer: B` line (or `Correct Answer(s): A, C`). Only the capital letters at the start count, so `Correct Answer: C, a firewall` means C, or
  - a bare `Correct Answer:` line placed directly under an option, which marks that option as correct. This is the shape you get when copying from many quiz pages.
- Two or more correct answers make a multi-answer question (`mcq-multi`). See "How many to pick" below.
- The explanation is everything after the answer. A leading `Explanation` heading is removed. Blank lines separate paragraphs.

### How many to pick

A multi-answer question is either "select N" or "select all that apply". These rules apply to every exam.

- **Select N** (the default): without a `Pick:` line, N is the number of correct answers. `Pick: 2` says the same thing explicitly and must match the number of correct answers. The student can pick at most N choices; the rest are locked until they unpick one. Each right pick earns 1/N of the question; a wrong pick earns nothing and costs nothing.
- **Select all** (`Pick: all`): any number of picks. Each wrong pick cancels one right pick, never below 0. Picking every choice scores 0 unless every choice is correct.
- If the stem doesn't say how many to pick (for example "Which TWO…" or "Select all that apply"), the app adds "(Choose two.)" or "(Select all that apply.)" when it shows the question.
- `Pick:` on a single-answer, numeric or PBQ question is an error.

## Typed number

The student types a number. Write the stem, then a `Correct Number:` line, then any of these optional lines, then the explanation:

- `Tolerance: 0.5` is how far off an answer may be and still count (default 0, an exact match).
- `Prefix: $` or `Suffix: %` is shown beside the input.

```text
Objective: 3.2
Sales rose from 80 to 100. What is the percent change? Answer as a percent, rounded to a whole number.

Correct Number: 25
Tolerance: 0.5
Suffix: %

Explanation
Change = 100 - 80 = 20. Divide by the old value: 20 / 80 = 0.25. Times 100 = 25%.
```

- Say in the stem which form you want ("as a percent, e.g. 25" or "as a decimal, e.g. 0.25") and how to round.
- Students may type `,`, `$`, `%` and spaces; they are ignored. Anything else that is not a number counts as unanswered.
- The explanation should show the steps.

## PBQs

A PBQ is a fenced block tagged `pbq` that holds JSON:

````text
Objective: 3.1
```pbq
{
  "type": "pbq-data",
  "pbqWeight": 2,
  "stem": "Use the table to answer each question.",
  "payload": {
    "caption": "Monthly tickets",
    "columns": ["Month", "Tickets"],
    "rows": [["Jan", "40"], ["Feb", "55"]],
    "chart": { "kind": "bar", "labelColumn": 0, "valueColumn": 1 },
    "fields": [
      { "id": "f1", "label": "Month with the most tickets",
        "options": [{ "id": "o1", "text": "Jan" }, { "id": "o2", "text": "Feb" }] }
    ]
  },
  "answer": { "values": { "f1": "o2" } },
  "explanation": "February has 55 tickets, January 40.",
  "partExplanations": { "f1": "Compare the Tickets column." }
}
```
````

- Required: `type`, `stem`, `payload`, `answer`. Optional: `id`, `pbqWeight` (1–6, default 2), `explanation`, `partExplanations`, `objectiveIds`, `difficulty`.
- `payload` and `answer` follow the template's shape. The **Add question** form starts every PBQ type with a valid example, and `docs/pbq-authoring.md` lists the rules.

### From screenshots

To turn screenshots of a PBQ into a block, pick the template that matches how the learner answers:

| The screenshot shows | Template |
| --- | --- |
| A table plus dropdowns (for example, "build the normalized tables") | `pbq-data`: the table goes in `columns`/`rows`, and each dropdown is one `field` with its own `options` |
| Dropdowns with no data table | `pbq-config` |
| Drag labels onto prompts | `pbq-match` |
| Put steps in order | `pbq-order` |
| Drag items into groups | `pbq-buckets` |
| Labels onto a network or flow diagram | `pbq-diagram` |
| Click the right areas of an image | `pbq-hotspot` |
| Read logs or type a command | `pbq-terminal` |

Capture one screenshot of each dropdown while it is open, and one of the graded answer. Then write the block by hand, or ask Claude to read the screenshots and draft it, and run `md-to-pack`. The script validates every id and answer, but it can't check that the block matches the screenshots, so compare them before you import.
