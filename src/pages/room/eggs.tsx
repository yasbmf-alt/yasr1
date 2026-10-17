import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { RoomSpot } from '../../assets/RoomArt';
import { useStore } from '../../data/store';
import { useUI } from '../../components/ui';
import { play } from '../../logic/sound';
import { eggDay, phraseOfDay } from '../../logic/eggs';

export interface RoomEggs {
  enabled: boolean;
  catAwake: boolean;
  keyFound: boolean;
  boxOpen: boolean;
  onEgg: (id: RoomSpot) => boolean;
  overlay: React.ReactNode;
  extra: React.ReactNode; // bilhetinho escondido atrás do vaso
}

/** Segredos do quarto: gatinha, chavinha no vaso e caixinha de música. */
export function useRoomEggs(): RoomEggs {
  const { data, saveSettings } = useStore();
  const ui = useUI();
  const found = data.settings.eggsFound ?? {};
  const [catAwake, setCatAwake] = useState(false);
  const [boxOpen, setBoxOpen] = useState(false);
  const [note, setNote] = useState<{ text: string; x: number; y: number } | null>(null);
  const keyFound = !!found.chave;
  const keyToday = !keyFound && (eggDay('chave', 3) || Object.keys(found).length > 0);

  const mark = (id: string) => {
    if (!found[id]) saveSettings({ eggsFound: { ...found, [id]: new Date().toISOString() } });
  };

  const onEgg = (id: RoomSpot) => {
    if (id === 'gato') {
      setCatAwake(true);
      play('meow');
      setTimeout(() => play('purr'), 650);
      setNote({ text: phraseOfDay('gato'), x: 48, y: 74 });
      mark('gato');
      setTimeout(() => setCatAwake(false), 2600);
      setTimeout(() => setNote(null), 4200);
      return true;
    }
    if (id === 'chave') {
      play('key');
      mark('chave');
      ui.toast('Você achou uma chavinha! Ela abre alguma coisa aqui no quarto…', 'diva');
      return true;
    }
    if (id === 'caixinha') {
      if (!keyFound) {
        play('drop');
        setNote({ text: 'trancada… procure uma chavinha 🔑', x: 16, y: 18 });
        setTimeout(() => setNote(null), 2600);
        return true;
      }
      setBoxOpen(true);
      play('musicbox');
      mark('caixinha');
      setNote({ text: `🎵 ${phraseOfDay('caixinha')}`, x: 16, y: 18 });
      setTimeout(() => setNote(null), 6000);
      setTimeout(() => setBoxOpen(false), 6200);
      return true;
    }
    return false;
  };

  const overlay = note ? (
    <motion.div key={note.text} className="egg-note" style={{ left: `${note.x}%`, top: `${note.y}%` }} initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }}>
      {note.text}
      {boxOpen && <span className="egg-notes" aria-hidden="true"><i>♪</i><i>♫</i><i>♪</i></span>}
    </motion.div>
  ) : null;

  // bilhetinho dobrado atrás do vaso: aparece em alguns dias, uma vez por dia
  const noteKey = `bilhete-${new Date().toISOString().slice(0, 10)}`;
  const showNote = eggDay('bilhete', 3) && !found[noteKey];
  const extra = showNote ? (
    <motion.button
      className="room-note-egg"
      style={{ left: '91.5%', top: '84%' }}
      initial={{ rotate: -14 }}
      animate={{ rotate: [-14, -8, -14] }}
      transition={{ repeat: Infinity, duration: 3 }}
      whileHover={{ y: -4, rotate: 0 }}
      onClick={() => {
        play('envelope');
        mark(noteKey);
        setNote({ text: `💌 ${phraseOfDay('bilhete')}`, x: 70, y: 70 });
        setTimeout(() => setNote(null), 5200);
      }}
      aria-label="Um bilhetinho dobrado atrás do vaso"
    >
      <svg viewBox="0 0 30 22" width="100%" height="100%" aria-hidden="true">
        <path d="M1 4 L15 1 L29 4 L27 21 L3 21z" fill="#FFFDF4" stroke="#E8D9A8" strokeWidth="1.2" />
        <path d="M2 5 L15 13 L28 5" fill="none" stroke="#E8D9A8" strokeWidth="1.2" />
        <path d="M15 17 c-3 -2 -4 -3.5 -4 -4.6 c0 -1 .8 -1.8 1.8 -1.8 c.9 0 1.6 .6 2.2 1.3 c.6 -.7 1.3 -1.3 2.2 -1.3 c1 0 1.8 .8 1.8 1.8 c0 1.1 -1 2.6 -4 4.6z" fill="#F38CB8" />
      </svg>
    </motion.button>
  ) : null;

  return { extra, enabled: true, catAwake, keyFound: keyFound || !keyToday, boxOpen, onEgg, overlay };
}
