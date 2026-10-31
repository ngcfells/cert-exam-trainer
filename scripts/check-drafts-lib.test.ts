import { describe, expect, it } from 'vitest';
import type { Question } from '../src/domain/types';
import { bankWithoutDrafts } from './check-drafts-lib';

const q = (id: string, stem: string) => ({ id, stem }) as unknown as Question;

describe('bankWithoutDrafts', () => {
  it('drops bank items that are the draft itself (the file already sits in items/)', () => {
    expect(bankWithoutDrafts([q('x-001', 'Same'), q('x-002', 'Other')], [q('x-001', 'Same')])).toEqual([q('x-002', 'Other')]);
  });

  it('treats the parsed bank copy as the same item when only key order differs', () => {
    const bankCopy = { stem: 'Same', id: 'x-001' } as unknown as Question;
    expect(bankWithoutDrafts([bankCopy], [q('x-001', 'Same')])).toEqual([]);
  });

  it('keeps a bank item that shares an id with a different draft, so the repeat is still reported', () => {
    expect(bankWithoutDrafts([q('x-001', 'Old stem')], [q('x-001', 'New stem')])).toEqual([q('x-001', 'Old stem')]);
  });
});
