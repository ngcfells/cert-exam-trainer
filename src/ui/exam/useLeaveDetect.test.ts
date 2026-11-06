import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
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

  it('does not leave when Tab moves focus out to the browser toolbar, but a later blur still counts', () => {
    const onLeave = vi.fn();
    vi.spyOn(document, 'hasFocus').mockReturnValue(false);
    renderHook(() => useLeaveDetect(true, onLeave));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    window.dispatchEvent(new Event('blur'));
    vi.runAllTimers();
    expect(onLeave).not.toHaveBeenCalled();
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
