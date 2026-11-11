// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { checkContent, updateApp } from './check';
import { sealExam, type ExamHashes } from './hashes';
import { HASHES_URL, nextManifest, type Manifest } from './manifest';
import { isOfficial } from './official';

const h = (c: string) => c.repeat(64);
const exams = (c: string): Record<string, ExamHashes> => ({ 'X0-001': sealExam({ meta: h('1'), questions: { q1: h(c) }, lessons: {} }) });
const INFO = { date: '2026-11-10', commit: 'abc1234', appVersion: '0.1.0' };
const v1 = nextManifest(null, exams('a'), INFO)!;
const v2 = nextManifest(v1, exams('b'), INFO)!;

const serving = (body: unknown, ok = true) => vi.fn(async () => ({ ok, json: async () => body }) as Response) as unknown as typeof fetch;
const check = (fetchFn: typeof fetch, local: Record<string, ExamHashes>) => checkContent({ fetchFn, local: () => local });

describe('checkContent', () => {
  it('verifies the current release, asking for a fresh copy of the list', async () => {
    const fetchFn = serving(v2);
    await expect(check(fetchFn, exams('b'))).resolves.toMatchObject({ kind: 'verified' });
    const [url, init] = vi.mocked(fetchFn).mock.calls[0];
    expect(String(url)).toMatch(new RegExp(`^${HASHES_URL.replace(/[.]/g, '\\.')}\\?t=\\d+$`));
    expect(init).toMatchObject({ cache: 'no-store' });
  });

  it('calls an earlier release out of date and unknown content a mismatch', async () => {
    await expect(check(serving(v2), exams('a'))).resolves.toMatchObject({ kind: 'outdated' });
    await expect(check(serving(v2), exams('c'))).resolves.toMatchObject({ kind: 'mismatch', diffs: [{ exam: 'X0-001', changed: ['q1'] }] });
  });

  it.each<[string, typeof fetch]>([
    ['the fetch fails', vi.fn(async () => Promise.reject(new Error('offline'))) as unknown as typeof fetch],
    ['the address answers 404', serving(v2, false)],
    ['the file is the wrong shape', serving({ hello: 'world' })],
    ['the file is another format', serving({ ...v2, format: 2 } as unknown as Manifest)],
    ['the file is not JSON', vi.fn(async () => ({ ok: true, json: async () => Promise.reject(new SyntaxError('bad')) }) as unknown as Response) as unknown as typeof fetch],
  ])('could not check when %s, even for matching content', async (_name, fetchFn) => {
    await expect(check(fetchFn, exams('b'))).resolves.toEqual({ kind: 'error' });
  });

  it('gives up after the timeout', async () => {
    const fetchFn = ((_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => init.signal!.addEventListener('abort', () => reject(new Error('aborted'))))) as unknown as typeof fetch;
    await expect(checkContent({ fetchFn, local: () => exams('b'), timeoutMs: 5 })).resolves.toEqual({ kind: 'error' });
  });
});

describe('updateApp', () => {
  const workers = (registration: unknown) => ({
    getRegistration: vi.fn(async () => registration as ServiceWorkerRegistration | undefined),
    addEventListener: vi.fn(),
  });

  it('finds nothing without a service worker, and never reloads', async () => {
    const reload = vi.fn();
    await expect(updateApp(undefined, reload)).resolves.toBe('none');
    await expect(updateApp(workers(undefined), reload)).resolves.toBe('none');
    expect(reload).not.toHaveBeenCalled();
  });

  it('finds nothing when no newer version is waiting or the check fails', async () => {
    const reload = vi.fn();
    const idle = workers({ update: vi.fn(async () => undefined), installing: null, waiting: null });
    await expect(updateApp(idle, reload)).resolves.toBe('none');
    expect(idle.addEventListener).not.toHaveBeenCalled();
    const failing = workers({ update: vi.fn(async () => Promise.reject(new Error('offline'))), installing: null, waiting: null });
    await expect(updateApp(failing, reload)).resolves.toBe('none');
    expect(reload).not.toHaveBeenCalled();
  });

  it('reloads once the newer version takes over', async () => {
    const reload = vi.fn();
    const w = workers({ update: vi.fn(async () => undefined), installing: {} as ServiceWorker, waiting: null });
    await expect(updateApp(w, reload)).resolves.toBe('reloading');
    expect(reload).not.toHaveBeenCalled();
    const [event, listener] = w.addEventListener.mock.calls[0] as [string, () => void];
    expect(event).toBe('controllerchange');
    listener();
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

describe('isOfficial', () => {
  it('is true only for the hosted build at the official address', () => {
    expect(isOfficial('https://ngcfells.github.io/cert-exam-trainer/', true)).toBe(true);
    expect(isOfficial('https://ngcfells.github.io/cert-exam-trainer/index.html?seed=4', true)).toBe(true);
    expect(isOfficial('https://ngcfells.github.io/cert-exam-trainer/', false)).toBe(false);
    expect(isOfficial('file:///C:/Users/x/index.html', true)).toBe(false);
    expect(isOfficial('http://localhost:4173/cert-exam-trainer/', true)).toBe(false);
    expect(isOfficial('https://evil.example/cert-exam-trainer/', true)).toBe(false);
    expect(isOfficial('https://ngcfells.github.io.evil.example/cert-exam-trainer/', true)).toBe(false);
    expect(isOfficial('https://ngcfells.github.io/cert-exam-trainer-fake/', true)).toBe(false);
  });
});
