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
  const maxF = Math.max(5, ...forecast.map((f) => f.n));

  // maturidade
  const ivl = (c: Flashcard) => (c.fsrs.lastReview ? (new Date(c.fsrs.due).getTime() - new Date(c.fsrs.lastReview).getTime()) / DAY : 0);
  const mat = {
    novos: cards.filter((c) => c.fsrs.phase === 'new').length,
    aprendendo: cards.filter((c) => c.fsrs.phase === 'learning' || c.fsrs.phase === 'relearning').length,
    jovens: cards.filter((c) => c.fsrs.phase === 'review' && ivl(c) < 21).length,
    maduros: cards.filter((c) => c.fsrs.phase === 'review' && ivl(c) >= 21).length,
  };
  const matTotal = Math.max(1, cards.length);

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
          <span className="fs2-s">{forecast[0].n ? `${forecast[0].n} vencem hoje` : 'nada vencendo hoje'}</span>
        </div>
      </div>

      <div className="fs2-row">
        {/* previsão */}
        <section className="card fs2-card">
          <h3 className="card-title">Previsão: cartões que vencem</h3>
          <div className="fs2-fc">
            {forecast.map((f, i) => (
              <div key={f.day} className={`fs2-fc-day ${i === 0 ? 'is-today' : ''}`}>
                <span className="fs2-fc-n">{f.n}</span>
                <span className="fs2-fc-bar"><motion.span initial={{ height: 0 }} animate={{ height: `${(f.n / maxF) * 100}%` }} transition={{ delay: i * 0.05 }} /></span>
                <span className="fs2-fc-d">{i === 0 ? 'hoje' : i === 1 ? 'amanhã' : DIAS_CURTOS[fromKey(f.day).getDay()]}</span>
              </div>
            ))}
          </div>
          <p className="field-hint">Os atrasados entram em "hoje". Use o Modo Turbo quando a barra de hoje estiver alta.</p>
        </section>

        {/* maturidade */}
        <section className="card fs2-card">
          <h3 className="card-title">Maturidade dos cartões</h3>
          <div className="fs2-mat" role="img" aria-label={`${mat.maduros} maduros, ${mat.jovens} jovens, ${mat.aprendendo} aprendendo, ${mat.novos} novos`}>
            {([['maduros', mat.maduros], ['jovens', mat.jovens], ['aprendendo', mat.aprendendo], ['novos', mat.novos]] as const).map(([k, v]) => v > 0 && <span key={k} className={`m-${k}`} style={{ width: `${(v / matTotal) * 100}%` }} />)}
          </div>
          <ul className="fs2-mat-leg">
            <li><i className="m-maduros" /> <b>{mat.maduros}</b> maduros <span className="muted">(intervalo ≥ 21 dias)</span></li>
            <li><i className="m-jovens" /> <b>{mat.jovens}</b> jovens</li>
            <li><i className="m-aprendendo" /> <b>{mat.aprendendo}</b> aprendendo</li>
            <li><i className="m-novos" /> <b>{mat.novos}</b> novos (nunca estudados)</li>
          </ul>
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
