import { useLayoutEffect, useState, type RefObject } from 'react';

/**
 * True while the element is wider inside than out, so it scrolls sideways. A box that scrolls must
 * take keyboard focus so keyboard users can scroll it (WCAG 2.1.1; axe scrollable-region-focusable).
 */
export function useScrolls(ref: RefObject<HTMLElement | null>): boolean {
  const [scrolls, setScrolls] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setScrolls(el.scrollWidth > el.clientWidth + 1);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    for (const child of el.children) ro.observe(child);
    return () => ro.disconnect();
  }, [ref]);
  return scrolls;
}
