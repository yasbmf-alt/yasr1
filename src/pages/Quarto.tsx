import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useUI } from '../components/ui';
import { Icon } from '../components/Icon';
import { RoomArt, SPOT_BOX, type RoomSpot } from '../assets/RoomArt';
import { Gaveta } from './room/Gaveta';
import { Macetes } from './room/Macetes';
import { Revisao } from './room/Revisao';
import { ROOM_EXTRA, type RoomView } from './room/registry';
import { useRoomEggs } from './room/eggs';
import { play } from '../logic/sound';

const VIEWS: Record<string, RoomView> = {
  gaveta: { title: 'Gaveta dos erros', render: () => <Gaveta /> },
  estante: { title: 'Biblioteca de macetes', render: () => <Macetes /> },
  mural: { title: 'Revisão rápida', render: () => <Revisao /> },
  ...ROOM_EXTRA,
};
const LINKS: Partial<Record<RoomSpot, 'evolucao' | 'biblioteca'>> = { janela: 'evolucao', armario: 'biblioteca' };

const LABELS: { id: RoomSpot; label: string }[] = [
  { id: 'armario', label: 'Biblioteca' },
  { id: 'gaveta', label: 'Gaveta dos erros' },
  { id: 'estante', label: 'Macetes' },
  { id: 'mural', label: 'Revisão rápida' },
  { id: 'mesa', label: 'Cantinho' },
  { id: 'cartas', label: 'Cartinhas' },
  { id: 'pote', label: 'Pote de conquistas' },
  { id: 'calendario', label: 'Retrospectiva' },
  { id: 'rotacoes', label: 'Rotações' },
  { id: 'mimos', label: 'Meus mimos' },
  { id: 'janela', label: 'Jardim' },
];

export function Quarto() {
  const ui = useUI();
  const reduce = useReducedMotion();
  const [view, setView] = useState<string | null>(() => ui.roomView);
  const [zoom, setZoom] = useState<RoomSpot | null>(null);
  const [back, setBack] = useState<RoomSpot | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const night = (() => {
    const h = new Date().getHours();
    return h < 6 || h >= 19;
  })();
  const eggs = useRoomEggs();

  useEffect(() => {
    if (ui.roomView && ui.roomView !== view) setView(ui.roomView);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ui.roomView]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const active = new Set<RoomSpot>([...(Object.keys(VIEWS) as RoomSpot[]), 'janela', 'armario']);
  if (eggs.enabled) (['gato', 'caixinha', ...(eggs.keyFound ? [] : ['chave'])] as RoomSpot[]).forEach((x) => active.add(x));

  const pick = (id: RoomSpot) => {
    if (eggs.onEgg(id)) return;
    play('pop');
    setZoom(id);
    const go = () => {
      setZoom(null);
      const link = LINKS[id];
      if (link) ui.go(link);
      else {
        setView(id);
        ui.setRoomView(id);
      }
    };
    if (reduce) go();
    else timer.current = setTimeout(go, 520);
  };

  const close = () => {
    setBack(view as RoomSpot);
    setView(null);
    ui.setRoomView(null);
  };

  if (view && VIEWS[view]) {
    return (
      <div className="page page-room-view">
        <header className="rv-head">
          <button className="btn btn-quiet btn-sm" onClick={close}><Icon name="chevronL" size={16} /> Quarto</button>
          <h1 className="h1">{VIEWS[view].title}</h1>
        </header>
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
          {VIEWS[view].render()}
        </motion.div>
      </div>
    );
  }

  const box = zoom ? SPOT_BOX[zoom] : back ? SPOT_BOX[back] : null;
  const origin = box ? `${((box[0] + box[2] / 2) / 1600) * 100}% ${((box[1] + box[3] / 2) / 900) * 100}%` : '50% 50%';
  const z = zoom ? Math.min(3.2, Math.max(1.8, 900 / Math.max(box![3], box![2] * 0.56))) : 1;

  return (
    <div className="page page-room">
      <header className="rv-head">
        <h1 className="h1">Meu quarto</h1>
        <span className="muted small">Clique nos objetos do quarto.</span>
      </header>
      <div className={`room ${night ? 'is-night' : ''}`}>
        <motion.div
          className="room-cam"
          style={{ transformOrigin: origin }}
          initial={back && !reduce ? { scale: 2.2, opacity: 0.4 } : false}
          animate={{ scale: z, opacity: zoom ? 0.15 : 1 }}
          transition={{ duration: zoom ? 0.55 : 0.45, ease: [0.4, 0.1, 0.25, 1] }}
          onAnimationComplete={() => back && setBack(null)}
        >
          <RoomArt active={active} onPick={pick} night={night} catAwake={eggs.catAwake} keyFound={eggs.keyFound} boxOpen={eggs.boxOpen} />
        </motion.div>
        <AnimatePresence>{eggs.overlay}</AnimatePresence>
      </div>
      <nav className="room-chips" aria-label="Atalhos do quarto">
        {LABELS.filter((l) => active.has(l.id)).map((l) => (
          <button key={l.id} className="chip chip-toggle" onClick={() => pick(l.id)}>{l.label}</button>
        ))}
      </nav>
    </div>
  );
}
