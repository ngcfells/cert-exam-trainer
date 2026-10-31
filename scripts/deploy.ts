/**
 * Builds the hosted PWA (dist/) and publishes it to the gh-pages branch for GitHub Pages. No Actions involved.
 *
 *   npm run deploy               build, commit to gh-pages, push to origin
 *   npm run deploy -- --dry-run  build and commit in a temporary worktree, but do not push
 *   npm run deploy -- --force    allow deploying from a branch other than main (uncommitted changes are always refused)
 */
import { execSync } from 'node:child_process';
import { deploy } from './deploy-lib';

const args = process.argv.slice(2).filter((a) => a !== '--');
const unknown = args.filter((a) => a !== '--dry-run' && a !== '--force');
if (unknown.length) {
  console.error(`deploy: unknown option ${unknown.join(' ')}`);
  process.exit(1);
}
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');

try {
  execSync('npm run build', { stdio: 'inherit' });
  const r = await deploy({ cwd: process.cwd(), remote: 'origin', branch: 'gh-pages', distDir: 'dist', dryRun, force });
  if (!r.commit) console.log('deploy: nothing changed since the last deploy.');
  else if (!r.pushed) console.log(`deploy: dry run made commit ${r.commit}; nothing was pushed.`);
  else console.log(`deploy: pushed ${r.commit} to gh-pages. Pages will update in a minute or two.`);
} catch (e) {
  console.error(`deploy: ${(e as Error).message}`);
  process.exit(1);
}
