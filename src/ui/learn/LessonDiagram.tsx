import { useId, type ReactNode } from 'react';
import type { Lesson } from '../../domain/lesson';
import './diagram.css';

type Diagram = NonNullable<Lesson['diagram']>;

/** Height of the standard normal curve at x, scaled so the peak is 1. */
const bell = (x: number) => Math.exp((-x * x) / 2);

/** A bell-curve outline from a to b (in standard deviations), mapped to a box. */
function bellPath(a: number, b: number, map: { x: (v: number) => number; y: (h: number) => number }, close: boolean): string {
  const pts: string[] = [];
  for (let v = a; v <= b + 1e-9; v += 0.1) pts.push(`${map.x(v).toFixed(1)},${map.y(bell(v)).toFixed(1)}`);
  const base = map.y(0).toFixed(1);
  return close ? `M${map.x(a).toFixed(1)},${base} L${pts.join(' L')} L${map.x(b).toFixed(1)},${base} Z` : `M${pts.join(' L')}`;
}

function BellRule() {
  const map = { x: (v: number) => 160 + v * 48, y: (h: number) => 120 - h * 95 };
  return (
    <>
      <path className="d-fill d-fill-3" d={bellPath(-3, 3, map, true)} />
      <path className="d-fill d-fill-2" d={bellPath(-2, 2, map, true)} />
      <path className="d-fill d-fill-1" d={bellPath(-1, 1, map, true)} />
      <path className="d-line" d={bellPath(-3.6, 3.6, map, false)} />
      <line className="d-axis" x1="10" y1="120" x2="310" y2="120" />
      {[-3, -2, -1, 0, 1, 2, 3].map((k) => (
        <text key={k} className="d-text" x={map.x(k)} y="136" textAnchor="middle">{k === 0 ? 'mean' : `${k > 0 ? '+' : '−'}${Math.abs(k)}σ`}</text>
      ))}
      <text className="d-text" x="10" y="160">About 68% of values fall within 1σ of the mean</text>
      <text className="d-text" x="10" y="177">About 95% within 2σ</text>
      <text className="d-text" x="10" y="194">About 99.7% within 3σ</text>
    </>
  );
}

function TailCurve() {
  const panels: { label: string; tails: [number, number][]; note: string }[] = [
    { label: 'Left-tailed', tails: [[-3.5, -1.64]], note: 'low values only' },
    { label: 'Right-tailed', tails: [[1.64, 3.5]], note: 'high values only' },
    { label: 'Two-tailed', tails: [[-3.5, -1.96], [1.96, 3.5]], note: 'both ends' },
  ];
  return (
    <>
      {panels.map((p, i) => {
        const left = 6 + i * 158;
        const map = { x: (v: number) => left + 76 + v * 20, y: (h: number) => 95 - h * 70 };
        return (
          <g key={p.label}>
            {p.tails.map(([a, b]) => <path key={a} className="d-fill d-fill-reject" d={bellPath(a, b, map, true)} />)}
            <path className="d-line" d={bellPath(-3.5, 3.5, map, false)} />
            <line className="d-axis" x1={left} y1="95" x2={left + 152} y2="95" />
            <text className="d-text d-strong" x={left + 76} y="115" textAnchor="middle">{p.label}</text>
            <text className="d-text" x={left + 76} y="131" textAnchor="middle">{p.note}</text>
          </g>
        );
      })}
      <text className="d-text" x="6" y="158">Shaded area: results extreme enough to reject the null hypothesis.</text>
    </>
  );
}

function ErrorMatrix() {
  const cell = (x: number, y: number, kind: 'err' | 'ok', title: string, sub: string) => (
    <g key={title + sub}>
      <rect className={`d-cell d-cell-${kind}`} x={x} y={y} width="125" height="62" rx="4" />
      <text className={`d-text d-strong d-t-${kind}`} x={x + 62.5} y={y + 28} textAnchor="middle">{title}</text>
      <text className={`d-text d-t-${kind}`} x={x + 62.5} y={y + 46} textAnchor="middle">{sub}</text>
    </g>
  );
  return (
    <>
      <text className="d-text d-strong" x="217" y="22" textAnchor="middle">Null is true</text>
      <text className="d-text d-strong" x="347" y="22" textAnchor="middle">Null is false</text>
      <text className="d-text d-strong" x="76" y="66" textAnchor="middle">Reject the null</text>
      <text className="d-text d-strong" x="76" y="132" textAnchor="middle">Keep the null</text>
      {cell(154, 32, 'err', 'Type I error', 'false positive')}
      {cell(284, 32, 'ok', 'Correct', 'true positive')}
      {cell(154, 98, 'ok', 'Correct', 'true negative')}
      {cell(284, 98, 'err', 'Type II error', 'false negative')}
    </>
  );
}

const POINTS: [number, number][] = [[1, 1.4], [2, 3.6], [3, 2.6], [4, 5.2], [5, 4.4], [6, 7.4], [7, 6.0], [8, 8.4]];

/** Least-squares slope and intercept of the sample points. */
function fit(pts: [number, number][]): { slope: number; intercept: number } {
  const n = pts.length;
  const mx = pts.reduce((s, p) => s + p[0], 0) / n;
  const my = pts.reduce((s, p) => s + p[1], 0) / n;
  const slope = pts.reduce((s, p) => s + (p[0] - mx) * (p[1] - my), 0) / pts.reduce((s, p) => s + (p[0] - mx) ** 2, 0);
  return { slope, intercept: my - slope * mx };
}

function RegressionFit() {
  const { slope, intercept } = fit(POINTS);
  const px = (x: number) => 40 + x * 30;
  const py = (y: number) => 170 - y * 15;
  const on = (x: number) => intercept + slope * x;
  return (
    <>
      <line className="d-axis" x1="40" y1="170" x2="300" y2="170" />
      <line className="d-axis" x1="40" y1="20" x2="40" y2="170" />
      <text className="d-text" x="300" y="188" textAnchor="end">x (the input)</text>
      <text className="d-text" x="46" y="16">y (the outcome)</text>
      <line className="d-line" x1={px(0.5)} y1={py(on(0.5))} x2={px(8.5)} y2={py(on(8.5))} />
      {POINTS.map(([x, y]) => (
        <g key={x}>
          <line className="d-resid" x1={px(x)} y1={py(y)} x2={px(x)} y2={py(on(x))} />
          <circle className="d-dot" cx={px(x)} cy={py(y)} r="4" />
        </g>
      ))}
      <text className="d-text d-strong" x={px(6) + 7} y={(py(POINTS[5][1]) + py(on(6))) / 2 + 4}>ε</text>
      <text className="d-text" x="20" y="206">Dashed gaps are ε, the error:</text>
      <text className="d-text" x="20" y="222">what the line does not explain.</text>
    </>
  );
}

function SigmoidCurve() {
  const px = (x: number) => 160 + x * 22;
  const py = (p: number) => 160 - p * 130;
  const pts: string[] = [];
  for (let x = -6; x <= 6.001; x += 0.25) pts.push(`${px(x).toFixed(1)},${py(1 / (1 + Math.exp(-x))).toFixed(1)}`);
  return (
    <>
      <line className="d-axis" x1="20" y1="160" x2="300" y2="160" />
      <line className="d-axis" x1="160" y1="20" x2="160" y2="160" />
      <line className="d-resid" x1="20" y1={py(0.5)} x2="300" y2={py(0.5)} />
      <path className="d-line" d={`M${pts.join(' L')}`} />
      <text className="d-text" x="166" y={py(1) + 4}>1</text>
      <text className="d-text" x="166" y={py(0) - 4}>0</text>
      <text className="d-text" x="24" y={py(0.5) - 5}>0.5 cutoff</text>
      <text className="d-text" x="300" y="178" textAnchor="end">input (the weighted sum)</text>
      <text className="d-text" x="166" y="14">predicted probability</text>
    </>
  );
}

function JoinVenn() {
  const uid = useId().replace(/:/g, '');
  const panels: { label: string; note: string; a: boolean; b: boolean; both: boolean }[] = [
    { label: 'Inner join', note: 'only rows that match', a: false, b: false, both: true },
    { label: 'Left join', note: 'all of A, plus matches from B', a: true, b: false, both: true },
    { label: 'Right join', note: 'all of B, plus matches from A', a: false, b: true, both: true },
    { label: 'Full outer join', note: 'every row from both', a: true, b: true, both: true },
  ];
  return (
    <>
      {panels.map((p, i) => {
        const left = 6 + (i % 2) * 236;
        const top = i < 2 ? 4 : 134;
        const cid = `${uid}-${i}`;
        return (
          <g key={p.label} transform={`translate(${left} ${top})`}>
            <defs>
              <clipPath id={cid}><circle cx="140" cy="50" r="44" /></clipPath>
            </defs>
            {p.a && <circle className="d-fill d-fill-sel" cx="86" cy="50" r="44" />}
            {p.b && <circle className="d-fill d-fill-sel" cx="140" cy="50" r="44" />}
            {p.both && !p.a && !p.b && <circle className="d-fill d-fill-sel" cx="86" cy="50" r="44" clipPath={`url(#${cid})`} />}
            <circle className="d-line" cx="86" cy="50" r="44" />
            <circle className="d-line" cx="140" cy="50" r="44" />
            <text className="d-text d-strong" x="60" y="54" textAnchor="middle">A</text>
            <text className="d-text d-strong" x="166" y="54" textAnchor="middle">B</text>
            <text className="d-text d-strong" x="113" y="108" textAnchor="middle">{p.label}</text>
            <text className="d-text" x="113" y="122" textAnchor="middle">{p.note}</text>
          </g>
        );
      })}
    </>
  );
}

function DecisionChain() {
  const steps: [string, string][] = [
    ['Distribution', 'How is the data spread?'],
    ['Test', 'Which hypothesis test?'],
    ['Tails', 'One tail or two?'],
    ['Statistic', 'Where does it fall on its curve?'],
    ['Errors', 'Type I and Type II risk'],
    ['Model', 'p-value and R²: simplest that works'],
  ];
  return (
    <>
      {steps.map(([name, note], i) => {
        const y = 6 + i * 38;
        return (
          <g key={name}>
            {i > 0 && <line className="d-axis" x1="24" y1={y - 8} x2="24" y2={y + 3} />}
            <circle className="d-dot" cx="24" cy={y + 15} r="12" />
            <text className="d-text d-strong d-t-on" x="24" y={y + 19} textAnchor="middle">{i + 1}</text>
            <text className="d-text d-strong" x="48" y={y + 13}>{name}</text>
            <text className="d-text" x="48" y={y + 28}>{note}</text>
          </g>
        );
      })}
    </>
  );
}

/** The lesson's own example: Q1 12, median 16, Q3 20, fences 0 and 32, whiskers to 5 and 30, one outlier at 40. */
function BoxPlot() {
  const px = (v: number) => 20 + v * 8;
  const [q1, med, q3, lo, hi, fenceLo, fenceHi, out] = [12, 16, 20, 5, 30, 0, 32, 40];
  return (
    <>
      {[fenceLo, fenceHi].map((f) => <line key={f} className="d-resid" x1={px(f)} y1="22" x2={px(f)} y2="120" />)}
      <text className="d-text" x={px(fenceLo) - 6} y="16">lower fence</text>
      <text className="d-text" x={px(fenceHi)} y="16" textAnchor="middle">upper fence</text>
      <text className="d-text d-strong" x={px(q1) - 4} y="36" textAnchor="end">Q1</text>
      <text className="d-text d-strong" x={px(med)} y="36" textAnchor="middle">median</text>
      <text className="d-text d-strong" x={px(q3) + 4} y="36" textAnchor="start">Q3</text>
      <line className="d-line" x1={px(lo)} y1="60" x2={px(q1)} y2="60" />
      <line className="d-line" x1={px(q3)} y1="60" x2={px(hi)} y2="60" />
      <line className="d-line" x1={px(lo)} y1="52" x2={px(lo)} y2="68" />
      <line className="d-line" x1={px(hi)} y1="52" x2={px(hi)} y2="68" />
      <rect className="d-box" x={px(q1)} y="44" width={px(q3) - px(q1)} height="32" />
      <line className="d-line" x1={px(med)} y1="44" x2={px(med)} y2="76" />
      <circle className="d-dot" cx={px(out)} cy="60" r="5" />
      <text className="d-text d-strong" x={px(out)} y="44" textAnchor="middle">outlier</text>
      <line className="d-line" x1={px(q1)} y1="88" x2={px(q3)} y2="88" />
      <line className="d-line" x1={px(q1)} y1="83" x2={px(q1)} y2="93" />
      <line className="d-line" x1={px(q3)} y1="83" x2={px(q3)} y2="93" />
      <text className="d-text" x={px(med)} y="106" textAnchor="middle">IQR = 8</text>
      <line className="d-axis" x1="14" y1="120" x2="356" y2="120" />
      {[0, 10, 20, 30, 40].map((v) => <text key={v} className="d-text" x={px(v)} y="136" textAnchor="middle">{v}</text>)}
      <text className="d-text" x="14" y="160">Whiskers stop at the last value inside a fence.</text>
    </>
  );
}

const VIEW: Record<Diagram['kind'], { box: string; body: ReactNode }> = {
  'box-plot': { box: '0 0 370 168', body: <BoxPlot /> },
  'join-venn': { box: '0 0 480 268', body: <JoinVenn /> },
  'bell-rule': { box: '0 0 320 202', body: <BellRule /> },
  'tail-curve': { box: '0 0 480 166', body: <TailCurve /> },
  'error-matrix': { box: '0 0 420 170', body: <ErrorMatrix /> },
  'regression-fit': { box: '0 0 320 230', body: <RegressionFit /> },
  'decision-chain': { box: '0 0 320 236', body: <DecisionChain /> },
  'sigmoid-curve': { box: '0 0 320 186', body: <SigmoidCurve /> },
};

/** A lesson's picture, drawn in code: no image files, theme colours only, described in words for screen readers. */
export function LessonDiagram({ diagram }: { diagram: Diagram }) {
  const uid = useId();
  const v = VIEW[diagram.kind];
  const capId = `${uid}-cap`;
  const descId = `${uid}-desc`;
  return (
    <figure className="diagram">
      <svg viewBox={v.box} role="img" aria-labelledby={capId} aria-describedby={descId} focusable="false">
        <title id={capId}>{diagram.caption}</title>
        <desc id={descId}>{diagram.description}</desc>
        {v.body}
      </svg>
      <figcaption>{diagram.caption}</figcaption>
    </figure>
  );
}
