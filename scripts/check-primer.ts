// Checks primer content: no 8-word run shared with reference notes, and (on request) every link answers.
// Usage: npm run check-primer -- --ref <dir>[,<dir>...] [--group <group>] [--links yes]
// The link check needs the internet, so it is not part of npm run check.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { sharedRuns } from '../src/content/overlap';
import { PRIMER_GROUPS, primerText } from '../src/domain/primer';
import { stripCode } from '../src/domain/richText';
import { PRACTICE_LINKS, PRIMER_TOPICS } from '../src/primer/topics';
import { parseArgs } from './exam-args';

const args = parseArgs(process.argv.slice(2));
const group = args.flags.group;
if (group && !(PRIMER_GROUPS as readonly string[]).includes(group)) throw new Error(`unknown group "${group}"; one of ${PRIMER_GROUPS.join(', ')}`);
const topics = PRIMER_TOPICS.filter((t) => !group || t.group === group);
let problems = 0;

const dirs = (args.flags.ref ?? '').split(',').filter(Boolean);
const refs = dirs.flatMap((d) => {
  const files = readdirSync(d).filter((f) => f.endsWith('.txt'));
  if (!files.length) throw new Error(`no .txt reference notes in ${d}`);
  return files.map((f) => ({ name: path.join(d, f), text: readFileSync(path.join(d, f), 'utf8') }));
});
for (const t of topics) {
  const text = stripCode(primerText(t));
  for (const ref of refs) {
    for (const run of sharedRuns(text, ref.text)) {
      console.log(`${t.id}: shares "${run}" with ${ref.name}`);
      problems++;
    }
  }
}

if (args.flags.links === 'yes') {
  const urls = [...new Set([...topics.flatMap((t) => t.links.map((l) => l.url)), ...(group ? [] : PRACTICE_LINKS.map((l) => l.url))])];
  for (const url of urls) {
    try {
      const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(15_000), headers: { 'User-Agent': 'cert-trainer-link-check' } });
      console.log(`${res.status} ${url}`);
      if (!res.ok) problems++;
    } catch (e) {
      console.log(`error ${url}: ${e instanceof Error ? e.message : String(e)}`);
      problems++;
    }
  }
}

console.log(`${problems} problem${problems === 1 ? '' : 's'}`);
process.exit(problems ? 1 : 0);
