import type { ReactNode } from 'react';
import { useMarks, type MarkStyle } from './prefs';
import './marks.css';

export type MarkLevel = 'right' | 'partly' | 'wrong';

/** The existing verdict rule: full marks, some marks, none. */
export function levelOf(fraction: number): MarkLevel {
  return fraction >= 1 ? 'right' : fraction > 0 ? 'partly' : 'wrong';
}

export const PLAIN_WORDS: Record<MarkLevel, string> = { right: 'Correct', partly: 'Partly correct', wrong: 'Incorrect' };

const STYLE_WORDS: Partial<Record<MarkStyle, Record<MarkLevel, string>>> = {
  smiley: { right: 'Nice one!', partly: 'Almost', wrong: 'Not this time' },
  stamp: { right: 'Correct', partly: 'Partial', wrong: 'Missed' },
};

const THUMB =
  'M2 21h4V9H2v12zm20-11a2 2 0 0 0-2-2h-6.3l1-4.6v-.3c0-.4-.2-.8-.4-1.1L13.2 1 6.6 7.6C6.2 8 6 8.5 6 9v10a2 2 0 0 0 2 2h9c.8 0 1.5-.5 1.8-1.2l3-7.1c.1-.2.2-.5.2-.7v-2z';
const THUMB_TURN: Record<MarkLevel, number> = { right: 0, partly: -90, wrong: 180 };

function Svg({ box, children }: { box: number; children: ReactNode }) {
  return (
    <svg className="mark-icon" viewBox={`0 0 ${box} ${box}`} aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

/** The icon for a style and level; colours come from marks.css (currentColor and classes). */
function icon(style: MarkStyle, level: MarkLevel): ReactNode {
  switch (style) {
    case 'banner':
      return (
        <Svg box={32}>
          {level === 'partly' ? (
            <>
              <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="2.5" />
              <path d="M16 2a14 14 0 0 0 0 28z" fill="currentColor" />
            </>
          ) : (
            <>
              <circle cx="16" cy="16" r="15" fill="currentColor" />
              <path className="mark-glyph" d={level === 'right' ? 'M9 16.5l5 5 9-10' : 'M10.5 10.5l11 11M21.5 10.5l-11 11'} />
            </>
          )}
        </Svg>
      );
    case 'smiley':
      return (
        <Svg box={44}>
          <circle className="mark-face" cx="22" cy="22" r="20" />
          <circle className="mark-face-dot" cx="15" cy="18" r="2.5" />
          <circle className="mark-face-dot" cx="29" cy="18" r="2.5" />
          <path className="mark-face-line" d={level === 'right' ? 'M13 26q9 9 18 0' : level === 'partly' ? 'M14 28h16' : 'M13 31q9 -9 18 0'} />
        </Svg>
      );
    case 'thumbs':
      return (
        <Svg box={24}>
          <path d={THUMB} fill="currentColor" transform={`rotate(${THUMB_TURN[level]} 12 12)`} />
        </Svg>
      );
    case 'shapes':
      return (
        <Svg box={40}>
          {level === 'right' ? (
            <circle cx="20" cy="20" r="15" className="mark-stroke" />
          ) : level === 'partly' ? (
            <path d="M20 5L36 34H4z" className="mark-stroke" />
          ) : (
            <path d="M7 7l26 26M33 7L7 33" className="mark-stroke" />
          )}
        </Svg>
      );
    case 'edge':
      return (
        <Svg box={20}>
          {level === 'right' ? (
            <path d="M4 10.5l4 4 8-9" className="mark-stroke" />
          ) : level === 'partly' ? (
            <>
              <circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M10 2.5a7.5 7.5 0 0 0 0 15z" fill="currentColor" />
            </>
          ) : (
            <path d="M5 5l10 10M15 5L5 15" className="mark-stroke" />
          )}
        </Svg>
      );
    default:
      return null;
  }
}

/**
 * A right / partly right / wrong mark (issue #10). Text plus decoration: the plain word always
 * reaches screen readers first; the style's own words follow when they differ. No role: the
 * caller's status region announces it.
 */
export function AnswerMark({
  level,
  size = 'large',
  markStyle,
  unanswered = false,
}: {
  level: MarkLevel;
  size?: 'large' | 'small';
  /** Defaults to the learner's chosen style. */
  markStyle?: MarkStyle;
  /** An unanswered results item: the wrong mark with "Not answered". */
  unanswered?: boolean;
}) {
  const chosen = useMarks().style;
  const style = markStyle ?? chosen;
  const plain = PLAIN_WORDS[level];

  if (size === 'small') {
    // Table cells: the style's icon at text size and the plain word, never friendly words.
    return (
      <span className={`mark-small mark-small-${style} mark-${level}`}>
        {style !== 'stamp' && icon(style, level)}
        {plain}
      </span>
    );
  }

  const shown = level === 'wrong' && unanswered ? 'Not answered' : (STYLE_WORDS[style]?.[level] ?? plain);
  return (
    <span className={`mark mark-${style} mark-${level} mark-pop`}>
      {shown !== plain && <span className="visually-hidden">{`${plain}. `}</span>}
      {icon(style, level)}
      <span className="mark-word">{shown}</span>
    </span>
  );
}
