// Drafts MCQs for one objective with a local Ollama model (spec §12 step 2), validating each with questionSchema.
// Usage: npm run draft:ollama -- --objective 2.1 --count 10 --out content-drafts/ollama-trial.json [--model qwen3.6:27b]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { dataPlusMeta } from '../src/banks/dataplus/meta';
import { questionSchema } from '../src/domain/schema';

function arg(name: string, fallback?: string): string {
  const i = process.argv.indexOf(`--${name}`);
  const v = i >= 0 ? process.argv[i + 1] : fallback;
  if (v === undefined) throw new Error(`missing --${name}`);
  return v;
}

const objective = arg('objective');
const count = Number(arg('count', '10'));
const out = arg('out');
const model = arg('model', 'qwen3.6:27b');
const meta = dataPlusMeta.objectives.find((o) => o.id === objective);
if (!meta) throw new Error(`unknown objective ${objective}`);

const brief = readFileSync('docs/content-drafting.md', 'utf8');
const topics = readFileSync('content-drafts/topics.md', 'utf8')
  .split(/\n(?=\d\.\d )/)
  .find((s) => s.startsWith(`${objective} `));
const example = {
  id: 'da2-1-1-mcq-001',
  exam: 'DA0-002',
  source: 'ours',
  type: 'mcq-single',
  objectiveIds: ['1.1'],
  difficulty: 1,
  stem: 'A table column uniquely identifies each row and can never be empty. What is this column called?',
  payload: { options: [{ id: 'a', text: 'Primary key' }, { id: 'b', text: 'Foreign key' }, { id: 'c', text: 'Index' }, { id: 'd', text: 'View' }] },
  answer: { correct: ['a'] },
  explanation: 'A primary key uniquely identifies each row and cannot be null. A foreign key references another table; an index speeds lookups; a view is a saved query.',
  acronyms: [],
  status: 'draft',
};
const prefix = `da2-${objective.replace('.', '-')}-mcq-`;

const prompt = [
  brief,
  `\nObjective ${objective}: ${meta.title}\nTopics:\n${topics ?? ''}`,
  `\nWrite ${count} original multiple-choice items for this objective (about 1 in 4 mcq-multi). Ids ${prefix}001 to ${prefix}${String(count).padStart(3, '0')}.`,
  `Return JSON only: {"items": [ ... ]}, each item shaped exactly like this example:\n${JSON.stringify(example)}`,
].join('\n');

const res = await fetch('http://localhost:11434/api/chat', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  // Streamed: a large local model can take longer than fetch's 5-minute header timeout to answer in one piece.
  body: JSON.stringify({ model, stream: true, think: false, format: 'json', messages: [{ role: 'user', content: prompt }], options: { temperature: 0.7, num_ctx: 16384 } }),
});
if (!res.ok || !res.body) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
let content = '';
let pending = '';
for await (const chunk of res.body.pipeThrough(new TextDecoderStream())) {
  const lines = (pending + chunk).split('\n');
  pending = lines.pop() ?? '';
  for (const line of lines) if (line.trim()) content += (JSON.parse(line) as { message?: { content?: string } }).message?.content ?? '';
}
const items = ((JSON.parse(content) as { items?: unknown[] }).items ?? []) as unknown[];

const valid: unknown[] = [];
items.forEach((item, i) => {
  const r = questionSchema.safeParse(item);
  if (r.success) valid.push(item);
  else console.log(`item ${i}: ${r.error.issues.map((x) => `${x.path.join('.')}: ${x.message}`).join('; ')}`);
});
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(valid, null, 2) + '\n');
console.log(`${valid.length} of ${items.length} valid (asked for ${count}); wrote ${out}`);
