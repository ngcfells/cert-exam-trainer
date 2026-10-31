import { describe, it, expect, vi, afterEach } from 'vitest';
import { armHistory } from './history';

const pop = (state: unknown = null) => window.dispatchEvent(new PopStateEvent('popstate', { state }));

afterEach(() => vi.restoreAllMocks());

describe('armHistory', () => {
  it('pushes one trap entry however often it is armed', () => {
    const push = vi.spyOn(window.history, 'pushState');
    const h = armHistory(() => {});
    h.arm();
    h.arm();
    expect(push).toHaveBeenCalledTimes(1);
    h.dispose();
  });

  it('turns browser Back into one onBack call, and the next arm pushes again', () => {
    const push = vi.spyOn(window.history, 'pushState');
    const onBack = vi.fn();
    const h = armHistory(onBack);
    h.arm();
    pop();
    expect(onBack).toHaveBeenCalledTimes(1);
    pop();
    expect(onBack).toHaveBeenCalledTimes(1);
    h.arm();
    expect(push).toHaveBeenCalledTimes(2);
    h.dispose();
  });

  it('leaves Back alone when not armed, so the landing page can be left', () => {
    const onBack = vi.fn();
    const h = armHistory(onBack);
    pop();
    expect(onBack).not.toHaveBeenCalled();
    h.dispose();
  });

  it('ignores the popstate of its own disarm', () => {
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    const onBack = vi.fn();
    const h = armHistory(onBack);
    h.arm();
    h.disarm();
    expect(back).toHaveBeenCalledTimes(1);
    pop();
    expect(onBack).not.toHaveBeenCalled();
    h.dispose();
  });

  it('arming while a disarm is in flight waits for it, then pushes', () => {
    vi.spyOn(window.history, 'back').mockImplementation(() => {});
    const push = vi.spyOn(window.history, 'pushState');
    const onBack = vi.fn();
    const h = armHistory(onBack);
    h.arm();
    h.disarm();
    h.arm();
    expect(push).toHaveBeenCalledTimes(1);
    pop();
    expect(push).toHaveBeenCalledTimes(2);
    pop();
    expect(onBack).toHaveBeenCalledTimes(1);
    h.dispose();
  });

  it('re-claims a trap entry reached with browser Forward', () => {
    const onBack = vi.fn();
    const h = armHistory(onBack);
    pop({ trap: true });
    pop();
    expect(onBack).toHaveBeenCalledTimes(1);
    h.dispose();
  });
});
