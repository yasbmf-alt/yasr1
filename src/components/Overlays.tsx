import React, { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useStore } from '../data/store';
import { Icon } from './Icon';
import { assetUrl } from '../assets/registry';
import { play } from '../logic/sound';
import { fmtLong } from '../logic/dates';
import { NOTE_HEX } from '../logic/colors';

export type Overlay =
  | { kind: 'image'; assetId: string }
  | { kind: 'voucher'; voucherId: string }
  | { kind: 'letter'; letterId: string }
  | { kind: 'event'; eventId: string; preview?: boolean };

function useEsc(onClose: () => void) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
}

const PARTICLE_COLORS = ['#F38CB8', '#D9EE76', '#FFF3B0', '#CFE4FF', '#E9D8FF', '#FFAEB1'];

/** confete e beijinhos subindo e caindo */
export function Party({ kisses = true }: { kisses?: boolean }) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <div className="party" aria-hidden="true">
      {Array.from({ length: 46 }).map((_, i) => (
        <motion.span
          key={`c${i}`}
          className="confetto"
          style={{ left: `${(i * 37) % 100}%`, background: PARTICLE_COLORS[i % PARTICLE_COLORS.length], borderRadius: i % 3 ? 3 : 99 }}
          initial={{ y: -40, rotate: 0, opacity: 1 }}
          animate={{ y: '108vh', rotate: 300 + i * 23, x: (i % 2 ? 1 : -1) * (20 + (i % 7) * 9) }}
          transition={{ duration: 2.4 + (i % 5) * 0.35, delay: (i % 10) * 0.05, ease: 'easeIn' }}
        />
      ))}
      {kisses &&
        Array.from({ length: 16 }).map((_, i) => (
          <motion.span
            key={`k${i}`}
            className="kiss"
            style={{ left: `${8 + ((i * 53) % 84)}%`, fontSize: 18 + (i % 4) * 7 }}
            initial={{ y: '100vh', opacity: 0, scale: 0.6 }}
            animate={{ y: '-12vh', opacity: [0, 1, 1, 0], scale: [0.6, 1, 1, 0.9], x: [0, (i % 2 ? 18 : -18), 0] }}
            transition={{ duration: 3.4 + (i % 4) * 0.4, delay: 0.25 + i * 0.14, ease: 'easeOut' }}
          >
            {i % 3 === 0 ? '💋' : '💗'}
          </motion.span>
        ))}
    </div>
  );
}

/** Pop-up de conclusão: SOMENTE a imagem da Yasmim, sem texto nem moldura. */
export function ImagePop({ assetId, onClose }: { assetId: string; onClose: () => void }) {
  useEsc(onClose);
  useEffect(() => {
    play('chapter');
    const t = setTimeout(() => play('kiss'), 700);
    return () => clearTimeout(t);
  }, []);
  return (
    <motion.div className="imgpop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} role="dialog" aria-label="Recompensa">
      <Party />
      <motion.img
        src={assetUrl(assetId)}
        alt=""
        className="imgpop-img"
        draggable={false}
        initial={{ scale: 0.82, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 20 }}
      />
      <button className="imgpop-x" onClick={onClose} aria-label="Fechar"><Icon name="close" size={18} /></button>
    </motion.div>
  );
}

/** Vale de mimo revelado como ingresso vintage saindo do envelope. */
export function VoucherReveal({ voucherId, onClose }: { voucherId: string; onClose: () => void }) {
  const { data } = useStore();
  useEsc(onClose);
  useEffect(() => {
    const t = setTimeout(() => play('paper'), 250);
    return () => clearTimeout(t);
  }, []);
  const v = data.vouchers.find((x) => x.id === voucherId);
  if (!v) return null;
  return (
    <motion.div className="vreveal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} role="dialog" aria-label={v.name}>
      <div className="vr-stage" onClick={(e) => e.stopPropagation()}>
        <motion.div className="vr-env" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 18 }}>
          <motion.span className="vr-flap" initial={{ rotateX: 0 }} animate={{ rotateX: 180 }} transition={{ delay: 0.45, duration: 0.45 }} />
        </motion.div>
        <motion.div className="ticket" initial={{ y: 80, scale: 0.7, opacity: 0 }} animate={{ y: -10, scale: 1, opacity: 1 }} transition={{ delay: 0.8, type: 'spring', stiffness: 160, damping: 16 }}>
          <span className="tk-notch tk-l" />
          <span className="tk-notch tk-r" />
          <span className="tk-top">🎟️ vale</span>
          <span className="tk-emoji">{v.emoji}</span>
          <strong className="tk-name">{v.name.toUpperCase()}</strong>
          <p className="tk-msg">{v.message}</p>
          <span className="tk-foot">sem validade · resgate quando quiser</span>
          <button className="btn btn-primary btn-sm" onClick={onClose}>Guardar em Meus Mimos</button>
        </motion.div>
      </div>
    </motion.div>
  );
}

/** Carta para a Yas do futuro: envelope abrindo e a mensagem original. */
export function LetterOpen({ letterId, onClose }: { letterId: string; onClose: () => void }) {
  const { data, saveLetter } = useStore();
  const l = data.letters.find((x) => x.id === letterId);
  const marked = useRef(false);
  useEsc(onClose);
  useEffect(() => {
    if (!l || marked.current) return;
    marked.current = true;
    if (!l.openedAt) saveLetter({ ...l, openedAt: new Date().toISOString() });
    const t = setTimeout(() => play('envelope'), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!l) return null;
  return (
    <motion.div className="lopen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-label={l.title || 'Carta'}>
      <div className="lo-stage">
        <motion.div className="lo-env" style={{ background: NOTE_HEX[l.envelope] }} initial={{ scale: 0.6, y: 60, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 18 }}>
          <motion.span className="lo-flap" style={{ background: NOTE_HEX[l.envelope] }} initial={{ rotateX: 0 }} animate={{ rotateX: 180 }} transition={{ delay: 0.7, duration: 0.55 }} />
          <motion.span className="lo-seal" initial={{ scale: 1 }} animate={{ scale: 0, opacity: 0 }} transition={{ delay: 0.5, duration: 0.25 }}>♥</motion.span>
        </motion.div>
        <motion.article className="lo-paper" initial={{ y: 40, opacity: 0, scale: 0.85 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ delay: 1.25, type: 'spring', stiffness: 140, damping: 18 }}>
          {l.title && <h2 className="lo-title">{l.title}</h2>}
          <p className="lo-body">{l.body}</p>
          <span className="lo-date">escrita em {fmtLong(l.createdAt.slice(0, 10))}</span>
          <button className="btn btn-primary btn-sm" onClick={onClose}>Guardar na caixa</button>
        </motion.article>
      </div>
    </motion.div>
  );
}
