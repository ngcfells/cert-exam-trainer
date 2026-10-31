import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

export type Run = (cmd: string, args: string[], cwd: string) => string;

export interface DeployOptions {
  cwd: string;
  remote: string;
  branch: string;
  distDir: string;
  dryRun: boolean;
  force: boolean;
  run?: Run;
}

const defaultRun: Run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

/**
 * Publishes the built site in `distDir` to `branch` on `remote` (GitHub Pages "deploy from a branch").
 * Works in a temporary git worktree so the user's checkout is never touched; the worktree is always removed.
 */
export async function deploy(opts: DeployOptions): Promise<{ commit: string | null; pushed: boolean }> {
  const run = opts.run ?? defaultRun;
  const git = (args: string[], cwd = opts.cwd) => run('git', args, cwd).trim();

  if (git(['status', '--porcelain'])) throw new Error('Refusing to deploy: working tree has uncommitted changes');
  const current = git(['rev-parse', '--abbrev-ref', 'HEAD']);
  if (current !== 'main' && !opts.force) throw new Error(`Refusing to deploy from branch ${current}; use main or --force`);
  const dist = path.resolve(opts.cwd, opts.distDir);
  if (!existsSync(path.join(dist, 'index.html'))) throw new Error(`Nothing to deploy: ${opts.distDir}/index.html not found`);
  const sha = git(['rev-parse', '--short', 'HEAD']);

  const tmp = mkdtempSync(path.join(tmpdir(), 'deploy-'));
  const wt = path.join(tmp, 'site');
  let added = false;
  let orphan: string | null = null;
  try {
    let remoteHasBranch = true;
    try {
      git(['fetch', '-q', opts.remote, `${opts.branch}:refs/remotes/${opts.remote}/${opts.branch}`]);
    } catch {
      remoteHasBranch = false;
    }
    if (remoteHasBranch) {
      git(['worktree', 'add', '-q', '--detach', wt, `${opts.remote}/${opts.branch}`]);
    } else {
      git(['worktree', 'add', '-q', '--detach', wt]);
      orphan = `deploy-tmp-${Date.now()}`;
      git(['checkout', '-q', '--orphan', orphan], wt);
    }
    added = true;

    for (const f of readdirSync(wt)) if (f !== '.git') rmSync(path.join(wt, f), { recursive: true, force: true });
    cpSync(dist, wt, { recursive: true });
    writeFileSync(path.join(wt, '.nojekyll'), '');
    git(['add', '-A'], wt);

    if (!git(['status', '--porcelain'], wt)) return { commit: null, pushed: false };
    git(['commit', '-q', '-m', `deploy: ${sha}`], wt);
    const commit = git(['rev-parse', '--short', 'HEAD'], wt);
    if (opts.dryRun) return { commit, pushed: false };
    git(['push', '-q', opts.remote, `HEAD:refs/heads/${opts.branch}`], wt);
    return { commit, pushed: true };
  } finally {
    if (added) {
      try {
        git(['worktree', 'remove', '--force', wt]);
      } catch {
        /* fall through to prune */
      }
    }
    rmSync(tmp, { recursive: true, force: true });
    git(['worktree', 'prune']);
    // The orphan branch only exists once something was committed on it.
    if (orphan && git(['branch', '--list', orphan])) git(['branch', '-q', '-D', orphan]);
  }
}
