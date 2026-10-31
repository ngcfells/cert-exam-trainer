import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { deploy } from './deploy-lib';

const git = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();

let root: string;
let repo: string;
let remote: string;

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'deploy-test-'));
  remote = path.join(root, 'remote.git');
  repo = path.join(root, 'repo');
  git(root, 'init', '-q', '--bare', remote);
  mkdirSync(repo);
  git(repo, 'init', '-q', '-b', 'main');
  git(repo, 'config', 'user.email', 't@example.com');
  git(repo, 'config', 'user.name', 'Test');
  git(repo, 'config', 'commit.gpgsign', 'false');
  writeFileSync(path.join(repo, 'src.txt'), 'source');
  writeFileSync(path.join(repo, '.gitignore'), 'dist/\n');
  git(repo, 'add', '.');
  git(repo, 'commit', '-q', '-m', 'init');
  git(repo, 'remote', 'add', 'origin', remote);
  mkdirSync(path.join(repo, 'dist', 'assets'), { recursive: true });
  writeFileSync(path.join(repo, 'dist', 'index.html'), '<html>v1</html>');
  writeFileSync(path.join(repo, 'dist', 'assets', 'a.js'), 'x');
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

const opts = (over: Partial<Parameters<typeof deploy>[0]> = {}) => ({
  cwd: repo, remote: 'origin', branch: 'gh-pages', distDir: 'dist', dryRun: false, force: false, ...over,
});
const remoteFiles = () => git(remote, 'ls-tree', '-r', '--name-only', 'gh-pages').split('\n').sort();

describe('deploy', { timeout: 30_000 }, () => {
  it('refuses a dirty working tree', async () => {
    writeFileSync(path.join(repo, 'src.txt'), 'changed');
    await expect(deploy(opts())).rejects.toThrow('Refusing to deploy: working tree has uncommitted changes');
  });

  it('refuses a branch other than main unless forced', async () => {
    git(repo, 'checkout', '-q', '-b', 'feature');
    await expect(deploy(opts())).rejects.toThrow('Refusing to deploy from branch feature; use main or --force');
    await expect(deploy(opts({ force: true }))).resolves.toMatchObject({ pushed: true });
  });

  it('first deploy creates gh-pages with only the built files and .nojekyll', async () => {
    const sha = git(repo, 'rev-parse', '--short', 'HEAD');
    const r = await deploy(opts());
    expect(r.pushed).toBe(true);
    expect(remoteFiles()).toEqual(['.nojekyll', 'assets/a.js', 'index.html']);
    expect(git(remote, 'log', '-1', '--format=%s', 'gh-pages')).toBe(`deploy: ${sha}`);
    expect(git(repo, 'branch', '--list', 'deploy-tmp-*')).toBe('');
  });

  it('an unchanged dist makes no commit', async () => {
    await deploy(opts());
    expect(await deploy(opts())).toEqual({ commit: null, pushed: false });
  });

  it('a changed dist replaces old files', async () => {
    await deploy(opts());
    rmSync(path.join(repo, 'dist', 'assets'), { recursive: true });
    writeFileSync(path.join(repo, 'dist', 'index.html'), '<html>v2</html>');
    await deploy(opts());
    expect(remoteFiles()).toEqual(['.nojekyll', 'index.html']);
  });

  it('dry run commits locally but leaves the remote alone', async () => {
    const r = await deploy(opts({ dryRun: true }));
    expect(r.commit).toMatch(/^[0-9a-f]{7,}$/);
    expect(r.pushed).toBe(false);
    expect(() => git(remote, 'rev-parse', '--verify', '-q', 'gh-pages')).toThrow();
  });

  it('refuses a missing dist folder', async () => {
    rmSync(path.join(repo, 'dist'), { recursive: true });
    await expect(deploy(opts())).rejects.toThrow('Nothing to deploy: dist/index.html not found');
  });

  it('removes its temporary worktree even when a step fails', async () => {
    const failingRun = (cmd: string, args: string[], cwd: string) => {
      if (args[0] === 'commit') throw new Error('boom');
      return execFileSync(cmd, args, { cwd, encoding: 'utf8' });
    };
    await expect(deploy({ ...opts(), run: failingRun })).rejects.toThrow('boom');
    expect(git(repo, 'worktree', 'list').split('\n')).toHaveLength(1);
  });
});
