import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

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

// Outside a provider (unit tests of one screen) guards are kept but nobody asks.
const GuardContext = createContext<LeaveGuards>(new LeaveGuards());

export function LeaveGuardProvider({ guards, children }: { guards: LeaveGuards; children: ReactNode }) {
  return <GuardContext.Provider value={guards}>{children}</GuardContext.Provider>;
}

/** While `active`, leaving by the nav bar, the footer or browser Back asks `message` first. */
export function useLeaveGuard(active: boolean, message: string = LEAVE_RUN): void {
  const guards = useContext(GuardContext);
  useEffect(() => (active ? guards.add({ message }) : undefined), [guards, active, message]);
}

/** One `LeaveGuards` for the life of the app. */
export function useLeaveGuards(): LeaveGuards {
  const [guards] = useState(() => new LeaveGuards());
  return guards;
}
