// Peças comuns dos ambientes da Yasland: cena ilustrada com objetos clicáveis,
// painel do objeto, campos e um calendário pequeno.
import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Icon } from '../components/Icon';
import { addDays, DIAS_CURTOS, fromKey, MESES_LONGOS, pad, toKey, today } from '../logic/dates';
import { play } from '../logic/sound';

/** grupo SVG clicável dentro de uma cena (sobe e brilha no hover, rótulo flutuante) */
export function Hot({ id, label, on, onPick, children }: { id: string; label: string; on?: boolean; onPick: (id: string) => void; children: React.ReactNode }) {
  return (
    <g
      className={`yl-hot ${on ? 'is-on' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-pressed={on}
      onClick={() => { play('pop'); onPick(id); }}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onPick(id))}
    >
      <title>{label}</title>
      {children}
    </g>
  );
}

// ilustrações da Yasland (src/yasland/art): o Vite gera a URL (ou embute no build de arquivo único)
const ART = import.meta.glob('./art/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export const art = (name: string) => ART[`./art/${name}.webp`] ?? '';

export interface Area { id: string; label: string; box: [number, number, number, number] } // x, y, largura, altura em px da imagem

/** cena ilustrada: a imagem é o cenário e cada objeto tem uma área clicável por cima */
export function ImgScene({ img, src, w, h, areas, on, onPick, children, sparkles = 8 }: {
  img?: string; src?: string; w: number; h: number; areas: Area[]; on?: string | null; onPick: (id: string) => void; children?: React.ReactNode; sparkles?: number;
}) {
  const pct = (v: number, t: number) => `${(v / t) * 100}%`;
  return (
    <div className="yl-iscene" style={{ aspectRatio: `${w} / ${h}` }}>
      <img src={src ?? art(img ?? '')} alt="" draggable={false} className="yl-iscene-img" />
      {Array.from({ length: sparkles }).map((_, i) => (
        <i key={i} className="yl-spark" style={{ left: `${(i * 37 + 11) % 92 + 4}%`, top: `${(i * 53 + 7) % 70 + 6}%`, animationDelay: `${(i * 0.7) % 4}s` }} aria-hidden="true" />
      ))}
      {children}
      {areas.map((a) => (
        <button
          key={a.id}
          className={`yl-area ${on === a.id ? 'is-on' : ''}`}
          style={{ left: pct(a.box[0], w), top: pct(a.box[1], h), width: pct(a.box[2], w), height: pct(a.box[3], h) }}
          onClick={() => { play('pop'); onPick(a.id); }}
          aria-label={a.label}
          aria-pressed={on === a.id}
        >
          <span className="yl-area-tip">{a.label}</span>
        </button>
      ))}
    </div>
  );
}

/** posição de um elemento por cima da cena, em px da imagem */
export const over = (w: number, h: number, x: number, y: number, ww?: number, hh?: number): React.CSSProperties => ({
  position: 'absolute', left: `${(x / w) * 100}%`, top: `${(y / h) * 100}%`, ...(ww ? { width: `${(ww / w) * 100}%` } : {}), ...(hh ? { height: `${(hh / h) * 100}%` } : {}),
});

/** fileira de botões ilustrados abaixo da cena */
export function Tiles({ items, on, onPick }: { items: { id: string; label: string; icon: string; badge?: number | string | null }[]; on: string | null; onPick: (id: string) => void }) {
  return (
    <div className="yl-tiles" role="tablist">
      {items.map((t, i) => (
        <motion.button
          key={t.id}
          role="tab"
          aria-selected={on === t.id}
          className={`yl-tile ${on === t.id ? 'is-on' : ''}`}
          onClick={() => { play('pop'); onPick(t.id); }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + i * 0.05 }}
          whileTap={{ scale: 0.94 }}
        >
          <img src={art(t.icon)} alt="" draggable={false} />
          <span>{t.label}</span>
          {t.badge ? <b className="yl-tile-badge">{t.badge}</b> : null}
        </motion.button>
      ))}
    </div>
  );
}

/** casca de um ambiente: voltar para a cidade, título, cena, botões e o painel do objeto escolhido */
export function Place({ title, emoji, onBack, scene, tiles, spot, panel, hint }: {
  title: string; emoji: string; onBack: () => void; scene: React.ReactNode; tiles?: React.ReactNode; spot: string | null; panel: React.ReactNode; hint?: string;
}) {
  return (
    <div className="yl-place">
      <header className="yl-place-head">
        <button className="yl-back" onClick={onBack}><Icon name="chevronL" size={18} /> Cidade</button>
        <h1 className="h1">{emoji} {title}</h1>
      </header>
      <motion.div className="yl-scene" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 20 }}>
        {scene}
      </motion.div>
      {tiles}
      {!spot && hint && <p className="yl-hint">{hint}</p>}
      <AnimatePresence mode="wait">
        {spot && (
          <motion.section key={spot} className="yl-panel" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.22 }}>
            {panel}
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PanelHead({ title, sub, onClose, children }: { title: string; sub?: string; onClose?: () => void; children?: React.ReactNode }) {
  return (
    <div className="yl-ph">
      <div className="yl-ph-l">
        {onClose && <button className="yl-ph-back" onClick={onClose} aria-label="Voltar"><Icon name="chevronL" size={18} /></button>}
        <div>
        <h2 className="yl-ph-t">{title}</h2>
        {sub && <p className="muted small yl-ph-s">{sub}</p>}
        </div>
      </div>
      <div className="btn-row">
        {children}
      </div>
    </div>
  );
}

export const num = (v: string) => {
  const n = Number(v.replace(',', '.'));
  return v.trim() === '' || !Number.isFinite(n) ? null : n;
};
export const brl = (n: number | null | undefined) => (n == null ? '—' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
export const fmtDate = (k: string) => {
  const d = fromKey(k);
  return k === today() ? 'hoje' : k === addDays(today(), -1) ? 'ontem' : `${DIAS_CURTOS[d.getDay()]} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
};
export const daysUntil = (k: string) => Math.round((fromKey(k).getTime() - fromKey(today()).getTime()) / 86400000);

/** data com padrão hoje (dá para registrar dias passados) */
export function DateIn({ value, onChange, id }: { value: string; onChange: (v: string) => void; id: string }) {
  return <input id={id} type="date" value={value} max={addDays(today(), 365)} onChange={(e) => e.target.value && onChange(e.target.value)} />;
}

export function F({ label, children, grow }: { label: string; children: React.ReactNode; grow?: boolean }) {
  return (
    <label className={`yl-f ${grow ? 'is-grow' : ''}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

/** calendário do mês com marcas coloridas por dia */
export function MiniMonth({ marks, onDay, sel }: { marks: (day: string) => { color: string; label: string }[]; onDay?: (d: string) => void; sel?: string | null }) {
  const [base, setBase] = useState(() => today().slice(0, 7));
  const [y, m] = base.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(y, m, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => toKey(new Date(y, m - 1, i + 1)))];
  const shift = (n: number) => setBase(toKey(new Date(y, m - 1 + n, 1)).slice(0, 7));
  return (
    <div className="yl-cal">
      <div className="yl-cal-head">
        <button className="icon-btn icon-btn-sm" onClick={() => shift(-1)} aria-label="Mês anterior"><Icon name="chevronL" size={14} /></button>
        <strong>{MESES_LONGOS[m - 1]} {y}</strong>
        <button className="icon-btn icon-btn-sm" onClick={() => shift(1)} aria-label="Próximo mês"><Icon name="chevronR" size={14} /></button>
      </div>
      <div className="yl-cal-grid">
        {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((d, i) => <span key={i} className="yl-cal-dow">{d}</span>)}
        {cells.map((d, i) =>
          d ? (
            <button key={d} className={`yl-cal-d ${d === today() ? 'is-today' : ''} ${sel === d ? 'is-sel' : ''}`} onClick={() => onDay?.(d)} title={marks(d).map((x) => x.label).join(' · ')}>
              <span>{fromKey(d).getDate()}</span>
              <i>{marks(d).slice(0, 4).map((x, k) => <b key={k} style={{ background: x.color }} />)}</i>
            </button>
          ) : <span key={`e${i}`} />,
        )}
      </div>
    </div>
  );
}

/** barras simples (semanas, dias) */
export function Bars({ items, color, fmt }: { items: { label: string; value: number; hint?: string }[]; color: string; fmt?: (v: number) => string }) {
  const max = Math.max(1, ...items.map((x) => x.value));
  return (
    <div className="yl-bars">
      {items.map((x, i) => (
        <div key={i} className="yl-bar" title={x.hint ?? `${x.label}: ${fmt ? fmt(x.value) : x.value}`}>
          <span className="yl-bar-v">{x.value ? (fmt ? fmt(x.value) : x.value) : ''}</span>
          <span className="yl-bar-t"><motion.i style={{ background: color }} initial={{ height: 0 }} animate={{ height: `${(x.value / max) * 100}%` }} transition={{ delay: i * 0.03, type: 'spring', stiffness: 140, damping: 20 }} /></span>
          <span className="yl-bar-l">{x.label}</span>
        </div>
      ))}
    </div>
  );
}

/** os últimos n dias (antigo → hoje) */
export const lastDays = (n: number) => Array.from({ length: n }, (_, i) => addDays(today(), i - n + 1));
export const weekStartOf = (k: string) => addDays(k, -((fromKey(k).getDay() + 6) % 7));

/** anel de progresso grande (evolução geral) */
export function Ring({ value, label, emoji, color = '#DD5D78', size = 170 }: { value: number; label: string; emoji?: string; color?: string; size?: number }) {
  const r = 70;
  const c = 2 * Math.PI * r;
  return (
    <div className="yl-ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 170 170">
        <circle cx="85" cy="85" r={r} fill="none" stroke="#F8E3EA" strokeWidth="16" />
        <motion.circle cx="85" cy="85" r={r} fill="none" stroke={color} strokeWidth="16" strokeLinecap="round" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - Math.min(1, value / 100)) }} transition={{ duration: 1.1, ease: 'easeOut' }} transform="rotate(-90 85 85)" />
      </svg>
      <div className="yl-ring-c">
        {emoji && <span className="yl-ring-e">{emoji}</span>}
        <b>{Math.round(value)}%</b>
        <small>{label}</small>
      </div>
    </div>
  );
}

/** barras horizontais com ícone e porcentagem */
export function HBars({ items }: { items: { label: string; emoji: string; value: number; color: string; hint?: string }[] }) {
  return (
    <div className="yl-hbars">
      {items.map((x, i) => (
        <div key={x.label} className="yl-hbar" title={x.hint}>
          <span className="yl-hbar-e">{x.emoji}</span>
          <span className="yl-hbar-m">
            <span className="yl-hbar-l"><b>{x.label}</b><em>{Math.round(x.value)}%</em></span>
            <span className="yl-hbar-t"><motion.i style={{ background: x.color }} initial={{ width: 0 }} animate={{ width: `${Math.min(100, x.value)}%` }} transition={{ delay: 0.15 + i * 0.08, type: 'spring', stiffness: 90, damping: 16 }} /></span>
          </span>
        </div>
      ))}
    </div>
  );
}
