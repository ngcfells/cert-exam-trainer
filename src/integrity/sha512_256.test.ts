// @vitest-environment node
import { createHash, randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { hashText, sha512_256 } from './sha512_256';

const node = (b: Uint8Array) => createHash('sha512-256').update(b).digest('hex');

describe('sha512_256', () => {
  it('matches the published test vectors', () => {
    expect(sha512_256(new Uint8Array())).toBe('c672b8d1ef56ed28ab87c3622c5114069bdd3ad7b8f9737498d0c01ecef0967a');
    expect(hashText('abc')).toBe('53048e2681941ef99b2e29b76b4c7dabe4c2d0c634fc6d46e0e2f13107e7af23');
  });

  it('matches Node for every length around the block and padding boundaries', () => {
    const data = randomBytes(300);
    for (let n = 0; n <= 300; n++) expect(sha512_256(data.subarray(0, n)), `length ${n}`).toBe(node(data.subarray(0, n)));
  });

  it('matches Node for larger random inputs', () => {
    for (const size of [1000, 4096, 65_537, 99_999, 100_000]) {
      const data = randomBytes(size);
      expect(sha512_256(data), `size ${size}`).toBe(node(data));
    }
  });

  it('hashes text as UTF-8, including characters outside ASCII and the basic plane', () => {
    const text = 'ε × “q” 😀';
    expect(hashText(text)).toBe(node(Buffer.from(text, 'utf8')));
  });
});
