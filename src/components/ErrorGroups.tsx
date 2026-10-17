import React, { useId, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Icon } from './Icon';
import { useStore } from '../data/store';
import { BIG_AREAS, REASONS, SUBTEMAS, type BigArea, type ErrorGroup, type ErrorReason, type Subtema } from '../types';
import { uid } from '../logic/dates';

const AREA_SHORT: Record<BigArea, string> = { clinica: 'Clínica', cirurgia: 'Cirurgia', pediatria: 'Pediatria', go: 'GO', preventiva: 'Preventiva' };

export const newGroup = (p: Partial<ErrorGroup> = {}): ErrorGroup => ({ id: uid(), subtema: null, reasons: [], count: 1, note: '', ...p });

/**
 * Classificação rápida e opcional dos erros: subtema (um), motivos (vários), quantidade.
 * `withSubject` adiciona grande área e matéria (usado nos simulados).
 */
export function ErrorGroups({ value, onChange, wrong, withSubject = false, defaultOpen = false }: {
  value: ErrorGroup[];
  onChange: (g: ErrorGroup[]) => void;
  wrong: number | null; // erros totais informados (para mostrar quantos faltam classificar)
  withSubject?: boolean;
  defaultOpen?: boolean;
}) {
  const fid = useId();
  const { data } = useStore();
  const [open, setOpen] = useState(defaultOpen || value.length > 0);
  const classified = value.reduce((a, g) => a + (g.count || 0), 0);
  const rest = wrong != null ? wrong - classified : null;
  const set = (id: string, p: Partial<ErrorGroup>) => onChange(value.map((g) => (g.id === id ? { ...g, ...p } : g)));

  return (
    <div className="eg">
      <button type="button" className="eg-toggle" onClick={() => { setOpen(!open); if (!open && !value.length) onChange([newGroup(withSubject ? {} : { count: Math.max(1, Math.min(wrong ?? 1, 99)) })]); }} aria-expanded={open}>
        <Icon name={open ? 'chevronD' : 'chevronR'} size={15} />
        Classificar erros <span className="muted">(opcional)</span>
        {wrong != null && wrong > 0 && (
          <span className={`eg-count ${rest === 0 ? 'is-ok' : ''}`}>{classified}/{wrong} classificados</span>
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div className="eg-body" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            {value.map((g, i) => (
              <div key={g.id} className="eg-row">
                {withSubject && (
                  <div className="eg-subject">
                    <select id={`${fid}-a${i}`} value={g.area ?? ''} onChange={(e) => set(g.id, { area: (e.target.value || null) as BigArea | null })} aria-label="Grande área">
                      <option value="">Área</option>
                      {BIG_AREAS.map((a) => <option key={a} value={a}>{AREA_SHORT[a]}</option>)}
                    </select>
                    <input
                      id={`${fid}-s${i}`}
                      list={`${fid}-topics`}
                      value={g.topicId ? data.topics.find((t) => t.id === g.topicId)?.name ?? g.subject ?? '' : g.subject ?? ''}
                      onChange={(e) => {
                        const t = data.topics.find((x) => x.name.toLowerCase() === e.target.value.trim().toLowerCase());
                        const ar = t && t.area !== 'geral' ? (t.area as BigArea) : g.area ?? null;
                        set(g.id, { topicId: t?.id ?? null, subject: e.target.value, area: ar });
                      }}
                      placeholder="Matéria ou doença"
                      aria-label="Matéria ou doença"
                    />
                  </div>
                )}
                <div className="eg-chips" role="radiogroup" aria-label="Subtema">
                  {SUBTEMAS.map((s) => (
                    <button
                      type="button"
                      key={s.id}
                      role="radio"
                      aria-checked={g.subtema === s.id}
                      className={`chip-mini ${g.subtema === s.id ? 'is-on' : ''}`}
                      onClick={() => set(g.id, { subtema: g.subtema === s.id ? null : (s.id as Subtema) })}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <div className="eg-line">
                  <div className="eg-chips eg-reasons" role="group" aria-label="Motivo do erro">
                    {REASONS.map((r) => {
                      const on = g.reasons.includes(r.id);
                      return (
                        <button
                          type="button"
                          key={r.id}
                          aria-pressed={on}
                          className={`chip-mini chip-reason r-${r.id} ${on ? 'is-on' : ''}`}
                          onClick={() => set(g.id, { reasons: on ? g.reasons.filter((x) => x !== r.id) : [...g.reasons, r.id as ErrorReason] })}
                        >
                          {r.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="stepper" aria-label="Quantidade de erros">
                    <button type="button" onClick={() => set(g.id, { count: Math.max(1, g.count - 1) })} aria-label="Menos">−</button>
                    <input id={`${fid}-n${i}`} inputMode="numeric" value={g.count} onChange={(e) => set(g.id, { count: Math.max(1, Math.min(999, Number(e.target.value.replace(/\D/g, '')) || 1)) })} aria-label="Quantidade" />
                    <button type="button" onClick={() => set(g.id, { count: g.count + 1 })} aria-label="Mais">+</button>
                  </div>
                  <button type="button" className="icon-btn icon-btn-sm" onClick={() => onChange(value.filter((x) => x.id !== g.id))} aria-label="Remover grupo"><Icon name="close" size={14} /></button>
                </div>
                <input id={`${fid}-o${i}`} className="eg-note" value={g.note} onChange={(e) => set(g.id, { note: e.target.value })} placeholder="Observação curta (opcional), ex.: dose de salbutamol" />
              </div>
            ))}
            <div className="eg-foot">
              <button type="button" className="btn btn-quiet btn-sm" onClick={() => onChange([...value, newGroup(withSubject ? { area: value.at(-1)?.area ?? null } : { count: Math.max(1, rest ?? 1) })])}>
                <Icon name="plus" size={14} /> Outro grupo de erros
              </button>
              {rest != null && rest > 0 && value.length > 0 && <span className="muted small">{rest} sem classificar — tudo bem deixar assim.</span>}
              {rest != null && rest < 0 && <span className="form-error small">Mais erros classificados do que o total.</span>}
            </div>
            <datalist id={`${fid}-topics`}>
              {data.topics.map((t) => <option key={t.id} value={t.name} />)}
            </datalist>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Rótulo curto para uma lista legada de "onde mais errei". */
export function groupsToLegacy(groups: ErrorGroup[]) {
  return [...groups]
    .sort((a, b) => b.count - a.count)
    .map((g) => [SUBTEMAS.find((s) => s.id === g.subtema)?.label, g.note].filter(Boolean).join(': '))
    .filter(Boolean)
    .slice(0, 2);
}
