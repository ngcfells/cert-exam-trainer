// Test helpers for screens that use the nav context.
import type { ReactNode } from 'react';
import { LeaveGuards, NavBar, navBack, NavProvider, useNavState } from './nav';

/** Test helper: provide only guards. */
export function LeaveGuardProvider({ guards, children }: { guards: LeaveGuards; children: ReactNode }) {
  return <NavProvider api={{ guards, setUp: () => {}, clearUp: () => {} }}>{children}</NavProvider>;
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
