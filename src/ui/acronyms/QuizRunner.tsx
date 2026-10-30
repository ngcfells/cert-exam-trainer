import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { AcronymEntry } from '../../acronyms/list';
import { buildChoices, isCorrect, type Direction } from '../../acronyms/quiz';
import { mulberry32 } from '../../exam/rng';
import { formatTime } from '../exam/formatTime';
import { back, front, type AcronymGrade } from './FlashcardRunner';

export function QuizRunner({
  deck,
  entries,
  show,
  answer,
  minutes,
  seed,
  now = Date.now,
  onFinish,
}: {
  deck: AcronymEntry[];
  /** The whole list, for distractors. */
  entries: AcronymEntry[];
  show: Direction;
  answer: 'type' | 'choose';
  /** 0 = untimed. */
  minutes: number;
  seed: number;
  now?: () => number;
  onFinish: (grades: AcronymGrade[], timedOut: boolean) => void;
}) {
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState('');
  const [graded, setGraded] = useState<Record<string, AcronymGrade>>({});
  const [deadline] = useState(() => (minutes > 0 ? now() + minutes * 60_000 : undefined));
  const [remaining, setRemaining] = useState(minutes * 60_000);
  const [announcement, setAnnouncement] = useState('');
  const choices = useMemo(() => {
    const rng = mulberry32(seed);
    return deck.map((a) => buildChoices(a, entries, show, rng));
  }, [deck, entries, show, seed]);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const [focusStatus, setFocusStatus] = useState(false);
  const finished = useRef(false);
  const gradedRef = useRef(graded);
  gradedRef.current = graded;
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;
  const announcedMinute = useRef(false);

  const finish = useCallback(
    (timedOut: boolean) => {
      if (finished.current) return;
      finished.current = true;
      const g = gradedRef.current;
      onFinishRef.current(deck.flatMap((a) => g[a.term] ?? []), timedOut);
    },
    [deck],
  );

  useEffect(() => {
    if (deadline === undefined) return;
    const id = setInterval(() => {
      const left = deadline - now();
      setRemaining(left);
      if (left <= 0) finish(true);
      else if (left <= 60_000 && !announcedMinute.current) {
        announcedMinute.current = true;
        setAnnouncement('1 minute remaining');
      }
    }, 1000);
    return () => clearInterval(id);
  }, [deadline, now, finish]);

  useEffect(() => {
    headingRef.current?.focus();
    setInput('');
  }, [index]);
  useEffect(() => {
    if (focusStatus) statusRef.current?.focus();
    setFocusStatus(false);
  }, [focusStatus]);

  const card = deck[index];
  const last = index === deck.length - 1;
  const result = graded[card.term];
  const correctText = back(card, show);

  function check(e?: FormEvent) {
    e?.preventDefault();
    if (result || !input.trim()) return;
    const correct = answer === 'choose' ? input === correctText : isCorrect(card, show, input);
    setGraded((g) => ({ ...g, [card.term]: { term: card.term, correct, given: input } }));
    setFocusStatus(true);
  }

  const prompt = show === 'term' ? `What does ${card.term} stand for?` : `Which acronym stands for ${card.expansion}?`;

  return (
    <div className="exam study">
      <span className="visually-hidden" aria-live="polite">
        {announcement}
      </span>
      <header className="exam-topbar">
        <span>{`Card ${index + 1} of ${deck.length}`}</span>
        {deadline !== undefined && (
          <span className="timer">
            <span aria-label="Time left" role="timer">
              {formatTime(remaining)}
            </span>
          </span>
        )}
      </header>
      <section className="exam-body" aria-labelledby="quiz-h">
        <h2 id="quiz-h" ref={headingRef} tabIndex={-1}>{`Card ${index + 1} of ${deck.length}`}</h2>
        <div className="acronym-card">
          <p className="acronym-term">{front(card, show)}</p>
          <form onSubmit={check}>
            {answer === 'type' ? (
              <label className="quiz-answer">
                Your answer
                <input
                  value={result ? (result.given ?? '') : input}
                  readOnly={!!result}
                  autoComplete="off"
                  spellCheck={false}
                  aria-describedby="quiz-prompt"
                  onChange={(e) => setInput(e.target.value)}
                />
              </label>
            ) : (
              <fieldset className="quiz-choices" disabled={!!result}>
                <legend>{prompt}</legend>
                {choices[index].map((c) => (
                  <label key={c}>
                    <input type="radio" name={`choice-${index}`} checked={(result ? result.given : input) === c} onChange={() => setInput(c)} />
                    {c}
                  </label>
                ))}
              </fieldset>
            )}
            {answer === 'type' && <p id="quiz-prompt" className="visually-hidden">{prompt}</p>}
            {!result && (
              <button type="submit" className="primary" disabled={!input.trim()}>
                Check
              </button>
            )}
          </form>
        </div>
        <p role="status" className="study-status" ref={statusRef} tabIndex={-1}>
          {result ? (result.correct ? 'Correct' : `Not quite: ${correctText}`) : ''}
        </p>
        {result && !result.correct && answer === 'type' && (
          <button
            type="button"
            onClick={() => {
              setGraded((g) => ({ ...g, [card.term]: { ...result, correct: true } }));
              setFocusStatus(true);
            }}
          >
            Count as correct
          </button>
        )}
      </section>
      <nav className="exam-nav" aria-label="Quiz navigation">
        {last ? (
          <button type="button" className="primary" onClick={() => finish(false)}>
            Finish
          </button>
        ) : (
          <>
            <button type="button" className={result ? 'primary' : undefined} onClick={() => setIndex(index + 1)}>
              Next
            </button>
            <button type="button" onClick={() => finish(false)}>
              Finish now
            </button>
          </>
        )}
      </nav>
    </div>
  );
}
