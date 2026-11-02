import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../data/store';
import { Modal, Field, ConfirmButton, LazyInput, useUI } from '../components/ui';
import { Icon } from '../components/Icon';
import { AREAS, areaOf, type Area, type Deck, type Flashcard } from '../types';
import { newCardState, previewLabel, RATING_LABEL, schedule, type Rating } from '../logic/fsrs';
import { countDue, countNew, countOverdue, DAILY_GOAL, deckCounts, deckQueue, isNewCard, mistakesQueue, turboPick, type TurboMode } from '../logic/flashQueue';
import { StationIcon } from '../assets/art';
import { Archipelago, SpecialtyPage, StudySheet, useTopicGroups, type StudyMode, type TopicGroup } from './flash/Archipelago';
import { ISLANDS, type IslandId } from './flash/islands';
import fcIcon from '../assets/fc/fc-icon.webp';
import type { CardState } from '../types';
import { parseAny, type RawCard } from '../logic/cardImport';
import { addDays, relDay, today, toKey, uid } from '../logic/dates';
import { isLearning } from '../logic/dailyPlan';
import { play } from '../logic/sound';
import { burst } from '../logic/fx';
import { isActive as isFocusActive } from '../components/focus';

// mais que isso parado num cartão (app esquecido aberto) não conta como estudo
const IDLE_CAP_MS = 3 * 60000;

const VIEW_KEY = 'yasr1-fc-view';
const SESSION_KEY = 'yasr1-fc-session';
type View = 'mapa' | 'temas';
interface SavedSession { plan: StudyPlan; done: string[] }
const loadSession = (): SavedSession | null => {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null') as SavedSession | null;
    return s?.plan?.ids?.length ? s : null;
  } catch {
    return null;
  }
};
const saveSessionLS = (s: SavedSession | null) => {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
};

export function Flashcards() {
  const { data } = useStore();
  const [deckId, setDeckId] = useState<string | null>(null);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [importing, setImporting] = useState<string | 'any' | null>(null);
  const [newDeck, setNewDeck] = useState(false);
  const [turbo, setTurbo] = useState(false);
  const deck = data.decks.find((d) => d.id === deckId) ?? null;
  const ui = useUI();
  const [view, setViewS] = useState<View>(() => {
    try {
      return (localStorage.getItem(VIEW_KEY) as View) || 'mapa';
    } catch {
      return 'mapa';
    }
  });
  const setView = (v: View) => {
    setViewS(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* ignore */
    }
  };
  const [island, setIslandS] = useState<IslandId | null>(() => {
    try {
      return (sessionStorage.getItem('yasr1-fc-island') as IslandId | null) || null;
    } catch {
      return null;
    }
  });
  const setIsland = (i: IslandId | null) => {
    setIslandS(i);
    try {
      if (i) sessionStorage.setItem('yasr1-fc-island', i);
      else sessionStorage.removeItem('yasr1-fc-island');
    } catch {
      /* ignore */
    }
    // leva até a ilha aberta (ou de volta ao mapa)
    setTimeout(() => document.querySelector(i ? '.spec' : '.arq')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 90);
  };
  const groups = useTopicGroups();
  /** começa uma sessão (sem cartões repetidos) e guarda o progresso para poder retomar */
  const start = (p: Omit<StudyPlan, 'key'>) => {
    const ids = [...new Set(p.ids)];
    if (!ids.length) return ui.toast('Nada para estudar aqui agora. 🌿');
    const full = { ...p, ids, key: `${p.kind}-${Date.now()}` };
    saveSessionLS({ plan: full, done: [] });
    play('pop');
    setPlan(full);
  };
  /** estuda um ou mais baralhos (os de um tema) no modo escolhido; sem limite de novos */
  const studyDecks = (deckIds: string[], mode: StudyMode, title: string) => {
    const set = new Set(deckIds);
    const mine = data.cards.filter((c) => set.has(c.deckId));
    const queue = deckIds.flatMap((id) => deckQueue(id, data.cards));
    const byId = new Map(mine.map((c) => [c.id, c]));
    let ids: string[];
    if (mode === 'novos') ids = queue.filter((x) => { const c = byId.get(x); return !!c && isNewCard(c); });
    else if (mode === 'revisar') ids = queue.filter((x) => { const c = byId.get(x); return !!c && !isNewCard(c); });
    else if (mode === 'errados') ids = queue.filter((x) => { const c = byId.get(x); return !!c && isLearning(c); });
    else if (mode === 'baralho') ids = mine.filter((c) => !isNewCard(c)).sort((a, b) => a.fsrs.due.localeCompare(b.fsrs.due)).map((c) => c.id);
    else ids = queue;
    if (!ids.length) {
      if (deckIds[0]) setDeckId(deckIds[0]); // nada para estudar: mostra os cartões
      return;
    }
    const label = mode === 'novos' ? ' · novos' : mode === 'revisar' ? ' · revisões' : mode === 'errados' ? ' · errados' : mode === 'baralho' ? ' · rever tudo' : '';
    start({ title: title + label, ids, kind: 'deck' });
  };
  const studyDeck = (id: string, mode: StudyMode = 'tudo') => {
    const d = data.decks.find((x) => x.id === id);
    if (d) studyDecks([id], mode, d.name);
  };
  const resume = () => {
    const s = loadSession();
    if (!s) return;
    const done = new Set(s.done);
    const ids = s.plan.ids.filter((x) => !done.has(x) && data.cards.some((c) => c.id === x));
    if (!ids.length) return saveSessionLS(null);
    setPlan({ ...s.plan, ids, key: `${s.plan.key}-r${Date.now()}` });
  };
  useEffect(() => {
    if (!ui.pendingStudy) return;
    if (ui.pendingStudy === '__erros__') start({ title: 'Treinar erros', ids: mistakesQueue(data.cards), kind: 'erros' });
    else studyDeck(ui.pendingStudy);
    ui.clearPendingStudy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ui.pendingStudy]);

  return (
    <div className="page page-fc">
      {deck ? (
        <DeckView deck={deck} onBack={() => setDeckId(null)} onStudy={() => studyDeck(deck.id)} onImport={() => setImporting(deck.id)} />
      ) : (
        <>
          <header className="ag-head fc-head">
            <h1 className="h1 fc-title"><motion.img src={fcIcon} alt="" className="fc-icon" whileHover={{ rotate: -10, scale: 1.08 }} /> Flashcards</h1>
            <div className="btn-row wrap">
              <button className="btn btn-quiet" onClick={() => setImporting('any')}><Icon name="upload" size={17} /> Importar CSV ou JSON</button>
              <button className="btn btn-primary" onClick={() => setNewDeck(true)}><Icon name="plus" size={18} /> Novo baralho</button>
            </div>
          </header>
          {data.cards.length > 0 && (
            <StudyHub
              onNew={() => start({ title: 'Estudar novos', ids: turboPick(data.cards, 'novos', null), kind: 'novos' })}
              onDue={() => start({ title: 'Revisar pendentes', ids: turboPick(data.cards, 'revisoes', null), kind: 'revisoes' })}
              onErrors={() => start({ title: 'Treinar erros', ids: mistakesQueue(data.cards), kind: 'erros' })}
              onTurbo={() => setTurbo(true)}
              onResume={resume}
              studying={!!plan}
            />
          )}
          {!data.decks.length ? (
            <div className="empty-big">
              <h2>Nenhum baralho ainda</h2>
              <p>Importe um CSV ou JSON (frente e verso) ou crie um baralho. Ligue cada baralho a um tema para ele morar na ilha da especialidade.</p>
              <button className="btn btn-primary" onClick={() => setImporting('any')}><Icon name="upload" size={18} /> Importar baralho</button>
            </div>
          ) : (
            <>
              <div className="fc-views seg" role="tablist" aria-label="Como ver os temas">
                <button role="tab" aria-selected={view === 'mapa'} className={view === 'mapa' ? 'is-on' : ''} onClick={() => setView('mapa')}>🏝️ Mapa das Ilhas</button>
                <button role="tab" aria-selected={view === 'temas'} className={view === 'temas' ? 'is-on' : ''} onClick={() => setView('temas')}>🗂️ Meus Temas</button>
              </div>
              <AnimatePresence mode="wait">
                {view === 'temas' ? (
                  <MyTopics key="temas" groups={groups} onStudy={(g, m) => studyDecks(g.decks.map((d) => d.id), m, g.name)} onOpenDeck={setDeckId} />
                ) : island ? (
                  <SpecialtyPage
                    key={island}
                    island={island}
                    groups={groups}
                    onBack={() => setIsland(null)}
                    onStudy={(g, m) => studyDecks(g.decks.map((d) => d.id), m, g.name)}
                    onOpenDeck={setDeckId}
                  />
                ) : (
                  <motion.div key="arq" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.03 }}>
                    <Archipelago groups={groups} onIsland={(i) => { play('page'); setIsland(i); }} />
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </>
      )}
      <ImportModal target={importing} onClose={() => setImporting(null)} onDone={(id) => { setImporting(null); setDeckId(id); }} />
      <DeckForm open={newDeck} onClose={() => setNewDeck(false)} onCreated={(id) => { setNewDeck(false); setDeckId(id); }} />
      <TurboModal open={turbo} onClose={() => setTurbo(false)} onStart={(mode, size) => { setTurbo(false); start({ title: `Turbo · ${TURBO_LABEL[mode]}`, ids: turboPick(data.cards, mode, size), kind: 'turbo' }); }} />
      <AnimatePresence>
        {plan && (
          <Study
            key={plan.key}
            plan={plan}
            onDone={(id) => { const s = loadSession(); if (s && s.plan.title === plan.title) saveSessionLS({ ...s, done: [...new Set([...s.done, id])] }); }}
            onFinish={() => saveSessionLS(null)}
            onMore={() => { setPlan(null); setTurbo(true); }}
            onClose={() => setPlan(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Painel de estudo: três ações + Turbo + meta ───────────────

const TURBO_LABEL: Record<TurboMode, string> = { novos: 'somente novos', revisoes: 'revisões', misto: 'misto' };

/** respostas de hoje (todas as notas contam para a meta) */
const answeredTodayCount = (cards: Flashcard[]) => {
  const t = today();
  return cards.reduce((n, c) => n + (c.log ?? []).filter((r) => toKey(new Date(r.at)) === t).length, 0);
};

function StudyHub({ onNew, onDue, onErrors, onTurbo, onResume, studying }: { onNew: () => void; onDue: () => void; onErrors: () => void; onTurbo: () => void; onResume: () => void; studying: boolean }) {
  const { data, saveSettings } = useStore();
  const goal = data.settings.flashGoal ?? DAILY_GOAL;
  const nNew = countNew(data.cards);
  const nDue = countDue(data.cards);
  const nLate = countOverdue(data.cards);
  const nErr = mistakesQueue(data.cards).length;
  const doneToday = answeredTodayCount(data.cards);
  const pct = Math.min(1, doneToday / Math.max(1, goal));
  const saved = studying ? null : loadSession();
  const left = saved ? saved.plan.ids.filter((x) => !saved.done.includes(x) && data.cards.some((c) => c.id === x)).length : 0;
  const R = 34;
  const C = 2 * Math.PI * R;
  const acts = [
    { id: 'new', n: nNew, title: 'Estudar novos', sub: 'nunca vistos', emoji: '🌱', cls: 'is-new', on: onNew },
    { id: 'due', n: nDue, title: 'Revisar pendentes', sub: nLate ? `${nLate} atrasado${nLate > 1 ? 's' : ''}` : 'para hoje', emoji: '🔁', cls: 'is-due', on: onDue },
    { id: 'err', n: nErr, title: 'Treinar erros', sub: 'que você errou', emoji: '🎯', cls: 'is-err', on: onErrors },
  ];
  return (
    <section className="hub">
      <div className="hub-acts">
        {acts.map((a, i) => (
          <motion.button
            key={a.id}
            className={`hub-act ${a.cls}`}
            disabled={!a.n}
            onClick={a.on}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, type: 'spring', stiffness: 220, damping: 18 }}
            whileHover={a.n ? { y: -6 } : undefined}
            whileTap={a.n ? { scale: 0.96 } : undefined}
          >
            <span className="hub-emoji" aria-hidden="true">{a.emoji}</span>
            <b className="hub-n">{a.n}</b>
            <strong>{a.title}</strong>
            <small>{a.n ? a.sub : 'nada agora ✓'}</small>
            {a.n > 0 && <span className="hub-go">Começar ›</span>}
          </motion.button>
        ))}
        <div className="hub-side">
          <div className={`hub-goal ${doneToday >= goal ? 'is-hit' : ''}`} title="Meta diária: só um incentivo, nunca um limite">
            <svg viewBox="0 0 80 80" aria-hidden="true">
              <circle cx="40" cy="40" r={R} className="hub-ring-bg" />
              <motion.circle cx="40" cy="40" r={R} className="hub-ring-fg" strokeDasharray={C} initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: C * (1 - pct) }} transition={{ duration: 0.9 }} transform="rotate(-90 40 40)" />
            </svg>
            <div>
              <b>{doneToday}<small>/{goal}</small></b>
              <span>{doneToday >= goal ? (doneToday > goal ? `meta + ${doneToday - goal} ✨` : 'meta batida! 🎉') : 'cartões hoje'}</span>
              <span className="hub-goal-ctl">
                <button onClick={() => saveSettings({ flashGoal: Math.max(5, goal - 5) })} aria-label="Diminuir meta">−</button>
                <button onClick={() => saveSettings({ flashGoal: Math.min(500, goal + 5) })} aria-label="Aumentar meta">+</button>
              </span>
            </div>
          </div>
          <motion.button className="hub-turbo" onClick={onTurbo} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
            <span className="turbo-bolt" aria-hidden="true"><svg viewBox="0 0 24 32"><path d="M14 1 L3 18 h8 l-3 13 L21 12 h-8 z" /></svg></span>
            <span><strong>Modo Turbo</strong><small>sessão rápida</small></span>
          </motion.button>
          {left > 0 && saved && (
            <button className="hub-resume" onClick={onResume}>▶ Continuar “{saved.plan.title}” · {left}</button>
          )}
        </div>
      </div>
      <Performance />
    </section>
  );
}

function Performance() {
  const { data } = useStore();
  const now = Date.now();
  const logs = data.cards.flatMap((c) => (c.log ?? []).map((r) => ({ ...r, deckId: c.deckId })));
  const wk = logs.filter((r) => now - new Date(r.at).getTime() < 7 * 86400000);
  const acc = wk.length ? Math.round((wk.filter((r) => r.g >= 2).length / wk.length) * 100) : null;
  const days = new Set(logs.map((r) => toKey(new Date(r.at))));
  let streak = 0;
  for (let d = days.has(today()) ? today() : addDays(today(), -1); days.has(d); d = addDays(d, -1)) streak++;
  const seen = data.cards.filter((c) => !isNewCard(c)).length;
  const total = data.cards.length;
  const minutesToday = data.sessions.filter((s) => s.type === 'flashcards' && s.date === today()).reduce((a, s) => a + (s.minutes ?? 0), 0);
  const per = new Map<string, { n: number; bad: number }>();
  for (const r of logs) {
    if (now - new Date(r.at).getTime() > 14 * 86400000) continue;
    const x = per.get(r.deckId) ?? { n: 0, bad: 0 };
    x.n++;
    if (r.g <= 2) x.bad++;
    per.set(r.deckId, x);
  }
  const worst = [...per.entries()].filter(([, x]) => x.n >= 5).map(([id, x]) => ({ id, rate: x.bad / x.n })).sort((a, b) => b.rate - a.rate).slice(0, 4);
  return (
    <details className="perf-box">
      <summary>📈 Meu desempenho</summary>
      <div className="perf-grid">
        <div><span>Lembrei (7 dias)</span><b>{acc == null ? '—' : `${acc}%`}</b></div>
        <div><span>Dias seguidos</span><b>{streak} 🔥</b></div>
        <div><span>Cartões vistos</span><b>{seen}<small>/{total}</small></b><i style={{ width: `${total ? (seen / total) * 100 : 0}%` }} /></div>
        <div><span>Tempo hoje</span><b>{minutesToday} min</b></div>
      </div>
      {worst.length > 0 && (
        <div className="perf-worst">
          <span>Onde mais erro (14 dias)</span>
          {worst.map((w) => <span key={w.id} className="chip-mini">{data.decks.find((d) => d.id === w.id)?.name ?? 'Baralho'} · {Math.round(w.rate * 100)}%</span>)}
        </div>
      )}
    </details>
  );
}

function TurboModal({ open, onClose, onStart }: { open: boolean; onClose: () => void; onStart: (mode: TurboMode, size: number | null) => void }) {
  const { data } = useStore();
  const [mode, setMode] = useState<TurboMode>('misto');
  const [size, setSize] = useState<number | null>(30);
  const avail = turboPick(data.cards, mode, null).length;
  const modes: { id: TurboMode; t: string; s: string; e: string }[] = [
    { id: 'novos', t: 'Somente novos', s: `${countNew(data.cards)} nunca vistos`, e: '🌱' },
    { id: 'revisoes', t: 'Revisões', s: `${countDue(data.cards)} vencidas`, e: '🔁' },
    { id: 'misto', t: 'Misto', s: 'novos primeiro, depois revisões', e: '🍹' },
  ];
  return (
    <Modal open={open} onClose={onClose} title="⚡ Modo Turbo">
      <div className="turbo-pick">
        <div className="turbo-modes" role="radiogroup" aria-label="Tipo de sessão">
          {modes.map((m) => (
            <button key={m.id} role="radio" aria-checked={mode === m.id} className={`turbo-mode ${mode === m.id ? 'is-on' : ''}`} onClick={() => setMode(m.id)}>
              <span>{m.e}</span>
              <strong>{m.t}</strong>
              <small>{m.s}</small>
            </button>
          ))}
        </div>
        <span className="muted small">Quantos cartões?</span>
        <div className="turbo-sizes" role="radiogroup" aria-label="Tamanho">
          {[15, 30, 50, null].map((n) => (
            <button key={String(n)} role="radio" aria-checked={size === n} className={`chip-mini ${size === n ? 'is-on' : ''}`} onClick={() => setSize(n)}>
              {n ?? `Todos (${avail})`}
            </button>
          ))}
        </div>
        <button className="btn btn-primary btn-lg" disabled={!avail} onClick={() => onStart(mode, size)}>
          ⚡ Começar · {size ? Math.min(size, avail) : avail} cartões
        </button>
        {!avail && <p className="muted small">Nada nesta categoria agora. Tente outra. 🌿</p>}
      </div>
    </Modal>
  );
}

// ── Meus Temas: todos os temas juntos, em ordem de estudo ─────

type TSort = 'primeiro-antigo' | 'primeiro-novo' | 'ultimo' | 'proxima';
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function MyTopics({ groups, onStudy, onOpenDeck }: { groups: TopicGroup[]; onStudy: (g: TopicGroup, m: StudyMode) => void; onOpenDeck: (id: string) => void }) {
  const [sort, setSortS] = useState<TSort>(() => {
    try {
      return (localStorage.getItem('yasr1-fc-tsort') as TSort) || 'primeiro-antigo';
    } catch {
      return 'primeiro-antigo';
    }
  });
  const setSort = (v: TSort) => {
    setSortS(v);
    try {
      localStorage.setItem('yasr1-fc-tsort', v);
    } catch {
      /* ignore */
    }
  };
  const [spec, setSpec] = useState<string>('todas');
  const [prog, setProg] = useState<'todos' | 'nao' | 'andamento' | 'completo'>('todos');
  const [status, setStatus] = useState<'todos' | 'revisar' | 'erros' | 'novos' | 'emdia'>('todos');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const dateOf = (g: TopicGroup) => (sort === 'ultimo' ? g.lastStudied : sort === 'proxima' ? g.nextReview : g.firstStudied);
  const shown = groups
    .filter((g) => spec === 'todas' || g.island === spec)
    .filter((g) => (prog === 'nao' ? g.studied === 0 : prog === 'andamento' ? g.studied > 0 && g.fresh > 0 : prog === 'completo' ? g.total > 0 && g.fresh === 0 : true))
    .filter((g) => (status === 'revisar' ? g.due - g.learning > 0 : status === 'erros' ? g.learning > 0 : status === 'novos' ? g.fresh > 0 : status === 'emdia' ? g.due + g.fresh === 0 : true))
    .filter((g) => !q.trim() || norm(g.name).includes(norm(q.trim())))
    .sort((a, b) => {
      const da = dateOf(a);
      const db = dateOf(b);
      if (!da && !db) return a.name.localeCompare(b.name, 'pt-BR');
      if (!da) return 1;
      if (!db) return -1;
      return sort === 'primeiro-novo' || sort === 'ultimo' ? db.localeCompare(da) : da.localeCompare(db);
    });
  // separadores por mês (ou "ainda não estudados")
  const blocks: { label: string; list: TopicGroup[] }[] = [];
  for (const g of shown) {
    const d = dateOf(g);
    const label = d ? `${MESES[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}` : sort === 'proxima' ? 'Sem revisão marcada' : 'Ainda não estudados';
    const last = blocks.at(-1);
    if (last && last.label === label) last.list.push(g);
    else blocks.push({ label, list: [g] });
  }
  const g = groups.find((x) => x.key === sel) ?? null;
  const sub = (x: TopicGroup) => {
    const d = dateOf(x);
    if (!d) return null;
    return sort === 'proxima' ? `revisão ${relDay(d)}` : sort === 'ultimo' ? `último estudo ${relDay(d)}` : `1º estudo ${d.slice(8, 10)}/${d.slice(5, 7)}`;
  };
  let idx = 0;
  return (
    <motion.section className="mytopics" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <div className="mt-tools">
        <label className="spec-search"><Icon name="search" size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar tema" aria-label="Buscar tema" /></label>
        <select value={sort} onChange={(e) => setSort(e.target.value as TSort)} aria-label="Ordenar">
          <option value="primeiro-antigo">1º estudo · mais antigos</option>
          <option value="primeiro-novo">1º estudo · mais recentes</option>
          <option value="ultimo">Último estudo</option>
          <option value="proxima">Próxima revisão</option>
        </select>
        <select value={spec} onChange={(e) => setSpec(e.target.value)} aria-label="Especialidade">
          <option value="todas">Todas as especialidades</option>
          {ISLANDS.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
        <select value={prog} onChange={(e) => setProg(e.target.value as typeof prog)} aria-label="Progresso">
          <option value="todos">Qualquer progresso</option><option value="nao">Não iniciados</option><option value="andamento">Em andamento</option><option value="completo">Todos vistos</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Revisão">
          <option value="todos">Qualquer situação</option><option value="revisar">Para revisar</option><option value="erros">Com erros</option><option value="novos">Com novos</option><option value="emdia">Em dia</option>
        </select>
      </div>
      {!shown.length && <p className="muted">Nenhum tema com esses filtros.</p>}
      {blocks.map((b) => (
        <div key={b.label} className="mt-block">
          <h3 className="mt-month"><span>{b.label}</span><small>{b.list.length} tema{b.list.length > 1 ? 's' : ''}</small></h3>
          <div className="tokens">
            {b.list.map((x) => {
              const area = x.topic?.area ?? x.decks[0]?.area ?? 'geral';
              return <Token key={x.key} i={idx++} name={x.name} sub={sub(x)} area={area} on={sel === x.key} counts={{ fresh: x.fresh, due: x.due, learning: x.learning, total: x.total, ready: x.due + x.fresh }} onStudy={() => setSel(sel === x.key ? null : x.key)} onOpen={() => onOpenDeck(x.decks[0].id)} />;
            })}
          </div>
        </div>
      ))}
      <AnimatePresence>{g && <StudySheet key={g.key} g={g} onClose={() => setSel(null)} onStudy={onStudy} onOpenDeck={onOpenDeck} />}</AnimatePresence>
    </motion.section>
  );
}

function Token({ i, name, sub, area, counts, on, onStudy, onOpen }: {
  i: number; name: string; sub: string | null; area: Area; on: boolean; counts: { fresh: number; due: number; learning: number; total: number; ready: number }; onStudy: () => void; onOpen: () => void;
}) {
  const a = areaOf(area);
  const ref = useRef<HTMLDivElement>(null);
  const ready = counts.ready > 0;
  // inclina a ficha na direção do mouse (efeito 3D leve)
  const tilt = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--rx', `${((e.clientY - r.top) / r.height - 0.5) * -16}deg`);
    el.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * 18}deg`);
  };
  const reset = () => {
    ref.current?.style.setProperty('--rx', '0deg');
    ref.current?.style.setProperty('--ry', '0deg');
  };
  return (
    <motion.div
      className={`token-wrap ${ready ? 'is-ready' : 'is-done'} ${on ? 'is-sel' : ''}`}
      style={{ ['--c' as string]: a.color, ['--i' as string]: a.ink, ['--d' as string]: `${(i % 5) * -1.1}s`, ['--dur' as string]: `${5.5 + (i % 4) * 0.7}s` }}
      initial={{ opacity: 0, scale: 0.6, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: Math.min(i, 14) * 0.04, type: 'spring', stiffness: 260, damping: 16 }}
    >
      <div className="token-float">
        <div className="token" ref={ref} onMouseMove={tilt} onMouseLeave={reset}>
          <button className="token-face" onClick={onStudy} aria-label={`${name}: ${ready ? `${counts.ready} cartões para estudar` : 'tudo em dia'}`}>
            <span className="token-rim" aria-hidden="true" />
            <span className="token-icon" aria-hidden="true"><StationIcon area={area} /></span>
            <span className="token-count">{ready ? counts.ready : '✓'}</span>
          </button>
          <button className="token-edit" onClick={onOpen} aria-label={`Ver cartões de ${name}`} title="Ver e editar cartões"><Icon name="edit" size={13} /></button>
        </div>
        <span className="token-shadow" aria-hidden="true" />
      </div>
      <strong className="token-name">{name}</strong>
      <span className="token-sub">
        {ready ? (
          <span className="token-counts">
            {counts.fresh > 0 && <b className="c-new-t" title="novos">{counts.fresh}</b>}
            {counts.due - counts.learning > 0 && <b className="c-rev-t" title="para revisar">{counts.due - counts.learning}</b>}
            {counts.learning > 0 && <b className="c-err-t" title="errados">{counts.learning}</b>}
          </span>
        ) : `${counts.total} cartões · em dia`}
      </span>
      {sub && <span className="token-date">{sub}</span>}
    </motion.div>
  );
}

// ── Baralho ───────────────────────────────────────────────────

function DeckView({ deck, onBack, onStudy, onImport }: { deck: Deck; onBack: () => void; onStudy: () => void; onImport: () => void }) {
  const { data, saveDeck, deleteDeck, saveCard, deleteCard } = useStore();
  const [q, setQ] = useState('');
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [limit, setLimit] = useState(60);
  const frontRef = useRef<HTMLTextAreaElement>(null);
  const cards = data.cards.filter((c) => c.deckId === deck.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const shown = cards.filter((c) => !q || (c.front + ' ' + c.back).toLowerCase().includes(q.toLowerCase()));
  const c = deckCounts(deck, data.cards);
  const a = areaOf(deck.area);

  return (
    <>
      <header className="deck-head" style={{ ['--c' as string]: a.color, ['--i' as string]: a.ink }}>
        <button className="btn btn-quiet btn-sm" onClick={onBack}><Icon name="chevronL" size={16} /> Baralhos</button>
        <div className="deck-head-main">
          <LazyInput id="deck-name" className="title-input" value={deck.name} ariaLabel="Nome do baralho" onCommit={(v) => v.trim() && saveDeck({ ...deck, name: v.trim() })} />
          <div className="deck-meta">
            <select id="deck-area" value={deck.area} onChange={(e) => saveDeck({ ...deck, area: e.target.value as Area })} aria-label="Grande área">
              {AREAS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
            </select>
            <select id="deck-topic" value={deck.topicId ?? ''} onChange={(e) => saveDeck({ ...deck, topicId: e.target.value || null })} aria-label="Tema">
              <option value="">Sem tema ligado</option>
              {[...data.topics].sort((x, y) => x.name.localeCompare(y.name, 'pt-BR')).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>
        <div className="btn-row wrap">
          <button className="btn btn-quiet btn-sm" onClick={onImport}><Icon name="upload" size={15} /> Importar mais</button>
          <button className="btn btn-primary" disabled={!c.ready} onClick={onStudy}>Estudar {c.ready ? `(${c.ready})` : ''}</button>
        </div>
      </header>
      {!deck.topicId && <p className="field-hint">Ligue o baralho a um tema para que as revisões entrem no registro de estudos e no jardim.</p>}

      <section className="card add-card">
        <form
          className="add-card-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!front.trim() || !back.trim()) return;
            saveCard({ id: uid(), deckId: deck.id, front: front.trim(), back: back.trim(), tags: [], fsrs: newCardState(), createdAt: new Date().toISOString() });
            setFront('');
            setBack('');
            play('pop');
            frontRef.current?.focus();
          }}
        >
          <Field label="Frente"><textarea ref={frontRef} id="nc-front" rows={2} value={front} onChange={(e) => setFront(e.target.value)} /></Field>
          <Field label="Verso"><textarea id="nc-back" rows={2} value={back} onChange={(e) => setBack(e.target.value)} /></Field>
          <button type="submit" className="btn btn-secondary" disabled={!front.trim() || !back.trim()}><Icon name="plus" size={16} /> Adicionar cartão</button>
        </form>
      </section>

      <section className="card">
        <div className="table-head">
          <h2 className="card-title">{cards.length} cartões · {c.fresh} novos · {c.due} para revisar</h2>
          <input id="fc-q" className="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar nos cartões" aria-label="Buscar nos cartões" />
        </div>
        {shown.length === 0 ? (
          <p className="muted">{cards.length ? 'Nenhum cartão com essa busca.' : 'Nenhum cartão ainda.'}</p>
        ) : (
          <ul className="card-list">
            {shown.slice(0, limit).map((fc) => (
              <li key={fc.id} className="card-row">
                <LazyInput id={`f-${fc.id}`} value={fc.front} ariaLabel="Frente" onCommit={(v) => v.trim() && saveCard({ ...fc, front: v.trim() })} />
                <LazyInput id={`b-${fc.id}`} value={fc.back} ariaLabel="Verso" onCommit={(v) => v.trim() && saveCard({ ...fc, back: v.trim() })} />
                <span className="card-due">{fc.fsrs.phase === 'new' ? 'novo' : relDay(toKey(new Date(fc.fsrs.due)))}</span>
                <ConfirmButton className="icon-btn icon-btn-sm" label={<Icon name="trash" size={15} />} question="Apagar?" confirmLabel="Apagar" onConfirm={() => deleteCard(fc.id)} />
              </li>
            ))}
          </ul>
        )}
        {shown.length > limit && <button className="btn btn-quiet" onClick={() => setLimit(limit + 60)}>Mostrar mais</button>}
      </section>

      <div className="danger-row">
        <ConfirmButton label={<><Icon name="trash" size={16} /> Excluir baralho</>} question={`Excluir o baralho e os ${cards.length} cartões?`} confirmLabel="Excluir" onConfirm={() => { deleteDeck(deck.id); onBack(); }} />
      </div>
    </>
  );
}

// ── Novo baralho ──────────────────────────────────────────────

function DeckForm({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const { data, saveDeck } = useStore();
  const [name, setName] = useState('');
  const [area, setArea] = useState<Area>('clinica');
  const [topicId, setTopicId] = useState('');
  useEffect(() => {
    if (open) { setName(''); setArea('clinica'); setTopicId(''); }
  }, [open]);
  return (
    <Modal open={open} onClose={onClose} title="Novo baralho">
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          const id = uid();
          saveDeck({ id, name: name.trim(), area, topicId: topicId || null, createdAt: new Date().toISOString() });
          onCreated(id);
        }}
      >
        <DeckFields name={name} setName={setName} area={area} setArea={setArea} topicId={topicId} setTopicId={(t) => {
          setTopicId(t);
          const tp = data.topics.find((x) => x.id === t);
          if (tp) { setArea(tp.area); if (!name) setName(tp.name); }
        }} />
        <div className="register-actions">
          <button type="button" className="btn btn-quiet" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={!name.trim()}>Criar</button>
        </div>
      </form>
    </Modal>
  );
}

function DeckFields({ name, setName, area, setArea, topicId, setTopicId }: {
  name: string; setName: (v: string) => void; area: Area; setArea: (a: Area) => void; topicId: string; setTopicId: (v: string) => void;
}) {
  const { data } = useStore();
  return (
    <div className="register-grid">
      <Field label="Tema da trilha (opcional)">
        <select id="df-topic" value={topicId} onChange={(e) => setTopicId(e.target.value)}>
          <option value="">Sem tema</option>
          {[...data.topics].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </Field>
      <Field label="Nome do baralho">
        <input id="df-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>
      <Field label="Grande área">
        <select id="df-area" value={area} onChange={(e) => setArea(e.target.value as Area)}>
          {AREAS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
        </select>
      </Field>
    </div>
  );
}

// ── Importação ────────────────────────────────────────────────

function ImportModal({ target, onClose, onDone }: { target: string | 'any' | null; onClose: () => void; onDone: (deckId: string) => void }) {
  const { data, saveDeck, saveCard } = useStore();
  const ui = useUI();
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [deckChoice, setDeckChoice] = useState<string>('new');
  const [name, setName] = useState('');
  const [area, setArea] = useState<Area>('clinica');
  const [topicId, setTopicId] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!target) return;
    setText('');
    setFileName('');
    setDeckChoice(target === 'any' ? 'new' : target);
    setName('');
    setTopicId('');
  }, [target]);

  const parsed = useMemo(() => (text.trim() ? parseAny(text, fileName) : null), [text, fileName]);
  useEffect(() => {
    if (parsed?.deckName && !name) setName(parsed.deckName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed?.deckName]);

  const doImport = () => {
    if (!parsed || parsed.error || !parsed.cards.length) return;
    let deckId = deckChoice;
    if (deckChoice === 'new') {
      deckId = uid();
      saveDeck({ id: deckId, name: name.trim() || fileName.replace(/\.(csv|json|txt|tsv)$/i, '') || 'Baralho importado', area, topicId: topicId || null, createdAt: new Date().toISOString() });
    }
    const existing = new Set(data.cards.filter((c) => c.deckId === deckId).map((c) => c.front.trim().toLowerCase()));
    let added = 0;
    const base = Date.now();
    parsed.cards.forEach((rc: RawCard, i) => {
      if (existing.has(rc.front.trim().toLowerCase())) return;
      saveCard({ id: uid(), deckId, front: rc.front, back: rc.back, tags: rc.tags, fsrs: newCardState(), createdAt: new Date(base + i).toISOString() });
      added++;
    });
    const skipped = parsed.cards.length - added;
    ui.toast(`${added} cartões importados${skipped ? ` (${skipped} repetidos ignorados)` : ''}.`);
    onDone(deckId);
  };

  return (
    <Modal open={!!target} onClose={onClose} title="Importar cartões" wide>
      <div className="form">
        <div className="import-drop">
          <button type="button" className="btn btn-secondary" onClick={() => fileRef.current?.click()}><Icon name="upload" size={17} /> Escolher arquivo</button>
          <span className="muted">{fileName || 'CSV, TSV ou JSON'}</span>
          <input
            ref={fileRef}
            id="import-cards-file"
            type="file"
            accept=".csv,.tsv,.txt,.json,text/csv,application/json,text/plain"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              setFileName(f.name);
              setText(await f.text());
            }}
          />
        </div>
        <Field label="Ou cole aqui" hint="CSV: uma linha por cartão, frente e verso separados por vírgula, ponto e vírgula ou tab. JSON: lista de objetos com frente/verso (ou front/back, pergunta/resposta).">
          <textarea id="import-text" rows={6} value={text} onChange={(e) => { setText(e.target.value); setFileName(''); }} placeholder={'frente;verso\nQual o tratamento inicial da cetoacidose?;Hidratação com SF 0,9%...'} />
        </Field>
        {parsed && (
          parsed.error ? (
            <p className="form-error">{parsed.error}</p>
          ) : (
            <div className="import-preview">
              <strong>{parsed.cards.length} cartões encontrados</strong>
              {parsed.cards.slice(0, 3).map((c, i) => (
                <div key={i} className="ip-row"><span>{c.front}</span><span className="muted">{c.back}</span></div>
              ))}
            </div>
          )
        )}
        <Field label="Colocar em">
          <select id="import-deck" value={deckChoice} onChange={(e) => setDeckChoice(e.target.value)}>
            <option value="new">Baralho novo</option>
            {data.decks.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
        {deckChoice === 'new' && (
          <DeckFields name={name} setName={setName} area={area} setArea={setArea} topicId={topicId} setTopicId={(t) => {
            setTopicId(t);
            const tp = data.topics.find((x) => x.id === t);
            if (tp) { setArea(tp.area); if (!name) setName(tp.name); }
          }} />
        )}
        <div className="register-actions">
          <button type="button" className="btn btn-quiet" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn btn-primary" disabled={!parsed || !!parsed.error} onClick={doImport}>
            Importar {parsed && !parsed.error ? parsed.cards.length : ''} cartões
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Sessão de estudo ──────────────────────────────────────────

export interface StudyPlan {
  key: string;
  title: string;
  ids: string[]; // fila fixada no início; o que não for respondido continua pendente
  kind: 'deck' | 'turbo' | 'erros' | 'dia' | 'novos' | 'revisoes';
}

function Study({ plan, onClose, onDone, onFinish, onMore }: { plan: StudyPlan; onClose: () => void; onDone: (cardId: string) => void; onFinish: () => void; onMore: () => void }) {
  const { data, saveCard, saveSession, snapshot } = useStore();
  const ui = useUI();
  const [queue, setQueue] = useState<string[]>(plan.ids);
  const [total] = useState(plan.ids.length);
  const [flipped, setFlipped] = useState(false);
  const [revealed, setRevealed] = useState(false); // já viu a resposta: dá para desvirar e ainda responder
  // respostas da sessão (para voltar, trocar a nota e registrar por tema)
  const [history, setHistory] = useState<{ id: string; prev: CardState; rating: Rating; at: string }[]>([]);
  const [back, setBack] = useState(0); // 0 = cartão atual; 1 = o último respondido; …
  // tempo ativo: só conta com a tela visível e sem longas pausas paradas
  const active = useRef({ ms: 0, last: Date.now(), hidden: false });
  // respostas de hoje (para comemorar a meta diária: passar dela é bônus, nunca proibido)
  const goalSeen = useRef<{ base: number; goal: number; n: number } | null>(null);
  if (!goalSeen.current) goalSeen.current = { base: answeredTodayCount(snapshot().cards), goal: snapshot().settings.flashGoal ?? DAILY_GOAL, n: 0 };
  const tick = () => {
    const a = active.current;
    const now = Date.now();
    if (!a.hidden) a.ms += Math.min(now - a.last, IDLE_CAP_MS);
    a.last = now;
  };
  useEffect(() => {
    const onVis = () => {
      tick();
      active.current.hidden = document.visibilityState === 'hidden';
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);
  const logged = useRef(new Map<string, { id: string; createdAt: string }>()); // tema → registro desta sessão
  const past = back > 0 ? history[history.length - back] : null;
  const card = data.cards.find((c) => c.id === (past ? past.id : queue[0]));
  const finished = !past && !data.cards.some((c) => c.id === queue[0]);
  // um cartão revisto só pode mudar de nota se não foi respondido de novo depois
  const canChange = !!past && !history.slice(history.length - back + 1).some((h) => h.id === past.id);
  const reviewed = history.length;
  const ok = history.filter((h) => h.rating >= 2).length;
  const again = reviewed - ok;

  /** um registro de flashcards por tema (sessões mistas viram vários), atualizado se algo mudar */
  const logSession = () => {
    if (!history.length) return;
    const deckOf = new Map(snapshot().cards.map((c) => [c.id, c.deckId]));
    const topicOf = new Map(snapshot().decks.map((d) => [d.id, d.topicId]));
    const per = new Map<string, { n: number; ok: number; decks: Set<string> }>();
    for (const h of history) {
      const deckId = deckOf.get(h.id);
      const topic = deckId ? topicOf.get(deckId) : null;
      if (!topic) continue;
      const x = per.get(topic) ?? { n: 0, ok: 0, decks: new Set<string>() };
      x.n++;
      x.ok += h.rating >= 2 ? 1 : 0;
      x.decks.add(deckId!);
      per.set(topic, x);
    }
    tick();
    const minutes = isFocusActive() ? null : Math.max(1, Math.round(active.current.ms / 60000));
    for (const [topicId, x] of per) {
      const ref = logged.current.get(topicId) ?? { id: uid(), createdAt: new Date().toISOString() };
      logged.current.set(topicId, ref);
      const names = [...x.decks].map((id) => snapshot().decks.find((d) => d.id === id)?.name).filter(Boolean).join(', ');
      saveSession({
        id: ref.id, date: today(), topicId, missionId: null, activityId: null, type: 'flashcards',
        minutes: minutes == null ? null : Math.max(1, Math.round((minutes * x.n) / history.length)), questions: x.n, correct: x.ok,
        errorTopics: [], notes: `${plan.kind === 'turbo' ? 'Turbo' : plan.kind === 'erros' ? 'Revisar meus erros' : plan.kind === 'novos' ? 'Novos' : plan.kind === 'revisoes' ? 'Revisões' : 'Baralho'}: ${names}`, createdAt: ref.createdAt,
      });
    }
  };
  // salva também se o app for para segundo plano ou fechar no meio (antes, só ao terminar ou no X)
  const logRef = useRef(logSession);
  logRef.current = logSession;
  useEffect(() => {
    const save = () => logRef.current();
    const onVis = () => document.visibilityState === 'hidden' && save();
    window.addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('pagehide', save);
      document.removeEventListener('visibilitychange', onVis);
      save();
    };
  }, []);
  useEffect(() => {
    if (finished) {
      onFinish();
      logSession();
      if (reviewed) play('mission');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  const flip = () => {
    if (!card) return;
    tick();
    setFlipped((f) => !f);
    setRevealed(true);
    play('flip');
  };
  const go = (n: number) => {
    tick();
    const b2 = Math.max(0, Math.min(history.length, n));
    if (b2 === back) return;
    setBack(b2);
    setFlipped(false);
    setRevealed(b2 > 0);
    play('page');
  };
  const close = () => {
    logSession();
    onClose();
  };

  const answer = (g: Rating) => {
    if (!card || !revealed) return;
    tick();
    if (past) {
      if (!canChange || g === past.rating) return go(back - 1);
      // troca a nota: recalcula a partir do estado de antes e corrige a resposta no histórico do cartão
      saveCard({ ...card, fsrs: schedule(past.prev, g), log: (card.log ?? []).map((r) => (r.at === past.at ? { ...r, g } : r)) });
      setQueue((q) => {
        if (past.rating === 1 && g !== 1) {
          const i = q.lastIndexOf(past.id);
          return i > 0 ? [...q.slice(0, i), ...q.slice(i + 1)] : q;
        }
        if (past.rating !== 1 && g === 1) return [...q, past.id];
        return q;
      });
      setHistory((h) => h.map((x, i) => (i === h.length - back ? { ...x, rating: g } : x)));
      play(g === 1 ? 'uncheck' : 'check');
      return go(back - 1);
    }
    const at = new Date().toISOString();
    if (goalSeen.current) {
      const gs = goalSeen.current;
      gs.n++;
      const total = gs.base + gs.n;
      if (total === gs.goal) {
        ui.toast(`Meta do dia batida: ${gs.goal} cartões! 🎉 Daqui pra frente é bônus.`, 'diva');
        burst({ x: window.innerWidth / 2, y: window.innerHeight / 3 }, 'confete', 22);
      } else if (total > gs.goal && (total - gs.goal) % 15 === 0) {
        ui.toast(`+${total - gs.goal} além da meta! Que dedicação ✨`, 'diva');
        burst({ x: window.innerWidth / 2, y: window.innerHeight / 3 }, 'brilho', 14);
      }
    }
    if (g >= 2) onDone(card.id); // cartão concluído nesta sessão: não volta se ela for retomada
    saveCard({ ...card, fsrs: schedule(card.fsrs, g), log: [...(card.log ?? []), { at, g }].slice(-40) });
    setHistory((h) => [...h, { id: card.id, prev: card.fsrs, rating: g, at }]);
    setQueue((q) => (g === 1 ? [...q.slice(1), q[0]] : q.slice(1)));
    setFlipped(false);
    setRevealed(false);
    play(g === 1 ? 'uncheck' : 'check');
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); }
      else if (e.key === 'ArrowLeft') go(back + 1);
      else if (e.key === 'ArrowRight') go(back - 1);
      else if (['1', '2', '3', '4'].includes(e.key)) answer(Number(e.key) as Rating);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  const done = total - queue.length;
  const left = queue.filter((id, i) => queue.indexOf(id) === i).length;
  const deckName = card ? data.decks.find((d) => d.id === card.deckId)?.name : null;
  return (
    <motion.div className={`study study-${plan.kind}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-label={`Estudar ${plan.title}`}>
      <div className="study-top">
        <span className="study-title">{plan.kind === 'turbo' && <span className="study-bolt" aria-hidden="true">⚡</span>}{plan.title}</span>
        <span className="study-bar"><span style={{ width: `${total ? (done / total) * 100 : 100}%` }} /></span>
        <span className="muted mono">{Math.min(done, total)}/{total}</span>
        <button className="icon-btn" onClick={close} aria-label="Sair"><Icon name="close" /></button>
      </div>

      {finished ? (
        <motion.div className="study-end" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <h2 className="h1">{plan.kind === 'turbo' ? 'Turbo feito! ⚡' : 'Sessão feita! 🎉'}</h2>
          <p>{reviewed} respostas · {ok} lembradas{again ? ` · ${again} para rever` : ''}</p>
          <p className="muted">Os cartões respondidos entraram no registro de estudos de cada tema.</p>
          <div className="btn-row">
            {history.length > 0 && <button className="btn btn-quiet btn-lg" onClick={() => go(1)}><Icon name="chevronL" size={18} /> Rever cartões</button>}
            <button className="btn btn-secondary btn-lg" onClick={() => { logSession(); onMore(); }}>⚡ Continuar estudando</button>
            <button className="btn btn-primary btn-lg" onClick={() => { ui.toast('Até a próxima rodada!', 'diva'); onClose(); }}>Fechar</button>
          </div>
        </motion.div>
      ) : card ? (
        <>
          <div className="study-nav">
            <button className="icon-btn" onClick={() => go(back + 1)} disabled={back >= history.length} aria-label="Cartão anterior" title="Cartão anterior (←)"><Icon name="chevronL" /></button>
            <span className={`study-where ${past ? 'is-past' : ''}`}>
              {past ? `Revendo ${back === 1 ? 'o último cartão' : `${back} cartões atrás`}` : `${left} ${left === 1 ? 'cartão restante' : 'cartões restantes'}`}
            </span>
            <button className="icon-btn" onClick={() => go(back - 1)} disabled={back === 0} aria-label="Próximo cartão" title="Voltar para frente (→)"><Icon name="chevronR" /></button>
          </div>
          <div className="flip-stage" onClick={flip} role="button" aria-label={flipped ? 'Ver a pergunta' : 'Ver a resposta'}>
            <motion.div className="flip" animate={{ rotateY: flipped ? 180 : 0 }} transition={{ type: 'spring', stiffness: 220, damping: 22 }}>
              <div className="flip-face flip-front">
                <span className="flip-tag">Frente{plan.kind !== 'deck' && deckName ? ` · ${deckName}` : ''}</span>
                <p>{card.front}</p>
                <span className="flip-hint">{revealed ? 'Clique para ver a resposta de novo' : 'Clique ou aperte espaço para virar'}</span>
              </div>
              <div className="flip-face flip-back">
                <span className="flip-tag">Verso</span>
                <p>{card.back}</p>
                <span className="flip-hint">Clique para ver a pergunta</span>
              </div>
            </motion.div>
          </div>
          {past ? (
            <p className="study-past-note muted small">
              {canChange ? 'Você respondeu com a nota marcada. Escolha outra para trocar, ou toque na seta › para seguir.' : 'Este cartão foi respondido de novo depois; aqui é só para rever.'}
            </p>
          ) : (
            <p className="study-past-note muted small">{revealed ? 'Como foi?' : 'Pense na resposta e vire o cartão.'} Se parar no meio, o resto fica guardado para depois.</p>
          )}
          <div className={`ratings ${revealed ? 'is-on' : ''}`}>
            {([1, 2, 3, 4] as Rating[]).map((g) => (
              <button
                key={g}
                className={`rate rate-${g} ${past?.rating === g ? 'is-chosen' : ''}`}
                disabled={!revealed || (!!past && !canChange)}
                onClick={() => answer(g)}
              >
                <span className="rate-l">{RATING_LABEL[g]}</span>
                <span className="rate-t">{previewLabel(past ? past.prev : card.fsrs, g)}</span>
                <span className="rate-k" aria-hidden="true">{g}</span>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </motion.div>
  );
}
