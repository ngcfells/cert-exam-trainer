import { useCallback, useEffect, useId, useRef, type Dispatch, type PointerEvent, type SetStateAction } from 'react';

/** Points are fractions of the drawing area, so a resize keeps the drawing in place. */
export type Stroke = { x: number; y: number }[];

interface Props {
  text: string;
  onText: Dispatch<SetStateAction<string>>;
  strokes: Stroke[];
  onStrokes: Dispatch<SetStateAction<Stroke[]>>;
}

function paint(canvas: HTMLCanvasElement, strokes: Stroke[]) {
  const ctx = canvas.getContext?.('2d');
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  // The ink is the theme's text colour (the canvas's CSS `color`), so light and dark both read.
  ctx.strokeStyle = getComputedStyle(canvas).color;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const s of strokes) {
    if (s.length === 0) continue;
    ctx.beginPath();
    ctx.moveTo(s[0].x * w, s[0].y * h);
    for (const p of s.length === 1 ? [{ x: s[0].x + 0.001, y: s[0].y }] : s.slice(1)) ctx.lineTo(p.x * w, p.y * h);
    ctx.stroke();
  }
}

/** A typing area (the keyboard and screen-reader path) and a drawing area for mouse, trackpad, touch or pen. */
export function Whiteboard({ text, onText, strokes, onStrokes }: Props) {
  const notesId = useId();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef<{ id: number; stroke: Stroke } | null>(null);
  const strokesRef = useRef(strokes);
  strokesRef.current = strokes;

  const redraw = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const live = drawing.current ? [...strokesRef.current, drawing.current.stroke] : strokesRef.current;
    paint(c, live);
  }, []);

  useEffect(() => {
    redraw();
  }, [strokes, redraw]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => redraw());
    ro.observe(c);
    return () => ro.disconnect();
  }, [redraw]);

  function point(e: PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const fx = ((e.clientX ?? 0) - r.left) / (r.width || 1);
    const fy = ((e.clientY ?? 0) - r.top) / (r.height || 1);
    return { x: Math.min(1, Math.max(0, fx)), y: Math.min(1, Math.max(0, fy)) };
  }

  function onDown(e: PointerEvent<HTMLCanvasElement>) {
    if (e.button !== undefined && e.button > 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drawing.current = { id: e.pointerId, stroke: [point(e)] };
    redraw();
  }
  function onMove(e: PointerEvent<HTMLCanvasElement>) {
    const d = drawing.current;
    if (!d || d.id !== e.pointerId) return;
    d.stroke.push(point(e));
    redraw();
  }
  function onEnd(e: PointerEvent<HTMLCanvasElement>) {
    const d = drawing.current;
    if (!d || d.id !== e.pointerId) return;
    drawing.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    onStrokes((s) => [...s, d.stroke]);
  }

  return (
    <div className="whiteboard">
      <label htmlFor={notesId}>Notes</label>
      <textarea id={notesId} className="wb-notes" rows={5} value={text} onChange={(e) => onText(e.target.value)} data-autofocus />
      <canvas
        ref={canvasRef}
        className="wb-canvas"
        aria-label="Drawing area"
        role="img"
        style={{ touchAction: 'none' }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onEnd}
        onPointerCancel={onEnd}
      />
      <button type="button" disabled={strokes.length === 0} onClick={() => onStrokes([])}>
        Clear drawing
      </button>
    </div>
  );
}
