import { useId, useRef, type ReactNode } from 'react';
import { useScrolls } from './useScrolls';

/**
 * A captioned table; with `rowHeader`, each row's first cell is its header.
 * Words in cells never split, so a table wider than the screen scrolls sideways inside its wrapper.
 * Only then is the wrapper a focusable, named region, so keyboard users can scroll it (WCAG 2.1.1).
 */
export function Table({ caption, head, rows, rowHeader = true }: { caption: ReactNode; head: string[]; rows: [key: string, ...cells: ReactNode[]][]; rowHeader?: boolean }) {
  const captionId = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const scrolls = useScrolls(wrap);
  return (
    <div ref={wrap} className="table-scroll" {...(scrolls ? { role: 'region', tabIndex: 0, 'aria-labelledby': captionId } : {})}>
      <table>
        <caption id={captionId}>{caption}</caption>
        <thead>
          <tr>
            {head.map((h, i) => <th key={i} scope="col">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map(([key, first, ...rest]) => (
            <tr key={key}>
              {rowHeader ? <th scope="row">{first}</th> : <td>{first}</td>}
              {rest.map((c, i) => <td key={i}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
