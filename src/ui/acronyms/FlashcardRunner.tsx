import { useState } from 'react';
import type { AcronymEntry } from '../../acronyms/list';
import type { Direction } from '../../acronyms/quiz';
import { AcronymFlip, knownStatus, RunnerFrame } from '../kit';
import { useLeaveGuard } from '../nav';

export interface AcronymGrade {
  term: string;
  correct: boolean;
  /** What the user typed or chose (quiz only). */
  given?: string;
}

export const front = (a: AcronymEntry, show: Direction) => (show === 'term' ? a.term : a.expansion);
export const back = (a: AcronymEntry, show: Direction) => (show === 'term' ? a.expansion : a.term);

export function FlashcardRunner({ deck, show, onFinish }: { deck: AcronymEntry[]; show: Direction; onFinish: (grades: AcronymGrade[], timedOut: boolean) => void }) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [grades, setGrades] = useState<Record<string, boolean>>({});
  const [isFinished, setIsFinished] = useState(false);
  useLeaveGuard(!isFinished && Object.keys(grades).length > 0);
  const card = deck[index];
  const finish = (g: Record<string, boolean>) => {
    setIsFinished(true);
    onFinish(deck.filter((a) => a.term in g).map((a) => ({ term: a.term, correct: g[a.term] })), false);
  };

  function grade(knew: boolean) {
    const g = { ...grades, [card.term]: knew };
    setGrades(g);
    if (index === deck.length - 1) finish(g);
    else setIndex(index + 1);
  }

  return (
    <RunnerFrame label="Card" index={index} total={deck.length} navLabel="Flashcard navigation" onIndex={setIndex} onFinish={() => finish(grades)}>
      <AcronymFlip
        front={front(card, show)}
        back={back(card, show)}
        backClass="acronym-back"
        revealed={revealed.has(index)}
        onReveal={() => setRevealed((r) => new Set(r).add(index))}
        onGrade={grade}
      />
      <p role="status" className="study-status">
        {knownStatus(grades[card.term])}
      </p>
    </RunnerFrame>
  );
}
