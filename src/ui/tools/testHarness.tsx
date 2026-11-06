import type { ReactNode } from 'react';
import { PanelProvider, usePanelState } from '../panels/PanelProvider';
import { RunToolsProvider, ToolButtons, ToolPanels } from './RunTools';

/** A run with its tool buttons and panels, as a runner mounts them. */
export function ToolsHarness({ children }: { children?: ReactNode }) {
  const api = usePanelState();
  return (
    <PanelProvider api={api}>
      <RunToolsProvider>
        <ToolButtons />
        {children}
        <ToolPanels />
      </RunToolsProvider>
    </PanelProvider>
  );
}
