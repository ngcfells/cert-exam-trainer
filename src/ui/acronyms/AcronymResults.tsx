import type { AcronymEntry } from '../../acronyms/list';
import { Table, useFocusHeading } from '../kit';
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
  const headingRef = useFocusHeading();
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
        <Table
          caption={quiz ? 'Missed' : 'Not known yet'}
          head={quiz ? ['Acronym', 'Meaning', 'Your answer'] : ['Acronym', 'Meaning']}
          rows={missed.map((g) => [g.term, g.term, byTerm.get(g.term)?.expansion, ...(quiz ? [g.given] : [])])}
        />
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
