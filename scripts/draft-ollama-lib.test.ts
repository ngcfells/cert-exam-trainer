import { describe, expect, it } from 'vitest';
import { exampleItem, topicsFor } from './draft-ollama-lib';

const file = '# DA0-002 topics by objective\n\n1.1 Explain data concepts.\n- Database types\n\n2.1 Given a scenario, acquire data.\n- Joins\n';

describe('topicsFor', () => {
  it('returns the section for the objective when the file is for that exam', () => {
    expect(topicsFor(file, 'DA0-002', '2.1')).toBe('2.1 Given a scenario, acquire data.\n- Joins\n');
  });

  it("never returns another exam's topics", () => {
    expect(topicsFor(file, 'CY0-001', '2.1')).toBeUndefined();
  });

  it('returns undefined for an objective the file does not list', () => {
    expect(topicsFor(file, 'DA0-002', '5.9')).toBeUndefined();
  });
});

describe('exampleItem', () => {
  it('uses a Data+ example for DA0-002', () => {
    expect(exampleItem('DA0-002', '1.1', 'da2-1-1-mcq-').stem).toMatch(/table column/);
  });

  it('uses a SecAI+ example for CY0-001, with the exam and ids filled in', () => {
    const ex = exampleItem('CY0-001', '2.1', 'cy1-2-1-mcq-');
    expect(ex.stem).not.toMatch(/table column/);
    expect(ex).toMatchObject({ id: 'cy1-2-1-mcq-001', exam: 'CY0-001', objectiveIds: ['2.1'], status: 'draft' });
  });

  it('uses an AutoOps+ example for AT0-001', () => {
    const ex = exampleItem('AT0-001', '1.2', 'at1-1-2-mcq-');
    expect(ex.stem).toMatch(/Git/);
    expect(ex).toMatchObject({ id: 'at1-1-2-mcq-001', exam: 'AT0-001', objectiveIds: ['1.2'] });
  });

  it('refuses an exam with no example rather than showing another exam', () => {
    expect(() => exampleItem('XX0-001', '1.1', 'xx-1-1-mcq-')).toThrow(/no drafting example/);
  });
});
