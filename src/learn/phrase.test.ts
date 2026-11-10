import { describe, it, expect } from 'vitest';
import { isValidSearchTerm } from './phrase';

describe('isValidSearchTerm', () => {
  it.each(['DNS TTL', 'bash local variable', 'rfc-1918 private.ranges'])('accepts %s', (s) => {
    expect(isValidSearchTerm(s)).toBe(true);
  });
  it.each([
    ['one word', 'one'],
    ['seven words', 'a b c d e f g'],
    ['over 50 characters', `${'abcdefghij '.repeat(4)}abcdefghijkl`],
    ['ampersand', 'a&b c'],
    ['url', 'https://x.y z'],
    ['slash', 'dns/ttl more'],
    ['empty', ''],
    ['TCP/IP', 'TCP/IP stack'],
  ])('rejects %s', (_n, s) => {
    expect(isValidSearchTerm(s)).toBe(false);
  });
});
