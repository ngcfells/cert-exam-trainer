/**
 * Builds the hosted PWA (dist/) and publishes it to the gh-pages branch for GitHub Pages. No Actions involved.
 * When the shipped content changed, it first publishes the new content hashes to the Security branch (issue #11),
 * after showing what changed and asking for a yes.
 *
 *   npm run deploy               build, publish hashes if the content changed, commit to gh-pages, push to origin
 *   npm run deploy -- --yes      accept the list of changed content without being asked (needed when no one can type)
 *   npm run deploy -- --dry-run  build and commit in temporary worktrees, but push nothing
 *   npm run deploy -- --force    allow deploying from a branch other than main (uncommitted changes are always refused)
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { hashRelease } from '../src/integrity/hashes';
import { HASHES_BRANCH, diffExams, nextManifest } from '../src/integrity/manifest';
import { deploy, preflight } from './deploy-lib';
import { describeChanges, publishHashes, readPublished, shippedHashes, waitForPublished } from './hashes-lib';

const FLAGS = ['--dry-run', '--force', '--yes'];
const args = process.argv.slice(2).filter((a) => a !== '--');
const unknown = args.filter((a) => !FLAGS.includes(a));
if (unknown.length) {
  console.error(`deploy: unknown option ${unknown.join(' ')}`);
  process.exit(1);
}
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');
const yes = args.includes('--yes');
const cwd = process.cwd();

async function confirmed(): Promise<boolean> {
  if (yes) return true;
  if (!process.stdin.isTTY) throw new Error('The content changed. Read the list above, then run again with --yes to publish its hashes');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question('Publish these hashes as the official content? (y/N) ');
  rl.close();
  return /^y(es)?$/i.test(answer.trim());
}

/** Publishes the content hashes when the content changed. The hashes go out before the site, so a freshly updated app never meets a list that does not know it. */
async function releaseHashes(commit: string): Promise<void> {
  const local = shippedHashes(cwd);
  const published = readPublished(cwd, 'origin');
  const appVersion = (JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }).version;
  const manifest = nextManifest(published, local, { date: new Date().toISOString().slice(0, 10), commit, appVersion });
  if (!manifest) {
    console.log('deploy: the content is unchanged; the published hashes stay as they are.');
    return;
  }
  console.log(published ? 'deploy: the content changed since the last release:' : 'deploy: first release of the content hashes:');
  for (const line of describeChanges(diffExams(local, published?.current.exams ?? {}))) console.log(line);
  if (dryRun) {
    const r = publishHashes({ cwd, remote: 'origin', manifest, commit, dryRun });
    console.log(`deploy: dry run made hashes commit ${r.commit}; nothing was pushed.`);
    return;
  }
  if (!(await confirmed())) throw new Error('Stopped: the hashes were not confirmed, so nothing was published');
  publishHashes({ cwd, remote: 'origin', manifest, commit, dryRun });
  console.log(`deploy: pushed release ${hashRelease(local).slice(0, 12)} to ${HASHES_BRANCH}. Waiting until its public address serves it…`);
  if (!(await waitForPublished(manifest.current.id))) {
    console.warn('deploy: the public address still serves the old hashes. Going on; "Check content" may be wrong for a few minutes.');
  }
}

try {
  const commit = preflight({ cwd, force });
  execSync('npm run build', { stdio: 'inherit' });
  await releaseHashes(commit);
  const r = await deploy({ cwd, remote: 'origin', branch: 'gh-pages', distDir: 'dist', dryRun, force });
  if (!r.commit) console.log('deploy: nothing changed since the last deploy.');
  else if (!r.pushed) console.log(`deploy: dry run made commit ${r.commit}; nothing was pushed.`);
  else console.log(`deploy: pushed ${r.commit} to gh-pages. Pages will update in a minute or two.`);
} catch (e) {
  console.error(`deploy: ${(e as Error).message}`);
  process.exit(1);
}
