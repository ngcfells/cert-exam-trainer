import { useEffect, useRef } from 'react';
import type { AcronymEntry } from '../../acronyms/list';
import type { AcronymGrade } from './FlashcardRunner';

export function AcronymResults({
  deck,
  grades,
  mode,
  timedOut,
  saveError,
  onAgain,
  onExit,
}: {
  deck: AcronymEntry[];
  grades: AcronymGrade[];
  mode: 'flashcards' | 'quiz';
  timedOut: boolean;
  saveError: string | null;
  onAgain: () => void;
  onExit: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);
  const byTerm = new Map(deck.map((a) => [a.term, a]));
  const right = grades.filter((g) => g.correct).length;
  const missed = grades.filter((g) => !g.correct);
  const quiz = mode === 'quiz';

  return (
    <section className="acronym-results" aria-labelledby="acr-res-h">
      <h2 id="acr-res-h" ref={headingRef} tabIndex={-1}>
        Results
      </h2>
      {timedOut && <p>Time ran out.</p>}
      {saveError && <p role="alert">{saveError}</p>}
      <p>{grades.length === 0 ? 'No cards answered.' : `${right} of ${grades.length} ${quiz ? 'correct' : 'known'}`}</p>
      {missed.length > 0 && (
        <table>
          <caption>{quiz ? 'Missed' : 'Not known yet'}</caption>
          <thead>
            <tr>
              <th scope="col">Acronym</th>
              <th scope="col">Meaning</th>
              {quiz && <th scope="col">Your answer</th>}
            </tr>
          </thead>
          <tbody>
            {missed.map((g) => (
              <tr key={g.term}>
                <th scope="row">{g.term}</th>
                <td>{byTerm.get(g.term)?.expansion}</td>
                {quiz && <td>{g.given}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <button type="button" className="primary" onClick={onAgain}>
        Study again
      </button>{' '}
      <button type="button" onClick={onExit}>
        Back to home
      </button>
    </section>
  );
}
