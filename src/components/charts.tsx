import React, { useState } from 'react';
import { motion } from 'framer-motion';

// ── Filtro de período ─────────────────────────────────────────

export const PERIODS = [7, 15, 30, 60] as const;

export function usePeriod(key: string, initial: number | null = 30): [number | null, (d: number | null) => void] {
  const [v, setV] = useState<number | null>(() => {
    try {
      const raw = localStorage.getItem(`yasr1-period-${key}`);
      if (raw === 'all') return null;
      return raw ? Number(raw) : initial;
    } catch {
      return initial;
    }
  });
  return [
    v,
    (d) => {
      setV(d);
      try {
        localStorage.setItem(`yasr1-period-${key}`, d == null ? 'all' : String(d));
      } catch {
        /* ignore */
      }
    },
  ];
}

export function PeriodFilter({ value, onChange, allowAll = false }: { value: number | null; onChange: (d: number | null) => void; allowAll?: boolean }) {
  return (
    <div className="seg seg-period" role="radiogroup" aria-label="Período">
      {PERIODS.map((p) => (
        <button key={p} role="radio" aria-checked={value === p} className={value === p ? 'is-on' : ''} onClick={() => onChange(p)}>
          {p} dias
        </button>
      ))}
      {allowAll && (
        <button role="radio" aria-checked={value == null} className={value == null ? 'is-on' : ''} onClick={() => onChange(null)}>
          Tudo
        </button>
      )}
    </div>
  );
}

// ── Linha ─────────────────────────────────────────────────────

export interface LinePoint {
  x: string;
  y: number;
  tip?: string;
}

export function LineChart({ points, yFormat, yMin, yMax, label, color = '#2E4A7F', height = 220, area = true, wide = false }: {
  points: LinePoint[]; yFormat: (v: number) => string; yMin?: number; yMax?: number; label: string; color?: string; height?: number; area?: boolean; wide?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = wide ? 1120 : 560;
  const H = height;
  const pad = { l: 44, r: 18, t: 18, b: 28 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const ys = points.map((p) => p.y);
  let lo = yMin ?? Math.min(...ys);
  let hi = yMax ?? Math.max(...ys);
  if (yMin == null) lo = Math.max(0, lo - (hi - lo) * 0.15);
  if (yMax == null) hi = hi + (hi - lo) * 0.15 || 1;
  if (hi === lo) hi = lo + 1;
  const x = (i: number) => pad.l + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo)) * ih;
  const ticks = [lo, lo + (hi - lo) / 2, hi];
  const path = points.map((p, i) => `${i ? 'L' : 'M'} ${x(i)} ${y(p.y)}`).join(' ');
  const areaPath = points.length > 1 ? `${path} L ${x(points.length - 1)} ${pad.t + ih} L ${x(0)} ${pad.t + ih} Z` : '';
  const every = Math.max(1, Math.ceil(points.length / 8));
  const h = hover != null ? points[hover] : null;
  return (
    <div className="chart-wrap">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="chart"
        role="img"
        aria-label={label}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          let best = 0;
          points.forEach((_, i) => { if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i; });
          setHover(best);
        }}
      >
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="grid-line" />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" className="axis-txt">{yFormat(t)}</text>
          </g>
        ))}
        {area && areaPath && <path d={areaPath} fill={color} opacity="0.08" />}
        <motion.path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.7 }} />
        {points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.y)} r={hover === i || i === points.length - 1 ? 5.5 : 3.5} fill={color} stroke="var(--surface)" strokeWidth="2" />
        ))}
        {points.map((p, i) => (i % every === 0 || i === points.length - 1) && (
          <text key={`l${i}`} x={x(i)} y={H - 8} textAnchor="middle" className="axis-txt">{p.x}</text>
        ))}
        <text x={x(points.length - 1)} y={y(points[points.length - 1].y) - 11} textAnchor={points.length > 1 ? 'end' : 'middle'} className="val-txt">{yFormat(points[points.length - 1].y)}</text>
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} className="cross" />}
      </svg>
      {h && hover != null && (
        <div className="tip" style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(h.y) / H) * 100}%` }}>
          <span>{h.tip ?? `${h.x} · ${yFormat(h.y)}`}</span>
        </div>
      )}
    </div>
  );
}

// ── Colunas ───────────────────────────────────────────────────

export interface BarDatum {
  x: string;
  y: number;
  tip?: string;
  highlight?: boolean;
}

export function ColumnChart({ bars, yFormat, label, color = '#F8C9F1', accent = '#F38CB8', height = 200, showValues = true }: {
  bars: BarDatum[]; yFormat: (v: number) => string; label: string; color?: string; accent?: string; height?: number; showValues?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 560;
  const H = height;
  const pad = { l: 40, r: 10, t: 18, b: 26 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const max = Math.max(...bars.map((b) => b.y), 0) || 1;
  const step = iw / Math.max(1, bars.length);
  const bw = Math.min(34, step * 0.62);
  const every = Math.max(1, Math.ceil(bars.length / 10));
  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label={label} onMouseLeave={() => setHover(null)}>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={pad.l} x2={W - pad.r} y1={pad.t + ih * (1 - f)} y2={pad.t + ih * (1 - f)} className="grid-line" />
            <text x={pad.l - 6} y={pad.t + ih * (1 - f) + 4} textAnchor="end" className="axis-txt">{yFormat(max * f)}</text>
          </g>
        ))}
        {bars.map((b, i) => {
          const h = (b.y / max) * ih;
          const cx = pad.l + step * i + step / 2;
          return (
            <g key={i} onMouseEnter={() => setHover(i)}>
              <rect x={cx - step / 2} y={pad.t} width={step} height={ih} fill="transparent" />
              <motion.rect
                x={cx - bw / 2}
                width={bw}
                rx="4"
                fill={b.highlight || hover === i ? accent : color}
                initial={{ y: pad.t + ih, height: 0 }}
                animate={{ y: pad.t + ih - h, height: Math.max(0, h) }}
                transition={{ delay: i * 0.02, type: 'spring', stiffness: 160, damping: 22 }}
              />
              {showValues && b.y > 0 && bars.length <= 12 && (
                <text x={cx} y={pad.t + ih - h - 5} textAnchor="middle" className="bar-val">{yFormat(b.y)}</text>
              )}
              {(i % every === 0 || i === bars.length - 1) && <text x={cx} y={H - 8} textAnchor="middle" className="axis-txt">{b.x}</text>}
            </g>
          );
        })}
      </svg>
      {hover != null && bars[hover] && (
        <div className="tip" style={{ left: `${((pad.l + step * hover + step / 2) / W) * 100}%`, top: `${((pad.t + ih - (bars[hover].y / max) * ih) / H) * 100}%` }}>
          <span>{bars[hover].tip ?? `${bars[hover].x} · ${yFormat(bars[hover].y)}`}</span>
        </div>
      )}
    </div>
  );
}

// ── Barras horizontais com percentual ─────────────────────────

export function PctBars({ rows, empty }: { rows: { id: string; label: string; value: number | null; n: number; color: string; sub?: string }[]; empty: string }) {
  const has = rows.some((r) => r.value != null);
  if (!has) return <p className="muted">{empty}</p>;
  return (
    <div className="abars">
      {rows.map((r, i) => (
        <div key={r.id} className="abar-row" title={r.value == null ? 'Sem dados' : `${Math.round(r.value * 100)}% em ${r.n} questões`}>
          <span className="abar-name"><i style={{ background: r.color }} />{r.label}</span>
          <span className="abar-track">
            {r.value != null && (
              <motion.span className="abar-fill" style={{ background: r.color }} initial={{ width: 0 }} animate={{ width: `${r.value * 100}%` }} transition={{ delay: i * 0.04, type: 'spring', stiffness: 130, damping: 20 }} />
            )}
          </span>
          <span className="abar-val">{r.value == null ? '—' : `${Math.round(r.value * 100)}%`}{r.sub && <small>{r.sub}</small>}</span>
        </div>
      ))}
    </div>
  );
}

// ── Barra empilhada (distribuição) ────────────────────────────

export function StackBar({ parts, format }: { parts: { id: string; label: string; value: number; color: string }[]; format: (v: number) => string }) {
  const total = parts.reduce((a, p) => a + p.value, 0);
  if (!total) return null;
  return (
    <div className="stack">
      <div className="stack-bar" role="img" aria-label={parts.map((p) => `${p.label} ${format(p.value)}`).join(', ')}>
        {parts.filter((p) => p.value > 0).map((p) => (
          <motion.span key={p.id} style={{ background: p.color }} initial={{ flexGrow: 0 }} animate={{ flexGrow: p.value }} title={`${p.label}: ${format(p.value)} (${Math.round((p.value / total) * 100)}%)`} />
        ))}
      </div>
      <ul className="stack-legend">
        {parts.filter((p) => p.value > 0).sort((a, b) => b.value - a.value).map((p) => (
          <li key={p.id}><i style={{ background: p.color }} />{p.label} <strong>{format(p.value)}</strong> <span className="muted">{Math.round((p.value / total) * 100)}%</span></li>
        ))}
      </ul>
    </div>
  );
}

export function Stat({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return (
    <div className="sk">
      <span className="sk-v">{value}</span>
      <span className="sk-l">{label}</span>
      {sub && <span className="sk-sub">{sub}</span>}
    </div>
  );
}
