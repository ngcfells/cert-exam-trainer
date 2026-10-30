import { openIdbRepo } from './idbRepo';
import { createMemoryRepo } from './memoryRepo';
import type { Repo } from './repo';

export type { Repo } from './repo';

/**
 * Opens IndexedDB storage, falling back to in-memory storage when IndexedDB is
 * unavailable, blocked, or does not answer within `timeoutMs`.
 */
export async function openRepo({ timeoutMs = 3000 }: { timeoutMs?: number } = {}): Promise<{ repo: Repo; persistent: boolean }> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    if (typeof indexedDB === 'undefined' || !indexedDB) throw new Error('IndexedDB unavailable');
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('IndexedDB timed out')), timeoutMs);
    });
    return { repo: await Promise.race([openIdbRepo(), timeout]), persistent: true };
  } catch {
    return { repo: createMemoryRepo(), persistent: false };
  } finally {
    clearTimeout(timer);
  }
}
