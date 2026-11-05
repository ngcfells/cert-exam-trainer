// Prints the preferred port if it is free, or else a free port the OS picks (an ephemeral port).
//   node scripts/free-port.mjs 4173
import net from 'node:net';
import process from 'node:process';

const preferred = Number(process.argv[2] ?? 0);

// Resolves to the bound port, or null if `host` cannot take `port` (in use, or no such address here).
function tryListen(port, host) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once('error', (err) => resolve(err.code === 'EADDRNOTAVAIL' || err.code === 'EAFNOSUPPORT' ? 'none' : null));
    srv.listen(port, host, () => {
      const { port: got } = srv.address();
      srv.close(() => resolve(got));
    });
  });
}

// A port is free only if every address can take it. On Windows a listen on all addresses
// succeeds beside another app's listen on one loopback address, and vite preview listens on
// `localhost` (either loopback address), so each one is checked on its own.
const HOSTS = ['127.0.0.1', '::1', '0.0.0.0', '::'];

async function isFree(port) {
  for (const host of HOSTS) if ((await tryListen(port, host)) === null) return false;
  return true;
}

async function pick() {
  if (preferred && (await isFree(preferred))) return preferred;
  for (let i = 0; i < 20; i++) {
    const port = await tryListen(0, '::');
    const got = typeof port === 'number' ? port : await tryListen(0, '0.0.0.0');
    if (typeof got === 'number' && (await isFree(got))) return got;
  }
  return null;
}

const port = await pick();
if (!port) process.exit(1);
process.stdout.write(String(port));
