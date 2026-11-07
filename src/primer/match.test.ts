import { describe, expect, it } from 'vitest';
import type { Question } from '../domain/types';
import { parseTopics, type PrimerTopic } from '../domain/primer';
import { commandWords, topicsFor, wordTopic } from './match';

const topic = (id: string, aliases: string[], extra: Record<string, unknown> = {}): unknown => ({
  id,
  group: 'text',
  title: id,
  purpose: 'p',
  aliases,
  what: ['w'],
  forms: [{ bash: '`x`', powershell: 'Same command', does: 'd' }],
  example: { intro: 'i', lines: [{ line: 'x', note: 'n' }] },
  trap: { wrong: 'w', why: 'y' },
  more: [{ heading: 'h', paragraphs: ['p'] }],
  ...extra,
});

const TOPICS: PrimerTopic[] = parseTopics([
  topic('made-up-tools', [], { group: 'basics' }),
  topic('grep', ['grep']),
  topic('git', ['git'], { group: 'dev' }),
  topic('sql', ['select', 'on', 'using', 'using('], { group: 'data', anyCase: true, where: 'w', forms: [{ bash: '`x`', does: 'd' }] }),
  topic('pandas', ['df[', 'df.', 'pd.'], { group: 'data', where: 'w', forms: [{ bash: '`x`', does: 'd' }] }),
]);
const ids = (ts: PrimerTopic[]) => ts.map((t) => t.id);
const find = (w: { word: string; sub?: string }) => wordTopic(w, TOPICS)?.id;

describe('commandWords', () => {
  it.each<[string, { word: string; sub?: string }[]]>([
    ['cat payments.log | grep ERROR | wc -l', [{ word: 'cat' }, { word: 'grep' }, { word: 'wc' }]],
    ['sudo systemctl restart invoice-api', [{ word: 'sudo' }, { word: 'systemctl', sub: 'restart' }]],
    ['git push -u origin HEAD', [{ word: 'git', sub: 'push' }]],
    ['nohup ./prune-cache.sh &', [{ word: 'nohup' }]],
    ['%2&', [{ word: '%' }]],
    ['%+ &', [{ word: '%' }]],
    ["awk '{ print $1; exit }' f", [{ word: 'awk' }]],
    [`curl --data '{"a":1}' -H "X: a|b" u && echo ok`, [{ word: 'curl' }, { word: 'echo' }]],
    ["awk '{print", [{ word: 'awk' }]],
    ["df['order_date'] = pd.to_datetime(df['order_date'])", [{ word: 'df[' }]],
    ['df.order_date = x', [{ word: 'df.' }]],
    ['df -h /var', [{ word: 'df' }]],
    ['using(member_id)', [{ word: 'using(' }]],
    ['AWS_PROFILE=dev aws s3 ls', [{ word: 'aws' }]],
    ['ls || echo none; pwd', [{ word: 'ls' }, { word: 'echo' }, { word: 'pwd' }]],
    ['./deploy.sh', []],
    ['$HOME', []],
    ['9f3c2ab', []],
    ['*', []],
    ['', []],
  ])('%s', (line, words) => expect(commandWords(line)).toEqual(words));
});

describe('wordTopic', () => {
  it('tries the subcommand pair, then the word', () => expect(find({ word: 'git', sub: 'push' })).toBe('git'));
  it('matches SQL in any case', () => expect(find({ word: 'ON' })).toBe('sql'));
  it('keeps disk-free df apart from pandas', () => {
    expect(find({ word: 'df' })).toBeUndefined();
    expect(find({ word: 'df[' })).toBe('pandas');
  });
  it('matches shell commands in exact case only', () => {
    expect(find({ word: 'Grep' })).toBeUndefined();
    expect(find({ word: 'HEAD' })).toBeUndefined();
  });
  it('sends a made-up tool to the made-up tools topic', () => expect(find({ word: 'weblog' })).toBe('made-up-tools'));
});

const q = (over: Partial<Question>): Question => ({
  id: 'q1',
  exam: 'X',
  source: 'user',
  type: 'mcq-single',
  objectiveIds: ['1.1'],
  difficulty: 1,
  stem: 'Which one?',
  payload: { options: [] },
  answer: { correct: [] },
  explanation: 'e',
  acronyms: [],
  status: 'approved',
  ...over,
});

const terminal = (payload: unknown, answer: unknown, stem = 'Use the terminal.') => q({ type: 'pbq-terminal', payload, answer, stem });

describe('topicsFor', () => {
  it('reads typed answers and code in the stem, in topic order', () => {
    const t = terminal(
      { output: ['$ ls'], steps: [{ id: 's1', label: 'Find errors' }] },
      { accept: { s1: ['grep ERROR app.log'] } },
      'You ran `git status` first.',
    );
    expect(ids(topicsFor(t, TOPICS))).toEqual(['grep', 'git']);
  });

  it('reads $ lines in the output', () => {
    const t = terminal({ output: ['$ weblog --tail', 'line'], steps: [] }, { accept: {} });
    expect(ids(topicsFor(t, TOPICS))).toEqual(['made-up-tools']);
  });

  it('raises nothing for upper-case words, paths and disk-free df in MCQ code', () => {
    const m = q({ stem: 'Is `HEAD` or `PATH` set?', payload: { options: [{ id: 'a', text: '`df -h /var`' }, { id: 'b', text: '`./deploy.sh`' }] } });
    expect(topicsFor(m, TOPICS)).toEqual([]);
  });

  it('reads MCQ option code and step labels', () => {
    const m = q({ payload: { options: [{ id: 'a', text: 'Run `grep -i x f`' }] } });
    expect(ids(topicsFor(m, TOPICS))).toEqual(['grep']);
    const t = terminal({ output: [], steps: [{ id: 's1', label: 'Show `SELECT` results', options: [{ id: 'o1', text: '`git log`' }] }] }, { accept: { s1: ['o1'] } });
    expect(ids(topicsFor(t, TOPICS))).toEqual(['git', 'sql']);
  });

  it("ignores a choice step's accepted option ids", () => {
    const t = terminal({ output: [], steps: [{ id: 's1', label: 'Pick', options: [{ id: 'grep', text: 'plain' }] }] }, { accept: { s1: ['grep'] } });
    expect(topicsFor(t, TOPICS)).toEqual([]);
  });

  it.each<[string, unknown, unknown]>([
    ['empty payload', {}, { accept: {} }],
    ['empty accept', { output: [], steps: [{ id: 's1', label: 'x' }] }, { accept: {} }],
    ['unclosed quote in output', { output: ["$ awk '{print"], steps: [] }, {}],
    ['null payload', null, null],
    ['non-string pieces', { output: [3, null], steps: [null, { id: 4, label: 5 }] }, { accept: { s1: 'grep' } }],
  ])('never throws on odd user questions: %s', (_, payload, answer) => {
    expect(() => topicsFor(terminal(payload, answer, undefined as unknown as string), TOPICS)).not.toThrow();
  });
});
