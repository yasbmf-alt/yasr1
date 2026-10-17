import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../data/store';
import { useUI } from './ui';
import { play } from '../logic/sound';
import { dayHash, eggDay, phraseOfDay } from '../logic/eggs';
import { rollMimo } from '../logic/rewards';
import { diffDays, today } from '../logic/dates';

/** Gatinha escondida atrás de um arbusto da trilha (um capítulo por dia). */
export function TrailCat({ chapterIndex, chapters, x, y }: { chapterIndex: number; chapters: number; x: number; y: number }) {
  const { data, saveSettings } = useStore();
  const ui = useUI();
  const [peek, setPeek] = useState(false);
  if (!chapters || dayHash('gato-trilha') % chapters !== chapterIndex) return null;
  return (
    <motion.button
      className={`trail-cat ${peek ? 'is-peek' : ''}`}
      style={{ left: `${x}%`, top: y }}
      onClick={() => {
        setPeek(true);
        play('meow');
        ui.toast(phraseOfDay('gato-trilha'), 'diva');
        saveSettings({ eggsFound: { ...(data.settings.eggsFound ?? {}), 'gato-trilha': new Date().toISOString() } });
        setTimeout(() => setPeek(false), 1800);
      }}
      aria-label="Uma gatinha escondida"
      whileHover={{ y: -6 }}
    >
      <svg viewBox="0 0 60 44" width="100%" height="100%" aria-hidden="true">
        <path d="M8 44 c0 -22 10 -32 22 -32 s22 10 22 32z" fill="#F2C38E" />
        <path d="M12 20 l2 -16 l12 10z M48 20 l-2 -16 l-12 10z" fill="#F2C38E" />
        <path d="M15 16 l1 -7 l6 5z M45 16 l-1 -7 l-6 5z" fill="#F8C9F1" />
        {peek ? (
          <>
            <path d="M20 26 q4 -4 8 0 M32 26 q4 -4 8 0" fill="none" stroke="#2E4A7F" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M26 33 q4 4 8 0" fill="none" stroke="#C97B8A" strokeWidth="2" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="23" cy="26" r="3" fill="#2E4A7F" />
            <circle cx="37" cy="26" r="3" fill="#2E4A7F" />
            <path d="M28 32 l2 2 l2 -2" fill="none" stroke="#C97B8A" strokeWidth="2" strokeLinecap="round" />
          </>
        )}
      </svg>
    </motion.button>
  );
}

/** Docinho raro: vira um vale docinho de verdade, no máximo a cada 10 dias. */
export function Candy({ x, y }: { x: number; y: number }) {
  const store = useStore();
  const ui = useUI();
  const { data } = store;
  const key = `docinho-${today()}`;
  const found = data.settings.eggsFound ?? {};
  const lastCandy = data.vouchers.filter((v) => v.source === 'docinho escondido').map((v) => v.receivedAt.slice(0, 10)).sort().at(-1);
  const allowed = !lastCandy || diffDays(today(), lastCandy) >= 10;
  if (!eggDay('docinho', 8) || found[key] || !allowed) return null;
  return (
    <AnimatePresence>
      <motion.button
        className="candy"
        style={{ left: `${x}%`, top: y }}
        initial={{ scale: 0 }}
        animate={{ scale: 1, rotate: [0, -8, 8, 0] }}
        transition={{ rotate: { repeat: Infinity, duration: 2.6, repeatDelay: 2 } }}
        onClick={() => {
          play('candy');
          const d = store.snapshot();
          const v = rollMimo(d, 'docinho escondido', { force: true, only: 'docinho' }) ?? rollMimo(d, 'docinho escondido', { force: true });
          store.saveSettings({ eggsFound: { ...found, [key]: new Date().toISOString() } });
          if (v) {
            store.saveVoucher(v);
            ui.enqueue({ kind: 'voucher', voucherId: v.id });
          }
        }}
        aria-label="Um docinho escondido"
      >
        <svg viewBox="0 0 64 32" width="100%" height="100%" aria-hidden="true">
          <path d="M2 6 L18 16 L2 26z M62 6 L46 16 L62 26z" fill="#F38CB8" />
          <circle cx="32" cy="16" r="15" fill="#FFAEB1" />
          <path d="M20 8 q12 8 0 16 M30 2 q10 14 0 28 M40 4 q8 12 0 24" fill="none" stroke="#fff" strokeWidth="3" opacity=".75" />
        </svg>
      </motion.button>
    </AnimatePresence>
  );
}

/** Borboleta do jardim: voa ao ser tocada e deixa uma frase escondida. */
export function GardenButterfly() {
  const { data, saveSettings } = useStore();
  const ui = useUI();
  const [gone, setGone] = useState(false);
  return (
    <motion.button
      className="g-butterfly"
      style={{ left: '62%', top: '38%' }}
      animate={gone ? { x: 400, y: -300, opacity: 0, rotate: 20 } : { x: [0, 20, -10, 0], y: [0, -14, -6, 0] }}
      transition={gone ? { duration: 1.4, ease: 'easeIn' } : { duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      onClick={(e) => {
        e.stopPropagation();
        if (gone) return;
        setGone(true);
        play('pop');
        ui.toast(phraseOfDay('borboleta'), 'diva');
        saveSettings({ eggsFound: { ...(data.settings.eggsFound ?? {}), borboleta: new Date().toISOString() } });
        setTimeout(() => setGone(false), 30000);
      }}
      aria-label="Uma borboleta"
    >
      <span className="wing wing-l" />
      <span className="wing wing-r" />
    </motion.button>
  );
}
