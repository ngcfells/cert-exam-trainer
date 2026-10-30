import { useEffect, useRef, useState } from 'react';
import type { AcronymEntry } from '../../acronyms/list';
import type { Direction } from '../../acronyms/quiz';

export interface AcronymGrade {
  term: string;
  correct: boolean;
  /** What the user typed or chose (quiz only). */
  given?: string;
}

export const front = (a: AcronymEntry, show: Direction) => (show === 'term' ? a.term : a.expansion);
export const back = (a: AcronymEntry, show: Direction) => (show === 'term' ? a.expansion : a.term);

export function FlashcardRunner({
  deck,
  show,
  onFinish,
}: {
  deck: AcronymEntry[];
  show: Direction;
  onFinish: (grades: AcronymGrade[], timedOut: boolean) => void;
}) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [grades, setGrades] = useState<Record<string, boolean>>({});
  const headingRef = useRef<HTMLHeadingElement>(null);
  const knewRef = useRef<HTMLButtonElement>(null);
  const [focusKnew, setFocusKnew] = useState(false);

  useEffect(() => headingRef.current?.focus(), [index]);
  useEffect(() => {
    if (focusKnew) knewRef.current?.focus();
    setFocusKnew(false);
  }, [focusKnew]);

  const card = deck[index];
  const last = index === deck.length - 1;
  const finish = (g: Record<string, boolean>) => onFinish(deck.filter((a) => a.term in g).map((a) => ({ term: a.term, correct: g[a.term] })), false);

  function grade(knew: boolean) {
    const g = { ...grades, [card.term]: knew };
    setGrades(g);
    if (last) finish(g);
    else setIndex(index + 1);
  }

  return (
    <div className="exam study">
      <section className="exam-body" aria-labelledby="flash-h">
        <h2 id="flash-h" ref={headingRef} tabIndex={-1}>{`Card ${index + 1} of ${deck.length}`}</h2>
        <div className="acronym-card">
          <p className="acronym-term">{front(card, show)}</p>
          {revealed.has(index) ? (
            <>
              <p className="acronym-back">{back(card, show)}</p>
              <button type="button" ref={knewRef} onClick={() => grade(true)}>
                I knew it
              </button>{' '}
              <button type="button" onClick={() => grade(false)}>
                I didn&apos;t know it
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setRevealed((r) => new Set(r).add(index));
                setFocusKnew(true);
              }}
            >
              Show answer
            </button>
          )}
        </div>
        <p role="status" className="study-status">
          {card.term in grades ? (grades[card.term] ? 'Marked as known' : 'Marked as not known') : ''}
        </p>
      </section>
      <nav className="exam-nav" aria-label="Flashcard navigation">
        <button type="button" disabled={index === 0} onClick={() => setIndex(index - 1)}>
          Previous
        </button>
        {!last && (
          <button type="button" onClick={() => setIndex(index + 1)}>
            Next
          </button>
        )}
        <button type="button" onClick={() => finish(grades)}>
          {last ? 'Finish' : 'Finish now'}
        </button>
      </nav>
    </div>
  );
}
