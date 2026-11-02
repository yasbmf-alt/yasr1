// Tela principal dos flashcards: o arquipélago das especialidades (cada ilha
// abre a sua página) e a página da especialidade, com subáreas em prateleiras
// de cartões colecionáveis que rolam para o lado.
import React, { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../../data/store';
import { Icon } from '../../components/Icon';
import { ImgScene, over } from '../../yasland/ui';
import { deckCounts } from '../../logic/flashQueue';
import { play } from '../../logic/sound';
import type { Deck, Topic } from '../../types';
import { arquipelago, cardArt, ISLANDS, islandMeta, islandOf, MAP_H, MAP_W, subareaOf, type IslandId } from './islands';

export type StudyMode = 'tudo' | 'novos' | 'revisar' | 'errados' | 'baralho';

export interface TopicGroup {
  key: string;
  name: string;
  topic: Topic | null;
  decks: Deck[];
  island: IslandId;
  sub: string;
  total: number;
  fresh: number;
  due: number;
  learning: number;
  studied: number;
}

/** um item por tema (vários baralhos do mesmo tema viram um cartão só) */
export function useTopicGroups(): TopicGroup[] {
  const { data } = useStore();
  return useMemo(() => {
    const m = new Map<string, TopicGroup>();
    for (const d of data.decks) {
      const topic = d.topicId ? data.topics.find((t) => t.id === d.topicId) ?? null : null;
      const key = topic?.id ?? `deck:${d.id}`;
      const island = islandOf(d, topic);
      const g = m.get(key) ?? { key, name: topic?.name ?? d.name, topic, decks: [], island, sub: subareaOf(island, d, topic), total: 0, fresh: 0, due: 0, learning: 0, studied: 0 };
      const c = deckCounts(d, data.cards);
      g.decks.push(d);
      g.total += c.total;
      g.fresh += c.fresh;
      g.due += c.due;
      g.learning += c.learning;
      g.studied += c.studied;
      m.set(key, g);
    }
    return [...m.values()];
  }, [data.decks, data.topics, data.cards]);
}

// ── Arquipélago ───────────────────────────────────────────────

export function Archipelago({ groups, onIsland }: { groups: TopicGroup[]; onIsland: (id: IslandId) => void }) {
  const per = (id: IslandId) => groups.filter((g) => g.island === id);
  return (
    <section className="arq">
      <h2 className="arq-t">Escolha uma especialidade</h2>
      <p className="arq-hint"><span>✦</span> Ao tocar, abre os temas da especialidade.</p>
      <ImgScene
        src={arquipelago}
        w={MAP_W}
        h={MAP_H}
        sparkles={7}
        onPick={(id) => onIsland(id as IslandId)}
        areas={ISLANDS.map((i) => ({ id: i.id, label: `${i.name}: ${per(i.id).length} tema${per(i.id).length === 1 ? '' : 's'}`, box: i.box }))}
      >
        <span className="arq-boat" aria-hidden="true">⛵</span>
        <span className="arq-wave w1" aria-hidden="true" />
        <span className="arq-wave w2" aria-hidden="true" />
        <span className="arq-wave w3" aria-hidden="true" />
        {ISLANDS.map((i, k) => {
          const list = per(i.id);
          if (!list.length) return null;
          const ready = list.reduce((n, g) => n + g.due + g.fresh, 0);
          const err = list.reduce((n, g) => n + g.learning, 0);
          return (
            <motion.span key={i.id} className={`arq-pin ${ready ? '' : 'is-ok'}`} style={over(MAP_W, MAP_H, i.pin[0], i.pin[1])} initial={{ scale: 0, y: 8 }} animate={{ scale: 1, y: 0 }} transition={{ delay: 0.25 + k * 0.06, type: 'spring', stiffness: 320, damping: 14 }}>
              {ready ? <>{ready}<small>{err ? ` · ${err}❗` : ''}</small></> : '✓'}
            </motion.span>
          );
        })}
      </ImgScene>
    </section>
  );
}

// ── Cartão colecionável de um tema ───────────────────────────

function TopicCard({ g, on, onPick, i }: { g: TopicGroup; on: boolean; onPick: () => void; i: number }) {
  const art = cardArt(g.name, islandMeta(g.island).emoji);
  const pct = g.total ? g.studied / g.total : 0;
  const ready = g.due + g.fresh;
  const R = 44;
  const C = 2 * Math.PI * R;
  return (
    <motion.button
      className={`tc ${on ? 'is-on' : ''} ${ready ? '' : 'is-done'}`}
      style={{ ['--c1' as string]: art.c1, ['--c2' as string]: art.c2 }}
      onClick={onPick}
      initial={{ opacity: 0, y: 18, rotate: art.tilt * 0.6 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ delay: Math.min(i, 10) * 0.04, type: 'spring', stiffness: 220, damping: 18 }}
      whileHover={{ y: -8, rotate: art.tilt * 0.4 }}
      whileTap={{ scale: 0.96 }}
      aria-pressed={on}
      aria-label={`${g.name}: ${g.studied} de ${g.total} cartões vistos`}
    >
      <span className="tc-count">{g.studied}<small>/{g.total}</small></span>
      <span className="tc-art">
        <svg viewBox="0 0 100 100" className="tc-ring" aria-hidden="true">
          <circle cx="50" cy="50" r={R} className="tc-ring-bg" />
          <motion.circle cx="50" cy="50" r={R} className="tc-ring-fg" strokeDasharray={C} initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: C * (1 - pct) }} transition={{ delay: 0.3, duration: 0.9 }} transform="rotate(-90 50 50)" />
        </svg>
        <span className={`tc-circle d${art.deco}`}>
          <span className="tc-emoji">{art.emoji}</span>
        </span>
      </span>
      <strong className="tc-name">{g.name}</strong>
      <span className="tc-nums">
        {g.fresh > 0 && <b className="c-new-t" title="novos">● {g.fresh}</b>}
        {g.due - g.learning > 0 && <b className="c-rev-t" title="para revisar">● {g.due - g.learning}</b>}
        {g.learning > 0 && <b className="c-err-t" title="errados">● {g.learning}</b>}
        {!ready && <b className="tc-ok">em dia ✓</b>}
      </span>
      <span className="tc-foot">{ready ? `${ready} para estudar` : `${g.total} cartões`}</span>
    </motion.button>
  );
}

/** prateleira que rola para o lado, com setinhas */
function Shelf({ title, groups, sel, onSel }: { title: string | null; groups: TopicGroup[]; sel: string | null; onSel: (k: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: 'smooth' });
  const ready = groups.reduce((n, g) => n + g.due + g.fresh, 0);
  return (
    <section className="shelf">
      {title && (
        <header className="shelf-h">
          <h3>{title}</h3>
          <small>{groups.length} tema{groups.length === 1 ? '' : 's'}{ready ? ` · ${ready} para estudar` : ' · tudo em dia ✓'}</small>
          <span className="shelf-arrows">
            <button className="icon-btn icon-btn-sm" onClick={() => scroll(-1)} aria-label="Voltar"><Icon name="chevronL" size={16} /></button>
            <button className="icon-btn icon-btn-sm" onClick={() => scroll(1)} aria-label="Avançar"><Icon name="chevronR" size={16} /></button>
          </span>
        </header>
      )}
      <div className="shelf-row" ref={ref}>
        {groups.map((g, i) => <TopicCard key={g.key} g={g} i={i} on={sel === g.key} onPick={() => { play('pop'); onSel(g.key); }} />)}
      </div>
    </section>
  );
}

// ── Página da especialidade ───────────────────────────────────

type Filter = 'todos' | 'estudar' | 'novos' | 'erros' | 'emdia';
type Sort = 'urgente' | 'az' | 'progresso';

export function SpecialtyPage({ island, groups, onBack, onStudy, onOpenDeck }: {
  island: IslandId; groups: TopicGroup[]; onBack: () => void;
  onStudy: (g: TopicGroup, mode: StudyMode) => void; onOpenDeck: (deckId: string) => void;
}) {
  const meta = islandMeta(island);
  const mine = groups.filter((g) => g.island === island);
  const subs = [...new Set(mine.map((g) => g.sub))].sort((a, b) => (a === 'Geral' ? 1 : b === 'Geral' ? -1 : a.localeCompare(b, 'pt-BR')));
  const [sub, setSub] = useState<string>('todas');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('todos');
  const [sort, setSort] = useState<Sort>('urgente');
  const [sel, setSel] = useState<string | null>(null);
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const shown = mine
    .filter((g) => sub === 'todas' || g.sub === sub)
    .filter((g) => !q.trim() || norm(g.name).includes(norm(q.trim())) || g.decks.some((d) => norm(d.name).includes(norm(q.trim()))))
    .filter((g) => (filter === 'estudar' ? g.due + g.fresh > 0 : filter === 'novos' ? g.fresh > 0 : filter === 'erros' ? g.learning > 0 : filter === 'emdia' ? g.due + g.fresh === 0 : true))
    .sort((a, b) => (sort === 'az' ? a.name.localeCompare(b.name, 'pt-BR') : sort === 'progresso' ? a.studied / (a.total || 1) - b.studied / (b.total || 1) : b.learning * 3 + b.due + b.fresh * 0.5 - (a.learning * 3 + a.due + a.fresh * 0.5) || a.name.localeCompare(b.name, 'pt-BR')));
  const shelves = sub === 'todas' && !q.trim() && subs.length > 1 ? subs.map((s) => ({ s, list: shown.filter((g) => g.sub === s) })).filter((x) => x.list.length) : [{ s: null as string | null, list: shown }];
  const g = mine.find((x) => x.key === sel) ?? null;
  const tot = mine.reduce((a, x) => ({ fresh: a.fresh + x.fresh, due: a.due + x.due, learning: a.learning + x.learning, studied: a.studied + x.studied, total: a.total + x.total }), { fresh: 0, due: 0, learning: 0, studied: 0, total: 0 });

  return (
    <motion.div className="spec" style={{ ['--ic' as string]: meta.color, ['--ii' as string]: meta.ink }} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 20 }}>
      <header className="spec-hero">
        <button className="yl-back" onClick={onBack}><Icon name="chevronL" size={18} /> Arquipélago</button>
        <motion.img src={meta.img} alt="" className="spec-island" initial={{ y: 20, opacity: 0 }} animate={{ y: [0, -6, 0], opacity: 1 }} transition={{ y: { repeat: Infinity, duration: 4, ease: 'easeInOut' }, opacity: { duration: 0.4 } }} />
        <div className="spec-info">
          <h1 className="h1">{meta.emoji} {meta.name}</h1>
          <p className="muted">{mine.length} tema{mine.length === 1 ? '' : 's'} · {tot.studied} de {tot.total} cartões vistos</p>
          <div className="spec-nums">
            <span className="c-new-t"><b>{tot.fresh}</b> novos</span>
            <span className="c-rev-t"><b>{tot.due - tot.learning}</b> para revisar</span>
            <span className="c-err-t"><b>{tot.learning}</b> errados</span>
          </div>
        </div>
      </header>

      {!mine.length ? (
        <div className="empty-big"><h2>Ilha vazia por enquanto</h2><p>Crie ou importe um baralho e ligue-o a um tema de {meta.name} para ele morar aqui.</p></div>
      ) : (
        <>
          <div className="spec-tools">
            {subs.length > 1 && (
              <div className="spec-subs" role="tablist" aria-label="Subáreas">
                {['todas', ...subs].map((s) => (
                  <button key={s} role="tab" aria-selected={sub === s} className={`spec-sub ${sub === s ? 'is-on' : ''}`} onClick={() => setSub(s)}>
                    {s === 'todas' ? 'Todas' : s}
                    <small>{s === 'todas' ? mine.length : mine.filter((x) => x.sub === s).length}</small>
                  </button>
                ))}
              </div>
            )}
            <div className="spec-filters">
              <label className="spec-search"><Icon name="search" size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Buscar em ${meta.name}`} aria-label="Buscar tema" /></label>
              <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)} aria-label="Filtrar">
                <option value="todos">Todos</option><option value="estudar">Para estudar</option><option value="novos">Com novos</option><option value="erros">Com errados</option><option value="emdia">Em dia</option>
              </select>
              <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Ordenar">
                <option value="urgente">Mais urgentes</option><option value="progresso">Menos vistos</option><option value="az">A–Z</option>
              </select>
            </div>
          </div>
          {!shown.length && <p className="muted">Nenhum tema com esse filtro.</p>}
          {shelves.map((x) => <Shelf key={x.s ?? 'all'} title={x.s} groups={x.list} sel={sel} onSel={(k) => setSel(sel === k ? null : k)} />)}
        </>
      )}

      <AnimatePresence>
        {g && (
          <motion.section key={g.key} className="tc-sheet" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}>
            <header>
              <div>
                <span className="tc-sheet-k">{g.sub}</span>
                <h3>{cardArt(g.name, meta.emoji).emoji} {g.name}</h3>
              </div>
              <button className="icon-btn" onClick={() => setSel(null)} aria-label="Fechar"><Icon name="close" size={18} /></button>
            </header>
            <div className="tc-modes">
              {([
                ['tudo', 'Estudar tudo', g.due + g.fresh, 'revisões + novos', ''],
                ['novos', 'Só novos', g.fresh, 'cartões que você nunca viu', 'c-new'],
                ['revisar', 'Só revisões', g.due - g.learning, 'os que venceram hoje', 'c-rev'],
                ['errados', 'Só os errados', g.learning, 'os que você marcou "De novo"', 'c-err'],
                ['baralho', 'Rever tudo', g.studied, 'mesmo o que não venceu', ''],
              ] as const).map(([m, l, n, h, cls]) => (
                <motion.button key={m} className={`tc-mode ${cls}`} disabled={!n} onClick={() => onStudy(g, m)} whileHover={{ y: -4 }} whileTap={{ scale: 0.95 }}>
                  <b>{n}</b>
                  <strong>{l}</strong>
                  <small>{h}</small>
                </motion.button>
              ))}
            </div>
            <div className="tc-decks">
              <span className="muted small">Baralhos deste tema:</span>
              {g.decks.map((d) => <button key={d.id} className="chip-mini" onClick={() => onOpenDeck(d.id)}><Icon name="edit" size={12} /> {d.name}</button>)}
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
