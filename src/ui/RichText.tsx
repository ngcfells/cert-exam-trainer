import { parseRich } from '../domain/richText';

/**
 * Question text with `inline code` and ``` blocks. A block is a <code> shown as a block that keeps
 * line breaks and indentation and wraps long lines, so it fits a phone screen without sideways scrolling
 * and stays valid inside a legend or a paragraph.
 */
export function RichText({ text }: { text: string }) {
  return (
    <>
      {parseRich(text).map((s, i) =>
        s.kind === 'text' ? s.value : <code key={i} className={s.kind === 'block' ? 'code-block' : undefined}>{s.value}</code>,
      )}
    </>
  );
}
