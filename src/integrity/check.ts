import type { ExamHashes } from './hashes';
import { localHashes } from './local';
import { HASHES_URL, manifestSchema, verdict, type Verdict } from './manifest';

/** `error`: the official list could not be fetched or read, so nothing is known. Never shown as verified. */
export type CheckResult = Verdict | { kind: 'error' };

/** Compares this copy's stock content with the official list. Sends no data: it fetches one public file. */
export async function checkContent(
  deps: { fetchFn?: typeof fetch; local?: () => Record<string, ExamHashes>; timeoutMs?: number } = {},
): Promise<CheckResult> {
  const { fetchFn = fetch, local = localHashes, timeoutMs = 10_000 } = deps;
  const stop = new AbortController();
  const timer = setTimeout(() => stop.abort(), timeoutMs);
  try {
    // The address is cached for five minutes; the query and `no-store` ask for the newest file.
    const res = await fetchFn(`${HASHES_URL}?t=${Date.now()}`, { cache: 'no-store', signal: stop.signal });
    if (!res.ok) return { kind: 'error' };
    const manifest = manifestSchema.safeParse(await res.json());
    return manifest.success ? verdict(local(), manifest.data) : { kind: 'error' };
  } catch {
    return { kind: 'error' };
  } finally {
    clearTimeout(timer);
  }
}

type Workers = Pick<ServiceWorkerContainer, 'getRegistration' | 'addEventListener'>;

/**
 * Asks the service worker for a newer version of the app. `reloading`: one was found, and the page reloads when
 * it takes over. `none`: there is no service worker, or no newer version yet.
 */
export async function updateApp(
  workers: Workers | undefined = navigator.serviceWorker,
  reload: () => void = () => location.reload(),
): Promise<'reloading' | 'none'> {
  try {
    const registration = await workers?.getRegistration();
    if (!workers || !registration) return 'none';
    await registration.update();
    if (!registration.installing && !registration.waiting) return 'none';
    workers.addEventListener('controllerchange', () => reload(), { once: true });
    return 'reloading';
  } catch {
    return 'none';
  }
}
