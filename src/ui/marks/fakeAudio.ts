import { vi } from 'vitest';

/** A stand-in AudioContext that records the tones asked for. */
export function fakeAudio(state: 'running' | 'suspended' = 'running') {
  const log = { created: 0, freqs: [] as number[], resumed: 0 };
  const param = () => ({ value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });
  class Fake {
    state = state;
    currentTime = 0;
    destination = {};
    constructor() {
      log.created++;
    }
    resume() {
      log.resumed++;
      return Promise.resolve();
    }
    createOscillator() {
      const frequency = param();
      const o = { type: 'sine', frequency, connect: vi.fn(() => o), start: vi.fn(), stop: vi.fn() };
      frequency.setValueAtTime = vi.fn((v: number) => log.freqs.push(v));
      return o;
    }
    createGain() {
      const g = { gain: param(), connect: vi.fn(() => g) };
      return g;
    }
  }
  vi.stubGlobal('AudioContext', Fake);
  return log;
}
