import { describe, it, expect } from 'vitest';
import { PBQ_TEMPLATES } from '../domain/pbq';
import { questionSchema } from '../domain/schema';
import { PBQ_STARTERS } from './starters';

describe('PBQ_STARTERS', () => {
  it.each(PBQ_TEMPLATES)('every starter passes questionSchema: %s', (type) => {
    const q = {
      id: 'x', exam: 'DA0-002', source: 'user', type, objectiveIds: ['1.1'], difficulty: 2, pbqWeight: 2,
      stem: 'S', explanation: '', acronyms: [], status: 'draft', ...PBQ_STARTERS[type],
    };
    expect(questionSchema.safeParse(q).error?.issues ?? []).toEqual([]);
  });
});
