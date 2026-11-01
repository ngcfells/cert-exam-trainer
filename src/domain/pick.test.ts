import { describe, expect, it } from 'vitest';
import { displayStem, effectivePick, pickHint, pickSuffix, pickWord, stemStatesPick } from './pick';
import type { Question } from './types';

const q = (over: Partial<Question> & { correct?: string[] } = {}): Question => {
  const { correct = ['a', 'c'], ...rest } = over;
  return {
    id: 'x-1', exam: 'DA0-002', source: 'user', type: 'mcq-multi', objectiveIds: ['1.1'], difficulty: 2,
    stem: 'Which controls help most?',
    payload: { options: ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, text: id })) },
    answer: { correct }, explanation: '', acronyms: [], status: 'approved',
    ...rest,
  };
};

describe('effectivePick', () => {
  it('uses the correct count when pick is missing', () => expect(effectivePick(q())).toBe(2));
  it('keeps all even with 2 correct', () => expect(effectivePick(q({ pick: 'all' }))).toBe('all'));
  it('is 1 for single answer', () => expect(effectivePick(q({ type: 'mcq-single', correct: ['a'] }))).toBe(1));
});

describe('stemStatesPick', () => {
  it.each([
    ['Which TWO controls apply?', 2],
    ['Select 3 answers.', 3],
    ['Please choose 2.', 2],
    ['Which three steps come first?', 3],
  ] as const)('true for %s', (stem, n) => expect(stemStatesPick(stem, n)).toBe(true));
  it('true for select all wording', () => expect(stemStatesPick('Select all that apply.', 'all')).toBe(true));
  it.each([
    ['Which of the 3 servers fails?', 2],
    ['Step 2 of the process fails. Why?', 3],
    ['Which threats apply?', 2],
  ] as const)('false for %s', (stem, n) => expect(stemStatesPick(stem, n)).toBe(false));
  it('a count word does not state select all', () => expect(stemStatesPick('Which two apply?', 'all')).toBe(false));
});

describe('pickSuffix and pickWord', () => {
  it('words up to ten, digits beyond', () => {
    expect(pickWord(2)).toBe('two');
    expect(pickWord(10)).toBe('ten');
    expect(pickWord(11)).toBe('11');
  });
  it('builds the suffix', () => {
    expect(pickSuffix(2)).toBe('(Choose two.)');
    expect(pickSuffix(3)).toBe('(Choose three.)');
    expect(pickSuffix('all')).toBe('(Select all that apply.)');
  });
});

describe('displayStem', () => {
  it('leaves a stem that states the count', () => {
    expect(displayStem(q({ stem: 'Which TWO help most?' }))).toBe('Which TWO help most?');
  });
  it('adds the count when missing', () => {
    expect(displayStem(q())).toBe('Which controls help most? (Choose two.)');
  });
  it('uses the correct count for an old 4-answer question', () => {
    expect(displayStem(q({ correct: ['a', 'b', 'c', 'd'] }))).toBe('Which controls help most? (Choose four.)');
  });
  it('adds select all', () => {
    expect(displayStem(q({ pick: 'all' }))).toBe('Which controls help most? (Select all that apply.)');
  });
  it('leaves single-answer stems alone', () => {
    expect(displayStem(q({ type: 'mcq-single', correct: ['a'] }))).toBe('Which controls help most?');
  });
});

describe('pickHint', () => {
  it('names the count or select all', () => {
    expect(pickHint(2)).toBe('Select 2.');
    expect(pickHint('all')).toBe('Select all that apply.');
  });
});
