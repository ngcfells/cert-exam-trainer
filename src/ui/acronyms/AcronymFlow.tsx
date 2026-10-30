import { useCallback, useEffect, useState } from 'react';
import { mergeAcronyms, type AcronymEntry } from '../../acronyms/list';
import { assembleDeck, MIN_CHOICE_ENTRIES } from '../../acronyms/quiz';
import { loadAcronyms, loadUserAcronyms, unexpandedUserTerms } from '../../acronyms/userList';
import { listExams } from '../../banks';
import type { Question } from '../../domain/types';
import { newSeed } from '../../exam/rng';
import type { Repo } from '../../storage';
import { applyReviews } from '../../study/srs';
import { LoadError } from '../study/LoadError';
import '../study/study.css';
import { AcronymResults } from './AcronymResults';
import { AcronymSetup, DEFAULT_DECK, type DeckChoices } from './AcronymSetup';
import { FlashcardRunner, type AcronymGrade } from './FlashcardRunner';
import { MyAcronyms } from './MyAcronyms';
import { QuizRunner } from './QuizRunner';

interface Loaded {
  entries: AcronymEntry[];
  srs: unknown[];
  mine: AcronymEntry[];
  userQuestions: Question[];
}

type Stage =
  | { stage: 'loading' }
  | { stage: 'error' }
  | { stage: 'setup'; data: Loaded }
  | { stage: 'running'; data: Loaded; deck: AcronymEntry[]; seed: number }
  | { stage: 'results'; deck: AcronymEntry[]; grades: AcronymGrade[]; timedOut: boolean; saveError: string | null };

/** SM-2 quality for a card (the same as cram). */
const KNEW = 4;
const DID_NOT_KNOW = 1;

export function AcronymFlow({ repo, examCode, seed, onExit }: { repo: Repo; examCode: string; seed?: number; onExit: () => void }) {
  const meta = listExams().find((m) => m.code === examCode)!;
  const [s, setS] = useState<Stage>({ stage: 'loading' });
  const [choices, setChoices] = useState<DeckChoices>(DEFAULT_DECK);

  const load = useCallback(async () => {
    try {
      const [entries, srs, mine, userQuestions] = await Promise.all([
        loadAcronyms(repo, examCode),
        repo.listRecords('srs'),
        loadUserAcronyms(repo, examCode),
        repo.getUserQuestions(examCode),
      ]);
      setS({ stage: 'setup', data: { entries, srs, mine, userQuestions } });
    } catch {
      setS({ stage: 'error' });
    }
  }, [repo, examCode]);

  useEffect(() => {
    void load();
  }, [load]);

  async function finish(deck: AcronymEntry[], grades: AcronymGrade[], timedOut: boolean) {
    let saveError: string | null = null;
    try {
      const reviews = grades.map((g) => ({ kind: 'acronym' as const, itemId: g.term, quality: g.correct ? KNEW : DID_NOT_KNOW }));
      if (reviews.length) await applyReviews(repo, examCode, reviews, new Date());
    } catch {
      saveError = 'Review scheduling could not be saved.';
    }
    setS({ stage: 'results', deck, grades, timedOut, saveError });
  }

  switch (s.stage) {
    case 'loading':
      return <p>Loading…</p>;
    case 'error':
      return <LoadError onExit={onExit} />;
    case 'setup': {
      const { entries, srs, mine, userQuestions } = s.data;
      // Suggestions check every list, so a term hidden by the source filter is not offered again.
      const suggestions = unexpandedUserTerms(userQuestions, mergeAcronyms(meta.acronyms, mine, 'both'));
      return (
        <>
          <AcronymSetup
            meta={meta}
            entries={entries}
            srs={srs}
            value={choices}
            onChange={setChoices}
            onCancel={onExit}
            onStart={() => {
              const deckSeed = seed ?? newSeed();
              const deck = assembleDeck({ entries, srs, exam: examCode, now: new Date(), seed: deckSeed, scope: choices.scope, count: choices.count });
              setS({ stage: 'running', data: s.data, deck, seed: deckSeed });
            }}
          />
          <MyAcronyms repo={repo} examCode={examCode} mine={mine} suggestions={suggestions} onChanged={load} />
        </>
      );
    }
    case 'running':
      return choices.mode === 'flashcards' ? (
        <FlashcardRunner deck={s.deck} show={choices.show} onFinish={(g, t) => void finish(s.deck, g, t)} />
      ) : (
        <QuizRunner
          deck={s.deck}
          entries={s.data.entries}
          show={choices.show}
          answer={s.data.entries.length >= MIN_CHOICE_ENTRIES ? choices.answer : 'type'}
          minutes={choices.minutes}
          seed={s.seed}
          onFinish={(g, t) => void finish(s.deck, g, t)}
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
            setS({ stage: 'loading' });
            void load();
          }}
          onExit={onExit}
        />
      );
  }
}
