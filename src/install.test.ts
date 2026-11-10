import { describe, expect, it } from 'vitest';
import { installKind } from './install';

const base = { pwa: true, standalone: false, ios: false, hasPrompt: false };

describe('installKind', () => {
  it('is none outside the hosted build (single file, file://, dev)', () => {
    expect(installKind({ ...base, pwa: false, hasPrompt: true })).toBe('none');
    expect(installKind({ ...base, pwa: false, ios: true })).toBe('none');
  });
  it('is installed when already running as an app', () => {
    expect(installKind({ ...base, standalone: true, hasPrompt: true })).toBe('installed');
  });
  it('is prompt when the browser offered an install', () => {
    expect(installKind({ ...base, hasPrompt: true })).toBe('prompt');
  });
  it('is ios on iPhone and iPad Safari, which has no prompt', () => {
    expect(installKind({ ...base, ios: true })).toBe('ios');
  });
  it('is manual when the browser offers no prompt, so the menu steps are shown', () => {
    expect(installKind(base)).toBe('manual');
  });
});
