import { describe, it, expect } from 'vitest';
import { isPbqTemplate } from '../domain/pbq';
import { questionSchema } from '../domain/schema';
import { JSON_STARTERS, usesJsonEditor, type JsonType } from './starters';

describe('JSON_STARTERS', () => {
  it.each(Object.keys(JSON_STARTERS) as JsonType[])('every starter passes questionSchema: %s', (type) => {
    const q = {
      id: 'x', exam: 'DA0-002', source: 'user', type, objectiveIds: ['1.1'], difficulty: 2, ...(isPbqTemplate(type) ? { pbqWeight: 2 } : {}),
      stem: 'S', explanation: '', acronyms: [], status: 'draft', ...JSON_STARTERS[type],
    };
    expect(questionSchema.safeParse(q).error?.issues ?? []).toEqual([]);
  });

  it('numeric and PBQs use the JSON editor, MCQs do not', () => {
    expect(usesJsonEditor('numeric')).toBe(true);
    expect(usesJsonEditor('pbq-order')).toBe(true);
    expect(usesJsonEditor('mcq-single')).toBe(false);
  });
});
