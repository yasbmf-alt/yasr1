import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../data/store';
import { Modal, Field, ConfirmButton, LazyInput, useUI } from '../components/ui';
import { Icon } from '../components/Icon';
import { AREAS, areaOf, type Area, type Deck, type Flashcard } from '../types';
import { isDue, newCardState, previewLabel, RATING_LABEL, schedule, type Rating } from '../logic/fsrs';
import type { CardState } from '../types';
import { parseAny, type RawCard } from '../logic/cardImport';
import { relDay, today, toKey, uid } from '../logic/dates';
import { play } from '../logic/sound';
import { isActive as isFocusActive } from '../components/focus';

const NEW_PER_SESSION = 20;

export function Flashcards() {
  const { data } = useStore();
  const [deckId, setDeckId] = useState<string | null>(null);
  const [studying, setStudying] = useState<string | null>(null);
  const [importing, setImporting] = useState<string | 'any' | null>(null);
  const [newDeck, setNewDeck] = useState(false);
  const deck = data.decks.find((d) => d.id === deckId) ?? null;

  return (
    <div className="page page-fc">
      {deck ? (
        <DeckView deck={deck} onBack={() => setDeckId(null)} onStudy={() => setStudying(deck.id)} onImport={() => setImporting(deck.id)} />
      ) : (
        <>
          <header className="ag-head">
            <h1 className="h1">Flashcards</h1>
            <div className="btn-row wrap">
              <button className="btn btn-quiet" onClick={() => setImporting('any')}><Icon name="upload" size={17} /> Importar CSV ou JSON</button>
              <button className="btn btn-primary" onClick={() => setNewDeck(true)}><Icon name="plus" size={18} /> Novo baralho</button>
            </div>
          </header>
          <DeckGrid onOpen={setDeckId} onStudy={setStudying} onImport={() => setImporting('any')} />
        </>
      )}
      <ImportModal target={importing} onClose={() => setImporting(null)} onDone={(id) => { setImporting(null); setDeckId(id); }} />
      <DeckForm open={newDeck} onClose={() => setNewDeck(false)} onCreated={(id) => { setNewDeck(false); setDeckId(id); }} />
      <AnimatePresence>{studying && <Study key={studying} deckId={studying} onClose={() => setStudying(null)} />}</AnimatePresence>
    </div>
  );
}

function deckCounts(deck: Deck, cards: Flashcard[]) {
  const mine = cards.filter((c) => c.deckId === deck.id);
  const now = new Date();
  const fresh = mine.filter((c) => c.fsrs.phase === 'new').length;
  const due = mine.filter((c) => c.fsrs.phase !== 'new' && isDue(c.fsrs, now)).length;
  return { total: mine.length, fresh, due, ready: due + Math.min(NEW_PER_SESSION, fresh) };
}

function DeckGrid({ onOpen, onStudy, onImport }: { onOpen: (id: string) => void; onStudy: (id: string) => void; onImport: () => void }) {
  const { data } = useStore();
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
    <div className="decks">
      {decks.map((d, i) => {
        const a = areaOf(d.area);
        const c = deckCounts(d, data.cards);
        const topic = d.topicId ? data.topics.find((t) => t.id === d.topicId) : null;
        return (
          <motion.div key={d.id} className="deck" style={{ ['--c' as string]: a.color, ['--i' as string]: a.ink }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <button className="deck-face" onClick={() => onOpen(d.id)}>
              <span className="deck-stack" aria-hidden="true"><i /><i /><i /></span>
              <span className="deck-area">{a.short}</span>
              <strong className="deck-name">{d.name}</strong>
              {topic && <span className="deck-topic">{topic.name}</span>}
              <span className="deck-count">{c.total} cartões</span>
            </button>
            <div className="deck-foot">
              <span className="muted">{c.ready ? `${c.ready} para hoje` : 'tudo em dia'}</span>
              <button className="btn btn-secondary btn-sm" disabled={!c.ready} onClick={() => onStudy(d.id)}>Estudar</button>
            </div>
          </motion.div>
        );
      })}
    </div>
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

function Study({ deckId, onClose }: { deckId: string; onClose: () => void }) {
  const { data, saveCard, saveSession } = useStore();
  const ui = useUI();
  const deck = data.decks.find((d) => d.id === deckId);
  // fila fixada no início da sessão; "De novo" devolve o cartão ao fim da fila
  const [queue, setQueue] = useState<string[]>(() => {
    const now = new Date();
    const mine = data.cards.filter((c) => c.deckId === deckId);
    const due = mine.filter((c) => c.fsrs.phase !== 'new' && isDue(c.fsrs, now)).sort((a, b) => a.fsrs.due.localeCompare(b.fsrs.due));
    const fresh = mine.filter((c) => c.fsrs.phase === 'new').sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(0, NEW_PER_SESSION);
    return [...due, ...fresh].map((c) => c.id);
  });
  const [total] = useState(queue.length);
  const [flipped, setFlipped] = useState(false);
  const [revealed, setRevealed] = useState(false); // já viu a resposta: dá para desvirar e ainda responder
  const [stats, setStats] = useState({ reviewed: 0, ok: 0, again: 0 });
  // cartões já respondidos nesta sessão, para poder voltar e rever
  const [history, setHistory] = useState<{ id: string; prev: CardState; rating: Rating }[]>([]);
  const [back, setBack] = useState(0); // 0 = cartão atual; 1 = o último respondido; …
  const startedAt = useRef(Date.now());
  const logged = useRef<{ id: string; createdAt: string } | null>(null);
  const past = back > 0 ? history[history.length - back] : null;
  const card = data.cards.find((c) => c.id === (past ? past.id : queue[0]));
  const finished = !past && !data.cards.some((c) => c.id === queue[0]);
  // um cartão revisto só pode mudar de nota se não foi respondido de novo depois
  const canChange = !!past && !history.slice(history.length - back + 1).some((h) => h.id === past.id);

  const logSession = () => {
    if (stats.reviewed === 0 || !deck?.topicId) return;
    // um registro por sessão: se a nota de um cartão mudar depois, o mesmo registro é atualizado
    logged.current = logged.current ?? { id: uid(), createdAt: new Date().toISOString() };
    saveSession({
      id: logged.current.id, date: today(), topicId: deck.topicId, missionId: null, activityId: null, type: 'flashcards',
      minutes: isFocusActive() ? null : Math.max(1, Math.round((Date.now() - startedAt.current) / 60000)), questions: stats.reviewed, correct: stats.ok,
      errorTopics: [], notes: `Baralho: ${deck.name}`, createdAt: logged.current.createdAt,
    });
  };
  useEffect(() => {
    if (finished) {
      logSession();
      if (stats.reviewed) play('mission');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  const flip = () => {
    if (!card) return;
    setFlipped((f) => !f);
    setRevealed(true);
    play('flip');
  };
  const go = (n: number) => {
    const b2 = Math.max(0, Math.min(history.length, n));
    if (b2 === back) return;
    setBack(b2);
    // ao rever um cartão passado, ele aparece pela pergunta; o atual volta como estava (sem resposta)
    setFlipped(false);
    setRevealed(b2 > 0);
    play('page');
  };

  const answer = (g: Rating) => {
    if (!card || !revealed) return;
    if (past) {
      // trocar a nota de um cartão já respondido (recalcula a partir do estado de antes)
      if (!canChange || g === past.rating) return go(back - 1);
      saveCard({ ...card, fsrs: schedule(past.prev, g) });
      setStats((st) => ({ ...st, ok: st.ok + Number(g >= 2) - Number(past.rating >= 2), again: st.again + Number(g === 1) - Number(past.rating === 1) }));
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
    const next = schedule(card.fsrs, g);
    saveCard({ ...card, fsrs: next });
    setHistory((h) => [...h, { id: card.id, prev: card.fsrs, rating: g }]);
    setStats((st) => ({ reviewed: st.reviewed + 1, ok: st.ok + (g >= 2 ? 1 : 0), again: st.again + (g === 1 ? 1 : 0) }));
    setQueue((q) => (g === 1 ? [...q.slice(1), q[0]] : q.slice(1)));
    setFlipped(false);
    setRevealed(false);
    play(g === 1 ? 'uncheck' : 'check');
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { logSession(); onClose(); }
      else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); }
      else if (e.key === 'ArrowLeft') go(back + 1);
      else if (e.key === 'ArrowRight') go(back - 1);
      else if (['1', '2', '3', '4'].includes(e.key)) answer(Number(e.key) as Rating);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  const done = total - queue.length;
  return (
    <motion.div className="study" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-label={`Estudar ${deck?.name ?? ''}`}>
      <div className="study-top">
        <span className="study-deck">{deck?.name}</span>
        <span className="study-bar"><span style={{ width: `${total ? (done / total) * 100 : 100}%` }} /></span>
        <span className="muted mono">{Math.min(done, total)}/{total}</span>
        <button className="icon-btn" onClick={() => { logSession(); onClose(); }} aria-label="Sair"><Icon name="close" /></button>
      </div>

      {finished ? (
        <motion.div className="study-end" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <h2 className="h1">Sessão feita</h2>
          <p>{stats.reviewed} respostas · {stats.reviewed - stats.again} lembradas de primeira ou depois</p>
          {deck?.topicId ? <p className="muted">A sessão entrou no registro de estudos.</p> : <p className="muted">Ligue o baralho a um tema para a sessão contar no jardim.</p>}
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
              {past ? `Revendo ${back === 1 ? 'o último cartão' : `${back} cartões atrás`}` : history.length ? 'Cartão atual' : 'Primeiro cartão'}
            </span>
            <button className="icon-btn" onClick={() => go(back - 1)} disabled={back === 0} aria-label="Próximo cartão" title="Voltar para frente (→)"><Icon name="chevronR" /></button>
          </div>
          <div className="flip-stage" onClick={flip} role="button" aria-label={flipped ? 'Ver a pergunta' : 'Ver a resposta'}>
            <motion.div className="flip" animate={{ rotateY: flipped ? 180 : 0 }} transition={{ type: 'spring', stiffness: 220, damping: 22 }}>
              <div className="flip-face flip-front">
                <span className="flip-tag">Frente</span>
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
          {past && (
            <p className="study-past-note muted small">
              {canChange ? 'Você respondeu com a nota marcada. Escolha outra para trocar, ou toque na seta › para seguir.' : 'Este cartão foi respondido de novo depois; aqui é só para rever.'}
            </p>
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
