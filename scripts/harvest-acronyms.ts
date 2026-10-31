/**
 * Harvests acronym tokens from public pages about an exam (spec §8 items 4–5). Dev-only.
 *
 *   npm run harvest-acronyms -- --sources <file.json> [--out <report.json>] [--no-dumps] [--delay-ms 5000]
 *
 * Page text is discarded as soon as its tokens are counted; the report holds terms, counts and source ids only.
 * Keep real source lists and reports in _WorkingData/ (gitignored). docs/acronyms.md has the workflow.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { buildReport, selectSources, sourcesFileSchema } from '../src/acronyms/harvest';
import { listExams } from '../src/banks';
import { parseHarvestArgs, runHarvest } from './harvest-lib';

function fail(msg: string): never {
  console.error(`harvest-acronyms: ${msg}`);
  process.exit(1);
}

let args;
try {
  args = parseHarvestArgs(process.argv.slice(2));
} catch (e) {
  fail(`${(e as Error).message}\nusage: npm run harvest-acronyms -- --sources <file.json> [--out <report.json>] [--no-dumps] [--delay-ms 5000]`);
}

let file;
try {
  file = sourcesFileSchema.parse(JSON.parse(readFileSync(args.sources, 'utf8')));
} catch (e) {
  fail(`${args.sources}: ${(e as Error).message}`);
}
const meta = listExams().find((m) => m.code === file.exam) ?? fail(`unknown exam "${file.exam}"`);
const out = args.out || `_WorkingData/harvest-${meta.code}.json`;

const { use, skipped } = selectSources(file.sources, args.includeDumps);
console.log(`harvesting ${use.length} sources for ${meta.code} (${skipped.length} skipped), ${args.delayMs} ms between requests per site`);
const run = await runHarvest({
  sources: use, fetch, delayMs: args.delayMs, log: (m) => console.log(`  ${m}`),
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
});
const report = buildReport({
  exam: meta.code, known: new Set(meta.acronyms.map((a) => a.term)), at: new Date().toISOString(),
  perSource: run.perSource, skipped: [...skipped, ...run.skipped], failed: run.failed,
});
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(report, null, 2) + '\n');

console.log(`\n${report.missing.length} terms not in the ${meta.code} list (${report.known.length} known seen):`);
for (const r of report.missing) console.log(`  ${r.term}\t${r.count}\t${r.sources.join(',')}`);
console.log(`\nwrote ${out}`);
