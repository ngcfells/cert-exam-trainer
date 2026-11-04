import { useRef } from 'react';
import { parseRich } from '../domain/richText';
import { useScrolls } from './useScrolls';

/**
 * A code block: a <code> shown as a block that keeps line breaks and indentation and wraps at spaces.
 * Words are never split (issue #4); a token longer than the line scrolls sideways inside the block,
 * which then takes keyboard focus. No role or label, so it stays valid inside a legend and the
 * fieldset's name still reads the code.
 */
function CodeBlock({ value }: { value: string }) {
  const ref = useRef<HTMLElement>(null);
  const scrolls = useScrolls(ref);
  return (
    // A box that scrolls sideways must take focus so keyboard users can scroll it (axe scrollable-region-focusable).
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
    <code ref={ref} className="code-block" tabIndex={scrolls ? 0 : undefined}>
      {value}
    </code>
  );
}

/**
 * Inline code with a line-break chance after each slash (but not between the two of `//`, or at
 * the end), so a long URL or path wraps at a slash instead of running off a narrow screen.
 */
function InlineCode({ value }: { value: string }) {
  const parts = value.split(/(?<=\/)(?=[^/])/);
  return <code>{parts.flatMap((p, i) => (i === 0 ? [p] : [<wbr key={i} />, p]))}</code>;
}

/** Question text with `inline code` and ``` blocks. */
export function RichText({ text }: { text: string }) {
  return (
    <>
      {parseRich(text).map((s, i) =>
        s.kind === 'text' ? s.value : s.kind === 'block' ? <CodeBlock key={i} value={s.value} /> : <InlineCode key={i} value={s.value} />,
      )}
    </>
  );
}
