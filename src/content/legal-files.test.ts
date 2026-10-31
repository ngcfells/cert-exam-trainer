import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (f: string) => readFileSync(f, 'utf8');

describe('license files', () => {
  it('LICENSE is MIT with the Commons Clause', () => {
    const text = read('LICENSE');
    expect(text).toContain('"Commons Clause" License Condition v1.0');
    expect(text).toContain('Licensor: ngcfells');
    expect(text).toContain('MIT License');
    expect(text).toContain('Copyright (c) 2026 ngcfells');
  });

  it('package.json points at LICENSE', () => {
    expect(JSON.parse(read('package.json')).license).toBe('SEE LICENSE IN LICENSE');
  });

  it('content license grants the training permission', () => {
    const text = read('CONTENT_LICENSE.md');
    expect(text).toContain('CC BY-NC 4.0');
    expect(text).toContain('including businesses, may use');
  });
});
