// Prints the preferred port if it is free, or else a free port the OS picks (an ephemeral port).
//   node scripts/free-port.mjs 4173
import net from 'node:net';
import process from 'node:process';

const preferred = Number(process.argv[2] ?? 0);

function tryListen(port) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once('error', () => resolve(null));
    // No host: listen on all addresses, as vite preview does, so a server on any of them counts as taken.
    srv.listen(port, () => {
      const { port: got } = srv.address();
      srv.close(() => resolve(got));
    });
  });
}

const port = (preferred && (await tryListen(preferred))) || (await tryListen(0));
if (!port) process.exit(1);
process.stdout.write(String(port));
