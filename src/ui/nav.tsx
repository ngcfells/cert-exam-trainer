import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';

export const LEAVE_RUN = 'Leave this exam? Your answers will be lost.';
/** A mock exam: leaving ends and scores it, and the results show in place. */
export const LEAVE_MOCK = 'Leave and score the exam now?';

/** How long after the app's own leave prompt a window blur is still put down to the prompt. */
export const PROMPT_GRACE_MS = 500;

let prompting = false;
let promptTimer: ReturnType<typeof setTimeout> | undefined;

/** True while the app's own leave prompt is up, and for a moment after: browsers blur the window for it. */
export function isPrompting(): boolean {
  return prompting;
}

function askLeave(message: string): boolean {
  prompting = true;
  clearTimeout(promptTimer);
  try {
    return window.confirm(message);
  } finally {
    promptTimer = setTimeout(() => (prompting = false), PROMPT_GRACE_MS);
  }
}

interface Guard {
  message: string;
  /** Runs on OK instead of leaving; the app stays on the screen. */
  onLeave?: () => void;
}

/** The guards raised by the mounted screen; the newest one speaks. */
export class LeaveGuards {
  private guards: Guard[] = [];

  add(g: Guard): () => void {
    this.guards.push(g);
    return () => {
      this.guards = this.guards.filter((x) => x !== g);
    };
  }

  /** True when there is nothing to lose, or the user agrees to leave. */
  confirmLeave(): boolean {
    const g = this.guards.at(-1);
    if (!g) return true;
    const ok = askLeave(g.message);
    if (!g.onLeave) return ok;
    if (ok) g.onLeave();
    return false;
  }
}

/** A tool's inner level: what Back is called and does instead of going to the parent screen. */
export interface NavUp {
  label: string;
  onUp: () => void;
}

export interface NavApi {
  guards: LeaveGuards;
  setUp: (up: NavUp) => void;
  clearUp: (up: NavUp) => void;
}

// Outside a provider (unit tests of one screen) guards and inner levels are kept but unused.
const NavContext = createContext<NavApi>({ guards: new LeaveGuards(), setUp: () => {}, clearUp: () => {} });

export function NavProvider({ api, children }: { api: NavApi; children: ReactNode }) {
  return <NavContext.Provider value={api}>{children}</NavContext.Provider>;
}

/** While `active`, leaving by the nav bar or browser Back asks `message` first. With `onLeave`, OK calls it and stays. */
export function useLeaveGuard(active: boolean, message: string = LEAVE_RUN, onLeave?: () => void): void {
  const { guards } = useContext(NavContext);
  const onLeaveRef = useRef(onLeave);
  onLeaveRef.current = onLeave;
  const hasLeave = onLeave !== undefined;
  useEffect(
    () => (active ? guards.add(hasLeave ? { message, onLeave: () => onLeaveRef.current?.() } : { message }) : undefined),
    [guards, active, message, hasLeave],
  );
}

/** Makes Back go to this tool's previous level, labelled `label`; `null` means the parent screen. */
export function useNavUp(label: string | null, onUp: () => void): void {
  const { setUp, clearUp } = useContext(NavContext);
  const onUpRef = useRef(onUp);
  onUpRef.current = onUp;
  // Layout effect, so the bar never paints the old label for a frame.
  useLayoutEffect(() => {
    if (label === null) return;
    const up = { label, onUp: () => onUpRef.current() };
    setUp(up);
    return () => clearUp(up);
  }, [label, setUp, clearUp]);
}

/** The app's nav state: one guard list and the current inner level. */
export function useNavState(): { api: NavApi; up: NavUp | null } {
  const [up, setUpState] = useState<NavUp | null>(null);
  const [api] = useState<NavApi>(() => ({
    guards: new LeaveGuards(),
    setUp: (u) => setUpState(u),
    clearUp: (u) => setUpState((cur) => (cur === u ? null : cur)),
  }));
  return { api, up };
}

/**
 * The nav bar's Back: asks first if a run would be lost, then climbs the tool's inner level if it
 * has one, else calls `toParent`. Returns false when the user chose to stay.
 */
export function navBack(api: NavApi, up: NavUp | null, toParent: () => void): boolean {
  if (!api.guards.confirmLeave()) return false;
  if (up) up.onUp();
  else toParent();
  return true;
}

export function NavBar({ label, backLabel, onBack, onHome }: { label: string; backLabel: string; onBack: () => void; onHome: () => void }) {
  return (
    <nav className="top-nav" aria-label={label}>
      <button type="button" onClick={onBack}>
        {backLabel}
      </button>
      <button type="button" onClick={onHome}>
        ⌂ All exams
      </button>
    </nav>
  );
}

/** True while the page, not counting `exclude`, is taller than the window. */
export function useTallPage(exclude: RefObject<HTMLElement>): boolean {
  const [tall, setTall] = useState(false);
  useEffect(() => {
    const check = () => {
      const el = exclude.current;
      const css = el && window.getComputedStyle(el);
      const own = el && css ? el.offsetHeight + parseFloat(css.marginTop) + parseFloat(css.marginBottom) : 0;
      setTall(document.documentElement.scrollHeight - own > window.innerHeight);
    };
    check();
    window.addEventListener('resize', check);
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(check);
    ro?.observe(document.body);
    return () => {
      window.removeEventListener('resize', check);
      ro?.disconnect();
    };
  }, [exclude]);
  return tall;
}
