import { vi } from 'vitest';

type State = 'running' | 'suspended' | 'interrupted' | 'closed';

/** A stand-in AudioContext that records the tones asked for and how the nodes are wired. */
export function fakeAudio(state: State = 'running') {
  const log = { created: 0, freqs: [] as number[], resumed: 0, links: [] as string[], contexts: [] as { state: State }[] };
  const param = () => ({ value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });
  // Like the real API, connect() returns the node it was given, so chained wiring is checked.
  const node = <T extends object>(kind: string, extra: T) => {
    const n = { kind, ...extra, connect: vi.fn((to: { kind: string }) => (log.links.push(`${kind}->${to.kind}`), to)) };
    return n;
  };
  class Fake {
    state = state;
    currentTime = 0;
    destination = { kind: 'destination' };
    constructor() {
      log.created++;
      log.contexts.push(this);
    }
    resume() {
      log.resumed++;
      return Promise.resolve();
    }
    createOscillator() {
      const frequency = param();
      frequency.setValueAtTime = vi.fn((v: number) => log.freqs.push(v));
      return node('osc', { type: 'sine', frequency, start: vi.fn(), stop: vi.fn() });
    }
    createGain() {
      return node('gain', { gain: param() });
    }
  }
  vi.stubGlobal('AudioContext', Fake);
  return log;
}
