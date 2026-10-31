import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';

export const LEAVE_RUN = 'Leave this exam? Your answers will be lost.';

interface Guard {
  message: string;
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
    return !g || window.confirm(g.message);
  }
}

/** A tool's inner level: what Back is called and does instead of going to the parent screen. */
export interface NavUp {
  label: string;
  onUp: () => void;
}

interface NavApi {
  guards: LeaveGuards;
  setUp: (up: NavUp) => void;
  clearUp: (up: NavUp) => void;
}

// Outside a provider (unit tests of one screen) guards and inner levels are kept but unused.
const NavContext = createContext<NavApi>({ guards: new LeaveGuards(), setUp: () => {}, clearUp: () => {} });

export function NavProvider({ api, children }: { api: NavApi; children: ReactNode }) {
  return <NavContext.Provider value={api}>{children}</NavContext.Provider>;
}

/** Test helper: provide only guards. */
export function LeaveGuardProvider({ guards, children }: { guards: LeaveGuards; children: ReactNode }) {
  return <NavProvider api={{ guards, setUp: () => {}, clearUp: () => {} }}>{children}</NavProvider>;
}

/** While `active`, leaving by the nav bar or browser Back asks `message` first. */
export function useLeaveGuard(active: boolean, message: string = LEAVE_RUN): void {
  const { guards } = useContext(NavContext);
  useEffect(() => (active ? guards.add({ message }) : undefined), [guards, active, message]);
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

/** Test helper: one screen inside a working nav bar. `onParent` is where Back goes with no inner level. */
export function TestNav({ children, onParent = () => {} }: { children: ReactNode; onParent?: () => void }) {
  const { api, up } = useNavState();
  return (
    <NavProvider api={api}>
      <NavBar label="Page navigation" backLabel={up?.label ?? '← Back'} onBack={() => void navBack(api, up, onParent)} onHome={() => {}} />
      {children}
    </NavProvider>
  );
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
