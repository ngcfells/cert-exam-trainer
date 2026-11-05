import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { AcronymEntry } from '../../acronyms/list';
import { buildChoices, isCorrect, type Direction } from '../../acronyms/quiz';
import { mulberry32 } from '../../exam/rng';
import { RunnerFrame, useCountdown, useFocusLater } from '../kit';
import { useLeaveGuard } from '../nav';
import { AnswerMark } from '../marks/AnswerMark';
import { playMark } from '../marks/sound';
import { back, backText, front, type AcronymGrade } from './FlashcardRunner';

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
  const [isFinished, setIsFinished] = useState(false);
  // A timed quiz asks from the start; an untimed one once a card is graded.
  useLeaveGuard(!isFinished && (minutes > 0 || Object.keys(graded).length > 0));
  const [deadline] = useState(() => (minutes > 0 ? now() + minutes * 60_000 : undefined));
  const choices = useMemo(() => {
    const rng = mulberry32(seed);
    return deck.map((a) => buildChoices(a, entries, show, rng));
  }, [deck, entries, show, seed]);
  const [statusRef, focusStatus] = useFocusLater<HTMLDivElement>();
  const finished = useRef(false);
  const gradedRef = useRef(graded);
  gradedRef.current = graded;
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  const finish = useCallback(
    (timedOut: boolean) => {
      if (finished.current) return;
      finished.current = true;
      setIsFinished(true);
      onFinishRef.current(deck.flatMap((a) => gradedRef.current[a.term] ?? []), timedOut);
    },
    [deck],
  );
  const { remaining, announcement } = useCountdown(deadline, now, () => finish(true), true);
  useEffect(() => setInput(''), [index]);

  const card = deck[index];
  const result = graded[card.term];
  const correctText = back(card, show);
  const prompt = show === 'term' ? `What does ${card.term} stand for?` : `Which acronym stands for ${card.expansion}?`;
  const grade = (g: AcronymGrade) => {
    setGraded((all) => ({ ...all, [card.term]: g }));
    playMark(g.correct ? 'right' : 'wrong');
    focusStatus();
  };

  function check(e: FormEvent) {
    e.preventDefault();
    if (result || !input.trim()) return;
    grade({ term: card.term, correct: answer === 'choose' ? input === correctText : isCorrect(card, show, input), given: input });
  }

  return (
    <RunnerFrame
      label="Card"
      index={index}
      total={deck.length}
      remaining={deadline === undefined ? undefined : remaining}
      announcer={<span className="visually-hidden" aria-live="polite">{announcement}</span>}
      navLabel="Quiz navigation"
      previous={false}
      nextPrimary={!!result}
      onIndex={setIndex}
      onFinish={() => finish(false)}
    >
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
      <div role="status" className="study-status" ref={statusRef} tabIndex={-1}>
        {result && <AnswerMark key={`${card.term}:${result.correct}`} level={result.correct ? 'right' : 'wrong'} />}
        {result && !result.correct && <p className="quiz-answer-text">{`The answer is: ${backText(card, show)}`}</p>}
      </div>
      {result && !result.correct && answer === 'type' && (
        <button type="button" onClick={() => grade({ ...result, correct: true })}>
          Count as correct
        </button>
      )}
    </RunnerFrame>
  );
}
