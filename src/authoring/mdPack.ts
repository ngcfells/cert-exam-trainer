import { z } from 'zod';
import { parseNumeric } from '../domain/numeric';
import { questionSchema } from '../domain/schema';

/** Converts the plain-text authoring format (docs/question-template.md) into pack entries. */
export interface MdOptions {
  exam: string;
  idPrefix: string;
  defaultObjective: string;
}

export interface MdResult {
  questions: unknown[];
  warnings: string[];
}

const SEPARATOR = /^\s*-{3,}\s*$/;
const INLINE_OPTION = /^([A-H])\s*[-.):]\s+(.+)$/;
const BARE_LETTER = /^([A-H])$/;
/** `Correct Answer:` / `Correct Answer(s):` with nothing after it marks the option just above. */
const MARKER = /^correct answers?(\(s\))?:\s*$/i;
const ANSWER_LINE = /^correct answers?(\(s\))?:\s*(.+)$/i;
const NUMBER_LINE = /^correct number:\s*(.+)$/i;
const NUMBER_OPTION = /^(tolerance|prefix|suffix):\s*(.+)$/i;
const META =/^(id|objectives?|difficulty):\s*(.+)$/i;
/** Copy-paste leftovers from quiz pages. */
const NOISE = /^(answer|correct)$/i;

/** FNV-1a, so the same stem keeps the same id across runs. */
function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** Joins lines into paragraphs separated by a blank line. */
function paragraphs(lines: string[]): string {
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function splitBlocks(md: string): string[][] {
  const blocks: string[][] = [[]];
  let inFence = false;
  for (const raw of md.replace(/\r\n?/g, '\n').split('\n')) {
    if (raw.trim().startsWith('```')) inFence = !inFence;
    if (!inFence && SEPARATOR.test(raw)) blocks.push([]);
    else blocks[blocks.length - 1].push(raw);
  }
  return blocks.filter((b) => b.some((l) => l.trim()));
}

interface Meta {
  id?: string;
  objectiveIds?: string[];
  difficulty?: number;
}

function takeMeta(lines: string[]): { meta: Meta; rest: string[]; images: number } {
  const meta: Meta = {};
  const rest: string[] = [];
  let images = 0;
  // Metadata is read only from the top of a block, so a stem line like "Objective: cut cost" stays text.
  let leading = true;
  for (const line of lines) {
    const t = line.trim();
    const m = leading ? META.exec(t) : null;
    if (t && !m && !t.startsWith('![')) leading = false;
    if (m) {
      const key = m[1].toLowerCase();
      if (key === 'id') meta.id = m[2].trim();
      else if (key === 'difficulty') meta.difficulty = Number(m[2].trim());
      else meta.objectiveIds = m[2].split(',').map((s) => s.trim()).filter(Boolean);
    } else if (t.startsWith('![')) images++;
    else rest.push(line);
  }
  return { meta, rest, images };
}

/** Leading uppercase letters only: "C, a firewall" is C, and "B. A switch" is B. */
function letters(text: string): string[] {
  const out: string[] = [];
  for (const tok of text.split(/\s*(?:,|&|\band\b)\s*|\s+/)) {
    const m = /^([A-H])[.)]?$/.exec(tok);
    if (!m) break;
    out.push(m[1]);
    if (tok.length > 1) break;
  }
  return out;
}

function parseMcq(lines: string[], n: number): { stem: string; options: { id: string; text: string }[]; correct: string[]; explanation: string } {
  const t = lines.map((l) => l.trim());
  let i = 0;
  const stem: string[] = [];
  const isOption = (k: number) => INLINE_OPTION.test(t[k]) || (BARE_LETTER.test(t[k]) && k + 1 < t.length);
  while (i < t.length && !isOption(i)) {
    if (!NOISE.test(t[i])) stem.push(t[i]);
    i++;
  }
  const options: { letter: string; text: string }[] = [];
  const correct = new Set<string>();
  // True right after an option's text line, so a wrapped line joins that option.
  let afterText = false;
  for (; i < t.length; i++) {
    const line = t[i];
    if (!line || NOISE.test(line)) {
      afterText = false;
      continue;
    }
    const inline = INLINE_OPTION.exec(line);
    if (inline) {
      options.push({ letter: inline[1], text: inline[2].trim() });
      afterText = true;
      continue;
    }
    if (BARE_LETTER.test(line)) {
      let j = i + 1;
      while (j < t.length && !t[j]) j++;
      if (j >= t.length) throw new Error(`Question ${n}: option ${line} has no text`);
      options.push({ letter: line, text: t[j] });
      i = j;
      afterText = true;
      continue;
    }
    if (MARKER.test(line) && options.length) {
      correct.add(options[options.length - 1].letter);
      afterText = false;
      continue;
    }
    if (afterText && !ANSWER_LINE.test(line) && !/^(explanation:?|why\b.*)$/i.test(line)) {
      options[options.length - 1].text += ` ${line}`;
      continue;
    }
    break;
  }
  if (options.length < 2) throw new Error(`Question ${n}: needs at least 2 options (A - text, A. text, or a letter on its own line)`);
  let rest = t.slice(i);
  const answer = rest.length ? ANSWER_LINE.exec(rest[0]) : null;
  if (answer) {
    letters(answer[2]).forEach((l) => correct.add(l));
    rest = rest.slice(1);
  }
  rest = rest.filter((l) => !NOISE.test(l));
  while (rest.length && !rest[0]) rest = rest.slice(1);
  if (rest[0] && /^explanation:?$/i.test(rest[0])) rest = rest.slice(1);
  const known = options.map((o) => o.letter);
  for (const c of correct) {
    if (!known.includes(c)) throw new Error(`Question ${n}: correct answer ${c} is not one of the options (${known.join(', ')})`);
  }
  if (!correct.size) throw new Error(`Question ${n}: no correct answer (add "Correct Answer: B")`);
  return {
    stem: paragraphs(stem),
    options: options.map((o) => ({ id: o.letter.toLowerCase(), text: o.text })),
    correct: known.filter((l) => correct.has(l)).map((l) => l.toLowerCase()),
    explanation: paragraphs(rest),
  };
}

/** Stem, then `Correct Number:`, then optional Tolerance / Prefix / Suffix lines, then the explanation. */
function parseNumericBlock(lines: string[], n: number) {
  const t = lines.map((l) => l.trim());
  const at = t.findIndex((l) => NUMBER_LINE.test(l));
  const value = parseNumeric(NUMBER_LINE.exec(t[at])![1]);
  if (value === null) throw new Error(`Question ${n}: Correct Number must be a number, such as 12.5`);
  const payload: { prefix?: string; suffix?: string } = {};
  let tolerance = 0;
  let i = at + 1;
  for (; i < t.length; i++) {
    if (!t[i]) continue;
    const m = NUMBER_OPTION.exec(t[i]);
    if (!m) break;
    const key = m[1].toLowerCase();
    if (key === 'tolerance') {
      const tol = parseNumeric(m[2]);
      if (tol === null) throw new Error(`Question ${n}: Tolerance must be a number, such as 0.5`);
      tolerance = tol;
    } else payload[key as 'prefix' | 'suffix'] = m[2].trim();
  }
  let rest = t.slice(i);
  if (rest[0] && /^explanation:?$/i.test(rest[0])) rest = rest.slice(1);
  return { stem: paragraphs(t.slice(0, at)), payload, answer: { value, tolerance }, explanation: paragraphs(rest) };
}

function fenceBody(lines: string[]): string | undefined {
  const start = lines.findIndex((l) => /^```pbq\s*$/i.test(l.trim()));
  if (start < 0) return undefined;
  const end = lines.findIndex((l, k) => k > start && l.trim() === '```');
  return lines.slice(start + 1, end < 0 ? undefined : end).join('\n');
}

export function parseMarkdown(md: string, opts: MdOptions): MdResult {
  const warnings: string[] = [];
  const built = splitBlocks(md).map((block, idx) => {
    const n = idx + 1;
    const { meta, rest, images } = takeMeta(block);
    if (!rest.some((l) => l.trim() && !/^<!--.*-->$/.test(l.trim()))) {
      warnings.push(`Question ${n}: skipped, it has only ${images} image(s). Write it as a pbq block (see docs/question-template.md).`);
      return undefined;
    }
    if (images) warnings.push(`Question ${n}: ${images} image(s) ignored. Describe what they show in the text or a pbq block.`);
    const fence = fenceBody(rest);
    let q: Record<string, unknown>;
    if (fence !== undefined) {
      let pbq: Record<string, unknown>;
      try {
        pbq = JSON.parse(fence) as Record<string, unknown>;
      } catch (e) {
        throw new Error(`Question ${n}: pbq block is not valid JSON (${(e as Error).message})`);
      }
      q = {
        pbqWeight: 2,
        explanation: '',
        ...pbq,
        id: meta.id ?? pbq.id ?? `${opts.idPrefix}-${hash(String(pbq.stem ?? n))}`,
        exam: opts.exam,
        source: 'user',
        objectiveIds: meta.objectiveIds ?? pbq.objectiveIds ?? [opts.defaultObjective],
        difficulty: meta.difficulty ?? pbq.difficulty ?? 2,
        acronyms: pbq.acronyms ?? [],
        status: 'approved',
      };
    } else if (rest.some((l) => NUMBER_LINE.test(l.trim()))) {
      const m = parseNumericBlock(rest, n);
      q = {
        id: meta.id ?? `${opts.idPrefix}-${hash(m.stem)}`,
        exam: opts.exam,
        source: 'user',
        type: 'numeric',
        objectiveIds: meta.objectiveIds ?? [opts.defaultObjective],
        difficulty: meta.difficulty ?? 2,
        stem: m.stem,
        payload: m.payload,
        answer: m.answer,
        explanation: m.explanation,
        acronyms: [],
        status: 'approved',
      };
    } else {
      const m = parseMcq(rest, n);
      q = {
        id: meta.id ?? `${opts.idPrefix}-${hash(m.stem)}`,
        exam: opts.exam,
        source: 'user',
        type: m.correct.length > 1 ? 'mcq-multi' : 'mcq-single',
        objectiveIds: meta.objectiveIds ?? [opts.defaultObjective],
        difficulty: meta.difficulty ?? 2,
        stem: m.stem,
        payload: { options: m.options },
        answer: { correct: m.correct },
        explanation: m.explanation,
        acronyms: [],
        status: 'approved',
      };
    }
    const r = questionSchema.safeParse(q);
    if (!r.success) {
      const issue = r.error.issues[0] as z.ZodIssue;
      throw new Error(`Question ${n}: ${issue.path.join('.') || 'question'}: ${issue.message}`);
    }
    return q;
  });
  const questions = built.filter((q) => q !== undefined);
  const ids = questions.map((q) => q.id as string);
  const dup = ids.find((id, k) => ids.indexOf(id) !== k);
  if (dup) throw new Error(`Two questions have the id "${dup}" (same stem?). Give one an "Id:" line.`);
  return { questions, warnings };
}
