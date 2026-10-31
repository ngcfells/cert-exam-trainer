import { HOTSPOT_ON, hotspotLayout, type HotspotPayload } from '../../../domain/pbq';
import type { PbqProps } from './PbqView';
import { Boxes } from './parts';

export function HotspotView({ item, value, onChange }: PbqProps) {
  const p = item.question.payload as HotspotPayload;
  const layout = hotspotLayout(p, item.elementOrder);
  const underSpots = new Set(layout.map((x) => x.node));
  // Text is in image units, so a wider image would shrink it; scale to match a 480-wide image.
  const fontSize = `${(13 * Math.max(p.width, 480)) / 480}px`;
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
          <Boxes nodes={p.nodes.filter((n) => !underSpots.has(n.id))} />
          {layout.map(({ spot, slot, label }) => (
            <g key={spot.id} className={on(spot.id) ? 'spot on' : 'spot'} onClick={() => toggle(spot.id)}>
              <rect x={slot.x} y={slot.y} width={slot.w} height={slot.h} strokeWidth={on(spot.id) ? 5 : 1.5} strokeDasharray={on(spot.id) ? undefined : '6 4'} />
              {/* HTML inside the SVG so long labels wrap within the box (issue #1). */}
              <foreignObject x={slot.x} y={slot.y} width={slot.w} height={slot.h}>
                <div className="spot-label" style={{ fontSize }}>{label}</div>
              </foreignObject>
              {on(spot.id) && (
                <text x={slot.x + slot.w - 4} y={slot.y + 15} textAnchor="end" fontSize={14} fontWeight="bold">
                  ✓
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
      <ul className="parts">
        {layout.map(({ spot }) => (
          <li key={spot.id}>
            <label className="check">
              <input type="checkbox" checked={on(spot.id)} onChange={() => toggle(spot.id)} />
              {spot.name}
            </label>
          </li>
        ))}
      </ul>
    </>
  );
}
