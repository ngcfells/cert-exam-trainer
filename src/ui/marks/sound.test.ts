import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyMarks, DEFAULT_MARKS } from './prefs';
import { playMark, resetSoundForTests } from './sound';
import { fakeAudio } from './fakeAudio';

beforeEach(() => resetSoundForTests());
afterEach(() => {
  applyMarks(DEFAULT_MARKS);
  vi.unstubAllGlobals();
});

describe('playMark', () => {
  it('does nothing while sound is off', () => {
    const log = fakeAudio();
    playMark('right');
    expect(log.created).toBe(0);
  });

  it('plays a rising pair for right and one low tone for wrong', () => {
    const log = fakeAudio();
    applyMarks({ style: 'banner', sound: true });
    playMark('right');
    expect(log.freqs).toEqual([660, 880]);
    playMark('wrong');
    expect(log.freqs).toEqual([660, 880, 220]);
    playMark('partly');
    expect(log.freqs).toEqual([660, 880, 220, 520]);
  });

  it('reuses one audio context', () => {
    const log = fakeAudio();
    applyMarks({ style: 'banner', sound: true });
    playMark('right');
    playMark('wrong');
    playMark('partly');
    expect(log.created).toBe(1);
  });

  it('resumes a suspended context', () => {
    const log = fakeAudio('suspended');
    applyMarks({ style: 'banner', sound: true });
    playMark('right');
    expect(log.resumed).toBe(1);
  });

  it('is silent with no Web Audio', () => {
    vi.stubGlobal('AudioContext', undefined);
    applyMarks({ style: 'banner', sound: true });
    expect(() => playMark('right')).not.toThrow();
  });

  it('is silent when the browser blocks audio', () => {
    vi.stubGlobal(
      'AudioContext',
      class {
        constructor() {
          throw new Error('blocked');
        }
      },
    );
    applyMarks({ style: 'banner', sound: true });
    expect(() => playMark('right')).not.toThrow();
  });
});
