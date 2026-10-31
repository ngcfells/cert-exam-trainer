import type { ReactNode } from 'react';

/** A captioned table; with `rowHeader`, each row's first cell is its header. */
export function Table({ caption, head, rows, rowHeader = true }: { caption: ReactNode; head: string[]; rows: [key: string, ...cells: ReactNode[]][]; rowHeader?: boolean }) {
  return (
    <table>
      <caption>{caption}</caption>
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
  );
}
