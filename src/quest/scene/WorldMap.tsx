// Mapa-múndi do Yas Quest: oceano em pixel com as ilhas dos temas por região,
// a rota do dia em dourado e a Yasmim navegando de ilha em ilha no barquinho.
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ISLANDS, FINAL } from '../data';
import { sprites } from '../battle/sprites';
import { BIOMA_NOME, type BiomaId } from './Bioma';

const files = import.meta.glob('./mapa/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const art = (n: string) => files[`./mapa/${n}.png`];

export const MAP_W = 360;
export const MAP_H = 1800;
/** posição (centro) de cada ilha no mapa, em unidades de 360 × 1800 */
export const POS: Record<string, [number, number]> = {
  srag: [104, 150], ir: [256, 240], acido: [104, 330], vm: [256, 420], va: [104, 510],
  tox: [256, 690], lra: [104, 780], pcr: [256, 870], dva: [104, 960],
  ad: [256, 1140], ep: [104, 1230], pp: [256, 1320], psi: [104, 1410],
  pal: [240, 1585], [FINAL]: [170, 1705],
};
const SIGNS: { b: BiomaId; y: number }[] = [{ b: 'resp', y: 56 }, { b: 'emerg', y: 600 }, { b: 'mente', y: 1050 }, { b: 'cuidado', y: 1495 }];
export const posOf = (tema: string) => POS[tema === FINAL ? FINAL : ISLANDS.find((i) => i.tema === tema)?.slug ?? 'srag'] ?? [180, 800];

export interface MapIsland { tema: string; label: string; bioma: BiomaId; slug?: string; done: boolean; routeN?: number; cur: boolean; fog: boolean; capital?: boolean }

export function WorldMap({ islands, sel, route, night, agora, proxima, onSelect }: { islands: MapIsland[]; sel: string; route: string[]; night?: boolean; agora?: string; proxima?: string; onSelect: (tema: string) => void }) {
  const box = useRef<HTMLDivElement>(null);
  // o barquinho fica onde você ESTÁ (a missão atual), não onde você tocou
  const [sx, sy] = posOf(agora ?? sel);
  useEffect(() => {
    // leva a câmera até a ilha escolhida
    const el = box.current?.querySelector<HTMLElement>(`[data-tema="${CSS.escape(sel)}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [sel]);
  // trechos da rota: feitos (dourado), o próximo passo (animado, de onde você está até a próxima) e o resto (pontilhado)
  const done = new Set(islands.filter((i) => i.done).map((i) => i.tema));
  const line = (a: string, b2: string) => { const [x1, y1] = posOf(a); const [x2, y2] = posOf(b2); return `M${x1},${y1} L${x2},${y2}`; };
  const segs = route.slice(0, -1).map((t, i) => ({ k: `${t}>${route[i + 1]}`, d: line(t, route[i + 1]), kind: done.has(t) && done.has(route[i + 1]) ? 'is-done' : 'is-later' }));
  if (agora && proxima) segs.push({ k: 'next', d: line(agora, proxima), kind: 'is-next' });
  const allPts = [...ISLANDS.map((i) => i.tema), FINAL].map(posOf).map(([x, y]) => `${x},${y}`).join(' ');
  return (
    <div className={`wm ${night ? 'is-night' : ''}`} ref={box} style={{ backgroundImage: `url(${art('oceano')})` }}>
      <svg className="wm-paths" viewBox={`0 0 ${MAP_W} ${MAP_H}`} aria-hidden="true">
        <polyline points={allPts} className="wm-sea" />
        {segs.map((g) => <path key={g.k} d={g.d} className={`wm-route ${g.kind}`} />)}
      </svg>
      {SIGNS.map((s) => (
        <span key={s.b} className={`wm-sign is-${s.b}`} style={{ top: `${(s.y / MAP_H) * 100}%` }}>{BIOMA_NOME[s.b]}</span>
      ))}
      {islands.map((i) => {
        const [x, y] = posOf(i.tema);
        const isFinal = i.tema === FINAL;
        return (
          <button
            key={i.tema} data-tema={i.tema}
            className={`wm-isle ${isFinal ? 'is-final' : ''} ${i.tema === sel ? 'is-sel' : ''} ${i.done ? 'is-done' : ''} ${i.tema === agora ? 'is-agora' : ''} ${i.tema === proxima ? 'is-proxima' : ''} ${route.length && !i.routeN && !isFinal ? 'is-off' : ''} ${i.fog ? 'is-fog' : ''}`}
            style={{ left: `${(x / MAP_W) * 100}%`, top: `${(y / MAP_H) * 100}%` }}
            onClick={() => onSelect(i.tema)}
            aria-label={`${i.label}${i.routeN ? `, missão ${i.routeN} de hoje` : ''}${i.done ? ', concluída hoje' : ''}`}
          >
            <img className="wm-land" src={art(isFinal ? 'ilha-final' : `ilha-${i.bioma}`)} alt="" draggable={false} />
            {i.slug && <span className="wm-boss"><img src={sprites.monstro(i.slug)} alt="" draggable={false} /></span>}
            {isFinal && <span className="wm-boss is-final">🏥</span>}
            <span className="wm-flag">{i.label}</span>
            {i.routeN && <span className={`wm-n ${i.done ? 'is-done' : ''}`}>{i.done ? '✓' : i.routeN}</span>}
            {i.done && <span className="wm-tag is-done">CONQUISTADA</span>}
            {i.tema === agora && !i.done && <span className="wm-tag is-agora">VOCÊ ESTÁ AQUI</span>}
            {i.tema === proxima && <span className="wm-tag is-proxima">PRÓXIMA ▼</span>}
            {i.done && <span className="wm-done-flag" aria-hidden="true">🚩</span>}
            {i.capital && <span className="wm-crown" aria-hidden="true">★</span>}
          </button>
        );
      })}
      <motion.span
        className="wm-boat" aria-hidden="true"
        animate={{ left: `${((sx + (sx > 180 ? -70 : 70)) / MAP_W) * 100}%`, top: `${((sy + 22) / MAP_H) * 100}%` }}
        transition={{ type: 'spring', stiffness: 40, damping: 14 }}
      >
        <span className="wm-boat-yas"><img src={sprites.yas()} alt="" draggable={false} /></span>
        <img className="wm-boat-hull" src={art('barco')} alt="" draggable={false} />
      </motion.span>
    </div>
  );
}
