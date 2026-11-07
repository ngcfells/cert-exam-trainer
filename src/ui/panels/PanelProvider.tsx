import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ReportMode } from '../../report/contract';

export type PanelKind = 'settings' | 'calculator' | 'whiteboard' | 'report' | 'command-help';

/** Where a report was started from. Empty for the general entry points. */
export interface ReportContext {
  questionId?: string;
  exam?: string;
  mode?: ReportMode;
}

export interface PanelApi {
  current: PanelKind | null;
  /** Opens a panel, replacing any open one. Focus returns to `opener` when it closes. */
  open(k: PanelKind, opener: HTMLElement | null): void;
  /** Closes the open panel. `restoreFocus: false` when the screen is changing and sets its own focus. */
  close(opts?: { restoreFocus?: boolean }): void;
  /** The running mock exam's deadline, for the clock in the Settings panel. */
  mockDeadline: number | null;
  setMockDeadline(ms: number | null): void;
  /** What the report panel was opened for. */
  reportContext: ReportContext;
  /** Opens the report panel for `ctx`. */
  openReport(ctx: ReportContext, opener: HTMLElement | null): void;
  /** The primer topic ids the Command help panel was opened for, most relevant first. */
  helpTopics: string[];
  /** Opens the Command help panel for these topic ids. */
  openCommandHelp(topicIds: string[], opener: HTMLElement | null): void;
}

/** App-level panel state: one panel at a time. */
export function usePanelState(): PanelApi {
  const [current, setCurrent] = useState<PanelKind | null>(null);
  const [mockDeadline, setMockDeadline] = useState<number | null>(null);
  const [reportContext, setReportContext] = useState<ReportContext>({});
  const opener = useRef<HTMLElement | null>(null);
  const refocus = useRef<HTMLElement | null>(null);

  const open = useCallback((k: PanelKind, el: HTMLElement | null) => {
    // Opened from inside a panel, which is about to close: focus goes back to that panel's opener.
    if (!el?.closest('dialog.panel')) opener.current = el;
    setCurrent(k);
  }, []);
  const openReport = useCallback(
    (ctx: ReportContext, el: HTMLElement | null) => {
      setReportContext(ctx);
      open('report', el);
    },
    [open],
  );
  const [helpTopics, setHelpTopics] = useState<string[]>([]);
  const openCommandHelp = useCallback(
    (ids: string[], el: HTMLElement | null) => {
      setHelpTopics(ids);
      open('command-help', el);
    },
    [open],
  );
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

  return useMemo(
    () => ({ current, open, close, mockDeadline, setMockDeadline, reportContext, openReport, helpTopics, openCommandHelp }),
    [current, open, close, mockDeadline, reportContext, openReport, helpTopics, openCommandHelp],
  );
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
  reportContext: {},
  openReport: () => {},
  helpTopics: [],
  openCommandHelp: () => {},
};

/** The app's panels. Outside a provider (screen tests) it is a no-op, so screens render alone. */
export function usePanels(): PanelApi {
  return useContext(PanelContext) ?? NO_PANELS;
}
