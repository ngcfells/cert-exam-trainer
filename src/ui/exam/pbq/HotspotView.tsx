import { HOTSPOT_ON, type HotspotPayload } from '../../../domain/pbq';
import type { PbqProps } from './PbqView';

export function HotspotView({ item, value, onChange }: PbqProps) {
  const p = item.question.payload as HotspotPayload;
  const on = (id: string) => value[id] === HOTSPOT_ON;
  const toggle = (id: string) => {
    const next = { ...value };
    if (on(id)) delete next[id];
    else next[id] = HOTSPOT_ON;
    onChange(next);
  };

  return (
    <>
      <p className="hint">Select every area that applies. Click an area on the image, or tick its box.</p>
      <div className="diagram hotspot" style={{ aspectRatio: `${p.width} / ${p.height}` }}>
        {/* Pointer enhancement only; the checkboxes below are the accessible path. */}
        <svg viewBox={`0 0 ${p.width} ${p.height}`} aria-hidden="true">
          {p.nodes.map((n) => (
            <g key={n.id}>
              <rect x={n.x} y={n.y} width={n.w} height={n.h} fill="#fff" stroke="#333" strokeWidth={2} />
              {n.text && (
                <text x={n.x + n.w / 2} y={n.y + n.h / 2} textAnchor="middle" dominantBaseline="middle" fontSize={14}>
                  {n.text}
                </text>
              )}
            </g>
          ))}
          {p.spots.map((s) => (
            <g key={s.id} className={on(s.id) ? 'spot on' : 'spot'} onClick={() => toggle(s.id)}>
              <rect
                x={s.x}
                y={s.y}
                width={s.w}
                height={s.h}
                fill={on(s.id) ? 'rgba(31,78,121,0.15)' : 'transparent'}
                stroke="#1f4e79"
                strokeWidth={on(s.id) ? 5 : 1.5}
                strokeDasharray={on(s.id) ? undefined : '6 4'}
              />
              {on(s.id) && (
                <text x={s.x + s.w - 6} y={s.y + 16} textAnchor="end" fontSize={16} fontWeight="bold" fill="#1f4e79">
                  ✓
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
      <ul className="parts">
        {p.spots.map((s) => (
          <li key={s.id}>
            <label className="check">
              <input type="checkbox" checked={on(s.id)} onChange={() => toggle(s.id)} />
              {s.name}
            </label>
          </li>
        ))}
      </ul>
    </>
  );
}
