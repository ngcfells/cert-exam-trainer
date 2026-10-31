import { describe, it, expect } from 'vitest';
import { sharedRuns } from './overlap';

describe('sharedRuns', () => {
  it('returns each 8-word run both texts share, ignoring case and punctuation', () => {
    expect(
      sharedRuns('Attackers hid a trigger phrase in the training data, then waited.', 'Note: attackers hid a trigger phrase in the training data!', 8),
    ).toEqual(['attackers hid a trigger phrase in the training', 'hid a trigger phrase in the training data']);
  });

  it('returns nothing when the text is shorter than n words', () => {
    expect(sharedRuns('a b c d e f g', 'a b c d e f g', 8)).toEqual([]);
  });

  it('returns nothing when no 8-word run is shared', () => {
    expect(sharedRuns('the model drifted after the vendor changed its tokenizer last week', 'the vendor changed the tokenizer and the model drifted later')).toEqual([]);
  });

  it('defaults to 8 words and lists a repeated run once', () => {
    const run = 'one two three four five six seven eight';
    expect(sharedRuns(`${run} and ${run}`, run)).toEqual([run]);
  });
});
