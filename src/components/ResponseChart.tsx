"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export interface ChartPoint {
  t: string; // ISO time
  ms: number | null; // null = check failed
  code: number | null;
  error: string | null;
}

const H = 220;
const PAD = { top: 26, right: 12, bottom: 28, left: 44 };

function niceMax(v: number) {
  if (v <= 0) return 100;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/** Response time over the last 24h. Single series, crosshair + tooltip, failed checks marked on the baseline. */
export function ResponseChart({ points }: { points: ChartPoint[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(720);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const geo = useMemo(() => {
    if (!points.length) return null;
    const t0 = new Date(points[0].t).getTime();
    const t1 = Math.max(new Date(points[points.length - 1].t).getTime(), t0 + 60_000);
    const yMax = niceMax(Math.max(...points.map((p) => p.ms ?? 0)) * 1.1);
    const iw = w - PAD.left - PAD.right;
    const ih = H - PAD.top - PAD.bottom;
    const x = (iso: string) => PAD.left + ((new Date(iso).getTime() - t0) / (t1 - t0)) * iw;
    const y = (ms: number) => PAD.top + ih - (ms / yMax) * ih;

    // Break the line at failed checks so downtime reads as a gap.
    let d = "";
    let pen = false;
    for (const p of points) {
      if (p.ms === null) {
        pen = false;
        continue;
      }
      d += `${pen ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.ms).toFixed(1)} `;
      pen = true;
    }
    const ticksY = [0, yMax / 2, yMax];
    const ticksX = [0, 0.25, 0.5, 0.75, 1].map((f) => new Date(t0 + f * (t1 - t0)).toISOString());
    return { x, y, d, yMax, ticksY, ticksX, baseY: PAD.top + ih };
  }, [points, w]);

  if (!geo) {
    return (
      <div className="grid h-[220px] place-items-center rounded-xl border border-dashed border-line">
        <p className="hud">No checks in the last 24 hours</p>
      </div>
    );
  }

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left + PAD.left;
    let best = 0;
    let bestDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(geo.x(p.t) - px);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    setHover(best);
  };

  const hp = hover !== null ? points[hover] : null;
  const hx = hp ? geo.x(hp.t) : 0;

  return (
    <div ref={wrap} className="relative w-full">
      <svg width={w} height={H} role="img" aria-label="Response time over the last 24 hours" className="block">
        <defs>
          <linearGradient id="rt-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#7dd3fc" />
            <stop offset="50%" stopColor="#a5b4fc" />
            <stop offset="100%" stopColor="#c4b5fd" />
          </linearGradient>
        </defs>

        {/* recessive grid + y labels */}
        {geo.ticksY.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={w - PAD.right} y1={geo.y(v)} y2={geo.y(v)} stroke="#2a3045" strokeOpacity={0.6} />
            <text x={PAD.left - 8} y={geo.y(v) + 4} textAnchor="end" className="fill-dim font-mono text-[10px]">
              {Math.round(v)}
            </text>
          </g>
        ))}
        <text x={PAD.left - 8} y={PAD.top - 14} textAnchor="end" className="fill-dim font-mono text-[9px] uppercase">
          ms
        </text>

        {/* x labels */}
        {geo.ticksX.map((t, i) => (
          <text
            key={t}
            x={geo.x(t)}
            y={H - 8}
            textAnchor={i === 0 ? "start" : i === geo.ticksX.length - 1 ? "end" : "middle"}
            className="fill-dim font-mono text-[10px]"
          >
            {fmtTime(t)}
          </text>
        ))}

        <path d={geo.d} fill="none" stroke="url(#rt-line)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {/* failed checks on the baseline */}
        {points.map((p) =>
          p.ms === null ? (
            <rect key={p.t} x={geo.x(p.t) - 1.5} y={geo.baseY - 10} width={3} height={10} rx={1.5} fill="#c4b5fd" />
          ) : null,
        )}

        {/* crosshair */}
        {hp && (
          <g pointerEvents="none">
            <line x1={hx} x2={hx} y1={PAD.top} y2={geo.baseY} stroke="#8a93a8" strokeDasharray="3 3" />
            {hp.ms !== null && (
              <circle cx={hx} cy={geo.y(hp.ms)} r={4.5} fill="#a5b4fc" stroke="#080a12" strokeWidth={2} />
            )}
          </g>
        )}

        <rect
          x={PAD.left}
          y={PAD.top}
          width={w - PAD.left - PAD.right}
          height={geo.baseY - PAD.top}
          fill="transparent"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        />
      </svg>

      {hp && (
        <div
          className="pointer-events-none absolute top-2 z-10 min-w-36 rounded-lg border border-line bg-panel/95 px-3 py-2 shadow-lg"
          style={{ left: Math.min(Math.max(hx - 72, 0), w - 160) }}
        >
          <p className="hud mb-1">{new Date(hp.t).toLocaleString([], { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}</p>
          {hp.ms !== null ? (
            <p className="font-mono text-sm text-ink">
              {hp.ms} ms <span className="text-dim">· {hp.code}</span>
            </p>
          ) : (
            <p className="text-sm text-ink">Failed{hp.error ? `: ${hp.error}` : ""}</p>
          )}
        </div>
      )}
    </div>
  );
}
