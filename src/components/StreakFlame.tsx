import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../data/store';
import { streakInfo } from '../logic/progress';
import { bestStreakDate } from '../logic/achievements';
import { diffDays, fmtShort, today } from '../logic/dates';
import { burst } from '../logic/fx';
import { play } from '../logic/sound';

// Sequência de estudo: dias seguidos com pelo menos um registro salvo
// (vários registros no mesmo dia contam um dia só). Hoje sem estudo ainda
// não quebra a sequência; um dia inteiro sem estudo, sim.

type Tier = 0 | 1 | 2 | 3 | 4 | 5;
const tierOf = (n: number): Tier => (n <= 0 ? 0 : n <= 7 ? 1 : n <= 14 ? 2 : n <= 19 ? 3 : n <= 39 ? 4 : 5);
const MILESTONES = [7, 15, 20, 40];

function message(n: number, today: boolean) {
  if (n === 0) return 'A chama descansa. Um registro hoje e ela acende de novo.';
  if (!today) return `Sua chama está acesa há ${n} dia${n > 1 ? 's' : ''}. Estude hoje para ela continuar.`;
  if (n === 1) return 'Primeiro dia de chama acesa. Bora!';
  if (n < 8) return 'Constância é tudo. Você está construindo o hábito.';
  if (n < 15) return 'Mais de uma semana seguida, diva. Que orgulho!';
  if (n < 20) return 'Chama dourada! Seu esforço está brilhando.';
  if (n < 40) return 'Chama intensa. Ninguém segura você.';
  return 'Chama lendária. Você é inspiração pura!';
}

export function StreakFlame() {
  const { data, saveSettings } = useStore();
  const st = useMemo(() => streakInfo(data.sessions), [data.sessions]);
  const days = useMemo(() => [...new Set(data.sessions.map((s) => s.date))].sort(), [data.sessions]);
  const t0 = today();
  const last = days.filter((d) => d <= t0).at(-1) ?? null;
  // sequência perdida: o último estudo foi antes de ontem
  const broken = st.current === 0 && !!last && diffDays(t0, last) >= 2;
  const [mood, setMood] = useState<'normal' | 'sad' | 'ignite'>('normal');
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const tier = tierOf(st.current);

  // animação triste: uma vez por sequência perdida (lembrada nas configurações)
  useEffect(() => {
    if (!broken || !last || data.settings.streakBreakSeen === last) return undefined;
    const id = setTimeout(() => {
      setMood('sad');
      play('fizzle');
      saveSettings({ streakBreakSeen: last });
      setTimeout(() => setMood('normal'), 2600);
    }, 700);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [broken, last]);

  // reacendeu: primeiro dia de uma sequência nova (uma vez por dia)
  useEffect(() => {
    if (!(st.current === 1 && st.studiedToday)) return undefined;
    const key = 'yasr1-chama-acesa';
    try {
      if (localStorage.getItem(key) === t0) return undefined;
      localStorage.setItem(key, t0);
    } catch {
      return undefined;
    }
    const id = setTimeout(() => {
      setMood('ignite');
      play('ignite');
      if (btn.current) burst(btn.current, 'brilho', 10);
      setTimeout(() => setMood('normal'), 1400);
    }, 500);
    return () => clearTimeout(id);
  }, [st.current, st.studiedToday, t0]);

  useEffect(() => {
    if (!open) return undefined;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open]);

  const reached = MILESTONES.map((m) => ({ m, date: bestStreakDate(days, m) }));
  const label = st.current === 0 ? 'Sequência de estudo apagada' : `${st.current} dia${st.current > 1 ? 's seguidos' : ' seguido'} de estudo`;

  return (
    <div className="streak">
      <motion.button
        ref={btn}
        className={`streak-btn tier-${tier} mood-${mood} ${st.current && !st.studiedToday ? 'is-waiting' : ''}`}
        onClick={(e) => {
          setOpen(!open);
          if (!open && st.current > 0) {
            play(MILESTONES.includes(st.current) || tier >= 4 ? 'grow' : 'pop');
            burst(e, tier >= 3 ? 'confete' : 'brilho', 6 + tier * 2);
          }
        }}
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.94 }}
        aria-label={label}
        aria-expanded={open}
        title={label}
      >
        <Flame tier={tier} mood={mood} />
        <span className="streak-n">{st.current}</span>
      </motion.button>
      <AnimatePresence>
        {open && (
          <>
            <div className="streak-scrim" onClick={() => setOpen(false)} aria-hidden="true" />
            <motion.div
              className="streak-pop"
              role="dialog"
              aria-label="Sequência de estudo"
              initial={{ opacity: 0, scale: 0.9, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            >
              <div className="streak-pop-top">
                <span className={`streak-pop-flame tier-${tier}`}><Flame tier={tier} mood="normal" /></span>
                <div>
                  <strong className="streak-pop-n">{st.current} {st.current === 1 ? 'dia' : 'dias'}</strong>
                  <span className="muted small">{st.current ? (st.current > 1 ? 'seguidos estudando' : 'de estudo') : 'sem sequência ativa'}</span>
                </div>
              </div>
              <p className="streak-msg">{message(st.current, st.studiedToday)}</p>
              <p className="muted small">Melhor sequência: <strong>{st.best} {st.best === 1 ? 'dia' : 'dias'}</strong></p>
              <ul className="streak-ms">
                {reached.map(({ m, date }) => (
                  <li key={m} className={date ? 'is-on' : ''}>
                    <span>{m} dias</span>
                    <span className="muted small">{date ? `desde ${fmtShort(date)}` : 'a caminho'}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function Flame({ tier, mood }: { tier: Tier; mood: 'normal' | 'sad' | 'ignite' }) {
  const sad = mood === 'sad';
  return (
    <span className="flame" aria-hidden="true">
      {tier >= 5 && <span className="flame-sparks"><i /><i /><i /><i /></span>}
      <svg viewBox="0 0 40 52" className="flame-svg">
        <path className="fl-outer" d="M20 2 C 24 12 36 18 35 33 C 34 44 27 50 20 50 C 12 50 5 44 5 33 C 5 25 10 20 13 14 C 14 20 16 23 18 24 C 17 16 18 8 20 2 Z" />
        <path className="fl-mid" d="M20 14 C 23 21 30 26 29 35 C 28 42 24 46 20 46 C 15 46 11 42 11 36 C 11 31 14 28 16 24 C 17 29 19 30 20 30 C 19 25 19 19 20 14 Z" />
        <path className="fl-core" d="M20 27 C 22 31 25 34 25 38 C 25 42 23 44 20 44 C 17 44 15 42 15 39 C 15 35 18 32 20 27 Z" />
        {tier > 0 || sad ? (
          sad ? (
            <g className="fl-face">
              <path d="M14.5 36.5 q2 -1.6 4 0 M21.5 36.5 q2 -1.6 4 0" />
              <path d="M17.5 42 q2.5 -1.8 5 0" />
              <circle className="fl-tear" cx="15.2" cy="39.4" r="1" />
            </g>
          ) : (
            <g className="fl-face">
              <circle cx="16.6" cy="37" r="1.3" />
              <circle cx="23.4" cy="37" r="1.3" />
              <path d="M18 40.6 q2 1.6 4 0" />
            </g>
          )
        ) : null}
      </svg>
    </span>
  );
}
