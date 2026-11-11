/**
 * Builds the hosted PWA (dist/) and publishes it to the gh-pages branch for GitHub Pages. No Actions involved.
 * When the shipped content changed, it first publishes the new content hashes to the Security branch (issue #11),
 * after showing what changed and asking for a yes.
 *
 *   npm run deploy               build, publish hashes if the content changed, commit to gh-pages, push to origin
 *   npm run deploy -- --yes      accept the list of changed content without being asked (needed when no one can type)
 *   npm run deploy -- --dry-run  build and commit in temporary worktrees, but push nothing
 *   npm run deploy -- --force    allow deploying the site from a branch other than main (uncommitted changes are
 *                                always refused, and content hashes are only ever published from main)
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { deploy, preflight } from './deploy-lib';
import { releaseHashes, shippedHashes } from './hashes-lib';

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

async function confirm(): Promise<boolean> {
  if (yes) return true;
  if (!process.stdin.isTTY) throw new Error('The content changed. Read the list above, then run again with --yes to publish its hashes');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question('Publish these hashes as the official content? (y/N) ');
  rl.close();
  return /^y(es)?$/i.test(answer.trim());
}

try {
  preflight({ cwd, force });
  execSync('npm run build', { stdio: 'inherit' });
  // Everything that can refuse the site push is checked again before the hashes go out.
  const commit = preflight({ cwd, force });
  if (!existsSync('dist/index.html')) throw new Error('Nothing to deploy: dist/index.html not found');

  const hashes = await releaseHashes({
    cwd,
    remote: 'origin',
    local: shippedHashes(cwd),
    commit,
    date: new Date().toISOString().slice(0, 10),
    appVersion: (JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }).version,
    dryRun,
    confirm,
    log: (line) => console.log(`deploy: ${line}`),
  });

  let r;
  try {
    r = await deploy({ cwd, remote: 'origin', branch: 'gh-pages', distDir: 'dist', dryRun, force });
  } catch (e) {
    const note = hashes === 'published' ? ' The new hashes ARE published, so the app says "out of date" until the site is pushed: run deploy again.' : '';
    throw new Error(`${(e as Error).message}.${note}`);
  }
  if (!r.commit) console.log('deploy: nothing changed since the last deploy.');
  else if (!r.pushed) console.log(`deploy: dry run made commit ${r.commit}; nothing was pushed.`);
  else console.log(`deploy: pushed ${r.commit} to gh-pages. Pages will update in a minute or two.`);
} catch (e) {
  console.error(`deploy: ${(e as Error).message}`);
  process.exit(1);
}
