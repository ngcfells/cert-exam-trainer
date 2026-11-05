import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./free-port.mjs', import.meta.url));

/**
 * The port a test server should use: the value of `envVar` if set, else `preferred` if free,
 * else a free port the OS picks. The choice is saved in `envVar`, so Playwright workers
 * (which load the config again) and the tests agree on it.
 */
export function serverPort(envVar: string, preferred: number): number {
  if (!process.env[envVar]) {
    const port = execFileSync(process.execPath, [script, String(preferred)], { encoding: 'utf8' }).trim();
    if (port !== String(preferred)) console.log(`Port ${preferred} is in use; using port ${port} for this run.`);
    process.env[envVar] = port;
  }
  return Number(process.env[envVar]);
}
