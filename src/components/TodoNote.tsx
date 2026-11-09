// Post-it amarelinho de tarefinhas no canto da página inicial. Sem atraso, sem
// vermelho, sem cobrança: o que foi feito fica riscado até o fim do dia e some
// no dia seguinte. O app sugere algumas ideias (correção, flashcards, agenda),
// mas só entram no post-it se a pessoa tocar nelas.
import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../data/store';
import { useUI, type Page } from './ui';
import { Icon } from './Icon';
import { today, uid } from '../logic/dates';
import { play } from '../logic/sound';
import { countDue, countNew } from '../logic/flashQueue';
import { eventTitle, occurrences } from '../logic/agenda';
import type { TodoItem } from '../types';

const KEY_OPEN = 'yasr1-todo-open';
// no celular começa escondido (só a abinha), para não cobrir a página
const readOpen = () => {
  let v: string | null = null;
  try { v = localStorage.getItem(KEY_OPEN); } catch { /* sem armazenamento */ }
  return v == null ? window.innerWidth > 860 : v === '1';
};
const writeOpen = (v: boolean) => { try { localStorage.setItem(KEY_OPEN, v ? '1' : '0'); } catch { /* sem armazenamento */ } };

const CHEERS = ['que orgulho! 🌼', 'arrasou ✨', 'mais uma! 💛', 'tá voando 🦋', 'boa, Yas! 🌷'];

interface Idea { key: string; text: string; page: Page; emoji: string }

export function TodoNote() {
  const { data, saveSettings } = useStore();
  const ui = useUI();
  const [open, setOpen] = useState(readOpen);
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [showIdeas, setShowIdeas] = useState(false);
  const t0 = today();
  const all = data.settings.todos ?? [];
  // as feitas em outro dia já foram embora
  const items = all.filter((t) => !t.done || t.doneAt === t0);
  const pending = items.filter((t) => !t.done);
  const doneToday = items.filter((t) => t.done);

  const save = (next: TodoItem[]) => saveSettings({ todos: next.filter((t) => !t.done || t.doneAt === t0) });
  const toggle = (id: string) => {
    const it = all.find((t) => t.id === id);
    if (!it) return;
    if (!it.done) play('check');
    save(all.map((t) => (t.id === id ? { ...t, done: !t.done, doneAt: !t.done ? t0 : undefined } : t)));
  };
  const add = (text: string, extra: Partial<TodoItem> = {}) => {
    const v = text.trim();
    if (!v) return;
    save([...all, { id: uid(), text: v, done: false, createdAt: new Date().toISOString(), ...extra }]);
    play('pop');
  };
  const remove = (id: string) => save(all.filter((t) => t.id !== id));
  const saveEdit = () => {
    if (!editing) return;
    const v = editing.text.trim();
    save(v ? all.map((t) => (t.id === editing.id ? { ...t, text: v } : t)) : all.filter((t) => t.id !== editing.id));
    setEditing(null);
  };

  // ideias do app, só as que ainda não estão no post-it
  const ideas = useMemo<Idea[]>(() => {
    const out: Idea[] = [];
    for (const s of [...data.simulados].sort((a, b) => b.date.localeCompare(a.date))) {
      if (s.correctionDoneAt || !(s.errors ?? []).length) continue;
      out.push({ key: `sim:${s.id}`, text: `Terminar de corrigir o ${s.name}`, page: 'simulados', emoji: '📝' });
      if (out.length >= 2) break;
    }
    // sem números grandes: a ideia é um convite, não uma conta
    if (countDue(data.cards) > 0) out.push({ key: `fc:${t0}`, text: 'Uma rodadinha de revisão nos flashcards', page: 'flashcards', emoji: '🃏' });
    else if (countNew(data.cards) > 0) out.push({ key: `fcn:${t0}`, text: 'Conhecer uns flashcards novos', page: 'flashcards', emoji: '🃏' });
    for (const o of occurrences(data.events, t0, t0).slice(0, 3)) out.push({ key: `ev:${o.ev.id}:${o.date}`, text: eventTitle(o.ev, data), page: 'agenda', emoji: '📅' });
    const used = new Set(all.map((t) => t.key).filter(Boolean));
    return out.filter((i) => !used.has(i.key));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.simulados, data.cards, data.events, data.missions, all, t0]);

  const setOpenP = (v: boolean) => { setOpen(v); writeOpen(v); play('pop'); };
  // florzinhas que estouram ao marcar uma tarefa
  const [burst, setBurst] = useState<{ id: string; n: number } | null>(null);
  const check = (id: string) => {
    const it = all.find((t) => t.id === id);
    if (it && !it.done) {
      setBurst({ id, n: Date.now() });
      window.setTimeout(() => setBurst((b) => (b?.id === id ? null : b)), 900);
    }
    toggle(id);
  };
  const allDone = items.length > 0 && pending.length === 0;

  // reserva o canto de cima da página enquanto o post-it está aberto (telas largas)
  useEffect(() => {
    document.documentElement.classList.toggle('pit-open', open);
    return () => document.documentElement.classList.remove('pit-open');
  }, [open]);

  return (
    <div className="pit-wrap">
      <AnimatePresence initial={false} mode="wait">
        {open ? (
          <motion.aside
            key="note"
            className="pit-fly"
            aria-label="Minhas tarefinhas"
            initial={{ y: -260, rotate: 14, opacity: 0 }}
            animate={{ y: 0, rotate: 0, opacity: 1 }}
            exit={{ y: -260, rotate: -10, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 17 }}
          >
            <div className={`pit ${allDone ? 'is-all-done' : ''}`}>
              <span className="pit-tape" aria-hidden="true" />
              <header className="pit-head">
                <h2>Tarefinhas <span className="pit-heart" aria-hidden="true">♡</span></h2>
                <button className="pit-hide" onClick={() => setOpenP(false)} aria-label="Esconder o post-it" title="Esconder">
                  <Icon name="chevronR" size={18} />
                </button>
              </header>

              <ul className="pit-list">
                <AnimatePresence initial={false}>
                  {[...pending, ...doneToday].map((t) => (
                    <motion.li
                      key={t.id}
                      layout
                      className={t.done ? 'is-done' : ''}
                      initial={{ opacity: 0, scale: 0.6, rotate: -6 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      exit={{ opacity: 0, x: 60, rotate: 8 }}
                      transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                    >
                      <span className="pit-check-wrap">
                        <button className="pit-check" role="checkbox" aria-checked={t.done} aria-label={t.done ? `Desmarcar: ${t.text}` : `Feito: ${t.text}`} onClick={() => check(t.id)}>
                          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 10.5c1.4 1.2 2.4 2.3 3.5 3.6C10 10.6 12.6 7.6 16 5" /></svg>
                        </button>
                        {burst?.id === t.id && (
                          <span className="pit-burst" key={burst.n} aria-hidden="true">
                            {['🌼', '✨', '💛', '🌸', '✨', '🌷'].map((e, i) => <i key={i} style={{ '--a': `${i * 60 + 15}deg` } as React.CSSProperties}>{e}</i>)}
                          </span>
                        )}
                      </span>
                      {editing?.id === t.id ? (
                        <input
                          className="pit-edit"
                          value={editing.text}
                          autoFocus
                          onChange={(e) => setEditing({ ...editing, text: e.target.value })}
                          onBlur={saveEdit}
                          onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(null); }}
                          aria-label="Editar tarefa"
                        />
                      ) : (
                        <span className="pit-text" onDoubleClick={() => setEditing({ id: t.id, text: t.text })} title="Toque duas vezes para editar"><span className="pit-ink">{t.text}</span></span>
                      )}
                      {t.page && !t.done && (
                        <button className="pit-go" onClick={() => ui.go(t.page!)} aria-label="Ir para lá" title="Ir para lá"><Icon name="chevronR" size={14} /></button>
                      )}
                      <button className="pit-del" onClick={() => remove(t.id)} aria-label={`Apagar: ${t.text}`} title="Apagar"><Icon name="close" size={13} /></button>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>

              <form className="pit-add" onSubmit={(e) => { e.preventDefault(); add(draft); setDraft(''); }}>
                <span className="pit-pencil" aria-hidden="true">✏️</span>
                <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="anotar uma tarefinha…" aria-label="Nova tarefa" maxLength={140} />
              </form>

              {ideas.length > 0 && (
                <div className="pit-ideas">
                  <button className="pit-ideas-btn" onClick={() => setShowIdeas(!showIdeas)} aria-expanded={showIdeas}>
                    <span className="pit-sparkle" aria-hidden="true">✨</span> ideias do app {showIdeas ? '▴' : `(${ideas.length}) ▾`}
                  </button>
                  <AnimatePresence initial={false}>
                    {showIdeas && ideas.map((i, k) => (
                      <motion.button
                        key={i.key}
                        className="pit-idea"
                        onClick={() => add(i.text, { page: i.page, key: i.key })}
                        title="Pôr no post-it"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0, transition: { delay: k * 0.05 } }}
                        exit={{ opacity: 0, scale: 0.8 }}
                      >
                        <span>{i.emoji}</span> {i.text} <b>+</b>
                      </motion.button>
                    ))}
                  </AnimatePresence>
                </div>
              )}

              <p className="pit-foot">
                {allDone
                  ? <span className="pit-party">tudo feito! 🎉 dia lindo</span>
                  : doneToday.length > 0
                    ? <>{doneToday.length} feita{doneToday.length > 1 ? 's' : ''} hoje · {CHEERS[(doneToday.length - 1) % CHEERS.length]}</>
                    : items.length === 0 ? 'nada por aqui · dia leve 🌿' : 'no seu ritmo 💛'}
              </p>
            </div>
          </motion.aside>
        ) : (
          <motion.button
            key="tab"
            className="pit-tab"
            onClick={() => setOpenP(true)}
            aria-label="Abrir as tarefinhas"
            title="Tarefinhas"
            initial={{ x: 70 }}
            animate={{ x: 0 }}
            exit={{ x: 70 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
          >
            <Icon name="chevronL" size={16} />
            <span className="pit-tab-note" aria-hidden="true">📝</span>
            {pending.length > 0 && <span className="pit-tab-dot" aria-hidden="true" />}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
