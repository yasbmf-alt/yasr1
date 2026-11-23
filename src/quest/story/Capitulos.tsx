// Menu do modo história: prólogo + um capítulo por ilha. Toca para assistir (ou rever).
import { motion } from 'framer-motion';
import { Bioma } from '../scene/Bioma';
import { sprites } from '../battle/sprites';
import { islandOf } from '../data';
import type { Cena } from './story';

export function Capitulos({ cenas, vistos, onPlay, onBack }: { cenas: Cena[]; vistos: Record<string, string>; onPlay: (c: Cena) => void; onBack: () => void }) {
  return (
    <div className="yq-hs">
      <button className="px-back" onClick={onBack}>◀ MAPA</button>
      <h2 className="px-h yq-hs-title">📖 MODO HISTÓRIA</h2>
      <p className="yq-hs-sub">A jornada da Yasmim pelo arquipélago. Cada ilha tem o seu capítulo: assista antes da missão ou reveja quando quiser.</p>
      <ol className="yq-hs-list">
        {cenas.map((c, k) => {
          const slug = c.boss ? islandOf(c.boss.tema)?.slug : undefined;
          const seen = !!vistos[c.id];
          return (
            <motion.li key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(k, 8) * 0.03 }}>
              <button className={`yq-hs-ch ${seen ? 'is-seen' : 'is-new'}`} onClick={() => onPlay(c)}>
                <span className="yq-hs-thumb"><Bioma b={c.bioma} still />{slug ? <img src={sprites.monstro(slug)} alt="" /> : c.id === 'prologo' ? <img src={sprites.bigode()} alt="" /> : <span className="yq-hs-emoji">🏥</span>}</span>
                <span className="yq-hs-txt">
                  <small>{c.capitulo}</small>
                  <b>{c.titulo}</b>
                  <i>{c.beats.length} cenas · {seen ? 'assistido ✓' : 'novo'}</i>
                </span>
                <span className="yq-hs-play" aria-hidden="true">▶</span>
              </button>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
