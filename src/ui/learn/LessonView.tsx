import type { Lesson } from '../../domain/lesson';
import { plural, Table, useFocusHeading } from '../kit';
import { Formula } from './Formula';

export function LessonView({ lesson, checkCount, onCheck }: { lesson: Lesson; checkCount: number; onCheck: () => void }) {
  const headingRef = useFocusHeading([lesson.id]);
  const { formula, rule, example, trap } = lesson;
  return (
    <article className="learn lesson" aria-labelledby="lesson-h">
      <h2 id="lesson-h" ref={headingRef} tabIndex={-1}>{lesson.title}</h2>

      <h3>What it means</h3>
      {lesson.meaning.map((p, i) => <p key={i}>{p}</p>)}

      {formula ? (
        <>
          <h3>The formula</h3>
          <Formula text={formula.text} spoken={formula.spoken} />
          <dl className="symbols">
            {formula.symbols.map((s) => (
              <div key={s.symbol}>
                <dt>{s.symbol}</dt>
                <dd>{s.meaning}</dd>
              </div>
            ))}
          </dl>
        </>
      ) : (
        <>
          <h3>The rule</h3>
          {rule!.map((p, i) => <p key={i}>{p}</p>)}
        </>
      )}

      <h3>Worked example</h3>
      <p>{example.intro}</p>
      {example.table && (
        <div className="table-scroll">
          <Table caption={example.table.caption} head={example.table.head} rows={example.table.rows.map((r, i) => [String(i), ...r] as [string, ...string[]])} />
        </div>
      )}
      <ol>
        {example.steps.map((s, i) => <li key={i}>{s}</li>)}
      </ol>

      <h3>Exam trap</h3>
      <p><strong>{trap.wrong}</strong></p>
      <p>{trap.why}</p>

      <h3>Check your understanding</h3>
      {checkCount > 0 ? (
        <>
          <p>{`Answer ${checkCount === 1 ? 'the question' : `all ${checkCount}`} with instant feedback. A score of 80% or more marks the lesson done.`}</p>
          <button type="button" className="primary" onClick={onCheck}>{`Start the check (${plural(checkCount, 'question')})`}</button>
        </>
      ) : (
        <p>The check questions for this lesson are not available.</p>
      )}
    </article>
  );
}
