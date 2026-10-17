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

  return { enabled: true, catAwake, keyFound: keyFound || !keyToday, boxOpen, onEgg, overlay };
}
