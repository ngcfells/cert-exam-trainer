// Independent-review helpers for draft items.
//   strip   <out.json> <draft.json>...   writes the items without answer, explanation or partExplanations (for the analyst)
//   compare <answers.json> <draft.json>... scores the analyst's answers against the keys and lists every mismatch
// Analyst answers: { "<id>": ["b"] } for MCQs; { "<id>": { "<partId>": "<valueId or typed command>" } } for PBQs;
// for pbq-hotspot, the list of spot ids to select; for pbq-order, either a position map or the ids in order.
import { readFileSync, writeFileSync } from 'node:fs';
import { HOTSPOT_ON, isPbqTemplate, partCorrect, partIds, type PartMap } from '../src/domain/pbq';
import type { McqAnswer, Question } from '../src/domain/types';

const [cmd, target, ...files] = process.argv.slice(2).filter((a) => a !== '--');
const items = files.flatMap((f) => JSON.parse(readFileSync(f, 'utf8')) as Question[]);

if (cmd === 'strip') {
  const hidden = new Set(['answer', 'explanation', 'partExplanations', 'status']);
  const stripped = items.map((q) => Object.fromEntries(Object.entries(q).filter(([k]) => !hidden.has(k))));
  writeFileSync(target, JSON.stringify(stripped, null, 2) + '\n');
  console.log(`${stripped.length} items written to ${target}`);
} else if (cmd === 'compare') {
  const answers = JSON.parse(readFileSync(target, 'utf8')) as Record<string, string[] | PartMap>;
  let mismatches = 0;
  for (const q of items) {
    const given = answers[q.id];
    let wrong: string[] = [];
    if (!given) wrong = ['no answer'];
    else if (!isPbqTemplate(q.type)) {
      const key = [...(q.answer as McqAnswer).correct].sort().join(',');
      const got = [...(given as string[])].sort().join(',');
      if (key !== got) wrong = [`analyst ${got}, key ${key}`];
    } else {
      const parts: PartMap = !Array.isArray(given)
        ? given
        : q.type === 'pbq-order'
          ? Object.fromEntries(given.map((id, i) => [String(i), id]))
          : Object.fromEntries(given.map((id) => [id, HOTSPOT_ON]));
      wrong = partIds(q).filter((id) => !partCorrect(q, id, parts)).map((id) => `part ${id}: analyst ${parts[id] ?? '(none)'}`);
    }
    if (wrong.length) {
      mismatches++;
      console.log(`${q.id}: ${wrong.join('; ')}`);
    }
  }
  console.log(`${items.length - mismatches} of ${items.length} match the key`);
} else {
  console.log('usage: review-tools strip <out> <files...> | compare <answers> <files...>');
  process.exitCode = 2;
}
