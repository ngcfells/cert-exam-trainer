import { AREA_TITLES, LESSON_AREAS, type Lesson } from '../../domain/lesson';
import type { ExamMeta } from '../../domain/types';
import { lessonState, type LessonState, type LessonStatus } from '../../study/lessonStatus';
import { useFocusHeading } from '../kit';

const STATE_LABELS: Record<LessonState, string> = { 'not-started': 'Not started', 'in-progress': 'In progress', done: 'Done' };

export function LessonList({ meta, lessons, status, onOpen, onExit }: { meta: ExamMeta; lessons: Lesson[]; status: LessonStatus; onOpen: (id: string) => void; onExit: () => void }) {
  const headingRef = useFocusHeading();
  const areas = LESSON_AREAS.filter((a) => lessons.some((l) => l.area === a));
  return (
    <section className="learn" aria-labelledby="learn-h">
      <h2 id="learn-h" ref={headingRef} tabIndex={-1}>{`Learn: ${meta.name} (${meta.code})`}</h2>
      <p>Each lesson explains one idea in plain English, works an example, shows the usual exam trap, then checks your understanding. Open them in any order.</p>
      {areas.length === 0 && <p>No lessons for this exam yet.</p>}
      {areas.map((a) => (
        <section key={a} aria-labelledby={`learn-area-${a}`}>
          <h3 id={`learn-area-${a}`}>{`${a}. ${AREA_TITLES[a]}`}</h3>
          <ul className="lesson-list">
            {lessons
              .filter((l) => l.area === a)
              .map((l) => {
                const state = lessonState(status[l.id]);
                return (
                  <li key={l.id}>
                    <button type="button" onClick={() => onOpen(l.id)}>{l.title}</button>
                    <span className={`lesson-state lesson-${state}`}>{STATE_LABELS[state]}</span>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
      <p>
        <button type="button" onClick={onExit}>Back to home</button>
      </p>
    </section>
  );
}
