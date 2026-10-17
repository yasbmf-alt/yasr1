import { EventDecor } from '../components/EventDecor';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue } from 'framer-motion';
import { useStore } from '../data/store';
import { useUI } from '../components/ui';
import { Icon } from '../components/Icon';
import { Asset } from '../assets/registry';
import { SPECIES_BY_AREA } from '../assets/art';
import { areaOf, type DataSnapshot, type Topic } from '../types';
import { chapterProgress, STAGE_LABEL, topicStats, type TopicStats } from '../logic/progress';
import { relDay, seasonOf, SEASON_LABEL } from '../logic/dates';
import { play } from '../logic/sound';
import { useAmbient } from '../components/useAmbient';
import { GardenButterfly } from '../components/Secrets';

const SEEN_KEY = 'yasr1-garden-seen';
const readSeen = (): Record<string, number> => {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? '{}');
  } catch {
    return {};
  }
};
const writeSeen = (v: Record<string, number>) => {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(v));
  } catch {
    /* ignore */
  }
};

/** Decorações liberadas pelo próprio jardim, sem prazo nem sequência. */
export const GARDEN_DECOR: { id: string; label: string; how: string; ok: (d: DataSnapshot, plants: number, blooms: number) => boolean }[] = [
  { id: 'regador', label: 'Regador', how: 'primeira planta', ok: (_, p) => p >= 1 },
  { id: 'banco', label: 'Banquinho', how: '5 plantas no jardim', ok: (_, p) => p >= 5 },
  { id: 'lanterna', label: 'Lanterna', how: '10 revisões registradas', ok: (d) => d.sessions.filter((s) => s.type === 'revisao').length >= 10 },
  { id: 'fonte', label: 'Fonte', how: 'primeira planta em flor', ok: (_, __, b) => b >= 1 },
];

// Canteiro contínuo: fileiras do fundo (pequenas) para a frente (maiores).
const ROWS = [
  { bottom: 43, scale: 0.66, cols: 12 },
  { bottom: 27, scale: 0.82, cols: 11 },
  { bottom: 9, scale: 1, cols: 10 },
  { bottom: 54, scale: 0.55, cols: 14 },
];
function slots() {
  const out: { x: number; bottom: number; scale: number; z: number }[] = [];
  let seed = 7;
  const r = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  ROWS.forEach((row, ri) => {
    for (let c = 0; c < row.cols; c++) {
      const off = ri % 2 ? 0.5 : 0;
      const x = ((c + 0.5 + off * 0.5) / row.cols) * 92 + 4 + (r() - 0.5) * 3;
      out.push({ x, bottom: row.bottom + (r() - 0.5) * 3, scale: row.scale, z: 10 - ri + (ri === 3 ? -2 : 0) });
    }
  });
  // embaralha de forma estável para o jardim crescer espalhado
  const order = out.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  // prioriza as três fileiras principais
  const main = order.filter((i) => i < 33);
  const back = order.filter((i) => i >= 33);
  return [...main, ...back].map((i) => out[i]);
}
const SLOTS = slots();

function skyClass(h: number) {
  if (h < 6 || h >= 19) return 'sky-night';
  if (h >= 17) return 'sky-dusk';
  return 'sky-day';
}

export function Garden() {
  const { data, saveSettings } = useStore();
  const ui = useUI();
  const ambient = useAmbient();
  const season = seasonOf();
  const sceneRef = useRef<HTMLDivElement>(null);
  const seenRef = useRef<Record<string, number>>(readSeen());
  const [growing, setGrowing] = useState<Set<string>>(new Set());
  const [pop, setPop] = useState<string | null>(null);

  const plants = useMemo(
    () =>
      data.topics
        .map((t) => ({ t, st: topicStats(t, data.sessions) }))
        .filter((x) => x.st.stage > 0)
        .sort((a, b) => (a.st.firstDate ?? '').localeCompare(b.st.firstDate ?? '') || a.t.id.localeCompare(b.t.id)),
    [data.topics, data.sessions],
  );
  const specials = [...data.chapters].sort((a, b) => a.number - b.number).filter((c) => chapterProgress(c, data.missions).complete);
  const blooms = plants.filter((p) => p.st.stage === 4).length;

  useEffect(() => {
    const seen = seenRef.current;
    const grew = new Set<string>();
    const next = { ...seen };
    for (const { t, st } of plants) {
      if ((seen[t.id] ?? 0) < st.stage) grew.add(t.id);
      next[t.id] = st.stage;
    }
    seenRef.current = next;
    writeSeen(next);
    if (!grew.size) return undefined;
    setGrowing(grew);
    play('grow');
    const id = setTimeout(() => setGrowing(new Set()), 2200);
    return () => clearTimeout(id);
  }, [plants]);

  const items = [
    ...plants.map((p) => ({ kind: 'plant' as const, key: p.t.id, p })),
    ...specials.map((c) => ({ kind: 'special' as const, key: `ch-${c.id}`, c })),
  ];

  return (
    <section className="garden">
      <div ref={sceneRef} className={`g-scene ${skyClass(new Date().getHours())} season-${season}`} onClick={() => setPop(null)}>
        <span className="g-sun" aria-hidden="true" />
        <EventDecor scene="jardim" />
        {[0, 1].map((i) => (
          <div key={i} className={`cloud ${ambient ? 'is-drifting' : ''}`} style={{ left: `${i ? 70 : 18}%`, top: i ? 46 : 18, width: i ? 96 : 120, animationDelay: `${i * -9}s` }}>
            <Asset slot="trail.decor.nuvem" />
          </div>
        ))}
        <svg className="g-land" viewBox="0 0 1000 400" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 150 C 150 90 300 120 420 140 S 700 80 1000 130 V400 H0Z" className="g-hill-far" />
          <path d="M0 200 C 200 150 380 190 520 180 S 820 150 1000 190 V400 H0Z" className="g-hill" />
          <path d="M0 250 C 240 225 520 250 1000 238 V400 H0Z" className="g-grass" />
          <path d="M-20 400 C 160 330 260 330 420 300 S 720 270 1020 290" className="g-path" />
        </svg>
        {ambient && season !== 'inverno' &&
          Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className={`fx fx-${season}`} style={{ left: `${(i * 13 + 5) % 100}%`, animationDelay: `${i * 1.4}s`, animationDuration: `${10 + (i % 4) * 2}s` }} aria-hidden="true" />
          ))}
        {ambient && (
          <span className="butterfly" style={{ left: '40%', top: '46%' }} aria-hidden="true">
            <span className="wing wing-l" />
            <span className="wing wing-r" />
          </span>
        )}
        <GardenButterfly />

        {items.slice(0, SLOTS.length).map((it, i) => {
          const sl = SLOTS[i];
          const style = { left: `${sl.x}%`, bottom: `${sl.bottom}%`, zIndex: sl.z, ['--s' as string]: sl.scale, animationDelay: `${(i % 9) * -0.7}s` };
          if (it.kind === 'special')
            return (
              <div key={it.key} className={`g-plant g-special ${ambient ? 'is-swaying' : ''}`} style={style} data-name={`Flor do ${it.c.title}`} tabIndex={0}>
                <Asset slot="garden.special" />
              </div>
            );
          const { t, st } = it.p;
          const species = SPECIES_BY_AREA[t.area];
          const grow = growing.has(t.id);
          return (
            <motion.button
              key={it.key}
              className={`g-plant ${ambient ? 'is-swaying' : ''} ${pop === t.id ? 'is-active' : ''}`}
              style={style}
              data-name={t.name}
              onClick={(e) => {
                e.stopPropagation();
                play('pop');
                setPop(pop === t.id ? null : t.id);
              }}
              aria-label={`${t.name}: ${STAGE_LABEL[st.stage]}`}
              initial={grow ? { scale: 0.5, y: 10 } : false}
              animate={grow ? { scale: [0.5, 1.15, 1], y: 0 } : { scale: 1 }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
            >
              <Asset slot={`garden.plant.${species}.${st.stage}`} />
              {grow && <span className="sparkle" aria-hidden="true">✦</span>}
            </motion.button>
          );
        })}

        {GARDEN_DECOR.filter((d) => d.ok(data, plants.length, blooms)).map((d, i) => (
          <DecorItem
            key={d.id}
            id={d.id}
            label={d.label}
            pos={data.settings.gardenDecor[d.id] ?? { x: [8, 78, 30, 88][i], y: [70, 74, 58, 62][i], placed: true }}
            sceneRef={sceneRef}
            onPlace={(x, y) => saveSettings({ gardenDecor: { ...data.settings.gardenDecor, [d.id]: { x, y, placed: true } } })}
          />
        ))}

        <AnimatePresence>
          {pop && <PlantPop key={pop} topicId={pop} slot={SLOTS[items.findIndex((x) => x.key === pop)]} onClose={() => setPop(null)} onOpen={(id) => { setPop(null); ui.openTopic(id); }} />}
        </AnimatePresence>

        {items.length === 0 && (
          <div className="g-empty">
            <p>Seu jardim começa no primeiro registro de estudo de cada tema.</p>
          </div>
        )}
        <span className={`g-season season-${season}`}>{SEASON_LABEL[season]}</span>
      </div>
      <div className="g-decor-row" aria-label="Decorações">
        {GARDEN_DECOR.map((d) => {
          const on = d.ok(data, plants.length, blooms);
          return (
            <span key={d.id} className={`g-decor-chip ${on ? 'is-on' : ''}`} data-tip={on ? `${d.label} · arraste no jardim` : `${d.label}: ${d.how}`}>
              <Asset slot={`garden.decor.${d.id}`} />
            </span>
          );
        })}
      </div>
    </section>
  );
}

function PlantPop({ topicId, slot, onClose, onOpen }: { topicId: string; slot?: { x: number; bottom: number; scale: number }; onClose: () => void; onOpen: (id: string) => void }) {
  const { data } = useStore();
  const t = data.topics.find((x) => x.id === topicId) as Topic | undefined;
  if (!t || !slot) return null;
  const st: TopicStats = topicStats(t, data.sessions);
  const a = areaOf(t.area);
  const left = slot.x > 70;
  return (
    <motion.div
      className="g-pop"
      style={{
        left: left ? undefined : `calc(${slot.x}% + 30px)`,
        right: left ? `calc(${100 - slot.x}% + 30px)` : undefined,
        bottom: `calc(${slot.bottom}% + 20px)`,
      }}
      initial={{ opacity: 0, scale: 0.85, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 420, damping: 26 }}
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-label={t.name}
    >
      <span className="g-pop-chip" style={{ background: a.color, color: a.ink }}>{a.short}</span>
      <strong className="g-pop-name">{t.name}</strong>
      <span className="g-pop-meta">
        {STAGE_LABEL[st.stage]} · {st.reviews} revis{st.reviews === 1 ? 'ão' : 'ões'}
        {st.accuracy != null ? ` · ${Math.round(st.accuracy * 100)}%` : ''}
      </span>
      {st.nextReview && <span className="g-pop-meta">Próxima revisão {relDay(st.nextReview)}</span>}
      <div className="g-pop-actions">
        <button className="btn btn-primary btn-sm" onClick={() => onOpen(t.id)}>Ver ficha</button>
        <button className="icon-btn icon-btn-sm" onClick={onClose} aria-label="Fechar"><Icon name="close" size={16} /></button>
      </div>
    </motion.div>
  );
}

function DecorItem({ id, label, pos, sceneRef, onPlace }: {
  id: string; label: string; pos: { x: number; y: number; placed: boolean };
  sceneRef: React.RefObject<HTMLDivElement>; onPlace: (x: number, y: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  if (!pos.placed) return null;
  return (
    <motion.div
      ref={ref}
      className="g-decor"
      style={{ left: `${pos.x}%`, top: `${pos.y}%`, x: mx, y: my }}
      drag
      dragMomentum={false}
      dragConstraints={sceneRef}
      dragElastic={0.05}
      whileDrag={{ scale: 1.1, zIndex: 40 }}
      onClick={(e) => e.stopPropagation()}
      onDragEnd={() => {
        const box = sceneRef.current?.getBoundingClientRect();
        const r = ref.current?.getBoundingClientRect();
        if (!box || !r) return;
        const x = Math.min(94, Math.max(0, ((r.left - box.left) / box.width) * 100));
        const y = Math.min(90, Math.max(30, ((r.top - box.top) / box.height) * 100));
        mx.set(0);
        my.set(0);
        play('drop');
        onPlace(Math.round(x * 10) / 10, Math.round(y * 10) / 10);
      }}
      title={`${label} · arraste para mudar de lugar`}
    >
      <Asset slot={`garden.decor.${id}`} />
    </motion.div>
  );
}
