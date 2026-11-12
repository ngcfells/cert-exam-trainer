// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listExams } from '../src/banks';
import { autoOpsItems } from '../src/banks/autoops/items';
import { cysaItems } from '../src/banks/cysa/items';
import { dataPlusItems } from '../src/banks/dataplus/items';
import { shippedLessons } from '../src/banks/lessons';
import { EXAM_METAS } from '../src/banks/metas';
import { secAiItems } from '../src/banks/secai/items';
import { parseExamMeta, parseQuestion } from '../src/domain/schema';
import type { Question } from '../src/domain/types';
import { hashExam, sealExam, type ExamHashes } from '../src/integrity/hashes';
import { localHashes } from '../src/integrity/local';
import { HASHES_BRANCH, HASHES_FILE, nextManifest, type ExamDiff, type Manifest } from '../src/integrity/manifest';
import { describeChanges, publishHashes, readPublished, releaseHashes, shippedHashes, waitForPublished, type ReleaseOptions } from './hashes-lib';

const ITEMS: Record<string, Question[]> = { 'DA0-002': dataPlusItems, 'CY0-001': secAiItems, 'AT0-001': autoOpsItems, 'CS0-004': cysaItems };

describe('shippedHashes', { timeout: 60_000 }, () => {
  const fromDisk = shippedHashes(process.cwd());

  it('gives the hashes the app works out for the same content', () => {
    for (const raw of EXAM_METAS) {
      const meta = parseExamMeta(raw);
      const inApp = hashExam({
        meta,
        questions: ITEMS[meta.code].map((q) => parseQuestion(q)),
        lessons: shippedLessons.filter((l) => l.exam === meta.code),
      });
      expect(Object.keys(fromDisk[meta.code].questions).length, meta.code).toBe(ITEMS[meta.code].length);
      expect(fromDisk[meta.code], meta.code).toEqual(inApp);
    }
    expect(Object.keys(fromDisk).sort()).toEqual(EXAM_METAS.map((m) => m.code).sort());
  });

  it('covers the lessons', () => {
    expect(Object.keys(fromDisk['DA0-002'].lessons).length).toBe(shippedLessons.filter((l) => l.exam === 'DA0-002').length);
  });
});

describe('localHashes', () => {
  it('has one entry for each exam the app lists', () => {
    expect(Object.keys(localHashes()).sort()).toEqual(listExams().map((m) => m.code).sort());
  });
});

describe('describeChanges', () => {
  const diff = (over: Partial<ExamDiff>): ExamDiff => ({
    exam: 'X0-001', changed: [], missing: [], extra: [], metaDiffers: false, lessonsChanged: [], lessonsMissing: [], lessonsExtra: [], ...over,
  });

  it('counts per exam and names the ids', () => {
    expect(describeChanges([diff({ changed: ['q1'], extra: ['q2', 'q3'], lessonsMissing: ['l1'], metaDiffers: true })])).toEqual([
      'X0-001: questions 1 changed, 2 added, 0 removed; lessons 0 changed, 0 added, 1 removed; exam details changed',
      '  changed questions: q1',
      '  added questions: q2, q3',
      '  removed lessons: l1',
    ]);
  });

  it('caps a long list at 20 ids', () => {
    const ids = Array.from({ length: 25 }, (_, i) => `q${String(i).padStart(2, '0')}`);
    const lines = describeChanges([diff({ changed: ids })]);
    expect(lines[1]).toBe(`  changed questions: ${ids.slice(0, 20).join(', ')} and 5 more`);
  });
});

describe('waitForPublished', () => {
  const reply = (id: string) => ({ ok: true, json: async () => ({ current: { id } }) }) as Response;

  it('resolves true once the address serves the release', async () => {
    let calls = 0;
    const sleeps: number[] = [];
    const fetchFn = (async () => (++calls < 3 ? reply('old') : reply('new'))) as unknown as typeof fetch;
    await expect(waitForPublished('new', { fetchFn, sleep: async (ms) => void sleeps.push(ms), everyMs: 10, timeoutMs: 100 })).resolves.toBe(true);
    expect(calls).toBe(3);
    expect(sleeps).toEqual([10, 10]);
  });

  it('resolves false at the timeout, through failed fetches too', async () => {
    let calls = 0;
    const fetchFn = (async () => {
      if (++calls % 2) throw new Error('offline');
      return reply('old');
    }) as unknown as typeof fetch;
    await expect(waitForPublished('new', { fetchFn, sleep: async () => undefined, everyMs: 10, timeoutMs: 30 })).resolves.toBe(false);
    expect(calls).toBe(4);
  });
});

describe('publishHashes and readPublished', { timeout: 60_000 }, () => {
  const git = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
  const h = (c: string) => c.repeat(64);
  const exam = (c: string): Record<string, ExamHashes> => ({ 'X0-001': sealExam({ meta: h('1'), questions: { q1: h(c) }, lessons: {} }) });
  const INFO = { date: '2026-11-10', commit: 'abc1234', appVersion: '0.1.0' };

  let root: string;
  let repo: string;
  let remote: string;

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'hashes-test-'));
    remote = path.join(root, 'remote.git');
    repo = path.join(root, 'repo');
    git(root, 'init', '-q', '--bare', remote);
    mkdirSync(repo);
    git(repo, 'init', '-q', '-b', 'main');
    git(repo, 'config', 'user.email', 't@example.com');
    git(repo, 'config', 'user.name', 'Test');
    git(repo, 'config', 'commit.gpgsign', 'false');
    writeFileSync(path.join(repo, 'src.txt'), 'source');
    git(repo, 'add', '.');
    git(repo, 'commit', '-q', '-m', 'init');
    git(repo, 'remote', 'add', 'origin', remote);
  });

  afterEach(() => rmSync(root, { recursive: true, force: true }));

  const publish = (manifest: Manifest, dryRun = false) => publishHashes({ cwd: repo, remote: 'origin', manifest, commit: 'abc1234', dryRun });

  it('reads nothing before the first release', () => {
    expect(readPublished(repo, 'origin')).toBeNull();
  });

  it('creates the branch with only the file and its README, then adds a commit per release', () => {
    const first = nextManifest(null, exam('a'), INFO)!;
    expect(publish(first)).toMatchObject({ pushed: true });
    expect(git(remote, 'ls-tree', '-r', '--name-only', HASHES_BRANCH).split('\n').sort()).toEqual(['README.md', HASHES_FILE]);
    expect(git(remote, 'log', '-1', '--format=%s', HASHES_BRANCH)).toBe('hashes: abc1234');
    expect(readPublished(repo, 'origin')).toEqual(first);

    const second = nextManifest(first, exam('b'), INFO)!;
    expect(publish(second)).toMatchObject({ pushed: true });
    expect(git(remote, 'rev-list', '--count', HASHES_BRANCH)).toBe('2');
    expect(readPublished(repo, 'origin')?.history.map((r) => r.id)).toEqual([first.current.id]);
    expect(git(repo, 'branch', '--list', 'deploy-tmp-*')).toBe('');
    expect(git(repo, 'status', '--porcelain')).toBe('');
  });

  it('pushes nothing on a dry run', () => {
    expect(publish(nextManifest(null, exam('a'), INFO)!, true)).toMatchObject({ pushed: false });
    expect(git(remote, 'branch', '--list', HASHES_BRANCH)).toBe('');
  });

  it('makes no commit when the file is unchanged', () => {
    const first = nextManifest(null, exam('a'), INFO)!;
    publish(first);
    expect(publish(first)).toEqual({ commit: null, pushed: false });
  });

  it('refuses to guess when the remote cannot be reached, so a release never restarts the history', () => {
    publish(nextManifest(null, exam('a'), INFO)!);
    git(repo, 'remote', 'set-url', 'origin', path.join(root, 'gone.git'));
    expect(() => readPublished(repo, 'origin')).toThrow('Could not read the published hashes from origin');
  });

  it('releaseHashes, with real git: two releases keep the history', async () => {
    const release = (c: string) =>
      releaseHashes({
        cwd: repo, remote: 'origin', local: exam(c), ...INFO, dryRun: false,
        confirm: async () => true, wait: async () => true, log: () => undefined,
      });
    await expect(release('a')).resolves.toBe('published');
    await expect(release('b')).resolves.toBe('published');
    await expect(release('b')).resolves.toBe('unchanged');
    const published = readPublished(repo, 'origin');
    expect(published?.current.exams).toEqual(exam('b'));
    expect(published?.history).toHaveLength(1);
    expect(git(remote, 'rev-list', '--count', HASHES_BRANCH)).toBe('2');
  });
});

// The order and the refusals, with the git steps replaced by a list in memory (the real ones are tested above).
describe('releaseHashes', () => {
  const h = (c: string) => c.repeat(64);
  const exam = (c: string): Record<string, ExamHashes> => ({ 'X0-001': sealExam({ meta: h('1'), questions: { q1: h(c) }, lessons: {} }) });
  const INFO = { date: '2026-11-10', commit: 'abc1234', appVersion: '0.1.0' };

  function setup(start: Manifest | null = null, branch = 'main') {
    const state = { published: start, pushes: 0, events: [] as string[] };
    const lines: string[] = [];
    const release = (c: string, over: Partial<ReleaseOptions> = {}) =>
      releaseHashes({
        cwd: '.', remote: 'origin', local: exam(c), ...INFO, dryRun: false,
        confirm: async () => (state.events.push('confirm'), true),
        wait: async () => (state.events.push('wait'), true),
        log: (l) => lines.push(l),
        git: {
          read: () => state.published,
          branch: () => branch,
          publish: (manifest, dryRun) => {
            state.events.push(dryRun ? 'dry-publish' : 'publish');
            if (!dryRun) {
              state.published = manifest;
              state.pushes++;
            }
            return { commit: 'c0ffee1', pushed: !dryRun };
          },
        },
        ...over,
      });
    return { state, lines, release };
  }

  it('publishes the first release after a yes, then waits, listing what is new', async () => {
    const { state, lines, release } = setup();
    await expect(release('a')).resolves.toBe('published');
    expect(state.events).toEqual(['confirm', 'publish', 'wait']);
    expect(lines[0]).toBe('First release of the content hashes:');
    expect(lines).toContain('  added questions: q1');
    expect(state.published?.current.exams).toEqual(exam('a'));
  });

  it('leaves the published file alone when the content is unchanged, without asking', async () => {
    const { state, lines, release } = setup(nextManifest(null, exam('a'), INFO));
    await expect(release('a')).resolves.toBe('unchanged');
    expect(state.events).toEqual([]);
    expect(lines).toEqual(['The content is unchanged; the published hashes stay as they are.']);
  });

  it('lists what changed and moves the old release into the history', async () => {
    const first = nextManifest(null, exam('a'), INFO)!;
    const { state, lines, release } = setup(first);
    await expect(release('b')).resolves.toBe('published');
    expect(lines[0]).toBe('The content changed since the last release:');
    expect(lines).toContain('  changed questions: q1');
    expect(state.published?.history.map((r) => r.id)).toEqual([first.current.id]);
  });

  it('publishes nothing when the answer is no', async () => {
    const { state, release } = setup();
    await expect(release('a', { confirm: async () => false })).rejects.toThrow('the hashes were not confirmed');
    expect(state.pushes).toBe(0);
  });

  it('pushes nothing on a dry run, and does not ask', async () => {
    const { state, release } = setup();
    await expect(release('a', { dryRun: true })).resolves.toBe('dry-run');
    expect(state.events).toEqual(['dry-publish']);
    expect(state.pushes).toBe(0);
  });

  it('publishes only from main', async () => {
    const { state, release } = setup(null, 'feature');
    await expect(release('a')).rejects.toThrow('Refusing to publish content hashes from branch feature');
    expect(state.events).toEqual([]);
  });

  it('stops the deploy when the public address never serves the new list, and a second run goes on', async () => {
    const { state, release } = setup();
    await expect(release('a', { wait: async () => false })).rejects.toThrow('the site was NOT pushed');
    expect(state.pushes).toBe(1);
    await expect(release('a')).resolves.toBe('unchanged');
    expect(state.pushes).toBe(1);
  });

  it('stops when the published file cannot be read', async () => {
    const { state, release } = setup();
    const git = {
      read: (): Manifest | null => {
        throw new Error('Could not read the published hashes from origin');
      },
      branch: () => 'main',
      publish: vi.fn(),
    };
    await expect(release('a', { git })).rejects.toThrow('Could not read the published hashes');
    expect(git.publish).not.toHaveBeenCalled();
    expect(state.pushes).toBe(0);
  });
});

