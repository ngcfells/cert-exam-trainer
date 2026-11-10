import { describe, expect, it } from 'vitest';
import { lessonSchema, lessonText } from './lesson';

const sampleLesson = {
  id: 'a-sample',
  exam: 'DA0-002',
  area: 'A',
  title: 'Sample',
  objectiveIds: ['3.2'],
  meaning: ['What it means.'],
  formula: { text: 'x^{2}', spoken: 'x squared', symbols: [{ symbol: 'x', meaning: 'a value' }] },
  example: { intro: 'Take 3.', table: { caption: 'Steps', head: ['x', 'x squared'], rows: [['3', '9']] }, steps: ['3 times 3 is 9.'] },
  trap: { wrong: 'Doubling gives 6.', why: 'Squaring multiplies by itself.' },
  checkIds: ['q1', 'q2', 'q3'],
};

const issues = (x: unknown) => lessonSchema.safeParse(x).error?.issues.map((i) => `${i.path.join('.')}: ${i.message}`) ?? [];

describe('lessonSchema', () => {
  it('accepts the sample', () => expect(issues(sampleLesson)).toEqual([]));

  it.each([
    ['both formula and rule', { ...sampleLesson, rule: ['A rule.'] }, /formula: give exactly one/],
    ['neither formula nor rule', { ...sampleLesson, formula: undefined }, /formula: give exactly one/],
    ['2 check ids', { ...sampleLesson, checkIds: ['q1', 'q2'] }, /checkIds/],
    ['6 check ids', { ...sampleLesson, checkIds: ['1', '2', '3', '4', '5', '6'] }, /checkIds/],
    ['a repeated check id', { ...sampleLesson, checkIds: ['q1', 'q1', 'q2'] }, /checkIds: repeated/],
    ['a short table row', { ...sampleLesson, example: { ...sampleLesson.example, table: { ...sampleLesson.example.table, rows: [['3']] } } }, /example\.table\.rows\.0: row has 1 cells/],
    ['an unknown key', { ...sampleLesson, extra: 1 }, /Unrecognized key/],
  ])('rejects %s', (_n, lesson, msg) => {
    expect(issues(lesson).join('\n')).toMatch(msg);
  });

  it('accepts a diagram with a caption and a description', () => {
    const diagram = { kind: 'join-venn', caption: 'Four joins.', description: 'Two circles, A and B.' };
    expect(issues({ ...sampleLesson, diagram })).toEqual([]);
    expect(lessonText(lessonSchema.parse({ ...sampleLesson, diagram }))).toContain('Two circles, A and B.');
    expect(lessonText(lessonSchema.parse({ ...sampleLesson, diagram }))).toContain('Four joins.');
  });

  it.each([
    ['an unknown diagram kind', { kind: 'pie', caption: 'c', description: 'd' }],
    ['a diagram with no description', { kind: 'join-venn', caption: 'c' }],
    ['a diagram with an extra key', { kind: 'join-venn', caption: 'c', description: 'd', x: 1 }],
  ])('rejects %s', (_n, diagram) => {
    expect(issues({ ...sampleLesson, diagram })).not.toEqual([]);
  });

  it('lessonText includes every prose field', () => {
    const t = lessonText(lessonSchema.parse(sampleLesson));
    for (const s of ['What it means.', 'x squared', 'a value', 'Take 3.', 'Steps', '3 times 3 is 9.', 'Doubling gives 6.', 'Squaring']) expect(t).toContain(s);
  });
});
