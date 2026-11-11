// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { Lesson } from '../domain/lesson';
import type { ExamMeta, Question } from '../domain/types';
import { canonical, hashExam, hashRelease, type ExamContent, type ExamHashes } from './hashes';
import { diffExams, manifestSchema, nextManifest, verdict, type Manifest } from './manifest';

const question = (id: string, text = 'Right'): Question => ({
  id,
  exam: 'X0-001',
  source: 'ours',
  type: 'mcq-single',
  objectiveIds: ['1.1'],
  difficulty: 1,
  stem: `Stem of ${id}`,
  payload: { options: [{ id: 'a', text }, { id: 'b', text: 'Wrong' }] },
  answer: { correct: ['a'] },
  explanation: 'Because ε × “q” 😀.',
  acronyms: [],
  status: 'approved',
});

const meta = (code: string, passingScore = 700) => ({ code, name: code, passingScore }) as unknown as ExamMeta;
const lesson = (id: string, title = 'T') => ({ id, exam: 'X0-001', title }) as unknown as Lesson;

const content = (over: Partial<ExamContent> = {}): ExamContent => ({
  meta: meta('X0-001'),
  questions: [question('q1'), question('q2')],
  lessons: [lesson('l1')],
  ...over,
});

const INFO = { date: '2026-11-10', commit: 'abc1234', appVersion: '0.1.0' };
const local = (c: ExamContent = content()): Record<string, ExamHashes> => ({ 'X0-001': hashExam(c) });
const manifestOf = (l: Record<string, ExamHashes>, prev: Manifest | null = null) => nextManifest(prev, l, INFO)!;

describe('canonical', () => {
  it('sorts keys at every depth, keeps array order and drops undefined properties', () => {
    expect(canonical({ b: 1, a: [2, { d: undefined, c: 'x' }] })).toBe('{"a":[2,{"c":"x"}],"b":1}');
  });

  it('gives the same text whatever order the keys were written in', () => {
    expect(canonical({ a: 1, b: { c: 2, d: 3 } })).toBe(canonical({ b: { d: 3, c: 2 }, a: 1 }));
  });
});

describe('hashExam', () => {
  it('changes only the edited question, the exam hash and the release id', () => {
    const before = hashExam(content());
    const after = hashExam(content({ questions: [question('q1', 'Changed'), question('q2')] }));
    expect(after.questions.q1).not.toBe(before.questions.q1);
    expect(after.questions.q2).toBe(before.questions.q2);
    expect(after.lessons).toEqual(before.lessons);
    expect(after.meta).toBe(before.meta);
    expect(after.hash).not.toBe(before.hash);
    expect(hashRelease({ x: after })).not.toBe(hashRelease({ x: before }));
  });

  it('notices a change to the exam details or a lesson', () => {
    const before = hashExam(content());
    expect(hashExam(content({ meta: meta('X0-001', 100) })).meta).not.toBe(before.meta);
    expect(hashExam(content({ lessons: [lesson('l1', 'Other')] })).lessons.l1).not.toBe(before.lessons.l1);
  });
});

describe('verdict', () => {
  const v1 = local();
  const v2 = local(content({ questions: [question('q1'), question('q2'), question('q3')] }));

  it('verifies the current release', () => {
    expect(verdict(v2, manifestOf(v2, manifestOf(v1)))).toMatchObject({ kind: 'verified', release: { id: hashRelease(v2) } });
  });

  it('calls an earlier release out of date', () => {
    expect(verdict(v1, manifestOf(v2, manifestOf(v1)))).toMatchObject({ kind: 'outdated', current: { id: hashRelease(v2) } });
  });

  it('reports what differs when the content matches no release', () => {
    const tampered = local(content({ questions: [question('q1', 'Changed'), question('q9')], lessons: [], meta: meta('X0-001', 1) }));
    expect(verdict(tampered, manifestOf(v2, manifestOf(v1)))).toEqual({
      kind: 'mismatch',
      diffs: [{ exam: 'X0-001', changed: ['q1'], missing: ['q2', 'q3'], extra: ['q9'], metaDiffers: true, lessonsChanged: [], lessonsMissing: ['l1'], lessonsExtra: [] }],
    });
  });

  it('lists an exam that only one side has, with every item', () => {
    const other = { 'Y0-001': hashExam(content({ meta: meta('Y0-001') })) };
    const diffs = diffExams(other, v1);
    expect(diffs.map((d) => d.exam)).toEqual(['X0-001', 'Y0-001']);
    expect(diffs[0]).toMatchObject({ missing: ['q1', 'q2'], extra: [], lessonsMissing: ['l1'], metaDiffers: true });
    expect(diffs[1]).toMatchObject({ missing: [], extra: ['q1', 'q2'], lessonsExtra: ['l1'], metaDiffers: true });
    expect(verdict(other, manifestOf(v1)).kind).toBe('mismatch');
  });
});

describe('nextManifest', () => {
  const v1 = local();
  const v2 = local(content({ questions: [question('q1')] }));
  const v3 = local(content({ questions: [] }));

  it('builds the first file with no history', () => {
    const m = manifestOf(v1);
    expect(m).toMatchObject({ format: 1, algorithm: 'SHA-512/256', current: { id: hashRelease(v1), ...INFO }, history: [] });
    expect(manifestSchema.parse(m)).toEqual(m);
  });

  it('returns null when the content is already the current release', () => {
    expect(nextManifest(manifestOf(v1), v1, INFO)).toBeNull();
  });

  it('moves each replaced release to the head of the history, with exam hashes only', () => {
    const m = manifestOf(v3, manifestOf(v2, manifestOf(v1)));
    expect(m.history.map((r) => r.id)).toEqual([hashRelease(v2), hashRelease(v1)]);
    expect(m.history[0].exams).toEqual({ 'X0-001': v2['X0-001'].hash });
    expect(manifestSchema.parse(m)).toEqual(m);
  });
});

describe('manifestSchema', () => {
  it('rejects another format and a file with no current release', () => {
    const m = manifestOf(local());
    expect(manifestSchema.safeParse({ ...m, format: 2 }).success).toBe(false);
    expect(manifestSchema.safeParse({ ...m, current: undefined }).success).toBe(false);
    expect(manifestSchema.safeParse({ ...m, current: { ...m.current, id: 'not-a-hash' } }).success).toBe(false);
  });

  it('rejects a file that disagrees with itself', () => {
    const m = manifestOf(local());
    const exam = m.current.exams['X0-001'];
    const wrongId = { ...m, current: { ...m.current, id: 'a'.repeat(64) } };
    const wrongExam = { ...m, current: { ...m.current, exams: { 'X0-001': { ...exam, questions: { ...exam.questions, q1: 'b'.repeat(64) } } } } };
    expect(manifestSchema.safeParse(wrongId).success).toBe(false);
    expect(manifestSchema.safeParse(wrongExam).success).toBe(false);
  });
});
