import { lessonSchema, type Lesson } from '../domain/lesson';
import { dataPlusLessonFixture } from './dataplus/lessonFixture';

/** Validates bundled lessons on load, naming the lesson that fails. */
function parseLessons(raw: unknown[]): Lesson[] {
  return raw.map((x, i) => {
    const r = lessonSchema.safeParse(x);
    if (r.success) return r.data;
    const id = (x as { id?: unknown })?.id ?? `#${i + 1}`;
    const issue = r.error.issues[0];
    throw new Error(`lesson ${String(id)} is invalid: ${issue.path.join('.')}: ${issue.message}`);
  });
}

// The shipped lessons: one JSON file per area or domain in each bank's lessons folder, each a lesson array, in file order.
const files = import.meta.glob<unknown[]>('./*/lessons/*.json', { eager: true, import: 'default' });

export const shippedLessons: Lesson[] = parseLessons(Object.keys(files).sort().flatMap((f) => files[f]));

// Unit tests and the e2e build use a small fixed lesson set that links fixture questions.
const lessons = import.meta.env.VITE_BANK === 'fixture' ? parseLessons(dataPlusLessonFixture) : shippedLessons;

export function getLessons(exam: string): Lesson[] {
  return lessons.filter((l) => l.exam === exam);
}
