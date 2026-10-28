import React, { useId } from 'react';
import { motion } from 'framer-motion';
import type { Session, Simulado } from '../types';

/**
 * Pote que enche conforme as horas estudadas no dia (até a meta). A água
 * ondula e solta bolhinhas; passa da meta e ganha brilho.
 */
export function HoursJar({ minutes, goal, size = 150 }: { minutes: number; goal: number; size?: number }) {
  const id = useId().replace(/:/g, '');
  const pct = goal > 0 ? Math.min(1, minutes / goal) : 0;
  const over = goal > 0 && minutes >= goal;
  // interior do pote: y de 34 (cheio) a 112 (vazio)
  const level = 112 - pct * 78;
  const small = size < 60;
  return (
    <span className={`jar ${over ? 'is-over' : ''} ${small ? 'is-small' : ''}`} style={{ width: size, height: size * 1.12 }} aria-hidden="true">
      <svg viewBox="0 0 100 112">
        <defs>
          <clipPath id={`jar-${id}`}>
            <path d="M26 30 h48 c6 0 9 4 9 10 v58 c0 8 -5 12 -12 12 h-42 c-7 0 -12 -4 -12 -12 v-58 c0 -6 3 -10 9 -10z" />
          </clipPath>
          <linearGradient id={`water-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--jar-top, #f8a9cf)" />
            <stop offset="1" stopColor="var(--jar-bottom, #e46aa5)" />
          </linearGradient>
        </defs>
        {/* vidro */}
        <path d="M26 30 h48 c6 0 9 4 9 10 v58 c0 8 -5 12 -12 12 h-42 c-7 0 -12 -4 -12 -12 v-58 c0 -6 3 -10 9 -10z" className="jar-glass" />
        <g clipPath={`url(#jar-${id})`}>
          <motion.g initial={{ y: 80 }} animate={{ y: level - 34 }} transition={{ type: 'spring', stiffness: 40, damping: 14 }}>
            <g className="jar-wave">
              <path d="M-40 34 q12.5 -6 25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 v90 h-175z" fill={`url(#water-${id})`} />
              <path d="M-52 37 q12.5 -5 25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 v90 h-175z" fill="#fff" opacity=".18" className="jar-wave2" />
            </g>
            {!small && pct > 0.05 && (
              <g className="jar-bubbles">
                <circle cx="38" cy="90" r="2.4" /><circle cx="58" cy="96" r="1.8" /><circle cx="66" cy="84" r="2.8" />
              </g>
            )}
          </motion.g>
        </g>
        {/* tampa e brilho */}
        <rect x="24" y="21" width="52" height="10" rx="4" className="jar-lid" />
        <rect x="40" y="15" width="20" height="7" rx="3.5" className="jar-lid2" />
        <path d="M30 44 v40" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".5" />
        {over && !small && <g className="jar-stars"><path d="M86 22 l2 5 5 1 -4 3 1 5 -4 -3 -4 3 1 -5 -4 -3 5 -1z" /><path d="M10 50 l1.5 3.5 3.5 .5 -3 2.2 .8 3.6 -2.8 -2 -2.8 2 .8 -3.6 -3 -2.2 3.5 -.5z" /></g>}
      </svg>
    </span>
  );
}

export const fmtHM = (m: number) => {
  const h = Math.floor(m / 60);
  const mm = Math.round(m % 60);
  return h ? `${h}h${mm ? String(mm).padStart(2, '0') : ''}` : `${mm}min`;
};

export const DEFAULT_GOAL = 240; // 4h por dia, ajustável no Painel

/** minutos estudados num dia: sessões + simulados feitos nele */
export const dayStudyMinutes = (sessions: Session[], simulados: Simulado[], day: string) =>
  sessions.reduce((a, s) => a + (s.date === day ? s.minutes ?? 0 : 0), 0) + simulados.reduce((a, s) => a + (s.date === day ? s.minutes ?? 0 : 0), 0);

/** selinho com o pote pequeno e as horas do dia */
export function DayHours({ minutes, goal }: { minutes: number; goal: number }) {
  if (!minutes) return null;
  return (
    <span className="day-hours" title={`${fmtHM(minutes)} de estudo (meta ${fmtHM(goal)})`}>
      <HoursJar minutes={minutes} goal={goal} size={22} />
      <b>{fmtHM(minutes)}</b>
    </span>
  );
}
