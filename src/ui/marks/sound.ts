import type { MarkLevel } from './AnswerMark';
import { getMarks } from './prefs';

/** Synthesised tones, so no audio files ship: [type, frequency Hz, seconds] played one after another. */
const TONES: Record<MarkLevel, [OscillatorType, number, number][]> = {
  right: [['sine', 660, 0.12], ['sine', 880, 0.12]],
  partly: [['triangle', 520, 0.2]],
  wrong: [['sine', 220, 0.25]],
};
const PEAK = 0.15;

let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  // A closed context never plays again: build a new one.
  if (ctx && ctx.state !== 'closed') return ctx;
  const Ctor = globalThis.AudioContext ?? (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

/** Plays the mark's sound when the learner turned sound on. Call only on a reveal they caused. */
export function playMark(level: MarkLevel): void {
  if (!getMarks().sound) return;
  try {
    const c = context();
    if (!c) return;
    // Suspended, or "interrupted" on iOS after a call: ask it to run again.
    if (c.state !== 'running') void c.resume().catch(() => undefined);
    let t = c.currentTime;
    for (const [type, freq, dur] of TONES[level]) {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(PEAK, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(c.destination);
      osc.start(t);
      osc.stop(t + dur);
      t += dur;
    }
  } catch {
    // Blocked or broken audio: stay silent.
  }
}

export function resetSoundForTests(): void {
  ctx = null;
}
