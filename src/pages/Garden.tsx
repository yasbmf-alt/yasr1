import { EventDecor } from '../components/EventDecor';
import { burst, multiTap } from '../logic/fx';
import { eggDay, phraseOfDay } from '../logic/eggs';
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
        <Ladybug />

        {items.slice(0, SLOTS.length).map((it, i) => {
          const sl = SLOTS[i];
          const style = { left: `${sl.x}%`, bottom: `${sl.bottom}%`, zIndex: sl.z, ['--s' as string]: sl.scale, animationDelay: `${(i % 9) * -0.7}s`, transformOrigin: '50% 100%' };
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
                burst(e, st.stage === 4 ? 'coracoes' : 'folhas', 8);
                poke(e.currentTarget);
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
            night={skyClass(new Date().getHours()) === 'sky-night'}
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

/** balanço de "cutucada" numa planta (só visual) */
function poke(el: Element) {
  el.classList.remove('is-poked');
  void (el as HTMLElement).offsetWidth;
  el.classList.add('is-poked');
  setTimeout(() => el.classList.remove('is-poked'), 700);
}

/** regar: solta o regador sobre uma planta (não muda nenhum dado) */
function waterAt(x: number, y: number) {
  const hit = document.elementsFromPoint(x, y + 30).find((el) => el.classList.contains('g-plant'));
  burst({ x, y: y + 10 }, 'gotas', 14);
  play('drop');
  if (hit) {
    const r = hit.getBoundingClientRect();
    setTimeout(() => {
      burst({ x: r.left + r.width / 2, y: r.top + r.height * 0.3 }, 'gotas', 10);
      hit.classList.add('is-watered');
      setTimeout(() => hit.classList.remove('is-watered'), 1400);
      setTimeout(() => burst({ x: r.left + r.width / 2, y: r.top + r.height * 0.2 }, 'brilho', 6), 500);
    }, 160);
  }
}

function DecorItem({ id, label, pos, sceneRef, onPlace, night }: {
  id: string; label: string; pos: { x: number; y: number; placed: boolean };
  sceneRef: React.RefObject<HTMLDivElement>; onPlace: (x: number, y: number) => void; night: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const [on, setOn] = useState(false);
  const [bird, setBird] = useState(false);
  const ui = useUI();
  if (!pos.placed) return null;
  const tap = (e: MouseEvent | TouchEvent | PointerEvent) => {
    const pt = 'clientX' in e ? { x: e.clientX, y: e.clientY } : { x: 0, y: 0 };
    if (id === 'regador') {
      setOn(true);
      waterAt(pt.x, pt.y);
      setTimeout(() => setOn(false), 700);
    } else if (id === 'lanterna') {
      setOn((v) => !v);
      play('pop');
    } else if (id === 'banco') {
      if (bird) return;
      setBird(true);
      play('pop');
      if (multiTap('banco', 3)) ui.toast(phraseOfDay('banco'), 'diva');
      setTimeout(() => setBird(false), 3600);
    } else if (id === 'fonte') {
      burst(pt, 'gotas', 12);
      play('drop');
    }
  };
  return (
    <motion.div
      ref={ref}
      className={`g-decor g-decor-${id} ${on ? 'is-on' : ''} ${night ? 'is-night' : ''}`}
      style={{ left: `${pos.x}%`, top: `${pos.y}%`, x: mx, y: my }}
      drag
      dragMomentum={false}
      dragConstraints={sceneRef}
      dragElastic={0.05}
      whileDrag={{ scale: 1.1, zIndex: 40, rotate: id === 'regador' ? -18 : 0 }}
      onClick={(e) => e.stopPropagation()}
      onTap={(e) => tap(e)}
      onDragEnd={() => {
        const box = sceneRef.current?.getBoundingClientRect();
        const r = ref.current?.getBoundingClientRect();
        if (!box || !r) return;
        const x = Math.min(94, Math.max(0, ((r.left - box.left) / box.width) * 100));
        const y = Math.min(90, Math.max(30, ((r.top - box.top) / box.height) * 100));
        mx.set(0);
        my.set(0);
        if (id === 'regador') waterAt(r.left + r.width * 0.85, r.top + r.height * 0.3);
        else play('drop');
        onPlace(Math.round(x * 10) / 10, Math.round(y * 10) / 10);
      }}
      title={`${label} · ${id === 'regador' ? 'arraste até uma planta para regar' : 'arraste para mudar de lugar'}`}
    >
      <Asset slot={`garden.decor.${id}`} />
      {id === 'fonte' && (
        <span className="fountain-water" aria-hidden="true">
          <i /><i /><i /><i /><i />
        </span>
      )}
      {id === 'lanterna' && <span className="lantern-glow" aria-hidden="true" />}
      <AnimatePresence>
        {bird && (
          <motion.span className="g-bird" initial={{ x: 80, y: -80, opacity: 0, rotate: 20 }} animate={{ x: 0, y: 0, opacity: 1, rotate: 0 }} exit={{ x: -90, y: -90, opacity: 0 }} transition={{ type: 'spring', stiffness: 140, damping: 14 }} aria-hidden="true">
            <svg viewBox="0 0 40 30" width="100%" height="100%">
              <ellipse cx="18" cy="18" rx="11" ry="9" fill="#CFE4FF" />
              <circle cx="27" cy="11" r="6.5" fill="#CFE4FF" />
              <path d="M33 11 l6 2 -6 2z" fill="#F2C14E" />
              <circle cx="29" cy="10" r="1.4" fill="#2E4A7F" />
              <path d="M10 16 q6 -6 12 0 q-6 4 -12 0z" fill="#9CC3F2" />
              <path d="M7 18 l-6 -3 2 5z" fill="#9CC3F2" />
              <path d="M16 27 v3 M21 27 v3" stroke="#F2C14E" strokeWidth="1.6" />
            </svg>
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/** joaninha rara: aparece em alguns dias, passeia pela grama e voa ao toque */
function Ladybug() {
  const { data, saveSettings } = useStore();
  const ui = useUI();
  const [gone, setGone] = useState(false);
  if (!eggDay('joaninha', 4) || gone) return null;
  return (
    <motion.button
      className="ladybug"
      style={{ left: '12%', bottom: '6%' }}
      animate={{ x: [0, 120, 260, 180, 40, 0], y: [0, -10, 0, 8, -4, 0], rotate: [80, 95, 75, 260, 280, 440] }}
      transition={{ duration: 46, repeat: Infinity, ease: 'linear' }}
      onClick={(e) => {
        e.stopPropagation();
        burst(e, 'coracoes', 8);
        play('pop');
        ui.toast(phraseOfDay('joaninha'), 'diva');
        saveSettings({ eggsFound: { ...(data.settings.eggsFound ?? {}), joaninha: new Date().toISOString() } });
        setGone(true);
      }}
      aria-label="Uma joaninha"
    >
      <svg viewBox="0 0 30 30" width="100%" height="100%" aria-hidden="true">
        <circle cx="15" cy="7" r="5" fill="#2E4A7F" />
        <ellipse cx="15" cy="17" rx="10" ry="11" fill="#E8505B" />
        <path d="M15 6 V28" stroke="#2E4A7F" strokeWidth="1.5" />
        <circle cx="10" cy="14" r="2.2" fill="#2E4A7F" />
        <circle cx="20" cy="14" r="2.2" fill="#2E4A7F" />
        <circle cx="10" cy="22" r="2" fill="#2E4A7F" />
        <circle cx="20" cy="22" r="2" fill="#2E4A7F" />
        <circle cx="13" cy="5" r="1" fill="#fff" />
        <circle cx="17" cy="5" r="1" fill="#fff" />
      </svg>
    </motion.button>
  );
}
