import { act, render } from '@testing-library/react';
import { createElement, useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

interface Opts {
  sitekey: string;
  execution: string;
  appearance: string;
  callback: (t: string) => void;
  'error-callback': () => void;
}

function fakeTurnstile() {
  const widgets: Opts[] = [];
  let tokens = 0;
  const api = {
    render: vi.fn((_el: HTMLElement, o: Opts) => {
      widgets.push(o);
      return `w${widgets.length - 1}`;
    }),
    execute: vi.fn(),
    reset: vi.fn(),
    remove: vi.fn(),
    succeed: (i = 0) => widgets[i].callback(`token-${++tokens}`),
    fail: (i = 0) => widgets[i]['error-callback'](),
    widgets,
  };
  return api;
}

type Hook = typeof import('./turnstile');
let mod: Hook;
let api: ReturnType<typeof fakeTurnstile>;

function host(siteKey = '0xKEY') {
  const out: { getToken?: () => Promise<string> } = {};
  function Host() {
    const { boxRef, getToken } = mod.useTurnstile(siteKey);
    useEffect(() => {
      out.getToken = getToken;
    });
    return createElement('div', { ref: boxRef, 'data-testid': 'box' });
  }
  const view = render(createElement(Host));
  return { ...view, out };
}

async function loadScript() {
  const s = document.querySelector<HTMLScriptElement>(`script[src="${SRC}"]`);
  expect(s).not.toBeNull();
  (window as unknown as { turnstile: unknown }).turnstile = api;
  await act(async () => {
    s!.dispatchEvent(new Event('load'));
  });
}

beforeEach(async () => {
  vi.resetModules();
  document.head.querySelectorAll('script').forEach((s) => s.remove());
  delete (window as unknown as { turnstile?: unknown }).turnstile;
  api = fakeTurnstile();
  mod = await import('./turnstile');
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useTurnstile', () => {
  it('loads the script, renders with execute mode and resolves the token', async () => {
    const { out } = host();
    const p = out.getToken!();
    await loadScript();
    expect(api.render).toHaveBeenCalledTimes(1);
    const opts = api.widgets[0];
    expect(opts).toMatchObject({ sitekey: '0xKEY', execution: 'execute', appearance: 'interaction-only' });
    expect(api.execute).toHaveBeenCalledWith('w0');
    api.succeed();
    await expect(p).resolves.toBe('token-1');
  });

  it('a second call resets and gets a new token', async () => {
    const { out } = host();
    const first = out.getToken!();
    await loadScript();
    api.succeed();
    await first;
    const second = out.getToken!();
    await act(async () => {});
    expect(api.render).toHaveBeenCalledTimes(1);
    expect(api.reset).toHaveBeenCalledWith('w0');
    api.succeed();
    await expect(second).resolves.toBe('token-2');
  });

  it('the error callback rejects with the message', async () => {
    const { out } = host();
    const p = out.getToken!();
    await loadScript();
    api.fail();
    await expect(p).rejects.toThrow('The spam check could not finish. Check your connection and try again.');
  });

  it('rejects after 60 seconds with no answer', async () => {
    vi.useFakeTimers();
    const { out } = host();
    const caught = out.getToken!().catch((e: Error) => e.message);
    await loadScript();
    vi.advanceTimersByTime(59_999);
    vi.advanceTimersByTime(1);
    expect(await caught).toBe(mod.SPAM_CHECK_MESSAGE);
  });

  it('adds the script once for two hooks', async () => {
    const a = host();
    const b = host();
    const pa = a.out.getToken!();
    const pb = b.out.getToken!();
    expect(document.querySelectorAll(`script[src="${SRC}"]`)).toHaveLength(1);
    await loadScript();
    api.succeed(0);
    api.succeed(1);
    await expect(Promise.all([pa, pb])).resolves.toHaveLength(2);
  });

  it('removes the widget on unmount', async () => {
    const { out, unmount } = host();
    const p = out.getToken!();
    await loadScript();
    api.succeed();
    await p;
    unmount();
    expect(api.remove).toHaveBeenCalledWith('w0');
  });
});
