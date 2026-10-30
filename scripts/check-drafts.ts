// Checks draft files before they join the bank: schema, id scheme, objective, acronyms, key balance and duplicates.
// Usage: npx vite-node scripts/check-drafts.ts -- <file.json>...
import { readFileSync } from 'node:fs';
import { extractAcronyms, questionText } from '../src/acronyms/extract';
import { dataPlusItems } from '../src/banks/dataplus/items';
import { dataPlusMeta } from '../src/banks/dataplus/meta';
import { answerBalance, longestOptionTell, nearDuplicates } from '../src/content';
import { questionSchema } from '../src/domain/schema';
import type { Question } from '../src/domain/types';

const files = process.argv.slice(2).filter((a) => a !== '--');
const listed = new Set(dataPlusMeta.acronyms.map((a) => a.term));
const objectives = new Set(dataPlusMeta.objectives.map((o) => o.id));
const short = (t: string) => (t.startsWith('mcq') ? 'mcq' : t.slice(4));
let problems = 0;
const all: Question[] = [];

for (const file of files) {
  const qs = JSON.parse(readFileSync(file, 'utf8')) as Question[];
  for (const q of qs) {
    const issues: string[] = [];
    const r = questionSchema.safeParse(q);
    if (!r.success) issues.push(...r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
    if (!objectives.has(q.objectiveIds?.[0])) issues.push(`unknown objective ${q.objectiveIds?.[0]}`);
    const want = `da2-${q.objectiveIds?.[0]?.replace('.', '-')}-${short(q.type ?? '')}-`;
    if (!q.id?.startsWith(want) || !/-\d{3}$/.test(q.id)) issues.push(`id should look like ${want}nnn`);
    if (r.success) {
      const tokens = [...new Set([...extractAcronyms(questionText(q)), ...q.acronyms])];
      const missing = tokens.filter((t) => !listed.has(t));
      if (missing.length) issues.push(`acronyms not in the list: ${missing.join(', ')}`);
      const untagged = extractAcronyms(questionText(q)).filter((t) => !q.acronyms.includes(t));
      if (untagged.length) issues.push(`acronyms used but not tagged: ${[...new Set(untagged)].join(', ')}`);
    }
    if (issues.length) {
      problems += issues.length;
      console.log(`${file} ${q.id}:\n  ${issues.join('\n  ')}`);
    }
    all.push(q);
  }
}

const ids = new Map<string, number>();
for (const q of [...dataPlusItems, ...all]) ids.set(q.id, (ids.get(q.id) ?? 0) + 1);
const repeats = [...ids].filter(([, n]) => n > 1).map(([id]) => id);
if (repeats.length) {
  problems += repeats.length;
  console.log(`repeated ids (in drafts or already in the bank): ${repeats.join(', ')}`);
}
const dups = nearDuplicates([...dataPlusItems, ...all]).filter(([a, b]) => all.some((q) => q.id === a || q.id === b));
for (const [a, b, s] of dups) console.log(`near duplicate ${a} ~ ${b} (${s.toFixed(2)})`);
problems += dups.length;

const pct = (n: number) => `${Math.round(n * 100)}%`;
console.log(`\n${all.length} items; key position ${Object.values(answerBalance(all)).map(pct).join('/')}; key longest ${pct(longestOptionTell(all))}`);
console.log(problems ? `${problems} problem(s)` : 'no problems');
process.exitCode = problems ? 1 : 0;
