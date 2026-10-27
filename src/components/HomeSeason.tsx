import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../data/store';
import { useUI } from './ui';
import { useActiveEvents } from './EventDecor';
import { burst, multiTap } from '../logic/fx';
import { play } from '../logic/sound';

// Temporadas só na página inicial: Halloween (roxo, preto e laranja) e Natal
// (vermelho, verde-floresta e amarelo-manteiga). Quando a data passa, a classe
// some e as cores normais voltam sozinhas. Sons só tocam ao clicar.

export type HomeSeasonId = 'halloween' | 'natal' | null;

export function useHomeSeason(): HomeSeasonId {
  const ev = useActiveEvents();
  const s = ev.seasonal;
  if (!s || !s.scenes.includes('trilha')) return null;
  return s.theme === 'halloween' ? 'halloween' : s.theme === 'natal' ? 'natal' : null;
}

export function HomeSeason({ season }: { season: HomeSeasonId }) {
  if (season === 'halloween') return <Halloween />;
  if (season === 'natal') return <Natal />;
  return null;
}

function Halloween() {
  const ui = useUI();
  const { data } = useStore();
  const ambient = data.settings.ambient !== false;
  const [boo, setBoo] = useState(false);
  return (
    <>
    <div className="hs hs-halloween" aria-hidden="true">
      {ambient && [0, 1, 2].map((i) => (
        <button
          key={i}
          className={`hs-bat b${i}`}
          tabIndex={-1}
          onClick={(e) => {
            play('pop');
            burst(e, 'brilho', 5);
            if (multiTap('morcego', 5)) ui.toast('Você encontrou a colônia de morcegos! 🦇 Nada te assusta, nem a prova.', 'diva');
          }}
        >
          <svg viewBox="0 0 64 28"><path d="M32 10 c-3 -6 -8 -8 -14 -6 c2 3 2 6 0 8 c-4 -3 -10 -3 -16 1 c6 1 10 5 12 10 c3 -3 7 -4 11 -2 c2 -3 4 -5 7 -5 c3 0 5 2 7 5 c4 -2 8 -1 11 2 c2 -5 6 -9 12 -10 c-6 -4 -12 -4 -16 -1 c-2 -2 -2 -5 0 -8 c-6 -2 -11 0 -14 6z" /><circle cx="29" cy="12" r="1.3" fill="#ffd166" /><circle cx="35" cy="12" r="1.3" fill="#ffd166" /></svg>
        </button>
      ))}
    </div>
      <motion.button
        className={`hs-ghost ${boo ? 'is-boo' : ''}`}
        tabIndex={-1}
        whileHover={{ y: -6 }}
        onClick={(e) => {
          setBoo(true);
          play('ghost');
          burst(e, 'brilho', 8);
          if (multiTap('fantasma', 3)) ui.toast('Buuu! Fantasminha diz: você é a residente mais corajosa que eu já assombrei. 👻', 'diva');
          setTimeout(() => setBoo(false), 900);
        }}
        aria-label="Fantasminha"
      >
        <svg viewBox="0 0 40 48"><path d="M4 22 a16 16 0 0 1 32 0 v22 l-5 -4 l-5 4 l-6 -4 l-6 4 l-5 -4 l-5 4z" fill="#fbf7ff" /><circle cx="15" cy="21" r="2.6" fill="#2a2238" /><circle cx="25" cy="21" r="2.6" fill="#2a2238" /><ellipse cx="20" cy="29" rx={boo ? 4 : 2.4} ry={boo ? 4.5 : 1.8} fill="#2a2238" /></svg>
      </motion.button>
      {ambient && <span className="hs-fog" aria-hidden="true" />}
    </>
  );
}

function Natal() {
  const ui = useUI();
  return (
    <>
    <div className="hs hs-natal" aria-hidden="true">
      <span className="hs-ornaments">
        <i className="o1" /><i className="o2" /><i className="o3" />
      </span>
      <span className="hs-lights">
        {Array.from({ length: 18 }).map((_, i) => <i key={i} style={{ animationDelay: `${(i % 6) * 0.35}s` }} />)}
      </span>
      </div>
      <motion.button
        className="hs-star"
        tabIndex={-1}
        whileHover={{ rotate: 18, scale: 1.1 }}
        onClick={(e) => {
          play('jingle');
          burst(e, 'brilho', 12);
          if (multiTap('estrela-natal', 3)) ui.toast('Ho ho ho! O Papai Noel deixou um recado: você merece um descanso gostoso hoje. 🎁', 'diva');
        }}
        aria-label="Estrela de Natal"
      >
        <svg viewBox="0 0 40 40"><path d="M20 2 l5 12 l13 1 l-10 8 l3 13 l-11 -7 l-11 7 l3 -13 l-10 -8 l13 -1z" fill="#ffd34d" stroke="#e0a91c" strokeWidth="1.5" strokeLinejoin="round" /></svg>
      </motion.button>
    </>
  );
}
