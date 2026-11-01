// Horta: canteiros que começam vazios. Cada semente cresce com os dias em que
// você cuidou de si (treino, água na meta, hábito, skincare, sono, receita…).
// Nada morre se você parar; quando fica pronta, dá para colher e ela entra na coleção.
import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { PlaceProps } from '../Yasland';
import { Hot, Place, PanelHead, fmtDate } from '../ui';
import { useYl, ylId, nowIso } from '../store';
import { activeDays, plotGrowth, SPECIES, speciesOf } from '../logic';
import type { YlPlot } from '../types';
import { play } from '../../logic/sound';
import { burst } from '../../logic/fx';
import { today } from '../../logic/dates';

const SLOTS = 12;
const DECOR = [
  { at: 2, id: 'espantalho', name: 'Espantalho' },
  { at: 5, id: 'banheira', name: 'Banheira de passarinho' },
  { at: 9, id: 'colmeia', name: 'Colmeia' },
  { at: 14, id: 'arco', name: 'Arco de flores' },
];

function PlantArt({ species, stage, x, y }: { species: string; stage: number; x: number; y: number }) {
  const sp = speciesOf(species);
  return (
    <g transform={`translate(${x} ${y})`} className={`yl-plant st-${stage}`}>
      {stage === 0 && (
        <>
          <ellipse cx="0" cy="4" rx="15" ry="7" fill="#A0704B" />
          <ellipse cx="-4" cy="1" rx="3" ry="2" fill="#F3D9A4" />
          <ellipse cx="4" cy="3" rx="3" ry="2" fill="#F3D9A4" />
        </>
      )}
      {stage >= 1 && <path d="M0 6 v-18" stroke="#5FA36A" strokeWidth="4" strokeLinecap="round" />}
      {stage >= 1 && <ellipse cx="-7" cy="-12" rx="7" ry="4" fill="#8DC26F" transform="rotate(-30 -7 -12)" />}
      {stage >= 1 && <ellipse cx="7" cy="-14" rx="7" ry="4" fill="#8DC26F" transform="rotate(30 7 -14)" />}
      {stage >= 2 && <path d="M0 -10 v-16" stroke="#5FA36A" strokeWidth="4" strokeLinecap="round" />}
      {stage >= 2 && <ellipse cx="-10" cy="-26" rx="10" ry="6" fill="#7DB85F" transform="rotate(-25 -10 -26)" />}
      {stage >= 2 && <ellipse cx="10" cy="-28" rx="10" ry="6" fill="#7DB85F" transform="rotate(25 10 -28)" />}
      {stage >= 3 && <circle cx="0" cy="-36" r="12" fill="#6FAE58" />}
      {stage === 4 && <text x="0" y="-30" textAnchor="middle" fontSize="26" className="yl-ripe">{sp.emoji}</text>}
    </g>
  );
}

export function Horta({ onBack }: PlaceProps) {
  const yl = useYl();
  const [spot, setSpot] = useState<string | null>(null);
  const [water, setWater] = useState<number | null>(null);
  const act = activeDays(yl.of, yl.cfg.waterGoal);
  const plots = yl.of('plot');
  const growing = plots.filter((p) => !p.harvestedAt);
  const harvested = plots.filter((p) => p.harvestedAt);
  const at = (slot: number) => growing.find((p) => p.slot === slot);
  const pick = (id: string) => setSpot((s) => (s === id ? null : id));
  const decor = DECOR.filter((d) => harvested.length >= d.at);

  const scene = (
    <svg viewBox="0 0 1000 480" className="yl-room" role="img" aria-label="Horta">
      <rect width="1000" height="480" fill="#CFE6B4" />
      {Array.from({ length: 30 }).map((_, i) => <circle key={i} cx={(i * 131) % 1000} cy={(i * 71) % 480} r="2" fill="#B9D99A" />)}
      {Array.from({ length: 51 }).map((_, i) => <rect key={i} x={-4 + i * 20} y="8" width="8" height="26" rx="3" fill="#F7EBD8" />)}
      <rect x="0" y="20" width="1000" height="6" fill="#EAD9BD" />
      {Array.from({ length: SLOTS }).map((_, i) => {
        const r = Math.floor(i / 4);
        const c = i % 4;
        const x = 60 + c * 190;
        const y = 70 + r * 130;
        const p = at(i);
        const g = p ? plotGrowth(p, act) : null;
        return (
          <Hot key={i} id={`plot-${i}`} label={p ? `${speciesOf(p.species).name}: ${g!.stage === 4 ? 'pronta para colher' : 'crescendo'}` : 'Canteiro vazio: plantar'} on={spot === `plot-${i}`} onPick={pick}>
            <rect x={x} y={y} width="160" height="100" rx="14" fill="#9C6B45" />
            <rect x={x + 8} y={y + 8} width="144" height="84" rx="10" fill={p ? '#6E4730' : '#7D5236'} />
            {!p && <text x={x + 80} y={y + 56} textAnchor="middle" className="yl-tag yl-plus">+ plantar</text>}
            {p && <text x={x + 146} y={y + 26} textAnchor="end" fontSize="16">{speciesOf(p.species).emoji}</text>}
            {p && [0, 1, 2].map((k) => <PlantArt key={k} species={p.species} stage={g!.stage} x={x + 36 + k * 44} y={y + 70} />)}
            {p && g!.stage < 4 && <rect x={x + 20} y={y + 86} width={120 * g!.pct} height="5" rx="2.5" fill="#FFE08A" />}
            {water === i && [0, 1, 2, 3, 4].map((k) => <circle key={k} className="yl-rain" cx={x + 30 + k * 25} cy={y + 10} r="4" fill="#7FB8F5" style={{ animationDelay: `${k * 0.08}s` }} />)}
          </Hot>
        );
      })}
      {/* galpão: coleção */}
      <Hot id="colecao" label="Galpão: coleção de colheitas" on={spot === 'colecao'} onPick={pick}>
        <rect x="830" y="120" width="140" height="150" rx="8" fill="#E6CFB4" stroke="#C79A72" strokeWidth="4" />
        <path d="M818 126 L900 70 L982 126 Z" fill="#D9578F" />
        <rect x="878" y="200" width="44" height="70" rx="6" fill="#C79A72" />
        <text x="900" y="160" textAnchor="middle" fontSize="26">🧺</text>
        <text x="900" y="300" textAnchor="middle" className="yl-tag yl-tag-dark">{harvested.length} colhidas</text>
      </Hot>
      {/* decorações liberadas pelas colheitas */}
      {decor.some((d) => d.id === 'espantalho') && <text x="900" y="400" fontSize="54" textAnchor="middle" className="yl-sway">🎃</text>}
      {decor.some((d) => d.id === 'banheira') && <text x="860" y="460" fontSize="34" textAnchor="middle">🐦</text>}
      {decor.some((d) => d.id === 'colmeia') && <text x="960" y="460" fontSize="34" textAnchor="middle" className="yl-sway">🐝</text>}
      {decor.some((d) => d.id === 'arco') && <text x="940" y="380" fontSize="34" textAnchor="middle">🌸</text>}
      <g className="yl-butterfly"><text fontSize="22">🦋</text></g>
    </svg>
  );

  const slot = spot?.startsWith('plot-') ? Number(spot.slice(5)) : null;
  const plot = slot != null ? at(slot) : undefined;
  const panel =
    spot === 'colecao' ? (
      <Collection harvested={harvested} decorCount={harvested.length} onClose={() => setSpot(null)} />
    ) : slot != null ? (
      plot ? (
        <PlotPanel
          p={plot}
          active={act}
          onClose={() => setSpot(null)}
          onWater={() => { setWater(slot); play('pop'); setTimeout(() => setWater(null), 1200); }}
          onHarvest={(e) => {
            yl.save({ ...plot, harvestedAt: nowIso() });
            play('mission');
            burst(e, 'folhas', 18);
            setSpot('colecao');
          }}
        />
      ) : (
        <Seeds onClose={() => setSpot(null)} onPlant={(sp) => { yl.save({ id: ylId('plot'), kind: 'plot', createdAt: nowIso(), slot, species: sp, plantedAt: today() }); play('grow'); setSpot(null); }} />
      )
    ) : null;
  return <Place title="Horta" emoji="🌱" onBack={onBack} scene={scene} spot={spot} panel={panel} hint="As plantas crescem com os dias em que você se cuida (treino, água na meta, hábitos, skincare, sono, receitas…). Nada murcha se você parar." />;
}

function Seeds({ onClose, onPlant }: { onClose: () => void; onPlant: (species: string) => void }) {
  return (
    <div>
      <PanelHead title="🌰 Escolha uma semente" sub="Cada uma precisa de alguns dias de cuidado para ficar pronta." onClose={onClose} />
      <div className="yl-seeds">
        {SPECIES.map((s, i) => (
          <motion.button key={s.id} className="yl-seed" onClick={() => onPlant(s.id)} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} whileHover={{ y: -5, rotate: -3 }}>
            <span className="yl-seed-e">{s.emoji}</span>
            <strong>{s.name}</strong>
            <small className="muted">{s.days} dias de cuidado</small>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function PlotPanel({ p, active, onClose, onWater, onHarvest }: { p: YlPlot; active: Set<string>; onClose: () => void; onWater: () => void; onHarvest: (e: React.MouseEvent) => void }) {
  const yl = useYl();
  const sp = speciesOf(p.species);
  const g = plotGrowth(p, active);
  const label = ['semente', 'brotinho', 'mudinha', 'quase lá', 'pronta para colher!'][g.stage];
  return (
    <div>
      <PanelHead title={`${sp.emoji} ${sp.name}`} sub={`Plantada ${fmtDate(p.plantedAt)} · ${label}`} onClose={onClose} />
      <div className="yl-plot">
        <div className="yl-plot-bar"><motion.i style={{ background: sp.color }} initial={{ width: 0 }} animate={{ width: `${g.pct * 100}%` }} /></div>
        <span className="small">{g.n} de {g.need} dias de cuidado desde o plantio</span>
        <div className="btn-row">
          <button className="btn btn-secondary btn-sm" onClick={onWater}>🚿 Regar</button>
          {g.stage === 4 && <button className="btn btn-primary btn-sm" onClick={onHarvest}>🧺 Colher</button>}
          <button className="btn btn-quiet btn-sm" onClick={() => { yl.del(p.id); onClose(); }}>Tirar do canteiro</button>
        </div>
        {g.stage < 4 && <p className="muted small">Ela cresce sozinha nos dias em que você registra um treino, bate a meta de água, marca um hábito, faz o skincare, registra o sono, uma tarefa da pia ou prepara uma receita.</p>}
      </div>
    </div>
  );
}

function Collection({ harvested, decorCount, onClose }: { harvested: YlPlot[]; decorCount: number; onClose: () => void }) {
  const count = (id: string) => harvested.filter((p) => p.species === id).length;
  return (
    <div>
      <PanelHead title="🧺 Coleção da horta" sub={`${new Set(harvested.map((p) => p.species)).size} de ${SPECIES.length} espécies colhidas`} onClose={onClose} />
      <div className="yl-collection">
        <AnimatePresence>
          {SPECIES.map((s, i) => {
            const n = count(s.id);
            return (
              <motion.div key={s.id} className={`yl-coll ${n ? 'is-got' : ''}`} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: i * 0.04 }}>
                <span className="yl-coll-e">{n ? s.emoji : '?'}</span>
                <strong>{n ? s.name : '???'}</strong>
                <small className="muted">{n ? `${n} colhida${n > 1 ? 's' : ''}` : 'ainda não colhida'}</small>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      <span className="yl-k">Decorações da horta</span>
      <div className="yl-collection">
        {DECOR.map((d) => (
          <div key={d.id} className={`yl-coll ${decorCount >= d.at ? 'is-got' : ''}`}>
            <span className="yl-coll-e">{decorCount >= d.at ? { espantalho: '🎃', banheira: '🐦', colmeia: '🐝', arco: '🌸' }[d.id] : '🔒'}</span>
            <strong>{d.name}</strong>
            <small className="muted">{decorCount >= d.at ? 'na sua horta' : `com ${d.at} colheitas`}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
