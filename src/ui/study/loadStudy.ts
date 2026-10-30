import { loadPool } from '../../banks/pool';
import type { Question } from '../../domain/types';
import type { Repo } from '../../storage';

/** The question pool (after the source filter), saved results and SRS records for one exam. */
export async function loadStudy(repo: Repo, examCode: string): Promise<{ pool: Question[]; results: unknown[]; srs: unknown[] }> {
  const [pool, results, srs] = await Promise.all([loadPool(repo, examCode), repo.listRecords('results'), repo.listRecords('srs')]);
  return { pool, results, srs };
}
