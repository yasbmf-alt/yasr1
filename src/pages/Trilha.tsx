import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion, useMotionValue, AnimatePresence } from 'framer-motion';
import { useAnimation } from 'framer-motion';
import { burst, multiTap } from '../logic/fx';
import { useStore } from '../data/store';
import { useUI, ProgressRing, ConfirmButton } from '../components/ui';
import { Icon } from '../components/Icon';
import { Asset } from '../assets/registry';
import { MissionPanel } from './MissionPanel';
import { ChapterEditor, NewMission } from './TrilhaForms';
import { areaOf, type Chapter, type Mission, type Note, type NoteColor } from '../types';
import { chapterMissions, chapterProgress, currentChapter, missionProgress } from '../logic/progress';
import { diffDays, fmtRange, today, uid } from '../logic/dates';
import { CONTEXT_LINES, greeting, motivational, pickRare } from '../logic/messages';
import type { MascotMood } from '../assets/art';
import { useActiveEvents } from '../components/EventDecor';
import { EventChip, EventDecor } from '../components/EventDecor';
import { play } from '../logic/sound';
import { useAmbient } from '../components/useAmbient';
import { buildLandscape, buildScene, PROP_ASPECT, samplePath, SCENE_COLORS, themeFor, W, TOP, ROW, xAt as sceneXAt, type Landscape } from './trailScene';
import { Leaf } from '../assets/trailArt';
import { Candy, TrailCat } from '../components/Secrets';
import { StreakFlame } from '../components/StreakFlame';
import { HomeSeason, useHomeSeason } from '../components/HomeSeason';

// Cada capítulo ganha um "mapa" de cor própria, como os andares da referência.
const THEMES = [
  { bg: '#EFF6CF', path: '#C3D88A', edge: '#AFC47E', hill: '#DDEBB0', tab: 'var(--lima)' },
  { bg: '#FFF6D3', path: '#F6DD8B', edge: '#EBC86A', hill: '#FCEBB5', tab: 'var(--manteiga)' },
  { bg: '#E4EFFF', path: '#B5D0F4', edge: '#98BAE8', hill: '#D2E3FB', tab: 'var(--azul-claro)' },
  { bg: '#FCE8F8', path: '#F4B8DE', edge: '#EE9FCF', hill: '#F8D6EF', tab: 'var(--rosa)' },
  { bg: '#F2EAFF', path: '#D3BFF6', edge: '#BFA4EF', hill: '#E5D8FC', tab: 'var(--lilas)' },
  { bg: '#FFE7E5', path: '#FBBDBD', edge: '#F5A0A3', hill: '#FDD5D3', tab: 'var(--pessego)' },
];
export const chapterTheme = (n: number) => THEMES[(Math.max(1, n) - 1) % THEMES.length];

export function Trilha() {
  const { data } = useStore();
  const chapters = useMemo(() => [...data.chapters].sort((a, b) => a.number - b.number), [data.chapters]);
  const [chId, setChId] = useState<string | null>(() => currentChapter(data.chapters)?.id ?? null);
  const [openMission, setOpenMission] = useState<string | null>(null);
  const [editCh, setEditCh] = useState<Chapter | 'new' | null>(null);
  const [newMission, setNewMission] = useState(false);
  const chapter = chapters.find((c) => c.id === chId) ?? currentChapter(chapters) ?? null;
  // direção da transição entre capítulos (avança → entra pela direita)
  const dir = useRef(1);
  const lastNum = useRef(chapter?.number ?? 0);
  if (chapter && chapter.number !== lastNum.current) {
    dir.current = chapter.number > lastNum.current ? 1 : -1;
    lastNum.current = chapter.number;
  }

  useEffect(() => {
    if (!chId && chapter) setChId(chapter.id);
  }, [chId, chapter]);

  const ui = useUI();
  const season = useHomeSeason();
  useEffect(() => {
    if (!ui.pendingMission) return;
    const m = data.missions.find((x) => x.id === ui.pendingMission);
    if (m) {
      setChId(m.chapterId);
      setOpenMission(m.id);
    }
    ui.clearPendingMission();
  }, [ui.pendingMission, data.missions, ui]);

  return (
    <div className={`page page-trilha ${season ? `season-${season}` : ''}`}>
      <HomeSeason season={season} />
      <Greeting />
      {chapters.length === 0 ? (
        <div className="empty-big">
          <h2>Sua trilha ainda está vazia</h2>
          <p>Cada capítulo é uma semana do seu cronograma. Crie o primeiro e adicione as missões dele.</p>
          <button className="btn btn-primary" onClick={() => setEditCh('new')}><Icon name="plus" size={18} /> Criar capítulo</button>
        </div>
      ) : (
        <>
          <ChapterTabs chapters={chapters} active={chapter?.id ?? null} onPick={setChId} onNew={() => setEditCh('new')} />
          <AnimatePresence mode="wait" initial={false} custom={dir.current}>
            {chapter && (
              <motion.div
                key={chapter.id}
                custom={dir.current}
                variants={{
                  enter: (d: number) => ({ opacity: 0, x: d * 40 }),
                  center: { opacity: 1, x: 0 },
                  leave: (d: number) => ({ opacity: 0, x: d * -40 }),
                }}
                initial="enter"
                animate="center"
                exit="leave"
                transition={{ duration: 0.24, ease: [0.3, 0.7, 0.2, 1] }}
              >
                <Board
                  chapter={chapter}
                  onOpen={(id) => { play('pop'); setOpenMission(id); }}
                  onEdit={() => setEditCh(chapter)}
                  onNewMission={() => setNewMission(true)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
      <MissionPanel missionId={openMission} onClose={() => setOpenMission(null)} />
      <ChapterEditor value={editCh} onClose={() => setEditCh(null)} onSaved={(id) => setChId(id)} />
      {chapter && <NewMission open={newMission} chapter={chapter} onClose={() => setNewMission(false)} onCreated={(id) => setOpenMission(id)} />}
    </div>
  );
}

// ── Saudação ──────────────────────────────────────────────────

function Greeting() {
  const { data } = useStore();
  const ev = useActiveEvents();
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1000));
  const [react, setReact] = useState<MascotMood | null>(null);
  const [special, setSpecial] = useState<string | null>(() => (Math.random() < 1 / 14 ? pickRare() : null));
  const [usedContext, setUsedContext] = useState(false);
  const t = today();
  const h = new Date().getHours();
  const lastStudy = useMemo(() => data.sessions.reduce((a, s) => (s.date > a ? s.date : a), ''), [data.sessions]);
  const doneToday = data.sessions.some((s) => s.date === t && s.missionId);
  const festive = ev.day && ['aniversario', 'aniversario-yas', 'reveillon', 'formatura'].includes(ev.day.theme);
  const ctx: { mood: MascotMood; line?: string } =
    h < 5 || h >= 23 ? { mood: 'sono', line: CONTEXT_LINES.madrugada }
      : festive ? { mood: 'festa' }
        : lastStudy && diffDays(t, lastStudy) >= 4 ? { mood: 'chocada', line: CONTEXT_LINES.voltou }
          : doneToday ? { mood: 'comemorando', line: CONTEXT_LINES.comemorando }
            : { mood: 'acenando' };
  const mood = react ?? ctx.mood;
  const line: string = special ?? ((!usedContext && ctx.line) || motivational(seed));

  const poke = (e: React.MouseEvent) => {
    setUsedContext(true);
    if (multiTap('mascote', 3)) {
      setSpecial(pickRare());
      setReact('chocada');
      play('meow');
      burst(e, 'coracoes', 12);
      setTimeout(() => setReact(null), 2600);
      return;
    }
    setSpecial(null);
    setSeed((s) => s + 1);
    setReact('comemorando');
    play('pop');
    burst(e, 'brilho', 6);
    setTimeout(() => setReact(null), 1200);
  };

  return (
    <header className="greet">
      <motion.button
        className="greet-mascot"
        onClick={poke}
        key={mood}
        initial={{ scale: 0.85, rotate: -6 }}
        animate={{ scale: 1, rotate: 0, y: [0, -8, 0] }}
        transition={{ type: 'spring', stiffness: 420, damping: 12 }}
        whileHover={{ rotate: [0, -6, 6, 0], transition: { duration: 0.5 } }}
        aria-label="Mascote. Clique para outra frase."
      >
        <MascotArt mood={mood} />
      </motion.button>
      <div className="greet-text">
        <div className="greet-row">
          <h1>{greeting()}, Yasmim!</h1>
          <EventChip />
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.button
            key={line}
            className={`diva-bubble ${special ? 'is-rare' : ''}`}
            onClick={poke}
            initial={{ scale: 0.6, opacity: 0, rotate: -4, y: 6 }}
            animate={{ scale: 1, opacity: 1, rotate: 0, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: -6, transition: { duration: 0.12 } }}
            transition={{ type: 'spring', stiffness: 420, damping: 18 }}
            title="Outra frase"
          >
            {line}
          </motion.button>
        </AnimatePresence>
      </div>
      <StreakFlame />
    </header>
  );
}

/** usa a arte da expressão, se você enviou; senão a sua arte principal; senão o provisório */
function MascotArt({ mood }: { mood: MascotMood }) {
  const { data } = useStore();
  const map = data.settings.assetMap;
  const slot = mood === 'acenando' ? 'mascot.greeting' : `mascot.${mood}`;
  if (map[slot] || !map['mascot.greeting']) return <Asset slot={slot} />;
  return <span className={`mascot-mood mood-${mood}`}><Asset slot="mascot.greeting" /></span>;
}

// ── Abas de capítulo ──────────────────────────────────────────

function ChapterTabs({ chapters, active, onPick, onNew }: { chapters: Chapter[]; active: string | null; onPick: (id: string) => void; onNew: () => void }) {
  const { data } = useStore();
  const t = today();
  return (
    <div className="ch-tabs" role="tablist" aria-label="Capítulos">
      {chapters.map((c) => {
        const p = chapterProgress(c, data.missions);
        const th = chapterTheme(c.number);
        const isNow = c.startDate <= t && c.endDate >= t;
        return (
          <button
            key={c.id}
            role="tab"
            aria-selected={active === c.id}
            className={`ch-tab ${active === c.id ? 'is-active' : ''}`}
            style={{ ['--tab' as string]: th.tab }}
            onClick={() => onPick(c.id)}
          >
            <span className="ch-tab-n">Cap. {c.number}{p.complete && <Icon name="check" size={14} />}</span>
            <span className="ch-tab-d">{fmtRange(c.startDate, c.endDate)}</span>
            <span className="ch-tab-bar"><span style={{ width: `${p.pct * 100}%` }} /></span>
            {isNow && <span className="ch-now">esta semana</span>}
          </button>
        );
      })}
      <button className="ch-tab ch-tab-add" onClick={onNew} aria-label="Novo capítulo" title="Novo capítulo">
        <Icon name="plus" size={18} />
      </button>
    </div>
  );
}

// ── Mapa da trilha ────────────────────────────────────────────

const xAt = sceneXAt;

function Board({ chapter, onOpen, onEdit, onNewMission }: { chapter: Chapter; onOpen: (id: string) => void; onEdit: () => void; onNewMission: () => void }) {
  const { data, saveNote } = useStore();
  const ui = useUI();
  const ambient = useAmbient();
  const boardRef = useRef<HTMLDivElement>(null);
  const [openNote, setOpenNote] = useState<string | null>(null);
  const ms = chapterMissions(chapter.id, data.missions);
  const prog = chapterProgress(chapter, data.missions);
  const th = chapterTheme(chapter.number);
  const theme = themeFor(chapter.number);
  const sc = SCENE_COLORS[theme];
  const n = ms.length;
  const H = TOP + n * ROW + 130;
  const pts = Array.from({ length: n + 1 }, (_, i) => ({ x: xAt(i), y: TOP + i * ROW }));
  const pathTo = (k: number) =>
    pts.slice(0, k + 1).reduce((d, p, i) => {
      if (i === 0) return `M ${p.x} ${p.y - 70} L ${p.x} ${p.y}`;
      const prev = pts[i - 1];
      const dy = (p.y - prev.y) / 2;
      return `${d} C ${prev.x} ${prev.y + dy} ${p.x} ${p.y - dy} ${p.x} ${p.y}`;
    }, '');
  const full = pathTo(n);
  let lastDone = -1;
  ms.forEach((m, i) => { if (missionProgress(m).complete) lastDone = i; });
  const progressEnd = prog.complete ? n : lastDone;
  const currentIdx = ms.findIndex((m) => !missionProgress(m).complete);
  const samples = useMemo(() => samplePath(pts), [n]); // eslint-disable-line react-hooks/exhaustive-deps
  const classic = theme === 'classico';
  // a paisagem clássica é montada em pixels: precisa da largura real do mapa
  const [bw, setBw] = useState(0);
  useLayoutEffect(() => {
    const el = boardRef.current;
    if (!el) return undefined;
    setBw(Math.round(el.clientWidth / 20) * 20);
    const ro = new ResizeObserver(([e]) => setBw(Math.round(e.contentRect.width / 20) * 20));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const land = useMemo(() => (classic && bw ? buildLandscape(n, H, bw, chapter.number, samples) : null), [classic, n, H, bw, chapter.number, samples]);
  const scene = useMemo(
    () => (classic ? { props: land?.props ?? [], pathDeco: [], streams: [], pond: null } : buildScene(theme, n, H, chapter.number, samples)),
    [classic, land, theme, n, H, chapter.number, samples],
  );
  const chestCtl = useAnimation();
  // trecho recém-concluído do caminho: desenha só a parte nova, com brilho
  const prevEnd = useRef(progressEnd);
  const [fresh, setFresh] = useState<{ a: number; b: number } | null>(null);
  useEffect(() => {
    if (progressEnd > prevEnd.current && prevEnd.current >= 0) {
      setFresh({ a: Math.max(0, prevEnd.current), b: progressEnd });
      const id = setTimeout(() => setFresh(null), 1800);
      prevEnd.current = progressEnd;
      return () => clearTimeout(id);
    }
    prevEnd.current = progressEnd;
    return undefined;
  }, [progressEnd]);
  const segPath = (a: number, b: number) =>
    pts.slice(a, b + 1).reduce((d, p, i, arr) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = arr[i - 1];
      const dy = (p.y - prev.y) / 2;
      return `${d} C ${prev.x} ${prev.y + dy} ${p.x} ${p.y - dy} ${p.x} ${p.y}`;
    }, '');
  const chapterIndex = [...data.chapters].sort((a, b) => a.number - b.number).findIndex((c) => c.id === chapter.id);
  const notes = data.notes.filter((x) => (x.chapterId === chapter.id || x.chapterId === null) && x.onTrail !== false);

  const addNote = () => {
    const note: Note = {
      id: uid(),
      text: '',
      color: (['manteiga', 'rosa', 'lilas', 'azul', 'lima', 'pessego'] as NoteColor[])[data.notes.length % 6],
      x: data.notes.length % 2 ? 90 : 7,
      y: TOP + 40 + (data.notes.length % 4) * 70,
      rot: Math.round(Math.random() * 10 - 5),
      chapterId: chapter.id,
      createdAt: new Date().toISOString(),
    };
    saveNote(note);
    play('note');
    setOpenNote(note.id);
  };

  return (
    <section
      className={`board-wrap scene-${theme}`}
      style={{ ['--map' as string]: sc.bg, ['--path' as string]: sc.path, ['--edge' as string]: sc.edge, ['--hill' as string]: sc.hill, ['--hill2' as string]: sc.hill2, ['--dash' as string]: sc.dash, ['--tab' as string]: th.tab }}
    >
      <div className="board-head">
        <div className="board-titles">
          <p className="eyebrow">Capítulo {chapter.number} · {fmtRange(chapter.startDate, chapter.endDate)}</p>
          <h2 className="board-title">{chapter.title}</h2>
          <span className="board-count">{prog.done} de {prog.missions} missões</span>
        </div>
        <div className="btn-row">
          <button className="btn btn-quiet btn-sm" onClick={onEdit}><Icon name="edit" size={16} /> Editar</button>
          <button className="btn btn-quiet btn-sm" onClick={onNewMission}><Icon name="plus" size={16} /> Missão</button>
          <button className="btn btn-note btn-sm" onClick={addNote}><Icon name="note" size={16} /> Post-it</button>
        </div>
      </div>

      <div className="board" ref={boardRef} style={{ height: H }}>
        <svg className="board-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
          {classic ? (
            <LandscapeGround H={H} land={land} />
          ) : (
            <>
              <path d={`M0 0 H${W} V150 C ${W * 0.8} 110 ${W * 0.6} 190 ${W * 0.35} 140 S ${W * 0.1} 120 0 160z`} fill="var(--hill2)" />
              <ellipse cx="180" cy="40" rx="320" ry="120" fill="var(--hill)" />
              <ellipse cx="820" cy="10" rx="360" ry="130" fill="var(--hill)" />
              {Array.from({ length: Math.ceil(H / 380) }).map((_, i) => (
                <ellipse key={`m${i}`} cx={i % 2 ? 120 : 880} cy={300 + i * 380} rx="210" ry="80" fill="var(--hill2)" opacity=".7" />
              ))}
            </>
          )}
          {scene.pond && (
            <>
              <ellipse cx={scene.pond.x} cy={scene.pond.y} rx="96" ry="36" fill="#BFD8F5" />
              <ellipse cx={scene.pond.x} cy={scene.pond.y - 3} rx="88" ry="30" fill="#CFE4FF" />
              <ellipse cx={scene.pond.x - 22} cy={scene.pond.y - 8} rx="38" ry="8" fill="#fff" opacity=".55" />
              <ellipse cx={scene.pond.x + 30} cy={scene.pond.y + 6} rx="14" ry="6" fill="#AFC47E" />
              <ellipse cx={scene.pond.x + 48} cy={scene.pond.y - 2} rx="10" ry="4" fill="#AFC47E" />
            </>
          )}
          {scene.streams.map((st, i) => (
            <g key={`s${i}`}>
              <path d={`M0 ${st.y} C ${W * 0.25} ${st.y - 26} ${W * 0.5} ${st.y + 26} ${W * 0.75} ${st.y - 10} S ${W} ${st.y + 14} ${W} ${st.y + 4}`} fill="none" stroke="#A9CBEF" strokeWidth="46" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              <path d={`M0 ${st.y} C ${W * 0.25} ${st.y - 26} ${W * 0.5} ${st.y + 26} ${W * 0.75} ${st.y - 10} S ${W} ${st.y + 14} ${W} ${st.y + 4}`} fill="none" stroke="#CFE4FF" strokeWidth="34" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              <path d={`M0 ${st.y - 4} C ${W * 0.25} ${st.y - 30} ${W * 0.5} ${st.y + 22} ${W * 0.75} ${st.y - 14} S ${W} ${st.y + 10} ${W} ${st.y}`} fill="none" stroke="#fff" strokeWidth="2.5" strokeDasharray="18 28" opacity=".8" vectorEffect="non-scaling-stroke" className="stream-flow" />
            </g>
          ))}
          {classic && <path d={full} fill="none" stroke="var(--path-shadow)" strokeWidth="58" strokeLinecap="round" vectorEffect="non-scaling-stroke" transform="translate(0 5)" />}
          <path d={full} fill="none" stroke="var(--edge)" strokeWidth={classic ? 54 : 50} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <path d={full} fill="none" stroke="var(--path)" strokeWidth={theme === 'pedras' ? 30 : 42} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          {classic && <path d={full} fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth="18" strokeLinecap="round" vectorEffect="non-scaling-stroke" transform="translate(-6 -3)" />}
          {theme === 'bosque' && <path d={full} fill="none" stroke="#C9A27E" strokeWidth="2" strokeDasharray="2 14" strokeLinecap="round" vectorEffect="non-scaling-stroke" opacity=".6" />}
          {progressEnd >= 1 && (
            <motion.path
              key={progressEnd}
              d={pathTo(progressEnd)}
              fill="none"
              stroke="var(--rosa-medio)"
              strokeOpacity=".4"
              strokeWidth={theme === 'pedras' ? 30 : 42}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            />
          )}
          {fresh && (
            <>
              <motion.path d={segPath(fresh.a, fresh.b)} fill="none" stroke="#FFF3B0" strokeWidth="58" strokeLinecap="round" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0, opacity: 0.9 }} animate={{ pathLength: 1, opacity: [0.9, 0.9, 0] }} transition={{ duration: 1.6, ease: 'easeOut' }} />
              <motion.path d={segPath(fresh.a, fresh.b)} fill="none" stroke="var(--rosa-medio)" strokeWidth="42" strokeLinecap="round" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: 'easeInOut' }} strokeOpacity=".55" />
            </>
          )}
          {theme !== 'pedras' && <path d={full} fill="none" stroke="var(--dash)" strokeOpacity=".9" strokeWidth="3" strokeDasharray="10 12" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
        </svg>

        {theme === 'noturno' && (
          <>
            <span className="moon" aria-hidden="true" />
            {Array.from({ length: Math.ceil(H / 40) }).map((_, i) => (
              <span key={`st${i}`} className="star" style={{ left: `${(i * 37) % 100}%`, top: 20 + ((i * 97) % Math.max(200, H - 60)) }} aria-hidden="true" />
            ))}
          </>
        )}
        {theme !== 'noturno' && [0, 1, 2].map((i) => (
          <div key={`c${i}`} className={`cloud ${ambient ? 'is-drifting' : ''}`} style={{ left: `${[12, 62, 84][i]}%`, top: classic ? [-18, -4, -26][i] : [20, 70, 300][i], animationDelay: `${i * -7}s`, width: [110, 90, 120][i] }}>
            <Asset slot="trail.decor.nuvem" />
          </div>
        ))}
        {scene.pathDeco.map((p, i) => (
          <div key={`pd${i}`} className={`pdeco pdeco-${p.kind}`} style={{ left: `${(p.x / W) * 100}%`, top: p.y, width: p.size, height: p.kind === 'pedra' ? p.size * 0.65 : p.size, transform: `translate(-50%, ${p.kind === 'pedra' ? '-50%' : '-100%'}) rotate(${p.rot}deg)` }}>
            <Asset slot={`trail.decor.${p.kind}`} />
          </div>
        ))}
        {scene.streams.map((st, i) => (
          <div key={`br${i}`} className="bridge" style={{ left: `${(st.bridgeX / W) * 100}%`, top: st.y }}>
            <Asset slot="trail.decor.ponte" />
          </div>
        ))}
        {land?.pond && (
          <div className="pond" style={{ left: `${(land.pond.x / W) * 100}%`, top: land.pond.y, width: land.pond.w, height: land.pond.w * 0.46 }}>
            <Asset slot="trail.decor.lago" />
          </div>
        )}
        {classic && pts.map((p, i) => (
          <span key={`cl${i}`} className={`clearing ${i === n ? 'clearing-chest' : ''}`} style={{ left: `${(p.x / W) * 100}%`, top: p.y }} aria-hidden="true" />
        ))}
        {scene.props.map((p, i) => (
          <div
            key={i}
            className={`prop prop-${p.kind} ${p.sway && ambient ? 'is-swaying' : ''}`}
            style={{ left: `${(p.x / W) * 100}%`, top: p.y, width: p.size, height: classic ? p.size * (PROP_ASPECT[p.kind] ?? 1) : p.size, transform: `translate(-50%, -100%) ${p.flip ? 'scaleX(-1)' : ''}`, animationDelay: `${(i % 7) * -0.6}s` }}
          >
            <Asset slot={`trail.decor.${p.kind}`} />
          </div>
        ))}
        {ambient && theme === 'noturno' && Array.from({ length: 14 }).map((_, i) => (
          <span key={`ff${i}`} className="firefly" style={{ left: `${(i * 53) % 100}%`, top: 80 + ((i * 131) % Math.max(200, H - 120)), animationDelay: `${i * -0.7}s` }} aria-hidden="true" />
        ))}
        {ambient && theme === 'bosque' && Array.from({ length: 8 }).map((_, i) => (
          <span key={`lf${i}`} className="falling-leaf" style={{ left: `${(i * 13 + 4) % 100}%`, animationDelay: `${i * 1.6}s`, animationDuration: `${10 + (i % 4) * 2}s` }} aria-hidden="true"><Leaf hue={i} /></span>
        ))}
        {ambient && theme === 'florido' && Array.from({ length: 8 }).map((_, i) => (
          <span key={`pt${i}`} className="fx fx-primavera trail-petal" style={{ left: `${(i * 13 + 6) % 100}%`, animationDelay: `${i * 1.4}s`, animationDuration: `${10 + (i % 4) * 2}s` }} aria-hidden="true" />
        ))}
        {ambient && theme !== 'noturno' && <Butterflies H={H} />}
        <EventDecor scene="trilha" />
        {(() => {
          const hide = scene.props.find((p) => p.kind === 'arbusto') ?? scene.props[1];
          return <TrailCat chapterIndex={chapterIndex} chapters={data.chapters.length} x={hide ? (hide.x / W) * 100 : 12} y={hide ? hide.y - 14 : 300} />;
        })()}
        {scene.props.length > 4 && <Candy x={(scene.props[scene.props.length - 3].x / W) * 100} y={scene.props[scene.props.length - 3].y - 30} />}

        {ms.map((m, i) => (
          <Station
            key={m.id}
            m={m}
            x={(pts[i].x / W) * 100}
            y={pts[i].y}
            current={i === currentIdx}
            index={i}
            onOpen={() => onOpen(m.id)}
          />
        ))}

        <motion.button
          className={`chest ${prog.complete ? 'is-open' : ''}`}
          style={{ left: `${(pts[n].x / W) * 100}%`, top: pts[n].y, x: '-50%', y: '-50%' }}
          animate={chestCtl}
          whileHover={{ scale: 1.06, rotate: prog.complete ? 0 : -3 }}
          whileTap={{ scale: 0.95 }}
          onClick={(e) => {
            if (prog.complete) {
              const el = e.currentTarget;
              play('key');
              void chestCtl.start({ scale: [1, 1.25, 0.95, 1.08], y: ['-50%', '-62%', '-50%', '-50%'], transition: { duration: 0.5 } });
              burst(el, 'brilho', 16);
              setTimeout(() => burst(el, 'confete', 14), 180);
              setTimeout(() => ui.celebrate({ kind: 'chapter', title: `${chapter.title} concluído`, extras: ['Uma flor rara nasceu no seu jardim'] }), 520);
            } else {
              play('drop');
              void chestCtl.start({ rotate: [0, -8, 8, -5, 5, 0], transition: { duration: 0.45 } });
              ui.toast('O baú abre quando todas as missões deste capítulo estiverem feitas.');
            }
          }}
          aria-label={prog.complete ? 'Baú do capítulo aberto' : 'Baú do capítulo, fechado'}
        >
          <Asset slot={prog.complete ? 'trail.chest.open' : 'trail.chest.closed'} />
        </motion.button>

        {n === 0 && (
          <div className="board-empty">
            <p>Nenhuma missão neste capítulo.</p>
            <button className="btn btn-primary btn-sm" onClick={onNewMission}><Icon name="plus" size={16} /> Adicionar missão</button>
          </div>
        )}

        {notes.map((note) => (
          <PostIt
            key={note.id}
            note={note}
            boardRef={boardRef}
            boardH={H}
            open={openNote === note.id}
            onOpen={() => setOpenNote(note.id)}
            onClose={() => setOpenNote(null)}
            chapterId={chapter.id}
          />
        ))}
      </div>
    </section>
  );
}

/** chão da paisagem clássica: colinas no horizonte, gramado e manchas de relevo */
function LandscapeGround({ H, land }: { H: number; land: Landscape | null }) {
  return (
    <>
      <path d={`M0 46 C 90 8 210 14 300 34 C 380 50 440 22 540 18 C 650 14 720 44 800 30 C 880 16 950 20 ${W} 38 V 120 H0z`} fill="var(--hill-far)" />
      <path d={`M0 66 C 120 40 230 52 330 62 C 420 70 470 44 560 46 C 680 48 760 70 860 56 C 920 48 970 50 ${W} 58 V 140 H0z`} fill="var(--hill-mid)" />
      <path d={`M0 84 C 140 66 300 72 420 66 C 470 63 530 63 580 66 C 700 72 860 66 ${W} 80 V ${H} H0z`} fill="var(--meadow)" />
      {land?.patches.map((p, i) => (
        <ellipse key={i} cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry} fill={p.tone === 'light' ? 'var(--meadow-light)' : 'var(--meadow-dark)'} opacity=".75" />
      ))}
    </>
  );
}

function Butterflies({ H }: { H: number }) {
  return (
    <>
      {[0, 1].map((i) => (
        <span key={i} className="butterfly" style={{ left: `${i ? 70 : 22}%`, top: i ? H * 0.55 : H * 0.25, animationDelay: `${i * -5}s` }} aria-hidden="true">
          <span className="wing wing-l" />
          <span className="wing wing-r" />
        </span>
      ))}
    </>
  );
}

function Station({ m, x, y, current, index, onOpen }: { m: Mission; x: number; y: number; current: boolean; index: number; onOpen: () => void }) {
  const { data } = useStore();
  const topic = data.topics.find((t) => t.id === m.topicId);
  const p = missionProgress(m);
  const internato = m.kind === 'internato';
  const area = areaOf(topic?.area ?? 'geral');
  return (
    <motion.div
      className={`station ${internato ? 'station-special' : ''} ${p.complete ? 'is-done' : ''} ${current ? 'is-current' : ''}`}
      style={{ left: `${x}%`, top: y, x: '-50%', y: internato ? -62 : -56 }}
      initial={{ scale: 0.4, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.06 * index, type: 'spring', stiffness: 300, damping: 18 }}
    >
      {current && (
        <motion.span className="station-callout" animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}>
          {p.started ? 'Continuar' : 'Começar'}
        </motion.span>
      )}
      <motion.button
        className="station-btn"
        onClick={(e) => {
          burst(e, p.complete ? 'brilho' : 'confete', 8);
          onOpen();
        }}
        whileHover={{ scale: 1.07, y: -3, rotate: index % 2 ? 2 : -2 }}
        whileTap={{ scale: 0.94, y: 2 }}
        style={{ ['--area' as string]: internato ? 'var(--pessego)' : area.color }}
        aria-label={`${m.label}. ${p.done} de ${p.total} atividades.${internato ? ' Missão especial do internato.' : ''}`}
      >
        <ProgressRing pct={p.pct} size={internato ? 124 : 112} stroke={8} color={p.complete ? 'var(--salvia-esc)' : 'var(--rosa-medio)'} track="rgba(255,255,255,.8)">
          <span className="station-face">
            <Asset slot={internato ? 'trail.station.internato' : `trail.station.${topic?.area ?? 'geral'}`} />
          </span>
        </ProgressRing>
        {p.complete && (
          <motion.span className="station-check" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 15 }}>
            <Icon name="check" size={16} />
          </motion.span>
        )}
        {internato && <span className="station-ribbon"><Icon name="star" size={12} /> Internato</span>}
      </motion.button>
      <div className="station-label">
        <span className="station-name">{m.label}</span>
      </div>
    </motion.div>
  );
}

// ── Post-its ──────────────────────────────────────────────────

export const NOTE_COLORS: { id: NoteColor; hex: string; label: string }[] = [
  { id: 'manteiga', hex: '#FFF3B0', label: 'Amarelo' },
  { id: 'rosa', hex: '#F8C9F1', label: 'Rosa' },
  { id: 'lilas', hex: '#E9D8FF', label: 'Lilás' },
  { id: 'azul', hex: '#CFE4FF', label: 'Azul' },
  { id: 'lima', hex: '#D9EE76', label: 'Verde' },
  { id: 'pessego', hex: '#FFAEB1', label: 'Pêssego' },
];
const noteHex = (c: NoteColor) => NOTE_COLORS.find((x) => x.id === c)?.hex ?? '#FFF3B0';

function PostIt({ note, boardRef, boardH, open, onOpen, onClose, chapterId }: {
  note: Note; boardRef: React.RefObject<HTMLDivElement>; boardH: number; open: boolean; onOpen: () => void; onClose: () => void; chapterId: string;
}) {
  const { data, saveNote, deleteNote } = useStore();
  const ref = useRef<HTMLButtonElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const dragged = useRef(false);
  const [text, setText] = useState(note.text);
  useEffect(() => setText(note.text), [note.text]);
  const y = Math.min(note.y, boardH - 40);

  const close = () => {
    if (!text.trim()) {
      deleteNote(note.id);
    } else if (text !== note.text) saveNote({ ...note, text });
    onClose();
  };
  const peek = note.text.trim().split('\n')[0].slice(0, 60);
  const openLeft = note.x > 60;

  return (
    <>
      <motion.button
        ref={ref}
        className={`postit ${open ? 'is-open' : ''}`}
        style={{ left: `${note.x}%`, top: y, x: mx, y: my, rotate: note.rot, background: noteHex(note.color) }}
        drag
        dragMomentum={false}
        dragConstraints={boardRef}
        dragElastic={0.04}
        whileHover={{ scale: 1.12 }}
        whileDrag={{ scale: 1.18, zIndex: 30, rotate: 3, boxShadow: '0 22px 30px -12px rgba(46,74,127,.45)' }}
        whileTap={{ scale: 1.05 }}
        onDragStart={() => { dragged.current = true; play('paper'); }}
        onDragEnd={() => {
          const box = boardRef.current?.getBoundingClientRect();
          const r = ref.current?.getBoundingClientRect();
          if (!box || !r) return;
          const nx = Math.min(96, Math.max(0, ((r.left - box.left) / box.width) * 100));
          const ny = Math.min(boardH - 40, Math.max(0, r.top - box.top));
          mx.set(0);
          my.set(0);
          saveNote({ ...note, x: Math.round(nx * 10) / 10, y: Math.round(ny) });
          play('note');
          setTimeout(() => { dragged.current = false; }, 0);
        }}
        onClick={() => {
          if (dragged.current) return;
          play('note');
          if (open) close();
          else onOpen();
        }}
        aria-label={peek ? `Post-it: ${peek}` : 'Post-it vazio'}
        data-peek={peek || 'Post-it vazio'}
      >
        <span className="postit-lines" aria-hidden="true" />
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="postit-card"
            style={{
              left: openLeft ? undefined : `calc(${note.x}% + 48px)`,
              right: openLeft ? `calc(${100 - note.x}% + 8px)` : undefined,
              top: Math.max(0, y - 20),
              background: noteHex(note.color),
              transformOrigin: openLeft ? '100% 0' : '0 0',
            }}
            initial={{ scale: 0.3, opacity: 0, rotate: note.rot }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.3, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            role="dialog"
            aria-label="Post-it"
          >
            <textarea
              id={`note-${note.id}`}
              className="postit-text"
              value={text}
              autoFocus
              placeholder="Escreva aqui…"
              onChange={(e) => setText(e.target.value)}
              onBlur={() => text !== note.text && text.trim() && saveNote({ ...note, text })}
              onKeyDown={(e) => e.key === 'Escape' && close()}
            />
            <div className="postit-tools">
              <div className="postit-colors" role="radiogroup" aria-label="Cor">
                {NOTE_COLORS.map((c) => (
                  <button
                    key={c.id}
                    role="radio"
                    aria-checked={note.color === c.id}
                    aria-label={c.label}
                    className={`swatch ${note.color === c.id ? 'is-on' : ''}`}
                    style={{ background: c.hex }}
                    onClick={() => saveNote({ ...note, text, color: c.id })}
                  />
                ))}
              </div>
              <label className="postit-all">
                <input
                  type="checkbox"
                  checked={note.chapterId === null}
                  onChange={(e) => saveNote({ ...note, text, chapterId: e.target.checked ? null : chapterId })}
                />
                Em todos os capítulos
              </label>
              <select
                id={`note-topic-${note.id}`}
                className="postit-topic"
                value={note.topicId ?? ''}
                onChange={(e) => saveNote({ ...note, text, topicId: e.target.value || null })}
                aria-label="Mostrar também no livro da matéria"
              >
                <option value="">Sem livro ligado</option>
                {[...data.topics].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map((t) => <option key={t.id} value={t.id}>Livro: {t.name}</option>)}
              </select>
              <div className="postit-actions">
                <ConfirmButton
                  className="icon-btn icon-btn-sm"
                  label={<Icon name="trash" size={16} />}
                  question="Jogar fora?"
                  confirmLabel="Sim"
                  onConfirm={() => { deleteNote(note.id); onClose(); }}
                />
                <button className="btn btn-sm btn-dark" onClick={close}>Fechar</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
