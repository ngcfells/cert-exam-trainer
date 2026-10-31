import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Checks the built output; `npm run check` builds dist/ and dist-single/ before unit tests.
const built = existsSync('dist/index.html') && existsSync('dist-single/index.html');

describe.skipIf(!built)('PWA build output (run npm run build && npm run build:single first)', () => {
  it('manifest has relative scope and our name and icon', () => {
    const m = JSON.parse(readFileSync('dist/manifest.webmanifest', 'utf8'));
    expect(m).toMatchObject({ name: 'Cert Exam Trainer', short_name: 'Exam Trainer', start_url: './', scope: './', display: 'standalone' });
    expect(m.icons).toContainEqual(expect.objectContaining({ type: 'image/svg+xml', sizes: 'any' }));
  });

  it('service worker precaches index.html and every built asset', () => {
    const sw = readFileSync('dist/sw.js', 'utf8');
    expect(sw).toContain('index.html');
    for (const f of readdirSync('dist/assets')) expect(sw, f).toContain(`assets/${f}`);
  });

  it('single-file build has no service-worker code', () => {
    const html = readFileSync('dist-single/index.html', 'utf8');
    expect(html).not.toContain('serviceWorker');
    expect(html).not.toContain('registerSW');
    expect(existsSync('dist-single/sw.js')).toBe(false);
  });
});

it('build output check is not silently skipped in CI-like runs', () => {
  // When run via `npm run check`, CHECK=1 is set and the build must exist.
  if (process.env.CHECK === '1') expect(built).toBe(true);
});
