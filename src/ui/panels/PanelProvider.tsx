import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export type PanelKind = 'settings' | 'calculator' | 'whiteboard';

export interface PanelApi {
  current: PanelKind | null;
  /** Opens a panel, replacing any open one. Focus returns to `opener` when it closes. */
  open(k: PanelKind, opener: HTMLElement | null): void;
  /** Closes the open panel. `restoreFocus: false` when the screen is changing and sets its own focus. */
  close(opts?: { restoreFocus?: boolean }): void;
  /** The running mock exam's deadline, for the clock in the Settings panel. */
  mockDeadline: number | null;
  setMockDeadline(ms: number | null): void;
}

/** App-level panel state: one panel at a time. */
export function usePanelState(): PanelApi {
  const [current, setCurrent] = useState<PanelKind | null>(null);
  const [mockDeadline, setMockDeadline] = useState<number | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const refocus = useRef<HTMLElement | null>(null);

  const open = useCallback((k: PanelKind, el: HTMLElement | null) => {
    opener.current = el;
    setCurrent(k);
  }, []);
  const close = useCallback((opts?: { restoreFocus?: boolean }) => {
    refocus.current = opts?.restoreFocus === false ? null : opener.current;
    opener.current = null;
    setCurrent(null);
  }, []);

  useEffect(() => {
    if (current !== null) return;
    const el = refocus.current;
    refocus.current = null;
    if (el?.isConnected) el.focus();
  }, [current]);

  return useMemo(() => ({ current, open, close, mockDeadline, setMockDeadline }), [current, open, close, mockDeadline]);
}

const PanelContext = createContext<PanelApi | null>(null);

export function PanelProvider({ api, children }: { api: PanelApi; children: ReactNode }) {
  return <PanelContext.Provider value={api}>{children}</PanelContext.Provider>;
}

const NO_PANELS: PanelApi = {
  current: null,
  open: () => {},
  close: () => {},
  mockDeadline: null,
  setMockDeadline: () => {},
};

/** The app's panels. Outside a provider (screen tests) it is a no-op, so screens render alone. */
export function usePanels(): PanelApi {
  return useContext(PanelContext) ?? NO_PANELS;
}
