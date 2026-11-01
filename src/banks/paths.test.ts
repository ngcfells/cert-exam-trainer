import { describe, it, expect } from 'vitest';
import { BANKS, bankFor, itemIdPrefix } from './paths';

describe('bank paths', () => {
  it('maps each exam to its folder and id prefix', () => {
    expect(BANKS['DA0-002']).toEqual({ dir: 'dataplus', idPrefix: 'da2' });
    expect(BANKS['CY0-001']).toEqual({ dir: 'secai', idPrefix: 'cy1' });
    expect(BANKS['AT0-001']).toEqual({ dir: 'autoops', idPrefix: 'at1' });
  });

  it('builds item id prefixes from exam, objective and type', () => {
    expect(itemIdPrefix('CY0-001', '2.6', 'mcq-multi')).toBe('cy1-2-6-mcq-');
    expect(itemIdPrefix('DA0-002', '2.3', 'pbq-hotspot')).toBe('da2-2-3-hotspot-');
    expect(itemIdPrefix('DA0-002', '3.2', 'numeric')).toBe('da2-3-2-num-');
    expect(itemIdPrefix('AT0-001', '1.4', 'pbq-terminal')).toBe('at1-1-4-terminal-');
  });

  it('throws on an unknown exam', () => {
    expect(() => bankFor('XX0-000')).toThrow('unknown exam "XX0-000"');
  });
});
