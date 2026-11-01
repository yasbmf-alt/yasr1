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

  const [wateringAll, setWateringAll] = useState(false);
  const waterAll = () => {
    if (wateringAll) return;
    setWateringAll(true);
    play('pop');
    setTimeout(() => setWateringAll(false), 1600);
  };
  const tree = (x: number, y: number, r: number, c: string, k: number) => (
    <g key={k} className="yl-tree" style={{ animationDelay: `${k * 0.4}s` }}>
      <rect x={x - 5} y={y + r * 0.5} width="10" height={r * 0.9} rx="4" fill="#B98B64" />
      <circle cx={x} cy={y} r={r} fill={c} />
      <circle cx={x - r * 0.55} cy={y + r * 0.2} r={r * 0.7} fill={c} />
      <circle cx={x + r * 0.55} cy={y + r * 0.25} r={r * 0.68} fill={c} />
      <circle cx={x - r * 0.3} cy={y - r * 0.35} r={r * 0.35} fill="#fff" opacity=".22" />
    </g>
  );
  const scene = (
    <svg viewBox="0 0 1000 600" className="yl-room yl-garden" role="img" aria-label="Horta">
      <defs>
        <linearGradient id="hg-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#D8EEFF" /><stop offset="1" stopColor="#F3FAEC" /></linearGradient>
        <linearGradient id="hg-grass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#CDE8B0" /><stop offset="1" stopColor="#B5DA93" /></linearGradient>
        <linearGradient id="hg-wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F0D3A8" /><stop offset="1" stopColor="#D9AF7C" /></linearGradient>
        <linearGradient id="hg-soil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8A5A3C" /><stop offset="1" stopColor="#6A4129" /></linearGradient>
        <linearGradient id="hg-leaf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#9BD27A" /><stop offset="1" stopColor="#5FA654" /></linearGradient>
        <clipPath id="hg-clip"><rect width="1000" height="600" rx="34" /></clipPath>
      </defs>
      <g clipPath="url(#hg-clip)">
        <rect width="1000" height="600" fill="url(#hg-sky)" />
        <g className="yl-sky-cloud"><ellipse cx="160" cy="70" rx="70" ry="22" fill="#fff" opacity=".9" /><ellipse cx="200" cy="58" rx="40" ry="20" fill="#fff" opacity=".9" /></g>
        <g className="yl-sky-cloud c2"><ellipse cx="720" cy="56" rx="60" ry="18" fill="#fff" opacity=".85" /><ellipse cx="750" cy="46" rx="34" ry="16" fill="#fff" opacity=".85" /></g>
        <ellipse cx="250" cy="250" rx="420" ry="120" fill="#BFE0A0" />
        <ellipse cx="800" cy="250" rx="420" ry="110" fill="#B3D893" />
        {[[60, 150, 46, '#7DBE6A'], [150, 135, 54, '#8DCB72'], [250, 160, 40, '#6FB25C'], [760, 140, 50, '#8DCB72'], [860, 155, 58, '#7DBE6A'], [955, 140, 42, '#6FB25C']].map(([x, y, r, c], k) => tree(x as number, y as number, r as number, c as string, k))}
        <rect y="205" width="1000" height="395" fill="url(#hg-grass)" />
        {/* cerquinha */}
        <rect x="0" y="222" width="1000" height="9" rx="4" fill="#FFF8EE" />
        <rect x="0" y="248" width="1000" height="9" rx="4" fill="#FFF8EE" />
        {Array.from({ length: 34 }).map((_, i) => <path key={i} d={`M${8 + i * 30} 272 v-58 l8 -10 l8 10 v58z`} fill="#FFFBF5" stroke="#EBDDCB" strokeWidth="2" />)}
        {/* florzinhas */}
        {Array.from({ length: 18 }).map((_, i) => (
          <g key={i} transform={`translate(${(i * 173) % 980 + 10} ${300 + ((i * 97) % 280)})`} className="yl-sprout" style={{ animationDelay: `${i * 0.3}s` }}>
            {[0, 72, 144, 216, 288].map((r) => <ellipse key={r} cx="0" cy="-5" rx="3.5" ry="5" fill={['#F7B6CF', '#FFFFFF', '#F9D976'][i % 3]} transform={`rotate(${r})`} />)}
            <circle r="2.6" fill="#F4C430" />
          </g>
        ))}
        {/* canteiros */}
        {Array.from({ length: SLOTS }).map((_, i) => {
          const r = Math.floor(i / 4);
          const c = i % 4;
          const x = 46 + c * 190;
          const y = 290 + r * 100;
          const p = at(i);
          const g = p ? plotGrowth(p, act) : null;
          return (
            <Hot key={i} id={`plot-${i}`} label={p ? `${speciesOf(p.species).name}: ${g!.stage === 4 ? 'pronta para colher' : 'crescendo'}` : 'Canteiro vazio: plantar'} on={spot === `plot-${i}`} onPick={pick}>
              <ellipse cx={x + 82} cy={y + 86} rx="84" ry="10" fill="rgba(60,90,40,.18)" />
              <rect x={x} y={y + 10} width="164" height="72" rx="12" fill="url(#hg-wood)" />
              {[0, 1, 2].map((k) => <line key={k} x1={x + 6} x2={x + 158} y1={y + 34 + k * 18} y2={y + 34 + k * 18} stroke="#C99A64" strokeWidth="1.6" opacity=".55" />)}
              <rect x={x - 4} y={y + 4} width="172" height="16" rx="8" fill="#F6DDB8" />
              <rect x={x + 8} y={y + 8} width="148" height="20" rx="7" fill="url(#hg-soil)" />
              {!p && <text x={x + 82} y={y + 60} textAnchor="middle" className="yl-tag yl-plus-g">+ plantar</text>}
              {p && <text x={x + 154} y={y + 70} textAnchor="end" fontSize="16">{speciesOf(p.species).emoji}</text>}
              {p && [0, 1, 2].map((k) => <PlantArt key={k} species={p.species} stage={g!.stage} x={x + 38 + k * 44} y={y + 22} />)}
              {p && g!.stage < 4 && <rect x={x + 18} y={y + 74} width={128 * g!.pct} height="5" rx="2.5" fill="#FFE08A" />}
              {p && g!.stage === 4 && <circle className="yl-ready" cx={x + 82} cy={y + 2} r="70" fill="none" stroke="#FFE08A" strokeWidth="3" strokeDasharray="6 10" />}
              {(water === i || (wateringAll && p)) && [0, 1, 2, 3, 4].map((k) => <circle key={k} className="yl-rain" cx={x + 30 + k * 26} cy={y - 30} r="4" fill="#7FB8F5" style={{ animationDelay: `${k * 0.08}s` }} />)}
            </Hot>
          );
        })}
        {/* galpão: coleção */}
        <Hot id="colecao" label="Galpão: coleção de colheitas" on={spot === 'colecao'} onPick={pick}>
          <ellipse cx="880" cy="482" rx="90" ry="12" fill="rgba(60,90,40,.18)" />
          <rect x="806" y="330" width="148" height="150" rx="12" fill="#FFF3E6" stroke="#EBCFAE" strokeWidth="4" />
          <path d="M792 338 L880 270 L968 338 Z" fill="#E87A97" />
          <path d="M792 338 L880 270 L968 338" fill="none" stroke="#D2627F" strokeWidth="6" strokeLinejoin="round" />
          <rect x="856" y="400" width="48" height="80" rx="8" fill="#D9B48A" />
          <circle cx="896" cy="442" r="4" fill="#FFE08A" />
          <text x="880" y="384" textAnchor="middle" fontSize="28">🧺</text>
          <rect x="834" y="236" width="92" height="26" rx="13" fill="#fff" />
          <text x="880" y="254" textAnchor="middle" className="yl-tag yl-tag-dark">{harvested.length} colhida{harvested.length === 1 ? '' : 's'}</text>
        </Hot>
        {/* regador rosa com coração: rega tudo */}
        <g className={`yl-can ${wateringAll ? 'is-on' : ''}`} role="button" tabIndex={0} aria-label="Regar todos os canteiros" onClick={waterAll} onKeyDown={(e) => e.key === 'Enter' && waterAll()}>
          <title>Regar tudo</title>
          <ellipse cx="860" cy="580" rx="60" ry="8" fill="rgba(60,90,40,.18)" />
          <path d="M800 540 h86 v38 q0 6 -6 6 h-74 q-6 0 -6 -6z" fill="#F7A6BC" />
          <path d="M886 548 l46 -30 l6 8 l-44 34z" fill="#F7A6BC" />
          <ellipse cx="938" cy="520" rx="8" ry="11" fill="#E87A97" transform="rotate(-35 938 520)" />
          <path d="M812 540 q31 -40 62 0" fill="none" stroke="#E87A97" strokeWidth="7" strokeLinecap="round" />
          <path d="M843 552 q-9 -9 -14 0 q-2 6 14 16 q16 -10 14 -16 q-5 -9 -14 0z" fill="#E8455F" />
        </g>
        {decor.some((d) => d.id === 'espantalho') && <text x="770" y="560" fontSize="46" textAnchor="middle" className="yl-sway">🎃</text>}
        {decor.some((d) => d.id === 'banheira') && <text x="40" y="580" fontSize="30" textAnchor="middle">🐦</text>}
        {decor.some((d) => d.id === 'colmeia') && <text x="960" y="300" fontSize="30" textAnchor="middle" className="yl-sway">🐝</text>}
        {decor.some((d) => d.id === 'arco') && <text x="500" y="285" fontSize="30" textAnchor="middle">🌸</text>}
        <g className="yl-butterfly"><text fontSize="22">🦋</text></g>
      </g>
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
