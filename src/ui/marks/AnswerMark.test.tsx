import { afterEach, describe, expect, it } from 'vitest';
import { act, render } from '@testing-library/react';
import { AnswerMark, levelOf, PLAIN_WORDS, type MarkLevel } from './AnswerMark';
import { applyMarks, DEFAULT_MARKS, MARK_STYLES, type MarkStyle } from './prefs';

afterEach(() => applyMarks(DEFAULT_MARKS));

const LEVELS: MarkLevel[] = ['right', 'partly', 'wrong'];
const STYLE_WORDS: Partial<Record<MarkStyle, Record<MarkLevel, string>>> = {
  smiley: { right: 'Nice one!', partly: 'Almost', wrong: 'Not this time' },
  stamp: { right: 'Correct', partly: 'Partial', wrong: 'Missed' },
};
const WITH_ICON: MarkStyle[] = ['banner', 'smiley', 'thumbs', 'shapes', 'edge'];

describe('AnswerMark (large)', () => {
  const cases = MARK_STYLES.flatMap((s) => LEVELS.map((l) => [s, l] as const));
  it.each(cases)('%s %s: plain word first, then the style word; icons hidden', (style, level) => {
    const { container } = render(<AnswerMark level={level} markStyle={style} />);
    const text = container.textContent ?? '';
    expect(text.startsWith(PLAIN_WORDS[level])).toBe(true);
    expect(text).toContain(STYLE_WORDS[style]?.[level] ?? PLAIN_WORDS[level]);
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBe(WITH_ICON.includes(style) ? 1 : 0);
    svgs.forEach((s) => expect(s.getAttribute('aria-hidden')).toBe('true'));
    expect(container.firstElementChild).toHaveClass('mark', `mark-${style}`, `mark-${level}`);
  });

  it('smiley right: hidden plain word, visible friendly words', () => {
    const { container } = render(<AnswerMark level="right" markStyle="smiley" />);
    expect(container.querySelector('.visually-hidden')?.textContent).toBe('Correct. ');
    expect(container.textContent).toBe('Correct. Nice one!');
  });

  it('banner right: the plain word is visible and not repeated', () => {
    const { container } = render(<AnswerMark level="right" markStyle="banner" />);
    expect(container.querySelector('.visually-hidden')).toBeNull();
    expect(container.textContent).toBe('Correct');
  });

  it.each(['smiley', 'banner', 'plain'] as const)('unanswered on %s says Not answered', (style) => {
    const { container } = render(<AnswerMark level="wrong" markStyle={style} unanswered />);
    expect(container.textContent).toBe('Incorrect. Not answered');
  });

  it('uses the chosen style when none is passed', () => {
    act(() => applyMarks({ style: 'stamp', sound: false }));
    const { container } = render(<AnswerMark level="right" />);
    expect(container.firstElementChild).toHaveClass('mark-stamp');
  });
});

describe('AnswerMark (small)', () => {
  it('thumbs right is the plain word with an icon', () => {
    const { container } = render(<AnswerMark level="right" size="small" markStyle="thumbs" />);
    expect(container.textContent).toBe('Correct');
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('smiley wrong never shows the friendly words', () => {
    const { container } = render(<AnswerMark level="wrong" size="small" markStyle="smiley" />);
    expect(container.textContent).toBe('Incorrect');
  });

  it('stamp small has no icon and no tilt', () => {
    const { container } = render(<AnswerMark level="wrong" size="small" markStyle="stamp" />);
    expect(container.querySelector('svg')).toBeNull();
    expect(container.firstElementChild).toHaveClass('mark-small');
    expect(container.firstElementChild).not.toHaveClass('mark-stamp');
  });

  it('plain small is the word alone', () => {
    const { container } = render(<AnswerMark level="right" size="small" markStyle="plain" />);
    expect(container.innerHTML).not.toContain('svg');
    expect(container.textContent).toBe('Correct');
  });
});

it('levelOf follows the verdict rule', () => {
  expect(levelOf(1)).toBe('right');
  expect(levelOf(0.5)).toBe('partly');
  expect(levelOf(0)).toBe('wrong');
});
