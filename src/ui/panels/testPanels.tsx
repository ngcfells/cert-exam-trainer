import type { ReactNode } from 'react';
import { PanelProvider, usePanels, usePanelState } from './PanelProvider';

/** Gives a screen under test the app's panel state, as App does. */
export function WithPanels({ children }: { children: ReactNode }) {
  const api = usePanelState();
  return <PanelProvider api={api}>{children}</PanelProvider>;
}

/** Shows the panel state, for assertions. */
export function PanelProbe() {
  const { current, mockDeadline } = usePanels();
  return <span data-testid="panel-probe" data-current={current ?? ''} data-deadline={mockDeadline ?? ''} />;
}
