import { describe, expect, it } from 'vitest';
import { acronymCovered, extractAcronyms } from '../acronyms/extract';
// Unit tests otherwise run on the fixture bank (VITE_BANK=fixture), so read the shipped banks directly.
import { autoOpsItems } from '../banks/autoops/items';
import { autoOpsMeta } from '../banks/autoops/meta';
import { dataPlusItems } from '../banks/dataplus/items';
import { dataPlusMeta } from '../banks/dataplus/meta';
import { secAiItems } from '../banks/secai/items';
import { secAiMeta } from '../banks/secai/meta';
import { primerText } from '../domain/primer';
import { PRIMER_TOPICS } from './topics';

// Accepted answers that are bare command vocabulary: no file, service or pattern from the question's own
// scenario, so teaching them gives nothing away. Each reviewed. Wildcard answers (`sort * | uniq -d`) are
// file-name-agnostic forms of the same kind and are skipped.
const BARE_VOCABULARY = new Set([
  'conda install pandas',
  'git fetch',
  'git fetch origin',
  'git fetch --all',
  'git remote update',
  'git push -u origin HEAD',
  'echo $?',
  `printf '%s\\n' "$?"`,
]);

describe('command primer rules', () => {
  // "Show all topics" and user-written questions can put any topic on any exam, so every topic must be
  // readable with every exam's acronym list, not only the topics that exam normally shows.
  it('every acronym in every topic is in every exam acronym list', () => {
    const problems: string[] = [];
    for (const meta of [dataPlusMeta, secAiMeta, autoOpsMeta]) {
      const listed = new Set(meta.acronyms.map((a) => a.term));
      for (const topic of PRIMER_TOPICS) {
        const missing = [...new Set(extractAcronyms(primerText(topic)))].filter((x) => !acronymCovered(x, listed));
        if (missing.length) problems.push(`${meta.code} ${topic.id}: ${missing.join(' ')}`);
      }
    }
    expect(problems).toEqual([]);
  });

  // The primer teaches how a command works; it must not hand over the answer to a question in the bank.
  it('no topic contains a typed-step answer from the banks', () => {
    const texts = PRIMER_TOPICS.map((t) => [t.id, primerText(t)] as const);
    const leaks: string[] = [];
    for (const items of [dataPlusItems, secAiItems, autoOpsItems]) {
      for (const q of items) {
        if (q.type !== 'pbq-terminal') continue;
        const steps = (q.payload as { steps: { id: string; options?: unknown[] }[] }).steps;
        const accept = (q.answer as { accept: Record<string, string[]> }).accept;
        for (const s of steps) {
          if (s.options?.length) continue;
          for (const a of accept[s.id] ?? []) {
            if (a.length < 7 || a.includes('*') || BARE_VOCABULARY.has(a)) continue;
            for (const [id, text] of texts) {
              if (text.includes(a)) leaks.push(`${q.id} ${s.id}: ${JSON.stringify(a)} in ${id}`);
            }
          }
        }
      }
    }
    expect(leaks).toEqual([]);
  });
});
