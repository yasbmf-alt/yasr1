import { EventDecor } from '../components/EventDecor';
import { burst, multiTap } from '../logic/fx';
import { today } from '../logic/dates';
import { eggDay, dayHash, phraseOfDay } from '../logic/eggs';
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue } from 'framer-motion';
import { useStore } from '../data/store';
import { useUI } from '../components/ui';
import { Icon } from '../components/Icon';
import { Asset, AssetImg } from '../assets/registry';
import { SPECIES_BY_AREA, StationIcon } from '../assets/art';
import { AREAS, areaOf, type Area, type Topic } from '../types';
import { STAGE_LABEL, missionProgress, topicStats, type TopicStats } from '../logic/progress';
import { fmtLong, relDay } from '../logic/dates';
import { STICKERS } from '../logic/stickers';
import { play } from '../logic/sound';
import { uploadImage } from '../components/upload';
import { BookMacetes, BookNotes } from '../components/BookPages';
import { topicOccurrences } from '../logic/simErrors';
import { searchLibrary } from '../logic/search';

interface Book {
  t: Topic;
  st: TopicStats;
}
interface Shelf {
  area: Area | null;
  books: Book[];
}


const BOOK_W = 66;
const BOOK_GAP = 12;

export function Biblioteca() {
  const { data, saveSettings } = useStore();
  const [open, setOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [bookMacete, setBookMacete] = useState<string | null>(null);
  const [jumping, setJumping] = useState<string | null>(null);
  const order = data.settings.libraryOrder ?? 'estudo';
  const wardrobeRef = useRef<HTMLDivElement>(null);
  const ui = useUI();
  useEffect(() => {
    if (ui.pendingBook) {
      setSelected(ui.pendingBook);
      setBookMacete(ui.pendingMacete);
      ui.clearPendingBook();
    }
  }, [ui.pendingBook, ui]);

  const [pendingOnly, setPendingOnly] = useState(false);
  const allBooks = useMemo(
    () =>
      data.topics
        .map((t) => {
          const occ = topicOccurrences(data.simulados, t.id);
          const st = topicStats(t, data.sessions);
          // primeiro contato com o tema: estudo ou simulado
          const first = [st.firstDate, occ.at(-1)?.sim.date].filter(Boolean).sort()[0] ?? null;
          const t0 = today();
          // pendente: correção de simulado em aberto, ou revisão de estudo vencida
          const pending = occ.some((o) => (o.group.status ?? 'nao') !== 'corrigido') || (!!st.nextReview && st.sessions.length > 0 && st.nextReview <= t0);
          // trilha: tema de missão só entra quando uma missão dele é concluída (missão só programada não conta);
          // tema fora das missões entra no primeiro registro de estudo. Simulados: apareceu nos erros de um simulado.
          const ms = data.missions.filter((m) => m.topicId === t.id);
          const inTrail = ms.length ? ms.some((m) => missionProgress(m).complete) : st.sessions.length > 0 || (t.map?.nodes.length ?? 0) > 1;
          return { t, st, first, inSims: occ.length > 0, inTrail, pending };
        })
        .filter((b) => b.inTrail) // erros de simulado ficam na Correção de Simulados, não viram livro
        .sort((a, b) => (a.first ?? '').localeCompare(b.first ?? '') || a.t.name.localeCompare(b.t.name)),
    [data.topics, data.sessions, data.simulados, data.missions],
  );
  const books = pendingOnly ? allBooks.filter((b) => b.pending) : allBooks;
  const counts = { pendentes: allBooks.filter((b) => b.pending).length };
  const [q, setQ] = useState('');
  const hits = useMemo(() => searchLibrary(data, q), [data, q]);

  // livro especial do dia: em alguns dias, um livro guarda uma frase
  const specialBook = eggDay('livro-especial', 3) && books.length ? books[dayHash('livro-qual') % books.length].t.id : null;

  const toggle = () => {
    play(open ? 'doorClose' : 'door');
    setOpen(!open);
    if (!open) setDrawer(false);
  };

  const pick = (id: string) => {
    play('pop');
    setJumping(id);
    if (id === specialBook && !(data.settings.eggsFound ?? {})[`livro-${today()}`]) {
      ui.toast(`Um livro especial! ${phraseOfDay('livro-especial')}`, 'diva');
      saveSettings({ eggsFound: { ...(data.settings.eggsFound ?? {}), [`livro-${today()}`]: new Date().toISOString() } });
    }
    setTimeout(() => {
      setSelected(id);
      setJumping(null);
      play('page');
    }, 280);
  };

  return (
    <div className="page page-lib">
      <header className="lib-head">
        <h1 className="h1">Biblioteca</h1>
        <div className="lib-search">
          <Icon name="search" size={16} />
          <input
            id="lib-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar tema, subtópico, mapa ou nota"
            aria-label="Buscar na Biblioteca"
            autoComplete="off"
          />
          {q.trim().length >= 2 && (
            <div className="lib-hits" role="listbox" aria-label="Resultados">
              {hits.length === 0 && <p className="muted small">Nada encontrado.</p>}
              {hits.map((h, i) => (
                <button
                  key={i}
                  role="option"
                  aria-selected={false}
                  className="lib-hit"
                  onClick={() => {
                    setQ('');
                    ui.openTopic(h.topic.id, h.nodeId ? { tab: 'mapa', nodeId: h.nodeId, simId: h.simId ?? 'tema' } : { tab: h.where === 'Subtópico' || h.where === 'Lacuna' ? 'questoes' : 'geral' });
                  }}
                >
                  <span className="lib-hit-t">{h.topic.name}</span>
                  <span className="lib-hit-w">{h.where}</span>
                  {h.where !== 'Tema' && <span className="lib-hit-x">{h.text}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        <AnimatePresence>
          {open && (
            <motion.div className="lib-controls" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <button className={`lib-pend ${pendingOnly ? 'is-on' : ''}`} aria-pressed={pendingOnly} onClick={() => setPendingOnly(!pendingOnly)}>
                Pendentes de revisão{counts.pendentes ? ` · ${counts.pendentes}` : ''}
              </button>
              <div className="seg" role="tablist" aria-label="Organizar livros">
                <button className={order === 'estudo' ? 'is-on' : ''} onClick={() => saveSettings({ libraryOrder: 'estudo' })}>Ordem de estudo</button>
                <button className={order === 'area' ? 'is-on' : ''} onClick={() => saveSettings({ libraryOrder: 'area' })}>Especialidade</button>
              </div>
              <button className="btn btn-quiet btn-sm" onClick={toggle}>Fechar armário</button>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <div className="wardrobe-stage">
        <EventDecor scene="biblioteca" />
        <div className="wardrobe" ref={wardrobeRef}>
          <button
            className="w-crown"
            aria-label="Topo do armário"
            tabIndex={-1}
            onClick={(e) => {
              if (multiTap('coroa', 3)) {
                play('key');
                burst(e, 'brilho', 12);
                ui.toast(phraseOfDay('coroa-armario'), 'diva');
                saveSettings({ eggsFound: { ...(data.settings.eggsFound ?? {}), 'coroa-armario': new Date().toISOString() } });
              }
            }}
          />
          <div className="w-body">
            <div className="w-interior">
              <span className="w-interior-bg" aria-hidden="true"><Asset slot="library.interior" /></span>
              <Shelves books={books} order={order} open={open} selected={selected} jumping={jumping} onPick={pick} special={specialBook} pendingOnly={pendingOnly} />
            </div>
            <Door side="left" open={open} onClick={toggle} />
            <Door side="right" open={open} onClick={toggle} />
            {!open && (
              <button className="w-hint" onClick={toggle}>
                Abrir armário
              </button>
            )}
          </div>
          <StickersOnWardrobe wardrobeRef={wardrobeRef} hidden={open} />
          <div className="w-base">
            <button className={`w-drawer ${drawer ? 'is-out' : ''}`} onClick={() => { play(drawer ? 'doorClose' : 'pop'); setDrawer(!drawer); }} aria-expanded={drawer} aria-label="Gaveta de adesivos">
              <Asset slot="library.drawer" />
            </button>
          </div>
          <div className="w-feet" aria-hidden="true"><span /><span /></div>
        </div>
        <AnimatePresence>{drawer && <StickerTray wardrobeRef={wardrobeRef} onClose={() => setDrawer(false)} />}</AnimatePresence>
      </div>

      <AnimatePresence>
        {selected && <OpenBook key={selected} topicId={selected} macete={bookMacete} onClose={() => { play('bookClose'); setSelected(null); setBookMacete(null); }} />}
      </AnimatePresence>
    </div>
  );
}

// ── Portas ────────────────────────────────────────────────────

function Door({ side, open, onClick }: { side: 'left' | 'right'; open: boolean; onClick: () => void }) {
  return (
    <motion.button
      className={`w-door w-door-${side}`}
      onClick={onClick}
      aria-label={open ? 'Fechar armário' : 'Abrir armário'}
      initial={false}
      animate={{ rotateY: open ? (side === 'left' ? -108 : 108) : 0, filter: open ? 'brightness(0.86)' : 'brightness(1)' }}
      transition={{ type: 'spring', stiffness: 55, damping: 12, mass: 0.9 }}
      whileHover={open ? undefined : { rotateY: side === 'left' ? -6 : 6 }}
    >
      <Asset slot={`library.door.${side}`} />
    </motion.button>
  );
}

// ── Prateleiras e livros ──────────────────────────────────────

function Shelves({ books, order, open, selected, jumping, onPick, special, pendingOnly }: {
  books: Book[]; order: 'estudo' | 'area'; open: boolean; selected: string | null; jumping: string | null; onPick: (id: string) => void; special: string | null; pendingOnly: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [perShelf, setPerShelf] = useState(8);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth - 32;
      setPerShelf(Math.max(3, Math.floor((w + BOOK_GAP) / (BOOK_W + BOOK_GAP))));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const shelves: Shelf[] = [];
  if (order === 'area') {
    for (const a of AREAS) {
      const list = books.filter((b) => b.t.area === a.id);
      for (let i = 0; i < list.length; i += perShelf) shelves.push({ area: a.id, books: list.slice(i, i + perShelf) });
    }
  } else {
    for (let i = 0; i < books.length; i += perShelf) shelves.push({ area: null, books: books.slice(i, i + perShelf) });
  }
  while (shelves.length < 3) shelves.push({ area: null, books: [] });

  let k = 0;
  return (
    <div className="shelves" ref={ref}>
      {books.length === 0 && open && (
        <motion.p className="shelves-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          {pendingOnly
            ? 'Nada pendente de revisão. Tudo em dia!'
            : 'Cada tema de missão vira um livro aqui quando você conclui a missão dele.'}
        </motion.p>
      )}
      {shelves.map((sh, i) => (
        <div className="shelf" key={`${order}-${i}`}>
          <div className="shelf-books">
            {sh.books.map((b) => {
              const idx = k++;
              return (
                <BookItem
                  key={b.t.id}
                  b={b}
                  delay={open ? 0.35 + idx * 0.035 : 0}
                  visible={open}
                  selected={selected === b.t.id}
                  jumping={jumping === b.t.id}
                  special={special === b.t.id}
                  onPick={() => onPick(b.t.id)}
                />
              );
            })}
          </div>
          <div className="shelf-plank">
            {sh.area && sh.books.length > 0 && (i === 0 || shelves[i - 1].area !== sh.area) && (
              <span className="shelf-tag" style={{ background: areaOf(sh.area).color, color: areaOf(sh.area).ink }}>
                {areaOf(sh.area).short}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function BookItem({ b, delay, visible, selected, jumping, onPick, special }: {
  b: Book; delay: number; visible: boolean; selected: boolean; jumping: boolean; onPick: () => void; special?: boolean;
}) {
  const a = areaOf(b.t.area);
  const acc = b.st.accuracy;
  const sat = acc == null ? 0.85 : 0.6 + Math.min(1, acc) * 0.55;
  return (
    <motion.button
      layout
      className={`book ${selected ? 'is-selected' : ''} ${special ? 'is-special' : ''}`}
      style={{ ['--cover' as string]: a.color, ['--ink' as string]: a.ink, filter: `saturate(${sat})` }}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: visible ? 1 : 0, y: jumping ? -26 : selected ? -10 : 0, rotate: jumping ? -4 : 0 }}
      transition={{ delay: jumping ? 0 : delay, type: 'spring', stiffness: 380, damping: 16 }}
      whileHover={{ y: -8, rotate: -2 }}
      onClick={onPick}
      title={b.t.name}
      aria-label={`Livro: ${b.t.name}`}
      tabIndex={visible ? 0 : -1}
    >
      <BookCover t={b.t} />
    </motion.button>
  );
}

function BookCover({ t, big }: { t: Topic; big?: boolean }) {
  return (
    <span className={`cover ${big ? 'cover-big' : ''}`}>
      {t.coverAssetId ? (
        <AssetImg className="cover-img" id={t.coverAssetId} alt="" />
      ) : (
        <>
          <span className="cover-emblem"><StationIcon area={t.area} /></span>
          <span className="cover-title">{t.name}</span>
        </>
      )}
      <span className="cover-spine" aria-hidden="true" />
      <span className="cover-pages" aria-hidden="true" />
      <span className="cover-ribbon" aria-hidden="true" />
    </span>
  );
}

// ── Livro aberto ──────────────────────────────────────────────

function OpenBook({ topicId, macete, onClose }: { topicId: string; macete?: string | null; onClose: () => void }) {
  const { data, saveTopic } = useStore();
  const ui = useUI();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState<'metricas' | 'lembretes' | 'macetes'>(macete ? 'macetes' : 'metricas');
  const [turn, setTurn] = useState(0);
  const goPage = (p: 'metricas' | 'lembretes' | 'macetes') => {
    if (p === page) return;
    play('page');
    setTurn((x) => x + 1);
    setPage(p);
  };
  const t = data.topics.find((x) => x.id === topicId);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  if (!t) return null;
  const st = topicStats(t, data.sessions);
  const a = areaOf(t.area);
  const species = SPECIES_BY_AREA[t.area];

  return (
    <motion.div className="book-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
      <motion.div
        className="spread"
        role="dialog"
        aria-label={t.name}
        onMouseDown={(e) => e.stopPropagation()}
        initial={{ scale: 0.5, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.6, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 240, damping: 22 }}
        style={{ ['--cover' as string]: a.color, ['--ink' as string]: a.ink }}
      >
        <motion.div className="page-l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.38 }}>
          <span className="pl-chip">{a.label}{t.specialty ? ` · ${t.specialty}` : ''}</span>
          <h2 className="pl-title">{t.name}</h2>
          <div className="pl-plant">
            {st.stage > 0 && <Asset slot={`garden.plant.${species}.${st.stage}`} />}
          </div>
          <span className="pl-stage">No jardim: {STAGE_LABEL[st.stage].toLowerCase()}</span>
        </motion.div>
        <div className="book-tabs" role="tablist" aria-label="Páginas do livro">
          {([['metricas', 'Métricas'], ['lembretes', `Lembretes${data.notes.filter((n) => n.topicId === t.id).length ? ` · ${data.notes.filter((n) => n.topicId === t.id).length}` : ''}`], ['macetes', `Macetes${data.macetes.filter((m) => m.topicId === t.id).length ? ` · ${data.macetes.filter((m) => m.topicId === t.id).length}` : ''}`]] as const).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={page === id} className={`book-tab bt-${id} ${page === id ? 'is-on' : ''}`} onClick={() => goPage(id)}>{label}</button>
          ))}
        </div>
        <div className="page-r">
          <AnimatePresence>
            {turn > 0 && (
              <motion.div key={turn} className="leaf" initial={{ rotateY: 0, opacity: 1 }} animate={{ rotateY: -175, opacity: 0.2 }} exit={{ opacity: 0 }} transition={{ duration: 0.45, ease: [0.4, 0.1, 0.3, 1] }} aria-hidden="true" />
            )}
          </AnimatePresence>
          {page === 'lembretes' && <motion.div key="l" className="pr-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}><BookNotes topic={t} /></motion.div>}
          {page === 'macetes' && <motion.div key="m" className="pr-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}><BookMacetes topic={t} initial={macete} /></motion.div>}
          {page === 'metricas' && <motion.div key="x" className="pr-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <div className="pr-big">
              <span className="pr-big-v">{st.accuracy == null ? '—' : `${Math.round(st.accuracy * 100)}%`}</span>
              <span className="pr-big-l">de acertos</span>
            </div>
            <dl className="pr-list">
              <div><dt>Questões feitas</dt><dd>{st.questions}</dd></div>
              <div><dt>Revisões</dt><dd>{st.reviews}</dd></div>
              <div><dt>Última sessão</dt><dd>{st.lastDate ? fmtLong(st.lastDate) : '—'}</dd></div>
              <div><dt>Próxima revisão</dt><dd>{st.nextReview ? relDay(st.nextReview) : '—'}</dd></div>
            </dl>
            <div className="pr-actions">
              <button className="btn btn-primary btn-sm" onClick={() => { onClose(); ui.openTopic(t.id); }}>Ver ficha completa</button>
              <button className="btn btn-quiet btn-sm" onClick={() => { onClose(); ui.openTopic(t.id, { tab: 'mapa' }); }}><Icon name="brain" size={15} /> Mapa conceitual</button>
              <button className="btn btn-quiet btn-sm" disabled={busy} onClick={() => fileRef.current?.click()}>
                <Icon name="upload" size={15} /> {busy ? 'Enviando…' : t.coverAssetId ? 'Trocar capa' : 'Personalizar capa'}
              </button>
              {t.coverAssetId && (
                <button className="btn btn-quiet btn-sm" onClick={() => saveTopic({ ...t, coverAssetId: null })}>Capa original</button>
              )}
            </div>
          </motion.div>}
          <motion.div
            className="flap"
            initial={{ rotateY: 0 }}
            animate={{ rotateY: -180 }}
            transition={{ delay: 0.12, duration: 0.6, ease: [0.3, 0.7, 0.2, 1] }}
            aria-hidden="true"
          >
            <BookCover t={t} big />
          </motion.div>
        </div>
        <button className="icon-btn spread-close" onClick={onClose} aria-label="Fechar livro"><Icon name="close" /></button>
        <input
          ref={fileRef}
          id="cover-file"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            setBusy(true);
            const r = await uploadImage(f);
            setBusy(false);
            if ('id' in r) {
              saveTopic({ ...t, coverAssetId: r.id });
              ui.toast('Capa nova no livro.');
            } else ui.toast(r.error, 'erro');
          }}
        />
      </motion.div>
    </motion.div>
  );
}

// ── Adesivos ──────────────────────────────────────────────────

function StickersOnWardrobe({ wardrobeRef, hidden }: { wardrobeRef: React.RefObject<HTMLDivElement>; hidden: boolean }) {
  const { data } = useStore();
  const placed = Object.entries(data.settings.stickers ?? {}).filter(([, p]) => p.placed);
  return (
    <motion.div className={`w-stickers ${hidden ? 'is-hidden' : ''}`} animate={{ opacity: hidden ? 0 : 1 }}>
      {placed.map(([id, p]) => (
        <PlacedSticker key={id} id={id} pos={p} wardrobeRef={wardrobeRef} />
      ))}
    </motion.div>
  );
}

function stickerDrop(info: { point: { x: number; y: number } }, wardrobe: HTMLDivElement | null) {
  if (!wardrobe) return null;
  const r = wardrobe.getBoundingClientRect();
  const cx = info.point.x - window.scrollX;
  const cy = info.point.y - window.scrollY;
  if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) return null;
  return { x: ((cx - r.left) / r.width) * 100, y: ((cy - r.top) / r.height) * 100 };
}

function PlacedSticker({ id, pos, wardrobeRef }: { id: string; pos: { x: number; y: number; rot: number }; wardrobeRef: React.RefObject<HTMLDivElement> }) {
  const { data, saveSettings } = useStore();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  return (
    <motion.div
      className="sticker sticker-placed"
      style={{ left: `${pos.x}%`, top: `${pos.y}%`, x: mx, y: my, rotate: pos.rot }}
      drag
      dragMomentum={false}
      whileHover={{ scale: 1.08 }}
      whileDrag={{ scale: 1.2, rotate: -6, zIndex: 40, filter: 'drop-shadow(0 14px 12px rgba(46,74,127,.35))' }}
      whileTap={{ scale: 0.95 }}
      onDragEnd={(_, info) => {
        const at = stickerDrop(info, wardrobeRef.current);
        mx.set(0);
        my.set(0);
        const all = { ...(data.settings.stickers ?? {}) };
        if (at) all[id] = { ...all[id], x: Math.round(at.x * 10) / 10, y: Math.round(at.y * 10) / 10, placed: true };
        else all[id] = { ...all[id], placed: false };
        play(at ? 'sticker' : 'drop');
        saveSettings({ stickers: all });
      }}
      title="Arraste para mover. Solte fora do armário para tirar."
    >
      <Asset slot={`sticker.${id}`} />
    </motion.div>
  );
}

function StickerTray({ wardrobeRef, onClose }: { wardrobeRef: React.RefObject<HTMLDivElement>; onClose: () => void }) {
  const { data, saveSettings } = useStore();
  const placed = data.settings.stickers ?? {};
  return (
    <motion.div
      className="tray"
      initial={{ opacity: 0, y: -24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
    >
      <div className="tray-inner">
        <div className="tray-head">
          <span className="tray-title">Adesivos</span>
          <span className="muted">Arraste para o armário</span>
          <button className="icon-btn icon-btn-sm" onClick={onClose} aria-label="Fechar gaveta"><Icon name="close" size={16} /></button>
        </div>
        <div className="tray-grid">
          {STICKERS.map((s) => {
            const earned = s.earned(data);
            const on = placed[s.id]?.placed;
            return (
              <div key={s.id} className={`tray-slot ${earned ? '' : 'is-locked'} ${on ? 'is-used' : ''}`} data-tip={earned ? (on ? `${s.label} · no armário` : s.label) : s.how}>
                {earned ? (
                  <motion.div
                    className="sticker"
                    drag
                    dragSnapToOrigin
                    whileHover={{ scale: 1.1, rotate: -4 }}
                    whileDrag={{ scale: 1.25, zIndex: 60 }}
                    onDragEnd={(_, info) => {
                      const at = stickerDrop(info, wardrobeRef.current);
                      if (!at) return;
                      play('sticker');
                      saveSettings({
                        stickers: { ...placed, [s.id]: { x: Math.round(at.x * 10) / 10, y: Math.round(at.y * 10) / 10, rot: Math.round(Math.random() * 24 - 12), placed: true } },
                      });
                    }}
                  >
                    <Asset slot={`sticker.${s.id}`} />
                  </motion.div>
                ) : (
                  <span className="sticker sticker-locked"><Asset slot={`sticker.${s.id}`} /></span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
