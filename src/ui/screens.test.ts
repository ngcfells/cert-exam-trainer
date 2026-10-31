import { describe, it, expect } from 'vitest';
import { parentOf } from './screens';

describe('parentOf', () => {
  it('sends a tool back to its exam page', () => {
    expect(parentOf({ name: 'mock', exam: 'DA0-002' })).toEqual({ name: 'exam', exam: 'DA0-002' });
    expect(parentOf({ name: 'learn', exam: 'CY0-001', lesson: 'x' })).toEqual({ name: 'exam', exam: 'CY0-001' });
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
