import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { LeaveGuards, PROMPT_GRACE_MS } from '../nav';
import { useLeaveDetect } from './useLeaveDetect';

function setVisibility(v: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => v });
  document.dispatchEvent(new Event('visibilitychange'));
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  setVisibility('visible');
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useLeaveDetect', () => {
  it('fires once when the page is hidden', () => {
    const onLeave = vi.fn();
    renderHook(() => useLeaveDetect(true, onLeave));
    setVisibility('hidden');
    setVisibility('visible');
    setVisibility('hidden');
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it('does not leave on a blur while the document still has focus (a panel or iframe took it)', () => {
    const onLeave = vi.fn();
    vi.spyOn(document, 'hasFocus').mockReturnValue(true);
    renderHook(() => useLeaveDetect(true, onLeave));
    window.dispatchEvent(new Event('blur'));
    vi.runAllTimers();
    expect(onLeave).not.toHaveBeenCalled();
  });

  it('leaves on a blur when the document has lost focus on the next task', () => {
    const onLeave = vi.fn();
    vi.spyOn(document, 'hasFocus').mockReturnValue(false);
    renderHook(() => useLeaveDetect(true, onLeave));
    window.dispatchEvent(new Event('blur'));
    expect(onLeave).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it('counts a blur right after Tab: focus that reaches the browser toolbar has left the page', () => {
    const onLeave = vi.fn();
    vi.spyOn(document, 'hasFocus').mockReturnValue(false);
    renderHook(() => useLeaveDetect(true, onLeave));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    window.dispatchEvent(new Event('blur'));
    vi.runAllTimers();
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  describe('Tab wraps inside the page, so the keyboard never tabs out of the exam', () => {
    const tab = (el: Element, shiftKey = false) => {
      const e = new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true });
      el.dispatchEvent(e);
      return e.defaultPrevented;
    };
    afterEach(() => document.body.replaceChildren());

    it('wraps Tab from the last control to the first, and Shift+Tab from the first to the last', () => {
      document.body.innerHTML = '<button>first</button><input aria-label="mid"><button disabled>off</button><button>last</button><button hidden>gone</button>';
      const [first, , , last] = document.querySelectorAll('button, input') as unknown as HTMLElement[];
      renderHook(() => useLeaveDetect(true, vi.fn()));
      last.focus();
      expect(tab(last)).toBe(true);
      expect(document.activeElement).toBe(first);
      expect(tab(first, true)).toBe(true);
      expect(document.activeElement).toBe(last);
    });

    it('treats a radio group as one stop, as the browser does', () => {
      document.body.innerHTML =
        '<button>first</button><input type="radio" name="t" aria-label="a"><input type="radio" name="t" aria-label="b" checked><input type="radio" name="t" aria-label="c">';
      const first = document.querySelector('button')!;
      const radios = document.querySelectorAll('input');
      renderHook(() => useLeaveDetect(true, vi.fn()));
      radios[1].focus();
      expect(tab(radios[1])).toBe(true);
      expect(document.activeElement).toBe(first);
      expect(tab(first, true)).toBe(true);
      expect(document.activeElement).toBe(radios[1]);
      // No choice yet: the browser stops on the first radio going forward, the last going back.
      radios[1].checked = false;
      radios[0].focus();
      expect(tab(radios[0])).toBe(true);
      expect(document.activeElement).toBe(first);
    });

    it('leaves Tab alone between controls in the middle', () => {
      document.body.innerHTML = '<button>first</button><button>second</button><button>last</button>';
      const second = document.querySelectorAll('button')[1];
      renderHook(() => useLeaveDetect(true, vi.fn()));
      second.focus();
      expect(tab(second)).toBe(false);
      expect(tab(second, true)).toBe(false);
    });

    it('wraps inside an open dialog (a panel) rather than the page', () => {
      document.body.innerHTML = '<button>page</button><dialog open><button>close</button><button>key</button></dialog>';
      const [, close, key] = document.querySelectorAll('button');
      renderHook(() => useLeaveDetect(true, vi.fn()));
      key.focus();
      expect(tab(key)).toBe(true);
      expect(document.activeElement).toBe(close);
    });

    it('does not wrap while inactive', () => {
      document.body.innerHTML = '<button>first</button><button>last</button>';
      const last = document.querySelectorAll('button')[1];
      renderHook(() => useLeaveDetect(false, vi.fn()));
      last.focus();
      expect(tab(last)).toBe(false);
    });
  });

  it('does not leave on the blur the app’s own leave prompt causes, even when Cancel is chosen', () => {
    const onLeave = vi.fn();
    const scored = vi.fn();
    vi.spyOn(document, 'hasFocus').mockReturnValue(false);
    // A real browser blurs the window while confirm() is up, and may give focus back late.
    vi.spyOn(window, 'confirm').mockImplementation(() => {
      window.dispatchEvent(new Event('blur'));
      return false;
    });
    renderHook(() => useLeaveDetect(true, onLeave));
    const guards = new LeaveGuards();
    guards.add({ message: 'Leave?', onLeave: scored });
    expect(guards.confirmLeave()).toBe(false);
    window.dispatchEvent(new Event('blur'));
    vi.advanceTimersByTime(PROMPT_GRACE_MS - 1);
    expect(onLeave).not.toHaveBeenCalled();
    expect(scored).not.toHaveBeenCalled();
    // After the grace period a blur counts again.
    vi.advanceTimersByTime(1);
    window.dispatchEvent(new Event('blur'));
    vi.runAllTimers();
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it('fires nothing while inactive', () => {
    const onLeave = vi.fn();
    vi.spyOn(document, 'hasFocus').mockReturnValue(false);
    renderHook(() => useLeaveDetect(false, onLeave));
    setVisibility('hidden');
    window.dispatchEvent(new Event('blur'));
    vi.runAllTimers();
    expect(onLeave).not.toHaveBeenCalled();
  });

  it('removes its listeners on unmount', () => {
    const onLeave = vi.fn();
    vi.spyOn(document, 'hasFocus').mockReturnValue(false);
    const { unmount } = renderHook(() => useLeaveDetect(true, onLeave));
    window.dispatchEvent(new Event('blur'));
    unmount();
    vi.runAllTimers();
    setVisibility('hidden');
    expect(onLeave).not.toHaveBeenCalled();
  });
});
