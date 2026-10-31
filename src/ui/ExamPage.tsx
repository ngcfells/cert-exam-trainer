import { useEffect, useState } from 'react';
import { getBundledQuestions, listExams } from '../banks';
import { getLessons } from '../banks/lessons';
import type { Repo } from '../storage';
import { useFocusHeading } from './kit';
import { questions } from './plural';
import type { ExamScreen } from './screens';
import { SourceToggle } from './SourceToggle';

/** One exam's page: its question counts, its source choice and every study tool. */
export function ExamPage({ repo, examCode, onNavigate }: { repo: Repo; examCode: string; onNavigate: (s: ExamScreen) => void }) {
  const headingRef = useFocusHeading();
  const [mine, setMine] = useState<number | null>(null);
  const meta = listExams().find((m) => m.code === examCode);

  useEffect(() => {
    void repo.getUserQuestions(examCode).then((qs) => setMine(qs.length));
  }, [repo, examCode]);

  if (!meta) return <p>Unknown exam.</p>;
  const go = (name: ExamScreen['name']) => () => onNavigate({ name, exam: examCode } as ExamScreen);
  const e = examCode;
  return (
    <section className="exam-page" aria-labelledby="exam-h">
      <h2 id="exam-h" ref={headingRef} tabIndex={-1}>{`${meta.name} (${meta.code})`}</h2>
      <p>{`Stock: ${questions(getBundledQuestions(e).length)} · Custom: ${questions(mine ?? 0)}`}</p>
      <SourceToggle repo={repo} examCode={e} />
      <div className="home-actions">
        <button type="button" className="primary" onClick={go('mock')}>{`Start mock exam: ${e}`}</button>
        <button type="button" onClick={go('practice')}>{`Practice: ${e}`}</button>
        <button type="button" onClick={go('cram')}>{`Cram: ${e}`}</button>
        <button type="button" onClick={go('progress')}>{`Progress: ${e}`}</button>
        <button type="button" onClick={go('acronyms')}>{`Acronyms: ${e}`}</button>
        {getLessons(e).length > 0 && <button type="button" onClick={go('learn')}>{`Learn: ${e}`}</button>}
        <button type="button" onClick={go('questions')}>{`My questions: ${e}`}</button>
        {import.meta.env.DEV && <button type="button" onClick={go('review')}>{`Review bank (dev): ${e}`}</button>}
      </div>
    </section>
  );
}
