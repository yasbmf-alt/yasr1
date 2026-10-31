import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../data/store';
import { Modal, Field, ConfirmButton, LazyInput, useUI } from '../components/ui';
import { Icon } from '../components/Icon';
import { AREAS, areaOf, type Area, type Deck, type Flashcard } from '../types';
import { newCardState, previewLabel, RATING_LABEL, schedule, type Rating } from '../logic/fsrs';
import { deckCounts, deckQueue, mistakesQueue, TURBO_SIZE, turboQueue } from '../logic/flashQueue';
import { StationIcon } from '../assets/art';
import type { CardState } from '../types';
import { parseAny, type RawCard } from '../logic/cardImport';
import { addDays, relDay, today, toKey, uid } from '../logic/dates';
import { catchUpDays, dayPlan, isLearning, topicWeights } from '../logic/dailyPlan';
import { play } from '../logic/sound';
import { isActive as isFocusActive } from '../components/focus';

// mais que isso parado num cartão (app esquecido aberto) não conta como estudo
const IDLE_CAP_MS = 3 * 60000;
// novos extras ao abrir um baralho depois do limite do dia
const EXTRA_NEW = 20;

export function Flashcards() {
  const { data } = useStore();
  const [deckId, setDeckId] = useState<string | null>(null);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [importing, setImporting] = useState<string | 'any' | null>(null);
  const [newDeck, setNewDeck] = useState(false);
  const deck = data.decks.find((d) => d.id === deckId) ?? null;
  const ui = useUI();
  const studyDeck = (id: string, mode: StudyMode = 'tudo') => {
    const d = data.decks.find((x) => x.id === id);
    if (!d) return;
    const mine = data.cards.filter((c) => c.deckId === id);
    const queue = deckQueue(id, data.cards);
    const byId = new Map(mine.map((c) => [c.id, c]));
    const p = dayPlan(data);
    const quota = Math.max(0, p.newLimit - p.newToday);
    const newIds = queue.filter((x) => byId.get(x)?.fsrs.phase === 'new');
    // novos: o que cabe no limite do dia; se já acabou, até 20 como extra (abrir o baralho é escolha sua)
    const pickNew = () => {
      if (quota > 0) return newIds.slice(0, quota);
      const extra = newIds.slice(0, EXTRA_NEW);
      if (extra.length) ui.toast(`O limite de novos de hoje já foi atingido. Estes ${extra.length} entram como extra, fora do plano.`);
      return extra;
    };
    let ids: string[];
    if (mode === 'novos') ids = pickNew();
    else if (mode === 'revisar') ids = queue.filter((x) => byId.get(x)?.fsrs.phase !== 'new');
    else if (mode === 'errados') ids = queue.filter((x) => { const c = byId.get(x); return !!c && isLearning(c); });
    else if (mode === 'baralho') ids = mine.filter((c) => c.fsrs.phase !== 'new').sort((a, b) => a.fsrs.due.localeCompare(b.fsrs.due)).map((c) => c.id);
    else {
      let left = quota;
      ids = queue.filter((x) => byId.get(x)?.fsrs.phase !== 'new' || left-- > 0);
      if (!ids.length) ids = pickNew();
    }
    if (!ids.length) return setDeckId(id); // nada para estudar: mostra os cartões do baralho
    const label = mode === 'novos' ? ' · novos' : mode === 'revisar' ? ' · revisar' : mode === 'errados' ? ' · errados' : mode === 'baralho' ? ' · baralho inteiro' : '';
    setPlan({ key: `${id}-${Date.now()}`, title: d.name + label, ids, kind: 'deck' });
  };
  useEffect(() => {
    if (!ui.pendingStudy) return;
    if (ui.pendingStudy === '__erros__') {
      const ids = mistakesQueue(data.cards);
      if (ids.length) setPlan({ key: `erros-${Date.now()}`, title: 'Revisar meus erros', ids, kind: 'erros' });
    } else studyDeck(ui.pendingStudy);
    ui.clearPendingStudy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ui.pendingStudy]);

  return (
    <div className="page page-fc">
      {deck ? (
        <DeckView deck={deck} onBack={() => setDeckId(null)} onStudy={() => studyDeck(deck.id)} onImport={() => setImporting(deck.id)} />
      ) : (
        <>
          <header className="ag-head">
            <h1 className="h1">Flashcards</h1>
            <div className="btn-row wrap">
              <button className="btn btn-quiet" onClick={() => setImporting('any')}><Icon name="upload" size={17} /> Importar CSV ou JSON</button>
              <button className="btn btn-primary" onClick={() => setNewDeck(true)}><Icon name="plus" size={18} /> Novo baralho</button>
            </div>
          </header>
          <div className={data.cards.length ? 'fc-layout' : ''}>
            <div className="fc-main">
              <DayPlanCard onStart={(ids, title) => setPlan({ key: `dia-${Date.now()}`, title, ids, kind: 'dia' })} />
              <FlashHub
                onTurbo={() => { const ids = turboQueue(data.cards); if (ids.length) setPlan({ key: `turbo-${Date.now()}`, title: 'Turbo', ids, kind: 'turbo' }); }}
                onMistakes={() => { const ids = mistakesQueue(data.cards); if (ids.length) setPlan({ key: `erros-${Date.now()}`, title: 'Revisar meus erros', ids, kind: 'erros' }); }}
              />
              {data.cards.length > 0 && (
                <p className="fc-legend">
                  <span><i className="c-new" /> novos</span>
                  <span><i className="c-rev" /> para revisar</span>
                  <span><i className="c-err" /> errados / aprendendo</span>
                </p>
              )}
              <TokenField onOpen={setDeckId} onStudy={studyDeck} onImport={() => setImporting('any')} />
            </div>
            {data.cards.length > 0 && <FlashSide />}
          </div>
        </>
      )}
      <ImportModal target={importing} onClose={() => setImporting(null)} onDone={(id) => { setImporting(null); setDeckId(id); }} />
      <DeckForm open={newDeck} onClose={() => setNewDeck(false)} onCreated={(id) => { setNewDeck(false); setDeckId(id); }} />
      <AnimatePresence>{plan && <Study key={plan.key} plan={plan} onClose={() => setPlan(null)} />}</AnimatePresence>
    </div>
  );
}

// ── Meta do dia, Turbo e erros ────────────────────────────────

function FlashHub({ onTurbo, onMistakes }: { onTurbo: () => void; onMistakes: () => void }) {
  const { data } = useStore();
  const turboN = Math.min(TURBO_SIZE, data.cards.filter((c) => c.fsrs.phase !== 'new').length);
  const errN = mistakesQueue(data.cards).length;
  if (!data.cards.length) return null;
  return (
    <section className="fhub">
      <span className="fhub-k">Extras, se sobrar fôlego:</span>
      <motion.button className="turbo" onClick={onTurbo} disabled={!turboN} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} title="30 cartões misturados dos temas que você já estudou, priorizando atrasados, errados e difíceis">
        <span className="turbo-bolt" aria-hidden="true">
          <svg viewBox="0 0 24 32"><path d="M14 1 L3 18 h8 l-3 13 L21 12 h-8 z" /></svg>
        </span>
        <span className="turbo-txt"><strong>Modo Turbo</strong><span>{turboN ? `${turboN} cartões misturados` : 'estude um tema primeiro'}</span></span>
      </motion.button>
      <button className="btn btn-secondary fhub-err" onClick={onMistakes} disabled={!errN}>
        <Icon name="restore" size={16} /> Revisar meus erros{errN ? ` · ${errN}` : ''}
      </button>
    </section>
  );
}

// ── Plano de hoje ─────────────────────────────────────────────

function DayPlanCard({ onStart }: { onStart: (ids: string[], title: string) => void }) {
  const { data } = useStore();
  const p = useMemo(() => dayPlan(data), [data]);
  if (!data.cards.length) return null;
  const extraNew = () => {
    // adiantar: mais 10 novos dos temas mais importantes, fora do plano
    const w = topicWeights(data);
    const deckTopic = new Map(data.decks.map((x) => [x.id, x.topicId]));
    const ids = data.cards
      .filter((c) => c.fsrs.phase === 'new')
      .sort((a, b) => (w.get(deckTopic.get(b.deckId) ?? '') ?? 0) - (w.get(deckTopic.get(a.deckId) ?? '') ?? 0) || a.createdAt.localeCompare(b.createdAt))
      .slice(0, 10)
      .map((c) => c.id);
    if (ids.length) onStart(ids, 'Novos extras');
  };
  const days = catchUpDays(p);
  return (
    <motion.section className={`dplan ${p.doneForToday ? 'is-done' : ''}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      {p.doneForToday ? (
        <div className="dplan-main">
          <span className="dplan-k">Plano de hoje</span>
          <strong className="dplan-big">Feito! 🎉</strong>
          <p>{p.doneToday} cartões hoje. Você está liberada dos flashcards por hoje.</p>
          <div className="btn-row">
            {p.waiting > 0 && <button className="btn btn-quiet btn-sm" onClick={extraNew}>Adiantar 10 novos</button>}
          </div>
        </div>
      ) : (
        <div className="dplan-main">
          <span className="dplan-k">Plano de hoje · cabe em {p.budget} min</span>
          <strong className="dplan-big">
            {p.reviewIds.length > 0 && <span className="c-rev-t">{p.reviewIds.length} revisões</span>}
            {p.reviewIds.length > 0 && p.newIds.length > 0 && ' + '}
            {p.newIds.length > 0 && <span className="c-new-t">{p.newIds.length} novos</span>}
          </strong>
          <p>≈ {Math.max(1, p.estMinutes)} min. Primeiro o que está para vencer, depois os novos dos temas que mais caem errado.</p>
          <button className="btn btn-primary btn-lg" onClick={() => { play('pop'); onStart(p.queue, 'Plano de hoje'); }}>
            {p.doneToday ? 'Continuar o plano de hoje' : 'Começar o plano de hoje'}
          </button>
          <span className="muted small">Pode parar quando quiser: o que faltar fica guardado.</span>
        </div>
      )}
      <ul className="dplan-notes">
        {p.carried > 0 && (
          <li>
            <b className="c-rev-t">{p.carried}</b> revisões atrasadas não cabem hoje e entram nos próximos dias, as mais urgentes primeiro{days > 1 ? ` (zera em uns ${days} dias)` : ''}.
          </li>
        )}
        {p.waiting > 0 && (
          <li>
            <b className="c-new-t">{p.waiting}</b> novos estão na <b>fila de espera</b>: entram até {p.newLimit} por dia, pelos temas mais importantes. Não precisa se preocupar com eles agora.
          </li>
        )}
      </ul>
    </motion.section>
  );
}

// ── Painel lateral ────────────────────────────────────────────

function FlashSide() {
  const { data, saveSettings } = useStore();
  const p = useMemo(() => dayPlan(data), [data]);
  const now = Date.now();
  const logs = data.cards.flatMap((c) => (c.log ?? []).map((r) => ({ ...r, deckId: c.deckId })));
  const wk = logs.filter((r) => now - new Date(r.at).getTime() < 7 * 86400000);
  const acc = wk.length ? Math.round((wk.filter((r) => r.g >= 2).length / wk.length) * 100) : null;
  const days = new Set(logs.map((r) => toKey(new Date(r.at))));
  let streak = 0;
  for (let d = days.has(today()) ? today() : addDays(today(), -1); days.has(d); d = addDays(d, -1)) streak++;
  // baralhos onde mais erro (14 dias)
  const per = new Map<string, { n: number; bad: number }>();
  for (const r of logs) {
    if (now - new Date(r.at).getTime() > 14 * 86400000) continue;
    const x = per.get(r.deckId) ?? { n: 0, bad: 0 };
    x.n++;
    if (r.g <= 2) x.bad++;
    per.set(r.deckId, x);
  }
  const worst = [...per.entries()].filter(([, x]) => x.n >= 5).map(([id, x]) => ({ id, rate: x.bad / x.n, n: x.n })).sort((a, b) => b.rate - a.rate).slice(0, 4);
  const total = p.doneToday + p.queue.length;
  const pct = total ? Math.min(1, p.doneToday / total) : 1;
  const learning = data.cards.filter(isLearning).length;
  const setMin = (v: number) => saveSettings({ flashMinutes: Math.max(10, Math.min(180, v)) });
  const setNew = (v: number) => saveSettings({ flashNewPerDay: Math.max(0, Math.min(80, v)) });
  return (
    <aside className="fside">
      <div className="fside-ring">
        <svg viewBox="0 0 44 44" aria-hidden="true">
          <circle cx="22" cy="22" r="18" className="fhub-ring-bg" />
          <circle cx="22" cy="22" r="18" className="fhub-ring-fg" strokeDasharray={`${pct * 113.1} 113.1`} />
        </svg>
        <div>
          <strong>{p.doneToday}<span className="muted">/{total}</span></strong>
          <span className="muted small">cartões do plano hoje</span>
        </div>
      </div>
      <dl className="fside-stats">
        <div><dt>Tempo hoje</dt><dd>{p.minutesToday}<small>/{p.budget} min</small></dd></div>
        <div><dt>Novos hoje</dt><dd className="c-new-t">{p.newToday}<small>/{p.newLimit}</small></dd></div>
        <div><dt>Lembrei (7 dias)</dt><dd>{acc == null ? '—' : `${acc}%`}</dd></div>
        <div><dt>Dias seguidos</dt><dd>{streak}</dd></div>
        <div><dt>Para revisar</dt><dd className="c-rev-t">{p.reviewsDue}</dd></div>
        <div><dt>Errados</dt><dd className="c-err-t">{learning}</dd></div>
        <div><dt>Fila de espera</dt><dd className="c-new-t">{p.waiting}</dd></div>
      </dl>
      {worst.length > 0 && (
        <div className="fside-worst">
          <span className="fside-h">Onde mais erro (14 dias)</span>
          <ul>
            {worst.map((w) => (
              <li key={w.id}>
                <span>{data.decks.find((d) => d.id === w.id)?.name ?? 'Baralho'}</span>
                <b className={w.rate >= 0.4 ? 'c-err-t' : ''}>{Math.round(w.rate * 100)}%</b>
              </li>
            ))}
          </ul>
          <span className="muted small">% de respostas "De novo" ou "Difícil"</span>
        </div>
      )}
      <div className="fside-cfg">
        <span className="fside-h">Meu ritmo</span>
        <div className="fside-ctl">
          <span>Tempo por dia</span>
          <span className="pn-goal-ctl">
            <button className="icon-btn icon-btn-sm" onClick={() => setMin(p.budget - 5)} aria-label="Menos tempo">−</button>
            <b>{p.budget} min</b>
            <button className="icon-btn icon-btn-sm" onClick={() => setMin(p.budget + 5)} aria-label="Mais tempo">+</button>
          </span>
        </div>
        <div className="fside-ctl">
          <span>Novos por dia</span>
          <span className="pn-goal-ctl">
            <button className="icon-btn icon-btn-sm" onClick={() => setNew(p.newLimit - 1)} aria-label="Menos novos">−</button>
            <b>{p.newLimit}</b>
            <button className="icon-btn icon-btn-sm" onClick={() => setNew(p.newLimit + 1)} aria-label="Mais novos">+</button>
          </span>
        </div>
      </div>
    </aside>
  );
}

// ── Fichas dos temas (flutuando) ──────────────────────────────

function TokenField({ onOpen, onStudy, onImport }: { onOpen: (id: string) => void; onStudy: (id: string, mode: StudyMode) => void; onImport: () => void }) {
  const { data } = useStore();
  const [choose, setChoose] = useState<string | null>(null);
  const decks = [...data.decks].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  if (!decks.length)
    return (
      <div className="empty-big">
        <h2>Nenhum baralho ainda</h2>
        <p>Importe um CSV ou JSON (frente e verso) ou crie um baralho e escreva os cartões. Cada baralho pode ser ligado a um tema da trilha.</p>
        <button className="btn btn-primary" onClick={onImport}><Icon name="upload" size={18} /> Importar baralho</button>
      </div>
    );
  return (
    <div className="tokens">
      {decks.map((d, i) => {
        const topic = d.topicId ? data.topics.find((t) => t.id === d.topicId) : null;
        const area = topic?.area ?? d.area;
        return <Token key={d.id} i={i} name={topic?.name ?? d.name} sub={topic && topic.name !== d.name ? d.name : null} area={area} counts={deckCounts(d, data.cards)} onStudy={() => setChoose(d.id)} onOpen={() => onOpen(d.id)} />;
      })}
      <StudyChooser deckId={choose} onClose={() => setChoose(null)} onPick={(id, m) => { setChoose(null); onStudy(id, m); }} onOpen={(id) => { setChoose(null); onOpen(id); }} />
    </div>
  );
}

type StudyMode = 'tudo' | 'novos' | 'revisar' | 'errados' | 'baralho';

/** escolher o que estudar no baralho: tudo, só novos, só revisões, só errados */
function StudyChooser({ deckId, onClose, onPick, onOpen }: { deckId: string | null; onClose: () => void; onPick: (id: string, m: StudyMode) => void; onOpen: (id: string) => void }) {
  const { data } = useStore();
  const d = deckId ? data.decks.find((x) => x.id === deckId) : null;
  const c = d ? deckCounts(d, data.cards) : null;
  const p = useMemo(() => dayPlan(data), [data]);
  const quota = Math.max(0, p.newLimit - p.newToday);
  const opts: { m: StudyMode; label: string; n: number; cls: string; hint: string }[] = c
    ? [
        { m: 'tudo', label: 'Tudo', n: c.due + Math.min(c.fresh, quota), cls: '', hint: 'revisões vencidas + novos dentro do limite do dia' },
        { m: 'novos', label: 'Só novos', n: c.fresh, cls: 'c-new-t', hint: quota ? `até ${Math.min(quota, c.fresh)} hoje pelo limite` : 'limite do dia atingido: entram como extra' },
        { m: 'revisar', label: 'Só revisões', n: c.due, cls: 'c-rev-t', hint: 'os que venceram, inclusive os que você errou' },
        { m: 'errados', label: 'Só os errados', n: c.learning, cls: 'c-err-t', hint: 'os que você marcou "De novo" e ainda estão aprendendo' },
        { m: 'baralho', label: 'Rever o baralho inteiro', n: c.total - c.fresh, cls: '', hint: 'todos os já estudados, mesmo os que não venceram' },
      ]
    : [];
  return (
    <Modal open={!!d} onClose={onClose} title={d ? `Estudar ${d.name}` : ''}>
      <div className="schoose">
        {opts.map((o) => (
          <button key={o.m} className="schoose-opt" disabled={!o.n} onClick={() => d && onPick(d.id, o.m)}>
            <span className="schoose-main">
              <strong>{o.label}</strong>
              <span className="muted small">{o.hint}</span>
            </span>
            <b className={`schoose-n ${o.cls}`}>{o.n}</b>
          </button>
        ))}
        {d && <button className="link small" onClick={() => onOpen(d.id)}>Ver e editar os cartões</button>}
      </div>
    </Modal>
  );
}

function Token({ i, name, sub, area, counts, onStudy, onOpen }: {
  i: number; name: string; sub: string | null; area: Area; counts: ReturnType<typeof deckCounts>; onStudy: () => void; onOpen: () => void;
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
      className={`token-wrap ${ready ? 'is-ready' : 'is-done'}`}
      style={{ ['--c' as string]: a.color, ['--i' as string]: a.ink, ['--d' as string]: `${(i % 5) * -1.1}s`, ['--dur' as string]: `${5.5 + (i % 4) * 0.7}s` }}
      initial={{ opacity: 0, scale: 0.6, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: i * 0.05, type: 'spring', stiffness: 260, damping: 16 }}
    >
      <div className="token-float">
        <div className="token" ref={ref} onMouseMove={tilt} onMouseLeave={reset}>
          <button className="token-face" onClick={ready ? onStudy : onOpen} aria-label={`${name}: ${ready ? `${counts.ready} cartões para estudar` : 'tudo em dia'}`}>
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
            {counts.learning > 0 && <b className="c-err-t" title="errados / aprendendo">{counts.learning}</b>}
          </span>
        ) : `${counts.total} cartões · em dia`}
        {sub ? <span className="muted"> · {sub}</span> : null}
      </span>
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
  kind: 'deck' | 'turbo' | 'erros' | 'dia';
}

function Study({ plan, onClose }: { plan: StudyPlan; onClose: () => void }) {
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
        errorTopics: [], notes: `${plan.kind === 'turbo' ? 'Turbo' : plan.kind === 'erros' ? 'Revisar meus erros' : plan.kind === 'dia' ? 'Plano de hoje' : 'Baralho'}: ${names}`, createdAt: ref.createdAt,
      });
    }
  };
  useEffect(() => {
    if (finished) {
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
          <h2 className="h1">{plan.kind === 'turbo' ? 'Turbo feito!' : plan.kind === 'dia' ? 'Plano de hoje feito! 🎉' : 'Sessão feita'}</h2>
          <p>{reviewed} respostas · {ok} lembradas{again ? ` · ${again} para rever` : ''}</p>
          <p className="muted">Os cartões respondidos entraram no registro de estudos de cada tema.</p>
          <div className="btn-row">
            {history.length > 0 && <button className="btn btn-quiet btn-lg" onClick={() => go(1)}><Icon name="chevronL" size={18} /> Rever cartões</button>}
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
