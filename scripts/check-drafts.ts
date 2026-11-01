// Checks draft files before they join the bank: schema, id scheme, objective, acronyms, key balance and duplicates.
// Usage: npm run check-drafts -- --exam CY0-001 [--ref <notes dir>] <file.json>...
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { acronymCovered, extractAcronyms, questionText } from '../src/acronyms/extract';
import { itemIdPrefix } from '../src/banks/paths';
import { answerBalance, longestOptionTell, nearDuplicates, sharedRuns } from '../src/content';
import { effectivePick, stemStatesPick } from '../src/domain/pick';
import { questionSchema } from '../src/domain/schema';
import type { Question } from '../src/domain/types';
import { bankWithoutDrafts } from './check-drafts-lib';
import { examFromArgs, parseArgs } from './exam-args';

const args = parseArgs(process.argv.slice(2));
const { meta, items: bankItems } = examFromArgs(args);
const files = args.positional;
// --ref <dir>: reference notes (every .txt in the folder) that no item may share an 8-word run with.
const refs = args.flags.ref
  ? readdirSync(args.flags.ref)
      .filter((f) => f.endsWith('.txt'))
      .map((f) => ({ name: f, text: readFileSync(path.join(args.flags.ref, f), 'utf8') }))
  : [];
if (args.flags.ref && !refs.length) throw new Error(`no .txt reference notes in ${args.flags.ref}`);
const listed = new Set(meta.acronyms.map((a) => a.term));
const objectives = new Set(meta.objectives.map((o) => o.id));
let problems = 0;
const all: Question[] = [];

for (const file of files) {
  const qs = JSON.parse(readFileSync(file, 'utf8')) as Question[];
  for (const q of qs) {
    const issues: string[] = [];
    const r = questionSchema.safeParse(q);
    if (!r.success) issues.push(...r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
    if (q.exam !== meta.code) issues.push(`exam should be ${meta.code}`);
    if (!objectives.has(q.objectiveIds?.[0])) issues.push(`unknown objective ${q.objectiveIds?.[0]}`);
    else if (r.success) {
      const want = itemIdPrefix(meta.code, q.objectiveIds[0], q.type);
      if (!q.id.startsWith(want) || !/-\d{3}$/.test(q.id)) issues.push(`id should look like ${want}nnn`);
    }
    if (r.success) {
      const tokens = extractAcronyms(questionText(q));
      // A token may be part of a compound term (CD in CI/CD); a tag must be a whole listed term.
      const missing = [...tokens.filter((t) => !acronymCovered(t, listed)), ...q.acronyms.filter((t) => !listed.has(t))];
      if (missing.length) issues.push(`acronyms not in the list: ${[...new Set(missing)].join(', ')}`);
      const untagged = tokens.filter((t) => !acronymCovered(t, new Set(q.acronyms)));
      if (untagged.length) issues.push(`acronyms used but not tagged: ${[...new Set(untagged)].join(', ')}`);
      if (q.type === 'mcq-multi' && !stemStatesPick(q.stem, effectivePick(q))) issues.push('stem does not say how many to pick (add "Which TWO…" or a pick field)');
      for (const ref of refs) {
        for (const run of sharedRuns(questionText(q), ref.text)) issues.push(`shares "${run}" with ${ref.name}`);
      }
    }
    if (issues.length) {
      problems += issues.length;
      console.log(`${file} ${q.id}:\n  ${issues.join('\n  ')}`);
    }
    all.push(q);
  }
}

const bank = bankWithoutDrafts(bankItems, all);
const ids = new Map<string, number>();
for (const q of [...bank, ...all]) ids.set(q.id, (ids.get(q.id) ?? 0) + 1);
const repeats = [...ids].filter(([, n]) => n > 1).map(([id]) => id);
if (repeats.length) {
  problems += repeats.length;
  console.log(`repeated ids (in drafts or already in the bank): ${repeats.join(', ')}`);
}
const dups = nearDuplicates([...bank, ...all]).filter(([a, b]) => all.some((q) => q.id === a || q.id === b));
for (const [a, b, s] of dups) console.log(`near duplicate ${a} ~ ${b} (${s.toFixed(2)})`);
problems += dups.length;

const pct = (n: number) => `${Math.round(n * 100)}%`;
console.log(`\n${all.length} items; key position ${Object.values(answerBalance(all)).map(pct).join('/')}; key longest ${pct(longestOptionTell(all))}`);
console.log(problems ? `${problems} problem(s)` : 'no problems');
process.exitCode = problems ? 1 : 0;
