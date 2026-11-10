import { describe, it, expect } from 'vitest';
import { backLabel, parentOf } from './screens';

describe('backLabel', () => {
  it('names the exam when Back goes to its page', () => {
    expect(backLabel({ name: 'practice', exam: 'DA0-002' })).toBe('← Back to Data+');
    expect(backLabel({ name: 'mock', exam: 'CY0-001' })).toBe('← Back to SecAI+');
    expect(backLabel({ name: 'cram', exam: 'AT0-001' })).toBe('← Back to AutoOps+');
  });

  it('is plain elsewhere', () => {
    expect(backLabel({ name: 'settings' })).toBe('← Back');
    expect(backLabel({ name: 'exam', exam: 'DA0-002' })).toBe('← Back');
    expect(backLabel({ name: 'edit', exam: 'DA0-002' })).toBe('← Back');
  });
});

describe('parentOf', () => {
  it('sends a tool back to its exam page', () => {
    expect(parentOf({ name: 'mock', exam: 'DA0-002' })).toEqual({ name: 'exam', exam: 'DA0-002' });
    expect(parentOf({ name: 'learn', exam: 'CY0-001', lesson: 'x' })).toEqual({ name: 'exam', exam: 'CY0-001' });
    expect(parentOf({ name: 'primer', exam: 'DA0-002' })).toEqual({ name: 'exam', exam: 'DA0-002' });
  });

  it('sends the editor back to My questions for the same exam', () => {
    expect(parentOf({ name: 'edit', exam: 'DA0-002', id: 'q' })).toEqual({ name: 'questions', exam: 'DA0-002' });
  });

  it('sends the exam page, Settings, About and Home to Home', () => {
    for (const s of [{ name: 'exam', exam: 'DA0-002' }, { name: 'settings' }, { name: 'about' }, { name: 'home' }] as const) {
      expect(parentOf(s)).toEqual({ name: 'home' });
    }
  });
});
