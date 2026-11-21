// Cena do modo história: tela cheia com tarjas de cinema, cenário da ilha, personagens
// em cena, legendas de narrador e balões de fala que digitam. Toque avança.
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { play } from '../../logic/sound';
import { Bioma } from '../scene/Bioma';
import { sprites } from '../battle/sprites';
import { islandOf } from '../data';
import type { Cena, Quem } from './story';

const NOME: Record<Quem, string> = { narrador: '', bigodes: 'Dr. Bigodes', yas: 'Yasmin', boss: '' };
const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function Cutscene({ cena, onEnd }: { cena: Cena; onEnd: () => void }) {
  const [i, setI] = useState(-1); // -1 = cartão do capítulo
  const [n, setN] = useState(0);
  const beat = i >= 0 ? cena.beats[i] : null;
  const text = beat?.texto ?? '';
  const done = n >= text.length;
  const bossIdx = useMemo(() => cena.beats.findIndex((b) => b.quem === 'boss'), [cena]);
  const bossOn = bossIdx >= 0 && i >= bossIdx;
  const yasOn = i >= 0;
  const slug = cena.boss ? islandOf(cena.boss.tema)?.slug : undefined;

  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = ''; }; }, []);
  useEffect(() => {
    if (!beat) return undefined;
    if (reduced()) { setN(text.length); return undefined; }
    setN(0);
    const t = window.setInterval(() => setN((x) => { if (x + 2 >= text.length) { window.clearInterval(t); return text.length; } return x + 2; }), 22);
    return () => window.clearInterval(t);
  }, [i]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (i === bossIdx && bossIdx >= 0) play('ghost'); }, [i]); // eslint-disable-line react-hooks/exhaustive-deps

  const next = () => {
    if (beat && !done) { setN(text.length); return; }
    if (i + 1 >= cena.beats.length) { onEnd(); return; }
    play('pop');
    setI(i + 1);
  };
  const who = beat?.quem;
  const bossNome = cena.boss?.nome ?? '';

  return createPortal(
    <div
      className={`cs cs-${cena.bioma} ${i === bossIdx && bossIdx >= 0 ? 'is-impact' : ''}`}
      role="dialog" aria-label={`${cena.capitulo}: ${cena.titulo}`} tabIndex={0}
      onClick={next} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next(); } if (e.key === 'Escape') onEnd(); }}
      ref={(el) => el?.focus()}
    >
      <Bioma b={cena.bioma} />
      <motion.span className="cs-bar is-top" initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.5 }} />
      <motion.span className="cs-bar is-bottom" initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.5 }} />
      <button className="cs-skip" onClick={(e) => { e.stopPropagation(); onEnd(); }}>pular ▸▸</button>

      {/* personagens */}
      <div className="cs-stage" aria-hidden="true">
        <AnimatePresence>
          {yasOn && (
            <motion.span key="yas" className={`cs-actor is-yas ${who === 'yas' ? 'is-talking' : who && who !== 'narrador' ? 'is-quiet' : ''}`} initial={{ x: -140, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 120, damping: 16 }}>
              <img src={sprites.yas()} alt="" draggable={false} />
            </motion.span>
          )}
          {i >= 0 && (
            <motion.span key="big" className={`cs-actor is-bigodes ${who === 'bigodes' ? 'is-talking' : who && who !== 'narrador' ? 'is-quiet' : ''}`} initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 14, delay: 0.15 }}>
              <img src={sprites.bigode()} alt="" draggable={false} />
            </motion.span>
          )}
          {bossOn && slug && (
            <motion.span key="boss" className={`cs-actor is-boss ${who === 'boss' ? 'is-talking' : who && who !== 'narrador' ? 'is-quiet' : ''}`} initial={{ x: 160, opacity: 0, scale: 1.3 }} animate={{ x: 0, opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 140, damping: 12 }}>
              <img src={sprites.monstro(slug)} alt="" draggable={false} />
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* cartão do capítulo */}
      <AnimatePresence>
        {i < 0 && (
          <motion.div className="cs-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.08 }} transition={{ duration: 0.35 }}>
            <motion.span className="cs-card-cap" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>{cena.capitulo.toUpperCase()}</motion.span>
            <motion.b className="cs-card-title" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.35, type: 'spring', stiffness: 220, damping: 13 }}>{cena.titulo}</motion.b>
            {cena.subtitulo && <motion.span className="cs-card-sub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>{cena.subtitulo}</motion.span>}
            <span className="cs-card-tap">toque para começar ▼</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* texto */}
      {beat && (
        who === 'narrador' ? (
          <motion.div key={`n${i}`} className="cs-caption" initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} aria-live="polite">
            <p>{text.slice(0, n)}<span className="cs-ghost" aria-hidden="true">{text.slice(n)}</span></p>
            {done && <i className="cs-next" aria-hidden="true">▼</i>}
          </motion.div>
        ) : (
          <motion.div key={`b${i}`} className={`cs-bubble at-${who}`} initial={{ scale: 0.85, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }} aria-live="polite">
            <b>{who === 'boss' ? bossNome : NOME[who!]}</b>
            <p>{text.slice(0, n)}<span className="cs-ghost" aria-hidden="true">{text.slice(n)}</span></p>
            {done && <i className="cs-next" aria-hidden="true">▼</i>}
          </motion.div>
        )
      )}
      {i >= 0 && <span className="cs-prog" aria-hidden="true"><span style={{ width: `${((i + 1) / cena.beats.length) * 100}%` }} /></span>}
    </div>,
    document.body,
  );
}
