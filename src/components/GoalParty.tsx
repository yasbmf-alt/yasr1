import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../data/store';
import { today } from '../logic/dates';
import { burst } from '../logic/fx';
import { play } from '../logic/sound';
import { DEFAULT_GOAL, HoursJar, dayStudyMinutes, fmtHM } from './HoursJar';

const KEY = 'yasr1-goal-party';
const LINES = ['Pote cheinho! Você é demais 💖', 'Meta batida! Pode se orgulhar hoje ✨', 'Que dia! Agora descansa um pouquinho 🌷', 'Mais um tijolinho na sua aprovação 🏥'];

/**
 * Comemoração quando as horas do dia chegam na meta: aparece uma vez por dia,
 * no momento em que a meta é batida (ou ao abrir o app já com ela batida).
 */
export function GoalParty() {
  const { data, mode } = useStore();
  const goal = data.settings.dailyGoalMinutes ?? DEFAULT_GOAL;
  const t = today();
  const min = dayStudyMinutes(data.sessions, data.simulados, t);
  const [show, setShow] = useState(false);
  const line = useRef(LINES[Math.floor(Math.random() * LINES.length)]);

  useEffect(() => {
    if (mode === 'loading' || min < goal) return;
    let seen: string | null = null;
    try {
      seen = localStorage.getItem(KEY);
    } catch {
      /* ignore */
    }
    if (seen === t) return;
    try {
      localStorage.setItem(KEY, t);
    } catch {
      /* ignore */
    }
    setShow(true);
  }, [min, goal, t, mode]);

  useEffect(() => {
    if (!show) return undefined;
    play('chapter');
    const w = window.innerWidth;
    const h = window.innerHeight;
    const shots = [0, 250, 520, 800].map((d, i) => window.setTimeout(() => burst({ x: w * [0.3, 0.7, 0.45, 0.58][i], y: h * [0.35, 0.3, 0.5, 0.42][i] }, 'confete', 22), d));
    const close = window.setTimeout(() => setShow(false), 6500);
    return () => {
      shots.forEach(clearTimeout);
      clearTimeout(close);
    };
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div className="party" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShow(false)} role="dialog" aria-label="Meta do dia batida">
          <motion.div className="party-card" initial={{ scale: 0.6, y: 30, rotate: -4 }} animate={{ scale: 1, y: 0, rotate: 0 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }}>
            <motion.div animate={{ y: [0, -14, 0], rotate: [0, -6, 6, 0] }} transition={{ duration: 0.9, repeat: 2, delay: 0.3 }}>
              <HoursJar minutes={min} goal={goal} size={120} />
            </motion.div>
            <span className="party-k">Meta do dia batida!</span>
            <strong className="party-big">{fmtHM(min)}</strong>
            <p>{line.current}</p>
            <button className="btn btn-primary btn-sm" onClick={() => setShow(false)}>Eba!</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
