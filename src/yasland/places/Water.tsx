// Bebedouro: recipientes com água de verdade (ondas, balanço no hover, respingo
// no clique). Arraste dentro do recipiente para dizer quanto bebeu; ao registrar,
// a água é despejada no garrafão do dia, que vai enchendo até a meta.
import React, { useId, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useYl, ylId, nowIso } from '../store';
import { Bars, DateIn, F, PanelHead, fmtDate, lastDays, num } from '../ui';
import { ConfirmButton, useUI } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { today, uid } from '../../logic/dates';
import { burst } from '../../logic/fx';
import { play } from '../../logic/sound';
import type { YlCfg } from '../types';

type Shape = YlCfg['vessels'][number]['shape'];
const SHAPES: Record<Shape, { d: string; top: number; bottom: number; extra?: React.ReactNode }> = {
  copo: { d: 'M18 18 L82 18 L73 128 Q72 134 66 134 L34 134 Q28 134 27 128 Z', top: 22, bottom: 134 },
  garrafinha: { d: 'M39 6 h22 v12 q17 6 17 22 v84 q0 10 -10 10 h-36 q-10 0 -10 -10 v-84 q0 -16 17 -22z', top: 26, bottom: 134 },
  garrafa: { d: 'M41 2 h18 v11 q21 8 21 28 v87 q0 10 -10 10 h-40 q-10 0 -10 -10 v-87 q0 -20 21 -28z', top: 22, bottom: 138 },
  pote: { d: 'M14 24 h64 v98 q0 12 -12 12 h-40 q-12 0 -12 -12z', top: 28, bottom: 134, extra: <path d="M78 46 q20 0 20 22 q0 22 -20 22" fill="none" stroke="#C9D7EA" strokeWidth="7" strokeLinecap="round" /> },
};

/** recipiente com água; fill de 0 a 1 */
export function Vessel({ shape, fill, size = 120, splash = 0, tilt = 0, big }: { shape: Shape; fill: number; size?: number; splash?: number; tilt?: number; big?: boolean }) {
  const id = useId().replace(/:/g, '');
  const s = SHAPES[shape];
  const level = s.bottom - Math.max(0, Math.min(1, fill)) * (s.bottom - s.top);
  return (
    <motion.svg viewBox="-4 -4 108 146" className={`yw ${big ? 'is-big' : ''}`} style={{ width: size, height: size * 1.35 }} animate={{ rotate: tilt }} transition={{ type: 'spring', stiffness: 120, damping: 12 }}>
      <defs>
        <clipPath id={`c${id}`}><path d={s.d} /></clipPath>
        <linearGradient id={`w${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9FD3FF" />
          <stop offset="1" stopColor="#4F94E8" />
        </linearGradient>
      </defs>
      {s.extra}
      <path d={s.d} className="yw-glass" />
      <g clipPath={`url(#c${id})`}>
        <g className="yw-slosh">
          <motion.g initial={false} animate={{ y: level - 20 }} transition={{ type: 'spring', stiffness: 70, damping: 11 }}>
            <g className="yw-wave">
              <path d="M-60 20 q12.5 -7 25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 v200 h-200z" fill={`url(#w${id})`} />
            </g>
            <g className="yw-wave2">
              <path d="M-72 23 q12.5 -5 25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 v200 h-200z" fill="#fff" opacity=".22" />
            </g>
            {fill > 0.04 && (
              <g className="yw-bubbles">
                <circle cx="34" cy="90" r="2.4" /><circle cx="60" cy="100" r="1.8" /><circle cx="70" cy="80" r="2.6" />
              </g>
            )}
          </motion.g>
        </g>
      </g>
      <path d={s.d} className="yw-shine" />
      <AnimatePresence>
        {splash > 0 &&
          [0, 1, 2, 3, 4, 5].map((k) => (
            <motion.circle
              key={`${splash}-${k}`}
              cx={50}
              cy={level}
              r={3 + (k % 3)}
              fill="#7FB8F5"
              initial={{ x: 0, y: 0, opacity: 1 }}
              animate={{ x: (k - 2.5) * 12, y: -26 - (k % 3) * 10, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          ))}
      </AnimatePresence>
    </motion.svg>
  );
}

export function WaterPanel({ onClose }: { onClose: () => void }) {
  const yl = useYl();
  const ui = useUI();
  const [sel, setSel] = useState(yl.cfg.vessels[1]?.id ?? yl.cfg.vessels[0]?.id);
  const [part, setPart] = useState(1); // quanto do recipiente (0–1)
  const [date, setDate] = useState(today());
  const [splash, setSplash] = useState(0);
  const [pouring, setPouring] = useState(false);
  const [editing, setEditing] = useState(false);
  const [newV, setNewV] = useState({ name: '', ml: '' });
  const drag = useRef(false);
  const stageRef = useRef<HTMLDivElement>(null);

  const v = yl.cfg.vessels.find((x) => x.id === sel) ?? yl.cfg.vessels[0];
  const goal = yl.cfg.waterGoal;
  const logs = yl.of('water');
  const dayLogs = logs.filter((w) => w.date === date).sort((a, b) => b.at.localeCompare(a.at));
  const dayMl = dayLogs.reduce((a, w) => a + w.ml, 0);
  const ml = Math.round((v?.ml ?? 0) * part);

  // arrastar dentro do recipiente define o nível (toque e mouse)
  const setFromPointer = (e: React.PointerEvent) => {
    const el = stageRef.current?.querySelector('.yw') as SVGElement | null;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const f = 1 - (e.clientY - (r.top + r.height * 0.12)) / (r.height * 0.82);
    setPart(Math.max(0.05, Math.min(1, Math.round(f * 20) / 20)));
  };

  const drink = () => {
    if (!v || ml <= 0) return;
    setPouring(true);
    play('pop');
    setTimeout(() => {
      yl.save({ id: ylId('water'), kind: 'water', createdAt: nowIso(), date, at: nowIso(), ml, vessel: v.name });
      setPouring(false);
      const before = dayMl;
      if (before < goal && before + ml >= goal) {
        play('mission');
        burst({ x: window.innerWidth / 2, y: window.innerHeight / 2.5 }, 'gotas', 26);
        ui.toast('Meta de água batida! 💧', 'diva');
      } else play('check');
      setPart(1);
    }, 850);
  };

  const week = lastDays(7).map((d) => ({ label: fmtDate(d).split(' ')[0], value: logs.filter((w) => w.date === d).reduce((a, w) => a + w.ml, 0) }));
  const fmtL = (x: number) => `${(x / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}L`;

  return (
    <div className="yw-panel">
      <PanelHead title="💧 Bebedouro" sub="Escolha o recipiente, arraste dentro dele para marcar quanto bebeu e registre." onClose={onClose}>
        <button className="btn btn-quiet btn-sm" onClick={() => setEditing(!editing)}><Icon name="edit" size={14} /> Recipientes e meta</button>
      </PanelHead>

      {editing && (
        <div className="yw-edit">
          <F label="Meta diária (mL)">
            <input id="yw-goal" inputMode="numeric" defaultValue={goal} onBlur={(e) => { const n = num(e.target.value); if (n && n >= 250) yl.setCfg({ waterGoal: Math.round(n) }); }} />
          </F>
          {yl.cfg.vessels.map((x) => (
            <div key={x.id} className="yw-edit-row">
              <input aria-label="Nome" defaultValue={x.name} onBlur={(e) => e.target.value.trim() && yl.setCfg({ vessels: yl.cfg.vessels.map((y) => (y.id === x.id ? { ...y, name: e.target.value.trim() } : y)) })} />
              <input aria-label="Capacidade em mL" inputMode="numeric" defaultValue={x.ml} onBlur={(e) => { const n = num(e.target.value); if (n && n > 0) yl.setCfg({ vessels: yl.cfg.vessels.map((y) => (y.id === x.id ? { ...y, ml: Math.round(n) } : y)) }); }} />
              <span className="muted small">mL</span>
              {yl.cfg.vessels.length > 1 && <button className="icon-btn icon-btn-sm" aria-label="Remover recipiente" onClick={() => yl.setCfg({ vessels: yl.cfg.vessels.filter((y) => y.id !== x.id) })}><Icon name="trash" size={14} /></button>}
            </div>
          ))}
          <form className="yw-edit-row" onSubmit={(e) => { e.preventDefault(); const n = num(newV.ml); if (!newV.name.trim() || !n) return; yl.setCfg({ vessels: [...yl.cfg.vessels, { id: uid(), name: newV.name.trim(), ml: Math.round(n), shape: 'pote' }] }); setNewV({ name: '', ml: '' }); }}>
            <input placeholder="Novo recipiente (ex.: caneca)" aria-label="Nome do recipiente" value={newV.name} onChange={(e) => setNewV({ ...newV, name: e.target.value })} />
            <input placeholder="mL" aria-label="Capacidade" inputMode="numeric" value={newV.ml} onChange={(e) => setNewV({ ...newV, ml: e.target.value })} />
            <button className="btn btn-secondary btn-sm" type="submit"><Icon name="plus" size={14} /> Adicionar</button>
          </form>
        </div>
      )}

      <div className="yw-main">
        <div className="yw-left">
          <div className="yw-shelf" role="radiogroup" aria-label="Recipiente">
            {yl.cfg.vessels.map((x) => (
              <button key={x.id} role="radio" aria-checked={x.id === sel} className={`yw-pick ${x.id === sel ? 'is-on' : ''}`} onClick={() => { setSel(x.id); setPart(1); setSplash((s) => s + 1); }}>
                <Vessel shape={x.shape} fill={0.7} size={44} />
                <span>{x.name}</span>
                <small>{x.ml} mL</small>
              </button>
            ))}
          </div>
          {v && (
            <div
              className="yw-stage"
              ref={stageRef}
              onPointerDown={(e) => { drag.current = true; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); setFromPointer(e); setSplash((s) => s + 1); }}
              onPointerMove={(e) => drag.current && setFromPointer(e)}
              onPointerUp={() => { drag.current = false; }}
              title="Clique ou arraste para cima/baixo para marcar quanto bebeu"
            >
              <Vessel shape={v.shape} fill={pouring ? 0 : part} size={170} splash={splash} tilt={pouring ? -38 : 0} />
              {pouring && (
                <svg className="yw-stream" viewBox="0 0 200 120" aria-hidden="true">
                  <motion.path d="M10 30 Q 110 -10 190 90" fill="none" stroke="#6FB0F2" strokeWidth="9" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5 }} />
                </svg>
              )}
            </div>
          )}
          <div className="yw-amount">
            <strong>{ml} mL</strong>
            <span className="muted small">{Math.round(part * 100)}% {v ? `do ${v.name.toLowerCase()}` : ''}</span>
          </div>
          <div className="yw-parts">
            {[0.25, 0.5, 0.75, 1].map((p) => <button key={p} className={`chip-mini ${part === p ? 'is-on' : ''}`} onClick={() => { setPart(p); setSplash((s) => s + 1); }}>{p === 1 ? 'Inteiro' : `${p * 100}%`}</button>)}
          </div>
          <div className="yw-go">
            <DateIn id="yw-date" value={date} onChange={setDate} />
            <button className="btn btn-primary" disabled={pouring || !ml} onClick={drink}>💧 Bebi {ml} mL</button>
          </div>
        </div>

        <div className="yw-right">
          <span className="yw-k">{date === today() ? 'Hoje' : fmtDate(date)}</span>
          <div className={`yw-big ${dayMl >= goal ? 'is-full' : ''}`}>
            <Vessel shape="garrafa" fill={dayMl / goal} size={150} big />
            {dayMl >= goal && <span className="yw-stars" aria-hidden="true">✦ ✦</span>}
          </div>
          <strong className="yw-total">{fmtL(dayMl)} <small>/ {fmtL(goal)}</small></strong>
          <span className="muted small">{dayMl >= goal ? 'Meta batida! Sua garrafa está cheia 💙' : `faltam ${fmtL(goal - dayMl)}`}</span>
          {dayLogs.length > 0 && (
            <ul className="yw-log">
              {dayLogs.map((w) => (
                <li key={w.id}>
                  <span>💧 {w.ml} mL</span>
                  <span className="muted small">{w.vessel ?? ''} · {new Date(w.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                  <ConfirmButton className="icon-btn icon-btn-sm" label={<Icon name="restore" size={13} />} question="Desfazer?" confirmLabel="Desfazer" onConfirm={() => yl.del(w.id)} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="yw-week">
        <span className="yw-k">Últimos 7 dias</span>
        <Bars items={week} color="#6FB0F2" fmt={fmtL} />
        <span className="muted small">Meta batida em {week.filter((x) => x.value >= goal).length} de 7 dias · média {fmtL(week.reduce((a, x) => a + x.value, 0) / 7)}</span>
      </div>
    </div>
  );
}
