import { useEffect, useMemo, useState } from 'react';
import { getBundledQuestions } from '../../banks';
import { getLessons } from '../../banks/lessons';
import { itemFor, type AssembledExam } from '../../exam/assemble';
import { mulberry32, newSeed } from '../../exam/rng';
import { scoreExam } from '../../exam/scoring';
import type { Repo } from '../../storage';
import { checkFraction, loadLessonStatus, markOpened, recordCheck } from '../../study/lessonStatus';
import { onlySeen } from '../../study/session';
import { ResultsScreen } from '../exam/ResultsScreen';
import { finishAttempt, type Finished } from '../exam/saveAttempt';
import { Loading, metaFor, useLoad } from '../kit';
import { useNavUp } from '../nav';
import { LoadError } from '../study/LoadError';
import { StudyRunner } from '../study/StudyRunner';
import { LessonList } from './LessonList';
import { LessonView } from './LessonView';
import './learn.css';

type View =
  | { kind: 'list' }
  | { kind: 'lesson'; id: string }
  | { kind: 'check'; id: string; startedAt: Date; seed: number }
  | { kind: 'result'; id: string; done: Finished; fraction: number };

/** A lesson's check items, in lesson order, from the approved bundled questions; `seed` shuffles MCQ options, a new one per check. */
export function checkExam(examCode: string, checkIds: string[], seed: number): AssembledExam {
  const byId = new Map(getBundledQuestions(examCode).map((q) => [q.id, q]));
  const rng = mulberry32(seed);
  const items = checkIds.flatMap((id) => {
    const q = byId.get(id);
    return q ? [itemFor(q, rng)] : [];
  });
  return onlySeen({ exam: examCode, seed, items, mcqCount: 0, pbqWeightSum: 0 }, items.map((i) => i.question.id));
}

export function LearnFlow({ repo, examCode, lessonId }: { repo: Repo; examCode: string; lessonId?: string }) {
  const meta = metaFor(examCode);
  const lessons = useMemo(() => getLessons(examCode), [examCode]);
  const [view, setView] = useState<View>(lessonId ? { kind: 'lesson', id: lessonId } : { kind: 'list' });
  const [status, reload] = useLoad(() => loadLessonStatus(repo, examCode), [repo, examCode]);
  const lesson = view.kind === 'list' ? undefined : lessons.find((l) => l.id === view.id);
  const seed = view.kind === 'check' ? view.seed : 0;
  const exam = useMemo(() => (lesson ? checkExam(examCode, lesson.checkIds, seed) : undefined), [examCode, lesson, seed]);

  const openId = view.kind === 'lesson' && lesson ? lesson.id : undefined;
  useEffect(() => {
    if (openId) void markOpened(repo, examCode, openId).catch(() => {});
  }, [repo, examCode, openId]);

  const toList = () => {
    setView({ kind: 'list' });
    void reload();
  };
  // Back climbs one level: check or result → lesson → list → exam page.
  const inCheck = (view.kind === 'check' || view.kind === 'result') && !!lesson;
  useNavUp(view.kind === 'list' ? null : inCheck ? '← Back to lesson' : '← Back to lessons', () =>
    inCheck && lesson ? setView({ kind: 'lesson', id: lesson.id }) : toList(),
  );

  if (view.kind === 'list') {
    if (status === undefined) return <Loading />;
    if (status === null) return <LoadError />;
    return <LessonList meta={meta} lessons={lessons} status={status} onOpen={(id) => setView({ kind: 'lesson', id })} />;
  }
  if (!lesson || !exam) {
    return (
      <section className="learn">
        <p>Lesson not found.</p>
      </section>
    );
  }
  if (view.kind === 'result') {
    return <ResultsScreen meta={meta} {...view.done} mode="lesson" lessonFraction={view.fraction} />;
  }
  if (view.kind === 'check') {
    const startedAt = view.startedAt;
    return (
      <StudyRunner
        mode="lesson"
        items={exam.items.map((item) => ({ kind: 'question', item }))}
        feedback="instant"
        startedAt={startedAt}
        onFinish={(o) => {
          const fraction = checkFraction(scoreExam(exam, o.responses, meta), lesson.checkIds);
          void finishAttempt(repo, meta, onlySeen(exam, o.seen), startedAt, { ...o, autoSubmitted: false, mode: 'lesson' }, o.checked)
            .then(async (done) => {
              let saveError = done.saveError;
              try {
                await recordCheck(repo, examCode, lesson.id, fraction);
              } catch {
                saveError = [saveError, 'Lesson progress could not be saved.'].filter(Boolean).join(' ');
              }
              setView({ kind: 'result', id: lesson.id, done: { ...done, saveError }, fraction });
            });
        }}
      />
    );
  }
  return <LessonView lesson={lesson} checkCount={exam.items.length} onCheck={() => setView({ kind: 'check', id: lesson.id, startedAt: new Date(), seed: newSeed() })} />;
}
