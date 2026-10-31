import { useState } from 'react';
import { mergeAcronyms, type AcronymEntry } from '../../acronyms/list';
import { assembleDeck, MIN_CHOICE_ENTRIES } from '../../acronyms/quiz';
import { loadAcronyms, loadUserAcronyms, unexpandedUserTerms } from '../../acronyms/userList';
import { newSeed } from '../../exam/rng';
import type { Repo } from '../../storage';
import { applyReviews } from '../../study/srs';
import { acronymReview } from '../exam/saveAttempt';
import { Loading, metaFor, useLoad } from '../kit';
import { LoadError } from '../study/LoadError';
import '../study/study.css';
import { AcronymResults } from './AcronymResults';
import { AcronymSetup, DEFAULT_DECK, type DeckChoices } from './AcronymSetup';
import { FlashcardRunner, type AcronymGrade } from './FlashcardRunner';
import { MyAcronyms } from './MyAcronyms';
import { QuizRunner } from './QuizRunner';

type Stage =
  | { stage: 'setup' }
  | { stage: 'running'; deck: AcronymEntry[]; seed: number }
  | { stage: 'results'; deck: AcronymEntry[]; grades: AcronymGrade[]; timedOut: boolean; saveError: string | null };

export function AcronymFlow({ repo, examCode, seed, onExit }: { repo: Repo; examCode: string; seed?: number; onExit: () => void }) {
  const meta = metaFor(examCode);
  const [s, setS] = useState<Stage>({ stage: 'setup' });
  const [choices, setChoices] = useState<DeckChoices>(DEFAULT_DECK);
  const [data, reload] = useLoad(async () => {
    const [entries, srs, mine, userQuestions] = await Promise.all([
      loadAcronyms(repo, examCode),
      repo.listRecords('srs'),
      loadUserAcronyms(repo, examCode),
      repo.getUserQuestions(examCode),
    ]);
    return { entries, srs, mine, userQuestions };
  }, [repo, examCode]);

  async function finish(deck: AcronymEntry[], grades: AcronymGrade[], timedOut: boolean) {
    let saveError: string | null = null;
    try {
      if (grades.length) await applyReviews(repo, examCode, grades.map((g) => acronymReview(g.term, g.correct)), new Date());
    } catch {
      saveError = 'Review scheduling could not be saved.';
    }
    setS({ stage: 'results', deck, grades, timedOut, saveError });
  }

  if (data === undefined) return <Loading />;
  if (data === null) return <LoadError onExit={onExit} />;
  const { entries, srs, mine, userQuestions } = data;
  const onFinish = (deck: AcronymEntry[]) => (g: AcronymGrade[], t: boolean) => void finish(deck, g, t);

  switch (s.stage) {
    case 'setup': {
      // Suggestions check every list, so a term hidden by the source filter is not offered again.
      const suggestions = unexpandedUserTerms(userQuestions, mergeAcronyms(meta.acronyms, mine, 'both'));
      const start = () => {
        const deckSeed = seed ?? newSeed();
        setS({ stage: 'running', seed: deckSeed, deck: assembleDeck({ entries, srs, exam: examCode, now: new Date(), seed: deckSeed, scope: choices.scope, count: choices.count }) });
      };
      return (
        <>
          <AcronymSetup meta={meta} entries={entries} srs={srs} value={choices} onChange={setChoices} onCancel={onExit} onStart={start} />
          <MyAcronyms repo={repo} examCode={examCode} mine={mine} suggestions={suggestions} onChanged={reload} />
        </>
      );
    }
    case 'running':
      return choices.mode === 'flashcards' ? (
        <FlashcardRunner deck={s.deck} show={choices.show} onFinish={onFinish(s.deck)} />
      ) : (
        <QuizRunner
          deck={s.deck}
          entries={entries}
          show={choices.show}
          answer={entries.length >= MIN_CHOICE_ENTRIES ? choices.answer : 'type'}
          minutes={choices.minutes}
          seed={s.seed}
          onFinish={onFinish(s.deck)}
        />
      );
    case 'results':
      return (
        <AcronymResults
          deck={s.deck}
          grades={s.grades}
          mode={choices.mode}
          timedOut={s.timedOut}
          saveError={s.saveError}
          onAgain={() => {
            setS({ stage: 'setup' });
            void reload(true);
          }}
          onExit={onExit}
        />
      );
  }
}
