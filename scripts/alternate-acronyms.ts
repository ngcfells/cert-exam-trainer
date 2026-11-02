/**
 * Drafts alternate meanings for an exam's built-in acronyms with local Ollama. Dev-only.
 *
 *   npm run alternate-acronyms -- --exam <code> [--out <file.json>] [--model qwen3.6:27b] [--terms A,B] [--suggest <file.json>]
 *
 * --suggest takes {"TERM": ["alternate", ...]}: the model then judges those suggestions instead of drafting its own.
 *
 * An alternate is another expansion of the same letters for the same idea (MTTR: Repair, Restore), which the
 * typed acronym quiz then also accepts. Rows that pass the local checks are candidates only: a person (or Claude)
 * copies the sensible ones into the exam's meta.ts as `alternates`.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { listExams } from '../src/banks';
import { draftAlternates, judgeAlternates, ollamaChat, parseAlternateArgs } from './expand-lib';

function fail(msg: string): never {
  console.error(`alternate-acronyms: ${msg}`);
  process.exit(1);
}

let args;
try {
  args = parseAlternateArgs(process.argv.slice(2));
} catch (e) {
  fail(`${(e as Error).message}\nusage: npm run alternate-acronyms -- --exam <code> [--out <file.json>] [--model <name>] [--terms A,B] [--suggest <file.json>]`);
}

const meta = listExams().find((m) => m.code === args.exam) ?? fail(`unknown exam "${args.exam}"`);
const wanted = new Set(args.terms);
const entries = meta.acronyms.filter((a) => !wanted.size || wanted.has(a.term)).map(({ term, expansion }) => ({ term, expansion }));
const out = args.out || `_WorkingData/alternates-${meta.code}.json`;

const common = { entries, exam: meta.code, examTitle: meta.name, topics: meta.domains.map((d) => d.title), chat: ollamaChat(args.model) };
let rows;
if (args.suggest) {
  let suggestions: Record<string, string[]>;
  try {
    suggestions = JSON.parse(readFileSync(args.suggest, 'utf8')) as Record<string, string[]>;
  } catch (e) {
    fail(`${args.suggest}: ${(e as Error).message}`);
  }
  const unknown = Object.keys(suggestions).filter((t) => !meta.acronyms.some((a) => a.term === t));
  if (unknown.length) fail(`${args.suggest}: not in the ${meta.code} list: ${unknown.join(', ')}`);
  console.log(`judging suggested alternates for ${Object.keys(suggestions).length} acronyms with ${args.model}...`);
  rows = await judgeAlternates({ ...common, suggestions });
} else {
  console.log(`drafting alternates for ${entries.length} acronyms with ${args.model}...`);
  rows = await draftAlternates(common);
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(rows, null, 2) + '\n');
for (const r of rows) {
  if (r.reason) console.log(`  ????  ${r.term}\t(${r.reason})`);
  else if (r.alternates.length || r.rejected.length) {
    console.log(`  ${r.alternates.length ? 'alt ' : '    '}  ${r.term}\t${r.expansion}\t-> ${r.alternates.join('; ') || '(none)'}`);
    for (const x of r.rejected) console.log(`          rejected: ${x.text} (${x.reason})`);
  }
}
console.log(`\n${rows.filter((r) => r.alternates.length).length} with alternates, ${rows.filter((r) => r.reason).length} without an answer; wrote ${out}`);
