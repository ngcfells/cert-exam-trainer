import { getBundledQuestions } from '../../banks';
import type { Question } from '../../domain/types';
import type { Repo } from '../../storage';

/** The question pool (bundled + user), saved results and SRS records for one exam. */
export async function loadStudy(repo: Repo, examCode: string): Promise<{ pool: Question[]; results: unknown[]; srs: unknown[] }> {
  const [mine, results, srs] = await Promise.all([repo.getUserQuestions(examCode), repo.listRecords('results'), repo.listRecords('srs')]);
  return { pool: [...getBundledQuestions(examCode), ...mine], results, srs };
}
