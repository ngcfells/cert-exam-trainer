import { describe, expect, it } from 'vitest';
// Unit tests otherwise run on the fixture bank (VITE_BANK=fixture), so read the shipped items directly.
import { autoOpsItems } from '../banks/autoops/items';
import { dataPlusItems } from '../banks/dataplus/items';
import { secAiItems } from '../banks/secai/items';
import { commandWords, MADE_UP_TOOLS, wordTopic, type CommandWord } from './match';
import { PRIMER_TOPICS } from './topics';

// Accepted-answer words that are not commands, each reviewed. Never add a real command here.
const NOT_COMMANDS = new Map([
  ['df', 'assignment target in df = df.astype(...)'],
  ['loans.', 'table.column start of an ON answer'],
  ['members.', 'table.column start of an ON answer'],
  ['source', 'legacy `source activate`, accepted but not taught'],
]);

// Words whose topic is not written yet. Each content task removes its words. Empty at release.
const PENDING: string[] = [
  // dev (Task 13)
  'conda activate', 'conda install', 'docker run',
  'git add', 'git checkout', 'git commit', 'git fetch', 'git push', 'git remote', 'git switch', 'git tag',
  // data (Task 14)
  'ON', 'On', 'on', 'SELECT', 'select', 'USING', 'USING(', 'Using', 'Using(', 'using', 'using(', 'df.', 'df[',
];

const key = (w: CommandWord) => (w.sub ? `${w.word} ${w.sub}` : w.word);

/** Every command word in every typed-step accepted answer of the shipped banks, drafts included. */
function answerWords(): CommandWord[] {
  const out: CommandWord[] = [];
  for (const items of [dataPlusItems, secAiItems, autoOpsItems]) {
    for (const q of items) {
      if (q.type !== 'pbq-terminal') continue;
      const steps = (q.payload as { steps: { id: string; options?: unknown[] }[] }).steps;
      const accept = (q.answer as { accept: Record<string, string[]> }).accept;
      for (const s of steps) if (!s.options?.length) for (const a of accept[s.id] ?? []) out.push(...commandWords(a));
    }
  }
  return out;
}

describe('command primer coverage', () => {
  const words = answerWords();

  it('every typed-step command word maps to a topic, a made-up tool or a reviewed non-command', () => {
    const unmapped = new Set(words.filter((w) => !wordTopic(w) && !NOT_COMMANDS.has(key(w))).map(key));
    expect([...unmapped].sort()).toEqual([...PENDING].sort());
  });

  it('every NOT_COMMANDS word still occurs', () => {
    const seen = new Set(words.map(key));
    expect([...NOT_COMMANDS.keys()].filter((k) => !seen.has(k))).toEqual([]);
  });

  it('no alias is claimed by two topics, and no alias is a made-up tool or a NOT_COMMANDS word', () => {
    const owners = new Map<string, string[]>();
    for (const t of PRIMER_TOPICS) for (const a of t.aliases) owners.set(a.toLowerCase(), [...(owners.get(a.toLowerCase()) ?? []), t.id]);
    const clashes = [...owners].filter(([a, ts]) => ts.length > 1 || MADE_UP_TOOLS.has(a) || NOT_COMMANDS.has(a)).map(([a, ts]) => `${a}: ${ts.join(', ')}`);
    expect(clashes).toEqual([]);
  });
});
