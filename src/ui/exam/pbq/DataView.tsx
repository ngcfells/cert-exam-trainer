import type { DataPayload } from '../../../domain/pbq';
import type { PbqProps } from './PbqView';
import { Table } from '../../Table';
import { fieldParts } from './ConfigView';
import { PartSelects } from './parts';

const BAR_H = 28;
const LABEL_W = 120;
const CHART_W = 480;

/** Drawn from the table's own cells; hidden from assistive tech because the table is the text equivalent. */
function BarChart({ p }: { p: DataPayload }) {
  const { labelColumn, valueColumn } = p.chart!;
  const values = p.rows.map((r) => Number(r[valueColumn]));
  const max = Math.max(...values, 0) || 1;
  const span = CHART_W - LABEL_W - 60;
  return (
    <svg className="chart" viewBox={`0 0 ${CHART_W} ${p.rows.length * BAR_H + 8}`} aria-hidden="true">
      {p.rows.map((r, i) => {
        const w = (Math.max(values[i], 0) / max) * span;
        const y = i * BAR_H + 4;
        return (
          <g key={i}>
            <text x={LABEL_W - 6} y={y + BAR_H / 2} textAnchor="end" dominantBaseline="middle" fontSize={13}>
              {r[labelColumn]}
            </text>
            <rect x={LABEL_W} y={y + 4} width={w} height={BAR_H - 8} />
            <text x={LABEL_W + w + 6} y={y + BAR_H / 2} dominantBaseline="middle" fontSize={13}>
              {r[valueColumn]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function DataView({ item, value, onChange }: PbqProps) {
  const p = item.question.payload as DataPayload;
  return (
    <>
      <div className="data-table">
        <Table caption={p.caption} head={p.columns} rowHeader={false} rows={p.rows.map((r, i) => [String(i), ...r] as [string, ...string[]])} />
      </div>
      {p.chart && <BarChart p={p} />}
      <PartSelects parts={fieldParts(p)} value={value} onChange={onChange} />
    </>
  );
}
