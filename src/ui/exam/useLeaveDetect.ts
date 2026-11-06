import { useEffect, useRef } from 'react';

/**
 * While `active`, calls `onLeave` once when the user leaves the page: it is hidden (tab or app switch, phone
 * locked, something taking over the screen), or the window loses focus to something outside the document.
 * A blur that only moves focus inside the page (a dialog, an iframe) is ignored: the check waits one task.
 * A blur caused by Tab is ignored too: keyboard users tab through the browser toolbar and back.
 */
export function useLeaveDetect(active: boolean, onLeave: () => void): void {
  const onLeaveRef = useRef(onLeave);
  onLeaveRef.current = onLeave;
  useEffect(() => {
    if (!active) return;
    let fired = false;
    let tabbing = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let tabTimer: ReturnType<typeof setTimeout> | undefined;
    const leave = () => {
      if (fired) return;
      fired = true;
      onLeaveRef.current();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') leave();
    };
    // Focus moves as part of the Tab keydown, so a blur from it lands before this timer clears the flag.
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      tabbing = true;
      clearTimeout(tabTimer);
      tabTimer = setTimeout(() => (tabbing = false), 0);
    };
    const onBlur = () => {
      if (tabbing) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!document.hasFocus()) leave();
      }, 0);
    };
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('blur', onBlur);
    return () => {
      clearTimeout(timer);
      clearTimeout(tabTimer);
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('blur', onBlur);
    };
  }, [active]);
}
