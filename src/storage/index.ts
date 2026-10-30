import { openIdbRepo } from './idbRepo';
import { createMemoryRepo } from './memoryRepo';
import type { Repo } from './repo';

export type { Repo } from './repo';

/** Opens IndexedDB storage, falling back to in-memory storage when IndexedDB is unavailable or blocked. */
export async function openRepo(): Promise<{ repo: Repo; persistent: boolean }> {
  try {
    if (typeof indexedDB === 'undefined' || !indexedDB) throw new Error('IndexedDB unavailable');
    return { repo: await openIdbRepo(), persistent: true };
  } catch {
    return { repo: createMemoryRepo(), persistent: false };
  }
}
