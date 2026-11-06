import { useCallback, useEffect, useRef, type RefObject } from 'react';

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const TIMEOUT_MS = 60_000;

export const SPAM_CHECK_MESSAGE = 'The spam check could not finish. Check your connection and try again.';

interface TurnstileApi {
  render(
    el: HTMLElement,
    opts: {
      sitekey: string;
      execution: 'execute';
      appearance: 'interaction-only';
      callback: (token: string) => void;
      'error-callback': () => void;
      'expired-callback': () => void;
    },
  ): string;
  execute(widgetId: string): void;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let loading: Promise<TurnstileApi> | null = null;

/** Loads Cloudflare's script once per page, and only when a token is first needed. */
function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!loading) {
    loading = new Promise<TurnstileApi>((resolve, reject) => {
      let script = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
      if (!script) {
        script = document.createElement('script');
        script.src = SCRIPT_SRC;
        script.async = true;
        document.head.appendChild(script);
      }
      const s = script;
      s.addEventListener('load', () => {
        if (window.turnstile) resolve(window.turnstile);
        else reject(new Error(SPAM_CHECK_MESSAGE));
      });
      s.addEventListener('error', () => {
        loading = null;
        s.remove();
        reject(new Error(SPAM_CHECK_MESSAGE));
      });
    });
  }
  return loading;
}

interface Pending {
  resolve(token: string): void;
  reject(err: Error): void;
  timer: ReturnType<typeof setTimeout>;
}

/** A fresh Turnstile token each time getToken is called. Tokens are never stored. */
export function useTurnstile(siteKey: string): { boxRef: RefObject<HTMLDivElement>; getToken(): Promise<string> } {
  const boxRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const pending = useRef<Pending | null>(null);

  const settle = useCallback((token: string | null) => {
    const p = pending.current;
    if (!p) return;
    pending.current = null;
    clearTimeout(p.timer);
    if (token) p.resolve(token);
    else p.reject(new Error(SPAM_CHECK_MESSAGE));
  }, []);

  const getToken = useCallback((): Promise<string> => {
    settle(null);
    const result = new Promise<string>((resolve, reject) => {
      pending.current = { resolve, reject, timer: setTimeout(() => settle(null), TIMEOUT_MS) };
    });
    const mine = pending.current;
    loadTurnstile().then(
      (ts) => {
        if (pending.current !== mine) return;
        if (!boxRef.current) {
          settle(null);
          return;
        }
        if (widgetId.current === null) {
          widgetId.current = ts.render(boxRef.current, {
            sitekey: siteKey,
            execution: 'execute',
            appearance: 'interaction-only',
            callback: (token) => settle(token),
            'error-callback': () => settle(null),
            'expired-callback': () => undefined,
          });
        } else {
          ts.reset(widgetId.current);
        }
        ts.execute(widgetId.current);
      },
      () => settle(null),
    );
    return result;
  }, [siteKey, settle]);

  useEffect(
    () => () => {
      settle(null);
      if (widgetId.current !== null) window.turnstile?.remove(widgetId.current);
      widgetId.current = null;
    },
    [settle],
  );

  return { boxRef, getToken };
}
