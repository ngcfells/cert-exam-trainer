import { describe, it, expect } from 'vitest';
import { parseMarkdown } from './mdPack';

const opts = { exam: 'DA0-002', idPrefix: 'user-da', defaultObjective: '1.1' };

// Original fixture text written for these tests.
const DASH = `Which shape has three sides?

A - Square
B - Triangle
C - Circle

Correct Answer(s): B - Triangle

Explanation
A triangle has three sides.

A square has four.`;

const BARE = `Pick the even numbers. (Select two.)

answer

A
Two

Correct Answer:
Correct

B
Three

C
Four

Correct Answer:
Correct
Explanation
Two and four divide by two.`;

describe('parseMarkdown', () => {
  it('dash options and Correct Answer(s) line', () => {
    const { questions } = parseMarkdown(DASH, opts);
    expect(questions).toHaveLength(1);
    expect(questions[0]).toMatchObject({
      type: 'mcq-single',
      exam: 'DA0-002',
      source: 'user',
      objectiveIds: ['1.1'],
      stem: 'Which shape has three sides?',
      payload: { options: [{ id: 'a', text: 'Square' }, { id: 'b', text: 'Triangle' }, { id: 'c', text: 'Circle' }] },
      answer: { correct: ['b'] },
      explanation: 'A triangle has three sides.\n\nA square has four.',
    });
    expect((questions[0] as { id: string }).id).toMatch(/^user-da-[0-9a-f]{8}$/);
  });

  it('letter on its own line and marker after option', () => {
    const q = parseMarkdown(BARE, opts).questions[0];
    expect(q).toMatchObject({
      stem: 'Pick the even numbers. (Select two.)',
      payload: { options: [{ id: 'a', text: 'Two' }, { id: 'b', text: 'Three' }, { id: 'c', text: 'Four' }] },
      answer: { correct: ['a', 'c'] },
      explanation: 'Two and four divide by two.',
    });
  });

  it('two correct makes mcq-multi', () => {
    expect(parseMarkdown(BARE, opts).questions[0]).toMatchObject({ type: 'mcq-multi' });
    const dotted = 'Q?\n\nA. one\nB. two\nC. three\n\nCorrect Answer: A, C';
    expect(parseMarkdown(dotted, opts).questions[0]).toMatchObject({ type: 'mcq-multi', answer: { correct: ['a', 'c'] } });
  });

  it('splits blocks on --- and keeps ids stable', () => {
    const a = parseMarkdown(`${DASH}\n---\n${BARE}\n---\n`, opts);
    const b = parseMarkdown(`${DASH}\n---\n${BARE}`, opts);
    expect(a.questions).toHaveLength(2);
    expect(a.questions).toEqual(b.questions);
  });

  it('metadata lines override defaults', () => {
    const q = parseMarkdown(`Id: my-q-1\nObjective: 2.1, 3.1\nDifficulty: 3\n${DASH}`, opts).questions[0];
    expect(q).toMatchObject({ id: 'my-q-1', objectiveIds: ['2.1', '3.1'], difficulty: 3, stem: 'Which shape has three sides?' });
  });

  it('pbq fence builds a valid pbq-data', () => {
    const block = [
      'Objective: 3.1',
      '```pbq',
      JSON.stringify({
        type: 'pbq-data',
        stem: 'Fill in the missing total.',
        payload: {
          caption: 'Sales',
          columns: ['Item', 'Qty'],
          rows: [['Pens', '3'], ['Pads', '4']],
          fields: [{ id: 'f1', label: 'Total', options: [{ id: 'o1', text: '7' }, { id: 'o2', text: '12' }] }],
        },
        answer: { values: { f1: 'o1' } },
      }),
      '```',
    ].join('\n');
    const q = parseMarkdown(block, opts).questions[0];
    expect(q).toMatchObject({ type: 'pbq-data', pbqWeight: 2, objectiveIds: ['3.1'], source: 'user', explanation: '' });
  });

  it('pbq fence with bad json names the question', () => {
    expect(() => parseMarkdown(`${DASH}\n---\n\`\`\`pbq\n{nope\n\`\`\``, opts)).toThrow(/Question 2: pbq block is not valid JSON/);
  });

  it('image lines warn', () => {
    const { warnings } = parseMarkdown(`${DASH}\n![shot](a.png)`, opts);
    expect(warnings).toEqual(['Question 1: 1 image(s) ignored. Describe what they show in the text or a pbq block.']);
  });

  it('an image-only block is skipped with a warning', () => {
    const { questions, warnings } = parseMarkdown(`${DASH}\n---\n![a](a.png)\n![b](b.png)\n---\n${BARE}`, opts);
    expect(questions).toHaveLength(2);
    expect(warnings).toEqual([expect.stringMatching(/^Question 2: skipped, it has only 2 image\(s\)/)]);
  });

  it('unknown answer letter is an error', () => {
    expect(() => parseMarkdown('Q?\nA - x\nB - y\nCorrect Answer: F', opts)).toThrow(/Question 1: correct answer F/);
  });

  it('answer text after the letter is not read as more letters', () => {
    const q = (answer: string) => parseMarkdown(`Q?\nA - w\nB - x\nC - y\n\nCorrect Answer: ${answer}`, opts).questions[0];
    expect(q('C, a firewall blocks it')).toMatchObject({ type: 'mcq-single', answer: { correct: ['c'] } });
    expect(q('B. A switch forwards frames')).toMatchObject({ answer: { correct: ['b'] } });
    expect(q('A and C')).toMatchObject({ answer: { correct: ['a', 'c'] } });
  });

  it('a wrapped option line joins its option', () => {
    const q = parseMarkdown('Q?\nA - first part\nof the option\nB - other\n\nCorrect Answer: A', opts).questions[0];
    expect(q).toMatchObject({ payload: { options: [{ id: 'a', text: 'first part of the option' }, { id: 'b', text: 'other' }] } });
  });

  it('metadata is read only from the top of a block', () => {
    const q = parseMarkdown('Objective: 2.1\nWhy?\nObjective: cut cost\nA - x\nB - y\nCorrect Answer: A', opts).questions[0];
    expect(q).toMatchObject({ objectiveIds: ['2.1'], stem: 'Why?\nObjective: cut cost' });
  });

  it('no correct answer is an error', () => {
    expect(() => parseMarkdown('Q?\nA - x\nB - y', opts)).toThrow(/Question 1: no correct answer/);
  });

  it('duplicate stems need an Id line', () => {
    expect(() => parseMarkdown(`${DASH}\n---\n${DASH}`, opts)).toThrow(/Id:/);
  });
});
