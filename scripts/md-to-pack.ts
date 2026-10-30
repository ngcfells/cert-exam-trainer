/**
 * Converts authoring Markdown (docs/question-template.md) into a question pack
 * for "Import questions" on the My questions screen.
 *
 *   npm run md-to-pack -- <in.md...> --exam DA0-002 --out <file.json> [--prefix user-da] [--objective 1.1]
 *
 * Writes nothing if any question is invalid. Packs are user content: never commit them.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { parseMarkdown } from '../src/authoring/mdPack';
import { listExams } from '../src/banks';
import { PACK_FORMAT, type QuestionPack } from '../src/storage/pack';
import type { Question } from '../src/domain/types';

function fail(msg: string): never {
  console.error(`md-to-pack: ${msg}`);
  process.exit(1);
}

const args = process.argv.slice(2).filter((a) => a !== '--');
const inputs: string[] = [];
const flags: Record<string, string> = {};
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    const value = args[i + 1];
    if (value === undefined || value.startsWith('--')) fail(`${args[i]} needs a value`);
    flags[args[i].slice(2)] = value;
    i++;
  } else inputs.push(args[i]);
}
if (!inputs.length || !flags.exam || !flags.out) {
  fail('usage: npm run md-to-pack -- <in.md...> --exam <code> --out <file.json> [--prefix <id prefix>] [--objective <id>]');
}

const meta = listExams().find((m) => m.code === flags.exam) ?? fail(`unknown exam "${flags.exam}"`);
const objectives = new Set(meta.objectives.map((o) => o.id));
const opts = {
  exam: meta.code,
  idPrefix: flags.prefix ?? `user-${meta.code.toLowerCase()}`,
  defaultObjective: flags.objective ?? meta.objectives[0].id,
};

const questions: Question[] = [];
for (const file of inputs) {
  let result;
  try {
    result = parseMarkdown(readFileSync(file, 'utf8'), opts);
  } catch (e) {
    fail(`${file}: ${(e as Error).message}`);
  }
  result.warnings.forEach((w) => console.warn(`warning: ${file}: ${w}`));
  for (const q of result.questions as Question[]) {
    const bad = q.objectiveIds.find((o) => !objectives.has(o));
    if (bad) fail(`${file}: ${q.id} references unknown objective "${bad}" for ${meta.code}`);
    if (questions.some((x) => x.id === q.id)) fail(`${file}: id "${q.id}" is used twice across the inputs`);
    questions.push(q);
  }
}

const pack: QuestionPack = { format: PACK_FORMAT, version: 1, exportedAt: new Date().toISOString(), questions };
writeFileSync(flags.out, `${JSON.stringify(pack, null, 2)}\n`);
const pbqs = questions.filter((q) => q.type.startsWith('pbq-')).length;
console.log(`Wrote ${questions.length} questions (${questions.length - pbqs} MCQ, ${pbqs} PBQ) to ${flags.out}`);
