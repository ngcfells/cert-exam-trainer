import type { Page } from '@playwright/test';

/**
 * Text-in-bounds rule (issues #4 and #7). Lists every place on the page where text breaks the rule:
 * - a word cut across two lines between two letters or digits ("Re|sult"); breaks at spaces,
 *   hyphens, slashes, dashes and other punctuation are normal line breaks;
 * - a diagram or hotspot box label that overflows its box;
 * - SVG text that leaves its picture;
 * - text past the window's left or right edge, unless it sits in a box that scrolls sideways and
 *   takes keyboard focus (a wide table, a code block, terminal output);
 * - a box that scrolls sideways but cannot take keyboard focus;
 * - a page that scrolls sideways.
 * Returns readable problem strings; an empty list means the page passes.
 */
export async function textOutOfBounds(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const problems: string[] = [];
    const W = document.documentElement.clientWidth;
    if (document.documentElement.scrollWidth > W + 1) problems.push(`page scrolls sideways (${document.documentElement.scrollWidth} > ${W})`);

    const where = (el: Element) => `${el.tagName.toLowerCase()}${el.className ? `.${String(el.className).split(' ')[0]}` : ''}`;
    const hidden = (el: Element) => !!el.closest('.sr-only, .visually-hidden, dialog:not([open]), [hidden]');
    /** The nearest ancestor that scrolls sideways, if any. */
    const scrollBox = (el: Element): HTMLElement | null => {
      for (let a: Element | null = el; a && a !== document.body; a = a.parentElement) {
        const ox = getComputedStyle(a).overflowX;
        if ((ox === 'auto' || ox === 'scroll') && a.scrollWidth > a.clientWidth + 1) return a as HTMLElement;
      }
      return null;
    };
    const unfocusable = new Set<Element>();
    const lineTop = (n: Node, i: number) => {
      const r = document.createRange();
      r.setStart(n, i);
      r.setEnd(n, i + 1);
      const rect = [...r.getClientRects()].find((x) => x.width > 0);
      return rect ? Math.round(rect.top) : null;
    };
    /**
     * Where a line break cuts a word between two letters or digits, the word with a | at each such cut;
     * otherwise null. A break beside punctuation (`["db"]|["host"]`) is a normal line-break point.
     */
    const midWordCuts = (n: Node, start: number, word: string): string | null => {
      const cuts: number[] = [];
      let prev = lineTop(n, start);
      for (let i = 1; i < word.length; i++) {
        const top = lineTop(n, start + i);
        if (top !== null && prev !== null && top !== prev && /[\p{L}\p{N}]/u.test(word[i - 1]) && /[\p{L}\p{N}]/u.test(word[i])) cuts.push(i);
        if (top !== null) prev = top;
      }
      return cuts.length ? cuts.reduceRight((w, c) => `${w.slice(0, c)}|${w.slice(c)}`, word) : null;
    };

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement;
      if (!el || hidden(el) || el.closest('svg text, script, style, option, select, textarea')) continue;
      const box = scrollBox(el);
      if (box && box.tabIndex < 0) unfocusable.add(box);
      const text = n.textContent ?? '';
      for (const m of text.matchAll(/[^\s\-/–—]+/g)) {
        const r = document.createRange();
        r.setStart(n, m.index!);
        r.setEnd(n, m.index! + m[0].length);
        const rects = [...r.getClientRects()].filter((x) => x.width > 0);
        if (rects.length === 0) continue;
        if (new Set(rects.map((x) => Math.round(x.top))).size > 1) {
          const cut = midWordCuts(n, m.index!, m[0]);
          if (cut) problems.push(`word split: "${cut}" in ${where(el)}`);
        }
        if (!box && rects.some((x) => x.left < -1 || x.right > W + 1)) problems.push(`text off screen: "${m[0]}" in ${where(el)}`);
      }
    }
    for (const box of unfocusable) problems.push(`${where(box)} scrolls sideways but cannot take keyboard focus`);

    for (const el of document.querySelectorAll('.box-label, .spot-label')) {
      if (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1) problems.push(`label overflows its box: "${el.textContent}"`);
    }

    for (const t of document.querySelectorAll<SVGTextElement>('svg text')) {
      const vb = t.ownerSVGElement?.viewBox.baseVal;
      if (!vb || hidden(t)) continue;
      const b = t.getBBox();
      if (b.x < vb.x - 0.5 || b.y < vb.y - 0.5 || b.x + b.width > vb.x + vb.width + 0.5 || b.y + b.height > vb.y + vb.height + 0.5) {
        problems.push(`SVG text leaves its picture: "${t.textContent}"`);
      }
    }
    return [...new Set(problems)];
  });
}
