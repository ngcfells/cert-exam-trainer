// @vitest-environment node
import { execFile } from 'node:child_process';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const script = fileURLToPath(new URL('./free-port.mjs', import.meta.url));
const run = promisify(execFile);

async function probe(preferred: number): Promise<number> {
  const { stdout } = await run(process.execPath, [script, String(preferred)]);
  return Number(stdout.trim());
}

/** Listens on a free port at `host`; resolves to the server, or null when the host has no such address. */
function hold(host: string): Promise<net.Server | null> {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once('error', () => resolve(null));
    srv.listen(0, host, () => resolve(srv));
  });
}

const portOf = (srv: net.Server) => (srv.address() as net.AddressInfo).port;
const close = (srv: net.Server) => new Promise((r) => srv.close(r));

describe('free-port', () => {
  it('keeps the preferred port when nothing holds it', async () => {
    const srv = (await hold('127.0.0.1'))!;
    const port = portOf(srv);
    await close(srv);
    expect(await probe(port)).toBe(port);
  });

  // vite preview listens on localhost, so a server on one loopback address must count as taken
  // (on Windows a wildcard listen succeeds beside it, which is how issue-free runs still failed).
  for (const host of ['127.0.0.1', '::1', '0.0.0.0', '::']) {
    it(`treats a port held on ${host} as taken`, async () => {
      const srv = await hold(host);
      if (!srv) return; // this machine has no such address
      const port = portOf(srv);
      try {
        const got = await probe(port);
        expect(got).not.toBe(port);
        expect(got).toBeGreaterThan(0);
      } finally {
        await close(srv);
      }
    });
  }
});
