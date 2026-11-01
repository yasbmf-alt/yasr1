// Yasland: cidadezinha onde os registros da vida real (treino, água, mercado,
// cozinha, spa e horta) viram ambientes interativos.
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import './yasland.css';
import { CityMap, PLACES, type PlaceId } from './CityMap';
import { useYl } from './store';
import { activeDays, BADGES, earned, plotGrowth } from './logic';
import { daysUntil, weekStartOf } from './ui';
import { today } from '../logic/dates';
import { burst } from '../logic/fx';
import { play } from '../logic/sound';
import { Academia } from './places/Academia';
import { Mercadinho } from './places/Mercadinho';
import { Casa } from './places/Casa';
import { Spa } from './places/Spa';
import { Horta } from './places/Horta';
import { Prefeitura } from './places/Prefeitura';

const KEY = 'yasr1-yl-place';
const recall = () => {
  try {
    return (localStorage.getItem(KEY) as PlaceId | null) || null;
  } catch {
    return null;
  }
};

export interface PlaceProps {
  onBack: () => void;
  go: (p: PlaceId) => void;
}

export function Yasland() {
  const yl = useYl();
  const [place, setPlace] = useState<PlaceId | null>(recall);
  const go = (p: PlaceId | null) => {
    setPlace(p);
    try {
      if (p) localStorage.setItem(KEY, p);
      else localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // conquistas novas: aparecem uma vez, com festa
  const got = useMemo(() => earned(yl.of, yl.cfg.waterGoal), [yl.all]); // eslint-disable-line react-hooks/exhaustive-deps
  const fresh = BADGES.filter((b) => got.has(b.id) && !yl.cfg.seenBadges.includes(b.id));
  const [showNew, setShowNew] = useState(false);
  useEffect(() => {
    if (!fresh.length) return;
    setShowNew(true);
    play('mission');
    burst({ x: window.innerWidth / 2, y: window.innerHeight / 2.4 }, 'confete', 24);
  }, [fresh.map((b) => b.id).join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const closeNew = () => {
    setShowNew(false);
    yl.setCfg({ seenBadges: [...new Set([...yl.cfg.seenBadges, ...fresh.map((b) => b.id)])] });
  };

  const t = today();
  const water = yl.of('water').filter((w) => w.date === t).reduce((a, w) => a + w.ml, 0);
  const ws = weekStartOf(t);
  const trains = [...yl.of('cardio'), ...yl.of('lift'), ...yl.of('sport')].filter((x) => x.date >= ws).length;
  const habits = yl.of('habit').filter((h) => !h.archived);
  const checked = new Set(yl.of('hcheck').filter((c) => c.date === t).map((c) => c.habitId));
  const expiring = yl.of('stock').filter((s) => s.status === 'ok' && s.expiry && daysUntil(s.expiry) <= 3).length;
  const act = activeDays(yl.of, yl.cfg.waterGoal);
  const ripe = yl.of('plot').filter((p) => !p.harvestedAt && plotGrowth(p, act).stage === 4).length;

  const props = { onBack: () => go(null), go: (p: PlaceId) => go(p) };
  return (
    <div className="page yl">
      <AnimatePresence mode="wait">
        {!place ? (
          <motion.div key="map" className="yl-city" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.04 }} transition={{ duration: 0.25 }}>
            <header className="yl-head">
              <div>
                <h1 className="h1">Yasland 🌆</h1>
                <p className="muted">Sua cidadezinha: clique num prédio para entrar.</p>
              </div>
              <div className="yl-today">
                <button className="yl-chip" onClick={() => go('casa')} title="Água de hoje"><span>💧</span><b>{(water / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}L</b><small>/{(yl.cfg.waterGoal / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}L</small></button>
                <button className="yl-chip" onClick={() => go('academia')} title="Treinos nesta semana"><span>🏋🏻‍♀️</span><b>{trains}</b><small>treino{trains === 1 ? '' : 's'} na semana</small></button>
                {habits.length > 0 && <button className="yl-chip" onClick={() => go('spa')} title="Hábitos de hoje"><span>✅</span><b>{checked.size}/{habits.length}</b><small>hábitos hoje</small></button>}
              </div>
            </header>
            <div className="yl-map-wrap">
              <CityMap onPick={(p) => go(p)} badges={{ mercadinho: expiring, horta: ripe }} />
            </div>
            <nav className="yl-quick" aria-label="Lugares da Yasland">
              {PLACES.map((p) => <button key={p.id} className="yl-quick-b" onClick={() => go(p.id)}><span>{p.emoji}</span>{p.name}</button>)}
            </nav>
          </motion.div>
        ) : (
          <motion.div key={place} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            {place === 'academia' && <Academia {...props} />}
            {place === 'mercadinho' && <Mercadinho {...props} />}
            {place === 'casa' && <Casa {...props} />}
            {place === 'spa' && <Spa {...props} />}
            {place === 'horta' && <Horta {...props} />}
            {place === 'prefeitura' && <Prefeitura {...props} />}
          </motion.div>
        )}
      </AnimatePresence>

      {createPortal(<AnimatePresence>
        {showNew && fresh.length > 0 && (
          <motion.div className="yparty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeNew} role="dialog" aria-label="Conquista nova">
            <motion.div className="party-card" initial={{ scale: 0.6, rotate: -4 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }} onClick={(e) => e.stopPropagation()}>
              <span className="party-k">Nova peça no museu da Yasland</span>
              <div className="yl-new-badges">
                {fresh.slice(0, 4).map((b, i) => (
                  <motion.div key={b.id} className="yl-badge is-got" initial={{ y: 20, opacity: 0, rotate: -10 }} animate={{ y: 0, opacity: 1, rotate: 0 }} transition={{ delay: 0.2 + i * 0.15, type: 'spring' }}>
                    <span className="yl-badge-e">{b.emoji}</span>
                    <strong>{b.name}</strong>
                    <small>{b.desc}</small>
                  </motion.div>
                ))}
              </div>
              <button className="btn btn-primary btn-sm" onClick={closeNew}>Guardar no museu</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>, document.body)}
    </div>
  );
}
