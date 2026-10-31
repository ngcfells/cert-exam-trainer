import { describe, it, expect, vi, afterEach } from 'vitest';
import { armHistory } from './history';

const pop = (state: unknown = null) => window.dispatchEvent(new PopStateEvent('popstate', { state }));
const below = () => false;
const onHome = () => true;

afterEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState(null, '');
});

describe('armHistory', () => {
  it('pushes one trap entry however often it is armed', () => {
    const push = vi.spyOn(window.history, 'pushState').mockImplementation(() => {});
    const h = armHistory(() => {}, below);
    h.arm();
    h.arm();
    expect(push).toHaveBeenCalledTimes(1);
    h.dispose();
  });

  it('turns browser Back into one onBack call, and the next arm pushes again', () => {
    const push = vi.spyOn(window.history, 'pushState').mockImplementation(() => {});
    const onBack = vi.fn();
    const h = armHistory(onBack, below);
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
    const h = armHistory(onBack, onHome);
    pop();
    expect(onBack).not.toHaveBeenCalled();
    h.dispose();
  });

  it('ignores the popstate of its own disarm', () => {
    vi.spyOn(window.history, 'pushState').mockImplementation(() => {});
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    const onBack = vi.fn();
    const h = armHistory(onBack, below);
    h.arm();
    h.disarm();
    expect(back).toHaveBeenCalledTimes(1);
    pop();
    expect(onBack).not.toHaveBeenCalled();
    h.dispose();
  });

  it('arming while a disarm is in flight waits for it, then pushes', () => {
    vi.spyOn(window.history, 'back').mockImplementation(() => {});
    const push = vi.spyOn(window.history, 'pushState').mockImplementation(() => {});
    const onBack = vi.fn();
    const h = armHistory(onBack, below);
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

  it('after a reload on a trap entry, the first disarm pops it', () => {
    window.history.replaceState({ trap: true }, '');
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    const h = armHistory(() => {}, onHome);
    h.disarm();
    expect(back).toHaveBeenCalledTimes(1);
    pop();
    h.dispose();
  });

  it('a second controller (StrictMode) does not pop again while the first one is popping', () => {
    window.history.replaceState({ trap: true }, '');
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    const first = armHistory(() => {}, onHome);
    first.disarm();
    first.dispose();
    const second = armHistory(() => {}, onHome);
    second.disarm();
    expect(back).toHaveBeenCalledTimes(1);
    pop();
    second.dispose();
  });

  it('Forward onto an old trap below the landing page re-claims it', () => {
    const onBack = vi.fn();
    const h = armHistory(onBack, below);
    pop({ trap: true });
    pop();
    expect(onBack).toHaveBeenCalledTimes(1);
    h.dispose();
  });

  it('Forward onto an old trap on the landing page drops it, so Back still leaves the app', () => {
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    const onBack = vi.fn();
    const h = armHistory(onBack, onHome);
    pop({ trap: true });
    expect(back).toHaveBeenCalledTimes(1);
    pop();
    pop();
    expect(onBack).not.toHaveBeenCalled();
    h.dispose();
  });
});
