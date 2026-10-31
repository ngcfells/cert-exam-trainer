/**
 * Drafts expansions for the missing terms in a harvest report with local Ollama. Dev-only.
 *
 *   npm run expand-acronyms -- --report <harvest.json> [--out <file.json>] [--model qwen3.6:27b] [--min-count 1]
 *
 * Output rows are candidates: "ok" rows passed the model and the initials check, "flag" rows need a person.
 * Nothing here edits the bank; a person (or Claude) copies sensible rows into the exam's meta.ts as `community`.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { HarvestReport } from '../src/acronyms/harvest';
import { listExams } from '../src/banks';
import { expandTerms, ollamaChat } from './expand-lib';

function fail(msg: string): never {
  console.error(`expand-acronyms: ${msg}`);
  process.exit(1);
}

const args = process.argv.slice(2).filter((a) => a !== '--');
const flags: Record<string, string> = {};
for (let i = 0; i < args.length; i++) {
  const value = args[i + 1];
  if (!args[i].startsWith('--') || value === undefined || value.startsWith('--')) fail(`bad argument ${args[i]}`);
  flags[args[i].slice(2)] = value;
  i++;
}
for (const k of Object.keys(flags)) if (!['report', 'out', 'model', 'min-count'].includes(k)) fail(`unknown argument --${k}`);
if (!flags.report) fail('usage: npm run expand-acronyms -- --report <harvest.json> [--out <file.json>] [--model <name>] [--min-count 1]');

const report = JSON.parse(readFileSync(flags.report, 'utf8')) as HarvestReport;
if (report.format !== 'cert-exam-trainer-acronym-harvest') fail(`${flags.report} is not a harvest report`);
const meta = listExams().find((m) => m.code === report.exam) ?? fail(`unknown exam "${report.exam}"`);
const minCount = Number(flags['min-count'] ?? 1);
const terms = report.missing.filter((r) => r.count >= minCount).map((r) => r.term);
const out = flags.out ?? `_WorkingData/expand-${meta.code}.json`;

console.log(`expanding ${terms.length} terms with ${flags.model ?? 'qwen3.6:27b'}...`);
const rows = await expandTerms({ terms, exam: meta.code, examTitle: meta.name, chat: ollamaChat(flags.model) });
const counts = new Map(report.missing.map((r) => [r.term, r.count]));
const full = rows.map((r) => ({ ...r, count: counts.get(r.term) ?? 0 }));
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(full, null, 2) + '\n');
for (const r of full) console.log(`  ${r.verdict === 'ok' ? 'ok  ' : 'FLAG'} ${r.term}\t${r.expansion}${r.reason ? `\t(${r.reason})` : ''}`);
console.log(`\n${full.filter((r) => r.verdict === 'ok').length} ok, ${full.filter((r) => r.verdict === 'flag').length} flagged; wrote ${out}`);
