import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Answer marks (issue #10) get their own colour tokens; this checks them for AA in both themes.
const css = readFileSync('src/index.css', 'utf8');

/** The custom properties declared directly in a block of CSS. */
function tokens(block: string): Record<string, string> {
  return Object.fromEntries([...block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}

function blockAfter(selector: string): string {
  const start = css.indexOf(selector);
  if (start < 0) throw new Error(`missing ${selector}`);
  const open = css.indexOf('{', start);
  return css.slice(open + 1, css.indexOf('}', open));
}

const light = tokens(blockAfter(':root {'));
const darkMedia = { ...light, ...tokens(blockAfter(":root:not([data-theme='light'])")) };
const darkAttr = { ...light, ...tokens(blockAfter(":root[data-theme='dark']")) };
const THEMES = { light, 'dark (system)': darkMedia, 'dark (chosen)': darkAttr } as const;

function luminance(hex: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`not a #rrggbb colour: ${hex}`);
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(m[1].slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const LEVELS = ['ok', 'warn', 'bad'] as const;
const MARK_TOKENS = [...LEVELS.flatMap((x) => [`--mark-${x}`, `--mark-${x}-bg`, `--mark-on-${x}`]), '--mark-face', '--mark-face-fg'];

describe('answer mark tokens', () => {
  it('every mark token is defined in light and both dark blocks match', () => {
    for (const t of MARK_TOKENS) {
      expect(light[t], t).toBeDefined();
      expect(darkMedia[t], t).toBe(darkAttr[t]);
    }
  });

  const cases = Object.keys(THEMES).flatMap((theme) => LEVELS.map((level) => [theme, level] as const));
  it.each(cases)('%s %s meets AA', (theme, x) => {
    const t: Record<string, string> = THEMES[theme as keyof typeof THEMES];
    expect(ratio(t[`--mark-${x}`], t['--bg'])).toBeGreaterThanOrEqual(4.5);
    expect(ratio(t[`--mark-${x}`], t[`--mark-${x}-bg`])).toBeGreaterThanOrEqual(4.5);
    expect(ratio(t[`--mark-on-${x}`], t[`--mark-${x}`])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(Object.keys(THEMES))('%s smiley face features', (theme) => {
    const t: Record<string, string> = THEMES[theme as keyof typeof THEMES];
    expect(ratio(t['--mark-face-fg'], t['--mark-face'])).toBeGreaterThanOrEqual(3);
  });
});
