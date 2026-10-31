import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { expect, it } from 'vitest';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}

// Colours come from the tokens in src/index.css so both themes stay AA.
it('no hard-coded colours in UI components or area stylesheets', () => {
  const offenders = files('src/ui')
    .filter((f) => /\.(tsx|css)$/.test(f) && !f.endsWith('.test.tsx'))
    .filter((f) => /#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(readFileSync(f, 'utf8')));
  expect(offenders).toEqual([]);
});
