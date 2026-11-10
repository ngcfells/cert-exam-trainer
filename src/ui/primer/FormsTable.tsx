import type { PrimerTopic } from '../../domain/primer';
import { RichText } from '../RichText';

type Row = PrimerTopic['forms'][number];

/** Bash and PowerShell side by side, or one "Type this" column for SQL and pandas. Stacks on a narrow screen. */
export function FormsTable({ caption, rows, single }: { caption: string; rows: Row[]; single: boolean }) {
  const head = single ? ['Type this', 'What it does'] : ['Bash', 'PowerShell', 'What it does'];
  return (
    <table className="primer-forms">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {head.map((h) => (
            <th key={h} scope="col">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          const cells = single ? [r.bash, r.does] : [r.bash, r.powershell ?? '', r.does];
          return (
            <tr key={i}>
              {cells.map((c, j) => (
                <td key={j} data-label={head[j]}>
                  <RichText text={c} />
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
