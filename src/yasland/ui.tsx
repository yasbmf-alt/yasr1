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

/** casca de um ambiente: voltar para a cidade, título, cena e o painel do objeto escolhido */
export function Place({ title, emoji, onBack, scene, spot, panel, hint }: {
  title: string; emoji: string; onBack: () => void; scene: React.ReactNode; spot: string | null; panel: React.ReactNode; hint?: string;
}) {
  return (
    <div className="yl-place">
      <header className="yl-place-head">
        <button className="btn btn-quiet btn-sm" onClick={onBack}><Icon name="chevronL" size={16} /> Cidade</button>
        <h1 className="h1">{emoji} {title}</h1>
      </header>
      <motion.div className="yl-scene" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 20 }}>
        {scene}
      </motion.div>
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
      <div>
        <h2 className="yl-ph-t">{title}</h2>
        {sub && <p className="muted small yl-ph-s">{sub}</p>}
      </div>
      <div className="btn-row">
        {children}
        {onClose && <button className="icon-btn icon-btn-sm" onClick={onClose} aria-label="Fechar"><Icon name="close" size={16} /></button>}
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
