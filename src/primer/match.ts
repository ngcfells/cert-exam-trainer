import { getBundledQuestions } from '../banks';
import type { PrimerTopic } from '../domain/primer';
import { parseRich } from '../domain/richText';
import type { Question } from '../domain/types';
import { PRIMER_TOPICS } from './topics';

export type CommandWord = { word: string; sub?: string };

/** Invented tools the banks use; they lead to one topic on reading an unfamiliar tool's help. */
export const MADE_UP_TOOLS: ReadonlySet<string> = new Set([
  'weblog', 'vulnai', 'proxyq', 'gr-suite', 'pipectl', 'logscrub', 'agentctl', 'gwctl',
  'netpol', 'cloudctl', 'iacctl', 'rolloutctl', 'svcstat', 'secretctl', 'lintcheck', 'providerctl',
]);
export const MADE_UP_TOPIC = 'made-up-tools';

/** Tools whose next word names what they do ("git push"). */
const WITH_SUB = new Set(['git', 'docker', 'conda', 'systemctl']);

/** Splits on | ; & (so also || && and a trailing &), never inside quotes. An unclosed quote runs to the end. */
function segments(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quote: string | null = null;
  for (const ch of line) {
    if (quote) {
      cur += ch;
      if (ch === quote) quote = null;
    } else if (ch === "'" || ch === '"') {
      quote = ch;
      cur += ch;
    } else if (ch === '|' || ch === ';' || ch === '&') {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

/** Splits a segment on spaces outside quotes. */
function tokens(segment: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quote: string | null = null;
  for (const ch of segment) {
    if (quote) {
      if (ch === quote) quote = null;
      cur += ch;
    } else if (ch === "'" || ch === '"') {
      quote = ch;
      cur += ch;
    } else if (/\s/.test(ch)) {
      if (cur) out.push(cur);
      cur = '';
    } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

const WORD = /^[A-Za-z_][A-Za-z0-9_-]*/;

/** A token's command word: `%` for a job spec, else the leading name plus one of [ . ( when it follows. */
function tokenWord(token: string, withSuffix = true): string | undefined {
  if (token.startsWith('%')) return '%';
  const m = WORD.exec(token);
  if (!m) return undefined;
  const next = token[m[0].length];
  return withSuffix && (next === '[' || next === '.' || next === '(') ? m[0] + next : m[0];
}

/** The command words in one shell line. */
export function commandWords(line: string): CommandWord[] {
  const out: CommandWord[] = [];
  for (const seg of segments(line)) {
    const ts = tokens(seg);
    let i = 0;
    while (i < ts.length && /^[A-Za-z_]\w*=/.test(ts[i])) i++;
    if (ts[i] === 'sudo') {
      out.push({ word: 'sudo' });
      i++;
    }
    if (i >= ts.length) continue;
    const word = tokenWord(ts[i]);
    if (!word) continue;
    const sub = WITH_SUB.has(word) && ts[i + 1] !== undefined ? tokenWord(ts[i + 1], false) : undefined;
    out.push(sub ? { word, sub } : { word });
  }
  return out;
}

const str = (x: unknown): string | undefined => (typeof x === 'string' ? x : undefined);
const arr = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);
const field = (x: unknown, k: string): unknown => (x && typeof x === 'object' ? (x as Record<string, unknown>)[k] : undefined);
const dropPrompt = (l: string) => l.replace(/^\$ /, '');

/** Shell lines inside the code of a piece of rich text. */
function codeLines(text: string | undefined): string[] {
  if (!text) return [];
  return parseRich(text).flatMap((s) => (s.kind === 'code' ? [dropPrompt(s.value)] : s.kind === 'block' ? s.value.split('\n').map(dropPrompt) : []));
}

/** Every shell line a question shows or accepts. Reads user content defensively and never throws. */
function questionLines(q: Question): string[] {
  const lines = [...codeLines(str(q.stem))];
  for (const o of arr(field(q.payload, 'options'))) lines.push(...codeLines(str(field(o, 'text'))));
  if (q.type !== 'pbq-terminal') return lines;
  for (const l of arr(field(q.payload, 'output'))) {
    const s = str(l);
    if (s?.startsWith('$ ')) lines.push(s.slice(2));
  }
  const accept = field(q.answer, 'accept');
  for (const step of arr(field(q.payload, 'steps'))) {
    lines.push(...codeLines(str(field(step, 'label'))));
    const options = arr(field(step, 'options'));
    for (const o of options) lines.push(...codeLines(str(field(o, 'text'))));
    const id = str(field(step, 'id'));
    if (options.length === 0 && id) for (const a of arr(field(accept, id))) if (str(a)) lines.push(a as string);
  }
  return lines;
}

/** The command words of a question, deduped, in first-seen order. */
export function questionCommandWords(q: Question): CommandWord[] {
  const seen = new Map<string, CommandWord>();
  for (const line of questionLines(q)) {
    for (const w of commandWords(line)) {
      const key = `${w.word} ${w.sub ?? ''}`;
      if (!seen.has(key)) seen.set(key, w);
    }
  }
  return [...seen.values()];
}

const hasAlias = (t: PrimerTopic, key: string) => (t.anyCase ? t.aliases.some((a) => a.toLowerCase() === key.toLowerCase()) : t.aliases.includes(key));

/** The topic a command word leads to: the "word sub" pair first, then the word alone. */
export function wordTopic(w: CommandWord, topics: PrimerTopic[] = PRIMER_TOPICS): PrimerTopic | undefined {
  if (MADE_UP_TOOLS.has(w.word)) return topics.find((t) => t.id === MADE_UP_TOPIC);
  const keys = w.sub ? [`${w.word} ${w.sub}`, w.word] : [w.word];
  for (const k of keys) {
    const t = topics.find((x) => hasAlias(x, k));
    if (t) return t;
  }
  return undefined;
}

/** The topics a question uses, in topic order. */
export function topicsFor(q: Question, topics: PrimerTopic[] = PRIMER_TOPICS): PrimerTopic[] {
  const hit = new Set(questionCommandWords(q).map((w) => wordTopic(w, topics)));
  return topics.filter((t) => hit.has(t));
}

/** The topics any of these questions use, in topic order. */
export function questionsTopics(qs: Question[], topics: PrimerTopic[] = PRIMER_TOPICS): PrimerTopic[] {
  const hit = new Set(qs.flatMap((q) => topicsFor(q, topics)));
  return topics.filter((t) => hit.has(t));
}

/** The topics an exam's bundled questions use, in topic order. */
export function examTopics(exam: string, topics: PrimerTopic[] = PRIMER_TOPICS): PrimerTopic[] {
  return questionsTopics(getBundledQuestions(exam), topics);
}

/** Every topic the primer shows for a bank: Shell basics plus the bank's own topics, or none if it uses none. */
export function shownTopics(qs: Question[], topics: PrimerTopic[] = PRIMER_TOPICS): PrimerTopic[] {
  const used = questionsTopics(qs, topics);
  return used.length ? [...basicsTopics(topics), ...used.filter((t) => t.group !== 'basics')] : [];
}

export function basicsTopics(topics: PrimerTopic[] = PRIMER_TOPICS): PrimerTopic[] {
  return topics.filter((t) => t.group === 'basics');
}
