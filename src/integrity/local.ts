import { getBundledQuestions, listExams } from '../banks';
import { getLessons } from '../banks/lessons';
import { hashExam, type ExamHashes } from './hashes';

/** Hashes of the stock content this copy of the app holds, by exam code. */
export function localHashes(): Record<string, ExamHashes> {
  return Object.fromEntries(
    listExams().map((meta) => [
      meta.code,
      hashExam({ meta, questions: getBundledQuestions(meta.code, { includeDrafts: true }), lessons: getLessons(meta.code) }),
    ]),
  );
}
