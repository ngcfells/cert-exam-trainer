import { useEffect, useRef } from 'react';
import { isPrompting } from '../nav';

const FOCUSABLE = 'a[href], button, input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])';

const isRadio = (el: Element | null): el is HTMLInputElement => el instanceof HTMLInputElement && el.type === 'radio' && el.name !== '';

/** The other radios in `r`'s group, `r` included, in page order. */
function group(r: HTMLInputElement, all: HTMLElement[]): HTMLInputElement[] {
  return all.filter((el): el is HTMLInputElement => isRadio(el) && el.name === r.name && el.form === r.form);
}

/** One element per Tab stop in `scope`, in page order. A radio group is one stop, as in the browser. */
function tabStops(scope: ParentNode): { stops: HTMLElement[]; all: HTMLElement[] } {
  const all = [...scope.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => !(el as HTMLButtonElement).disabled && !el.closest('[hidden], [inert]') && el.tabIndex >= 0,
  );
  const stops = all.filter((el) => {
    if (!isRadio(el)) return true;
    const g = group(el, all);
    const checked = g.find((r) => r.checked);
    return checked ? el === checked : el === g[0];
  });
  return { stops, all };
}

/** True when focus on `at` sits on the stop `stop` (anywhere in its radio group). */
function onStop(at: Element | null, stop: HTMLElement, all: HTMLElement[]): boolean {
  if (at === stop) return true;
  return isRadio(at) && isRadio(stop) && group(stop, all).includes(at);
}

/**
 * While `active`, calls `onLeave` once when the user leaves the page: it is hidden (tab or app switch, phone
 * locked, something taking over the screen), or the window loses focus to something outside the document.
 * A blur that only moves focus inside the page (a dialog, an iframe) is ignored: the check waits one task.
 * So is the blur the app's own leave prompt causes (see `isPrompting`).
 * Tab and Shift+Tab wrap at the ends of the page, or of an open panel, so the keyboard never tabs out to the
 * browser by accident. Browser keys (F6, Ctrl+L) still reach the toolbar, and that counts as leaving.
 */
export function useLeaveDetect(active: boolean, onLeave: () => void): void {
  const onLeaveRef = useRef(onLeave);
  onLeaveRef.current = onLeave;
  useEffect(() => {
    if (!active) return;
    let fired = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const leave = () => {
      if (fired) return;
      fired = true;
      onLeaveRef.current();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') leave();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || e.altKey || e.ctrlKey || e.metaKey) return;
      const dialogs = document.querySelectorAll('dialog[open]');
      const { stops, all } = tabStops(dialogs.length ? dialogs[dialogs.length - 1] : document.body);
      if (!stops.length) return;
      const first = stops[0];
      const last = stops[stops.length - 1];
      const at = document.activeElement;
      // Back into a radio group with no choice yet, the browser lands on its last radio.
      const lastIn = isRadio(last) && !last.checked ? group(last, all).at(-1)! : last;
      const target = e.shiftKey ? (onStop(at, first, all) ? lastIn : null) : onStop(at, last, all) ? first : null;
      if (!target) return;
      e.preventDefault();
      target.focus();
    };
    const onBlur = () => {
      if (isPrompting()) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!isPrompting() && !document.hasFocus()) leave();
      }, 0);
    };
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('blur', onBlur);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('blur', onBlur);
    };
  }, [active]);
}
