import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../data/store';
import { useUI } from './ui';
import { Icon } from './Icon';
import { StationIcon } from '../assets/art';
import { areaOf, type Flashcard } from '../types';
import { addDays, fmtShort, toKey, today, DIAS_CURTOS, fromKey } from '../logic/dates';
import { DAILY_GOAL } from '../logic/flashQueue';

// Estatísticas só de flashcards, com números que ajudam a decidir o que
// estudar. "Lembrado" = Difícil, Bom ou Fácil. Nada disso entra no acerto
// de questões.

const DAY = 86400000;
const pct = (ok: number, n: number) => (n ? Math.round((ok / n) * 100) : null);
const grade = (p: number | null) => (p == null ? '—' : p >= 90 ? 'A' : p >= 80 ? 'B' : p >= 65 ? 'C' : 'D');
const GRADE_TXT: Record<string, string> = { A: 'ótimo', B: 'bom', C: 'atenção', D: 'reforçar', '—': 'sem dados' };

/** respostas (do registro de cada cartão) num intervalo de dias */
function answersIn(cards: Flashcard[], from: number, to: number) {
  let n = 0;
  let ok = 0;
  for (const c of cards) for (const r of c.log ?? []) {
    const t = new Date(r.at).getTime();
    if (t >= from && t < to) {
      n++;
      if (r.g >= 2) ok++;
    }
  }
  return { n, ok };
}

export function FlashStats() {
  const { data } = useStore();
  const ui = useUI();
  const now = Date.now();
  const t0 = today();
  const startToday = fromKey(t0).getTime();
  const cards = data.cards;
  const fs = useMemo(() => data.sessions.filter((s) => s.type === 'flashcards' && s.questions), [data.sessions]);
  const hasLogs = cards.some((c) => c.log?.length);

  // hoje e semanas (registro por cartão; se ainda não houver, usa as sessões)
  const sessIn = (a: string, b: string) => fs.filter((s) => s.date >= a && s.date <= b).reduce((x, s) => ({ n: x.n + (s.questions ?? 0), ok: x.ok + (s.correct ?? 0) }), { n: 0, ok: 0 });
  const todayA = hasLogs ? answersIn(cards, startToday, startToday + DAY) : sessIn(t0, t0);
  const week = hasLogs ? answersIn(cards, startToday - 6 * DAY, startToday + DAY) : sessIn(addDays(t0, -6), t0);
  const prev = hasLogs ? answersIn(cards, startToday - 13 * DAY, startToday - 6 * DAY) : sessIn(addDays(t0, -13), addDays(t0, -7));
  const wp = pct(week.ok, week.n);
  const pp = pct(prev.ok, prev.n);
  const delta = wp != null && pp != null ? wp - pp : null;

  // dias seguidos com flashcards
  const days = new Set([...fs.map((s) => s.date), ...cards.flatMap((c) => (c.log ?? []).map((r) => toKey(new Date(r.at))))]);
  let streak = 0;
  for (let d = days.has(t0) ? t0 : addDays(t0, -1); days.has(d); d = addDays(d, -1)) streak++;

  // previsão: cartões vencendo nos próximos 7 dias (atrasados contam hoje)
  const studied = cards.filter((c) => c.fsrs.phase !== 'new');
  const forecast = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(t0, i);
    const end = fromKey(day).getTime() + DAY;
    const startD = i === 0 ? -Infinity : fromKey(day).getTime();
    return { day, n: studied.filter((c) => { const t = new Date(c.fsrs.due).getTime(); return t >= startD && t < end; }).length };
  });

  // boletim por baralho/tema
  const report = data.decks.map((d) => {
    const mine = cards.filter((c) => c.deckId === d.id);
    const topic = d.topicId ? data.topics.find((t) => t.id === d.topicId) : null;
    let a = answersIn(mine, now - 30 * DAY, now + DAY);
    if (!a.n && topic) a = fs.filter((s) => s.topicId === topic.id).reduce((x, s) => ({ n: x.n + (s.questions ?? 0), ok: x.ok + (s.correct ?? 0) }), { n: 0, ok: 0 });
    const p = pct(a.ok, a.n);
    return {
      d, topic, p, g: grade(p), answers: a.n,
      studied: mine.filter((c) => c.fsrs.phase !== 'new').length, total: mine.length,
      due: mine.filter((c) => c.fsrs.phase !== 'new' && new Date(c.fsrs.due).getTime() <= now).length,
      hard: mine.filter((c) => c.fsrs.lapses >= 2 || c.fsrs.difficulty >= 7).length,
    };
  }).sort((x, y) => (x.p ?? 101) - (y.p ?? 101));

  // cartões-problema
  const problems = cards
    .map((c) => {
      const misses = (c.log ?? []).filter((r) => r.g === 1);
      return { c, n: misses.length + c.fsrs.lapses, last: misses.at(-1)?.at ?? c.fsrs.lastReview };
    })
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 5);
  const dname = (id: string) => data.decks.find((d) => d.id === id)?.name ?? '';

  // programação: vencidos hoje, quantos novos faltam para a meta e os próximos cartões
  const dueNow = forecast[0].n;
  const toGoal = DAILY_GOAL - todayA.n - dueNow;
  const newDeck = data.decks.map((d) => ({ d, n: cards.filter((c) => c.deckId === d.id && c.fsrs.phase === 'new').length })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n)[0];
  const newPick = newDeck ? (data.topics.find((t) => t.id === newDeck.d.topicId)?.name ?? newDeck.d.name) : null;
  const upcoming = [...studied].sort((a, b) => a.fsrs.due.localeCompare(b.fsrs.due)).slice(0, 8);
  const whenTxt = (c: Flashcard) => {
    const t = new Date(c.fsrs.due).getTime();
    if (t <= now) return 'agora';
    const k = toKey(new Date(t));
    return k === t0 ? 'hoje' : k === addDays(t0, 1) ? 'amanhã' : fmtShort(k);
  };
  // errei × difícil: respostas 1 e 2 registradas em cada cartão
  const byRating = (g: 1 | 2) => cards.map((c) => ({ c, n: (c.log ?? []).filter((r) => r.g === g).length })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n);
  const againList = byRating(1);
  const hardList = byRating(2);

  if (!cards.length)
    return (
      <div className="empty-big">
        <h2>Nenhum flashcard ainda</h2>
        <p>Crie ou importe um baralho; as estatísticas aparecem aqui, separadas do acerto de questões.</p>
        <button className="btn btn-primary" onClick={() => ui.go('flashcards')}>Ir para os flashcards</button>
      </div>
    );

  return (
    <div className="fs2">
      {/* hoje e semana */}
      <div className="fs2-hero">
        <div className="fs2-tile t-today">
          <span className="fs2-k">Hoje</span>
          <span className="fs2-v">{todayA.n}<small>/{DAILY_GOAL}</small></span>
          <span className="fs2-bar"><span style={{ width: `${Math.min(100, (todayA.n / DAILY_GOAL) * 100)}%` }} /></span>
          <span className="fs2-s">{todayA.n >= DAILY_GOAL ? 'meta do dia batida!' : `faltam ${DAILY_GOAL - todayA.n} para a meta`}</span>
        </div>
        <div className="fs2-tile">
          <span className="fs2-k">Últimos 7 dias</span>
          <span className="fs2-v">{wp != null ? `${wp}%` : '—'}</span>
          <span className="fs2-s">
            {week.n} cartões · lembrados
            {delta != null && <b className={delta >= 0 ? 'up' : 'down'}> {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)} p.p.</b>}
          </span>
        </div>
        <div className="fs2-tile">
          <span className="fs2-k">Dias seguidos</span>
          <span className="fs2-v">{streak}<small> {streak === 1 ? 'dia' : 'dias'}</small></span>
          <span className="fs2-s">com flashcards</span>
        </div>
        <div className="fs2-tile">
          <span className="fs2-k">Amanhã</span>
          <span className="fs2-v">{forecast[1]?.n ?? 0}<small> {(forecast[1]?.n ?? 0) === 1 ? 'cartão' : 'cartões'}</small></span>
          <span className="fs2-s">{forecast[0].n ? `${forecast[0].n} ${forecast[0].n === 1 ? 'vence' : 'vencem'} hoje` : 'nada vencendo hoje'}</span>
        </div>
      </div>

      <div className="fs2-row">
        {/* programação */}
        <section className="card fs2-card">
          <h3 className="card-title">Sua programação</h3>
          <div className="fs2-plan">
            <div className="fs2-plan-today">
              <span className="fs2-plan-n">{dueNow}</span>
              <span>{dueNow === 1 ? 'cartão vencido para hoje' : 'cartões vencidos para hoje'}</span>
            </div>
            {toGoal > 0 && newPick && (
              <p className="fs2-plan-tip">Para bater a meta, faça também <b>{toGoal} novos</b> de <b>{newPick}</b>.</p>
            )}
            {toGoal <= 0 && <p className="fs2-plan-tip">Com os vencidos você já chega na meta de hoje. 🎯</p>}
            <div className="fs2-plan-days">
              {forecast.slice(1, 6).map((f, i) => (
                <span key={f.day} className="fs2-plan-day"><b>{f.n}</b>{i === 0 ? 'amanhã' : DIAS_CURTOS[fromKey(f.day).getDay()]}</span>
              ))}
            </div>
          </div>
          <h4 className="fs2-sub">Próximos cartões</h4>
          {upcoming.length ? (
            <ul className="fs2-next">
              {upcoming.map((c) => (
                <li key={c.id}>
                  <span className={`fs2-when ${new Date(c.fsrs.due).getTime() <= now ? 'is-now' : ''}`}>{whenTxt(c)}</span>
                  <span className="fs2-next-q">{c.front}</span>
                  <span className="muted small">{dname(c.deckId)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="muted">Nenhum cartão agendado ainda.</p>}
        </section>

        {/* errei × difícil */}
        <section className="card fs2-card">
          <h3 className="card-title">Onde estou errando</h3>
          <div className="fs2-miss">
            {([['errei', 'Errei (De novo)', againList], ['dificil', 'Difícil', hardList]] as const).map(([k, label, list]) => (
              <div key={k} className={`fs2-miss-col m-${k}`}>
                <span className="fs2-miss-h">{label} <b>{list.reduce((a, x) => a + x.n, 0)}</b></span>
                {list.length ? (
                  <ol>
                    {list.slice(0, 6).map(({ c, n }) => (
                      <li key={c.id} title={c.back}>
                        <span className="fs2-miss-q">{c.front}</span>
                        <span className="muted small">{dname(c.deckId)} · {n}×</span>
                      </li>
                    ))}
                  </ol>
                ) : <p className="muted small">Nenhum por aqui. ✨</p>}
              </div>
            ))}
          </div>
          <p className="field-hint">Conta as respostas registradas como "De novo" (1) e "Difícil" (2), das mais frequentes para as menos.</p>
        </section>
      </div>

      {/* boletim */}
      <section className="card fs2-card">
        <h3 className="card-title">Boletim por tema <span className="muted small">(últimos 30 dias)</span></h3>
        <div className="fs2-report">
          {report.map((r) => {
            const a = areaOf(r.topic?.area ?? r.d.area);
            return (
              <div key={r.d.id} className={`fs2-rc g-${r.g === '—' ? 'x' : r.g}`} style={{ ['--c' as string]: a.color }}>
                <span className="fs2-rc-icon" aria-hidden="true"><StationIcon area={r.topic?.area ?? r.d.area} /></span>
                <div className="fs2-rc-main">
                  <strong>{r.topic?.name ?? r.d.name}</strong>
                  <span className="muted small">{r.studied}/{r.total} estudados{r.due ? ` · ${r.due} para revisar` : ''}{r.hard ? ` · ${r.hard} difíceis` : ''}</span>
                </div>
                <div className="fs2-grade" title={GRADE_TXT[r.g]}>
                  <span>{r.g}</span>
                  <small>{r.p != null ? `${r.p}%` : GRADE_TXT[r.g]}</small>
                </div>
                <button className="btn btn-quiet btn-sm" onClick={() => ui.studyDeck(r.d.id)} title="Estudar este baralho"><Icon name="flashcards" size={15} /></button>
              </div>
            );
          })}
        </div>
        <p className="field-hint">Nota pela % de cartões lembrados: A ≥ 90%, B ≥ 80%, C ≥ 65%, D abaixo. Os piores aparecem primeiro.</p>
      </section>

      {/* cartões-problema */}
      <section className="card fs2-card">
        <div className="fs2-head">
          <h3 className="card-title">Cartões-problema</h3>
          {problems.length > 0 && <button className="btn btn-secondary btn-sm" onClick={() => ui.studyDeck('__erros__')}><Icon name="restore" size={14} /> Revisar meus erros</button>}
        </div>
        {problems.length ? (
          <ol className="fs2-prob">
            {problems.map(({ c, n, last }) => (
              <li key={c.id}>
                <span className="fs2-prob-n">{n}×</span>
                <span className="fs2-prob-q">{c.front}</span>
                <span className="muted small">{dname(c.deckId)}{last ? ` · errou por último em ${fmtShort(toKey(new Date(last)))}` : ''}</span>
              </li>
            ))}
          </ol>
        ) : <p className="muted">Nenhum cartão esquecido até agora. 💪</p>}
      </section>
    </div>
  );
}
