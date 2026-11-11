import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { EXAM_METAS } from '../src/banks/metas';
import { bankFor } from '../src/banks/paths';
import { lessonSchema, type Lesson } from '../src/domain/lesson';
import { parseExamMeta, parseQuestion } from '../src/domain/schema';
import { hashExam, type ExamContent, type ExamHashes } from '../src/integrity/hashes';
import { HASHES_BRANCH, HASHES_FILE, HASHES_URL, diffExams, manifestSchema, nextManifest, type ExamDiff, type Manifest } from '../src/integrity/manifest';
import { defaultRun, publishTree, type Run } from './deploy-lib';

const jsonFiles = (dir: string): unknown[][] =>
  readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(readFileSync(path.join(dir, f), 'utf8')) as unknown[]);

/** The content each exam ships, read from the bank files on disk and parsed as the app parses it on load. */
export function readShippedContent(root: string): Record<string, ExamContent> {
  const banks = path.join(root, 'src', 'banks');
  const lessons: Lesson[] = readdirSync(banks, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(path.join(banks, d.name, 'lessons')))
    .flatMap((d) => jsonFiles(path.join(banks, d.name, 'lessons')).flat())
    .map((l) => lessonSchema.parse(l));
  return Object.fromEntries(
    EXAM_METAS.map((raw) => {
      const meta = parseExamMeta(raw);
      const questions = jsonFiles(path.join(banks, bankFor(meta.code).dir, 'items')).flat().map((q) => parseQuestion(q));
      return [meta.code, { meta, questions, lessons: lessons.filter((l) => l.exam === meta.code) }];
    }),
  );
}

export function shippedHashes(root: string): Record<string, ExamHashes> {
  return Object.fromEntries(Object.entries(readShippedContent(root)).map(([code, c]) => [code, hashExam(c)]));
}

/**
 * The file on the hashes branch of `remote`, or null when the branch does not exist yet. Throws when the remote
 * cannot be reached or the file cannot be read: "no answer" must never pass for "no branch", or the next release
 * would start the history again from nothing.
 */
export function readPublished(cwd: string, remote: string, run: Run = defaultRun): Manifest | null {
  try {
    run('git', ['ls-remote', '--exit-code', remote, `refs/heads/${HASHES_BRANCH}`], cwd);
  } catch (e) {
    // Exit code 2 is git's "no such ref"; anything else is a failure to ask.
    if ((e as { status?: number }).status === 2) return null;
    throw new Error(`Could not read the published hashes from ${remote}. Check the connection and try again`);
  }
  const ref = `refs/remotes/${remote}/${HASHES_BRANCH}`;
  run('git', ['fetch', '-q', remote, `${HASHES_BRANCH}:${ref}`], cwd);
  return manifestSchema.parse(JSON.parse(run('git', ['show', `${ref}:${HASHES_FILE}`], cwd)));
}

const MAX_IDS = 20;

function idLine(label: string, ids: string[]): string[] {
  if (!ids.length) return [];
  const more = ids.length > MAX_IDS ? ` and ${ids.length - MAX_IDS} more` : '';
  return [`  ${label}: ${ids.slice(0, MAX_IDS).join(', ')}${more}`];
}

/** What a release would change, in plain lines. `diffs` compares the new content (local) with the published file. */
export function describeChanges(diffs: ExamDiff[]): string[] {
  return diffs.flatMap((d) => [
    `${d.exam}: questions ${d.changed.length} changed, ${d.extra.length} added, ${d.missing.length} removed; ` +
      `lessons ${d.lessonsChanged.length} changed, ${d.lessonsExtra.length} added, ${d.lessonsMissing.length} removed` +
      (d.metaDiffers ? '; exam details changed' : ''),
    ...idLine('changed questions', d.changed),
    ...idLine('added questions', d.extra),
    ...idLine('removed questions', d.missing),
    ...idLine('changed lessons', d.lessonsChanged),
    ...idLine('added lessons', d.lessonsExtra),
    ...idLine('removed lessons', d.lessonsMissing),
  ]);
}

const README = `# Content hashes

This branch holds the official SHA-512/256 hashes of the content that Cert Exam Trainer ships: every stock
question, every lesson and each exam's details. \`${HASHES_FILE}\` is written by \`npm run deploy\` on the main
branch, after the owner confirms the list of changed items. Nothing here is edited by hand.

The app's "Check content" button (Settings) compares its own content with this file. \`current\` is the newest
release, with one hash per item; \`history\` lists earlier releases, newest first.

Only the repository owner may change this branch.
`;

/** Commits the file (and this branch's README) to the hashes branch and pushes it, unless `dryRun`. */
export function publishHashes(opts: {
  cwd: string;
  remote: string;
  manifest: Manifest;
  commit: string;
  dryRun: boolean;
  run?: Run;
}): { commit: string | null; pushed: boolean } {
  return publishTree({
    cwd: opts.cwd,
    remote: opts.remote,
    branch: HASHES_BRANCH,
    message: `hashes: ${opts.commit}`,
    dryRun: opts.dryRun,
    run: opts.run,
    write(dir) {
      writeFileSync(path.join(dir, HASHES_FILE), `${JSON.stringify(opts.manifest, null, 1)}\n`);
      writeFileSync(path.join(dir, 'README.md'), README);
    },
  });
}

export interface ReleaseOptions {
  cwd: string;
  remote: string;
  /** The new content's hashes (`shippedHashes`). */
  local: Record<string, ExamHashes>;
  /** Short id of the commit being released, the release date (YYYY-MM-DD) and the app version. */
  commit: string;
  date: string;
  appVersion: string;
  dryRun: boolean;
  /** Asked after the list of changes is printed. False stops the release. */
  confirm: () => Promise<boolean>;
  log: (line: string) => void;
  /** Resolves true once the public address serves the release. Defaults to `waitForPublished`. */
  wait?: (id: string) => Promise<boolean>;
  run?: Run;
}

/**
 * The hashes half of a deploy. Publishes the content hashes when the content changed, after showing what changed
 * and getting a yes, and waits until the public address serves them. The site is pushed only after this returns,
 * so a freshly updated app never meets a list that does not know it. Throws to stop the deploy.
 */
export async function releaseHashes(opts: ReleaseOptions): Promise<'unchanged' | 'published' | 'dry-run'> {
  const run = opts.run ?? defaultRun;
  const published = readPublished(opts.cwd, opts.remote, run);
  const manifest = nextManifest(published, opts.local, { date: opts.date, commit: opts.commit, appVersion: opts.appVersion });
  if (!manifest) {
    opts.log('The content is unchanged; the published hashes stay as they are.');
    return 'unchanged';
  }
  opts.log(published ? 'The content changed since the last release:' : 'First release of the content hashes:');
  for (const line of describeChanges(diffExams(opts.local, published?.current.exams ?? {}))) opts.log(line);

  // Official hashes come from main only, even when --force lets the site go out from another branch.
  const branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], opts.cwd).trim();
  if (branch !== 'main') throw new Error(`Refusing to publish content hashes from branch ${branch}: the official content is what is on main`);

  if (opts.dryRun) {
    const r = publishHashes({ cwd: opts.cwd, remote: opts.remote, manifest, commit: opts.commit, dryRun: true, run });
    opts.log(`Dry run made hashes commit ${r.commit}; nothing was pushed.`);
    return 'dry-run';
  }
  if (!(await opts.confirm())) throw new Error('Stopped: the hashes were not confirmed, so nothing was published');
  publishHashes({ cwd: opts.cwd, remote: opts.remote, manifest, commit: opts.commit, dryRun: false, run });
  opts.log(`Pushed release ${manifest.current.id.slice(0, 12)} to ${HASHES_BRANCH}. Waiting until its public address serves it…`);
  if (!(await (opts.wait ?? waitForPublished)(manifest.current.id))) {
    throw new Error(
      'The hashes are published, but their public address still serves the old list, so the site was NOT pushed. ' +
        'Run deploy again in a few minutes; it will go straight to the site',
    );
  }
  return 'published';
}

/** Waits until the public address serves the release `id`. False when it still does not after `timeoutMs`. */
export async function waitForPublished(
  id: string,
  opts: { fetchFn?: typeof fetch; sleep?: (ms: number) => Promise<void>; timeoutMs?: number; everyMs?: number } = {},
): Promise<boolean> {
  const fetchFn = opts.fetchFn ?? fetch;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const timeoutMs = opts.timeoutMs ?? 7 * 60_000;
  const everyMs = opts.everyMs ?? 15_000;
  for (let waited = 0; ; waited += everyMs) {
    try {
      const res = await fetchFn(`${HASHES_URL}?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok && ((await res.json()) as { current?: { id?: string } }).current?.id === id) return true;
    } catch {
      /* not there yet */
    }
    if (waited + everyMs > timeoutMs) return false;
    await sleep(everyMs);
  }
}
