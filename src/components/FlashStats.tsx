import React, { useMemo } from 'react';
import { useStore } from '../data/store';
import { useUI } from './ui';
import { areaOf } from '../types';
import { addDays, fmtShort, today, weekStart } from '../logic/dates';

// Estatísticas só de flashcards. "Lembrados" (Difícil, Bom ou Fácil) nunca
// entra no acerto de questões, e vice-versa.

const pct = (ok: number, n: number) => (n ? Math.round((ok / n) * 100) : null);

export function FlashStats() {
  const { data } = useStore();
  const ui = useUI();
  const fs = useMemo(() => data.sessions.filter((s) => s.type === 'flashcards' && s.questions), [data.sessions]);
  const tmap = new Map(data.topics.map((t) => [t.id, t]));
  const dmap = new Map(data.decks.map((d) => [d.id, d]));

  const total = fs.reduce((a, s) => a + (s.questions ?? 0), 0);
  const ok = fs.reduce((a, s) => a + (s.correct ?? 0), 0);

  // por tema
  const byTopic = new Map<string, { n: number; ok: number; last: string }>();
  for (const s of fs) {
    const x = byTopic.get(s.topicId) ?? { n: 0, ok: 0, last: '' };
    x.n += s.questions ?? 0;
    x.ok += s.correct ?? 0;
    if (s.date > x.last) x.last = s.date;
    byTopic.set(s.topicId, x);
  }
  const topics = [...byTopic.entries()].map(([id, x]) => ({ id, t: tmap.get(id), ...x, p: pct(x.ok, x.n)! })).sort((a, b) => b.n - a.n);
  const hard = topics.filter((x) => x.n >= 10).sort((a, b) => a.p - b.p).slice(0, 3).filter((x) => x.p < 80);

  // cartões mais esquecidos
  const missed = data.cards
    .map((c) => ({ c, n: (c.log ?? []).filter((r) => r.g === 1).length + c.fsrs.lapses }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n || b.c.fsrs.difficulty - a.c.fsrs.difficulty)
    .slice(0, 8);

  // evolução semanal (últimas 8 semanas)
  const ws = weekStart(today());
  const weeks = Array.from({ length: 8 }, (_, i) => ({ w: addDays(ws, -7 * (7 - i)), n: 0, ok: 0 }));
  for (const s of fs) {
    const w = weeks.find((x) => x.w === weekStart(s.date));
    if (w) {
      w.n += s.questions ?? 0;
      w.ok += s.correct ?? 0;
    }
  }
  const maxN = Math.max(10, ...weeks.map((w) => w.n));
  const recent = [...fs].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).slice(0, 10);

  if (!fs.length && !missed.length)
    return (
      <div className="empty-big">
        <h2>Nenhum flashcard respondido ainda</h2>
        <p>As estatísticas de flashcards aparecem aqui depois da primeira sessão, separadas do acerto de questões.</p>
        <button className="btn btn-primary" onClick={() => ui.go('flashcards')}>Ir para os flashcards</button>
      </div>
    );

  return (
    <div className="fst">
      <div className="sim-kpis">
        <div className="sk"><span className="sk-v">{total}</span><span className="sk-l">cartões respondidos</span></div>
        <div className="sk"><span className="sk-v">{pct(ok, total) ?? '—'}{total ? '%' : ''}</span><span className="sk-l">lembrados (difícil, bom ou fácil)</span></div>
        <div className="sk"><span className="sk-v">{data.cards.filter((c) => c.fsrs.phase !== 'new').length}</span><span className="sk-l">cartões já estudados</span></div>
        <div className="sk"><span className="sk-v">{topics.length}</span><span className="sk-l">temas com flashcards</span></div>
      </div>

      <div className="fst-grid">
        <section className="card">
          <h3 className="card-title">Evolução por semana</h3>
          <div className="fst-weeks" role="table" aria-label="Cartões e lembrados por semana">
            {weeks.map((w) => {
              const p = pct(w.ok, w.n);
              return (
                <div key={w.w} className="fst-week" role="row" title={`Semana de ${fmtShort(w.w)}: ${w.n} cartões${p != null ? `, ${p}% lembrados` : ''}`}>
                  <span className="fst-p">{p != null ? `${p}%` : ''}</span>
                  <span className="fst-bar"><span style={{ height: `${(w.n / maxN) * 100}%` }} /></span>
                  <span className="fst-w">{fmtShort(w.w)}</span>
                </div>
              );
            })}
          </div>
          <p className="field-hint">Altura: cartões respondidos. Número: % lembrados na semana.</p>
        </section>

        <section className="card">
          <h3 className="card-title">Por tema</h3>
          {topics.length ? (
            <ul className="fst-topics">
              {topics.map((x) => (
                <li key={x.id}>
                  <span className="review-dot" style={{ background: areaOf(x.t?.area ?? 'geral').color }} />
                  <span className="fst-name">{x.t?.name ?? 'Tema removido'}</span>
                  <span className="fst-track"><span style={{ width: `${x.p}%` }} /></span>
                  <span className="fst-val">{x.p}%</span>
                  <span className="muted small">{x.n} cartões</span>
                </li>
              ))}
            </ul>
          ) : <p className="muted">Ligue os baralhos a temas para ver o desempenho por tema.</p>}
          {hard.length > 0 && <p className="fst-hard">Temas mais difíceis: <strong>{hard.map((x) => x.t?.name).filter(Boolean).join(', ')}</strong></p>}
        </section>

        <section className="card">
          <h3 className="card-title">Cartões que você mais esquece</h3>
          {missed.length ? (
            <ul className="fst-missed">
              {missed.map(({ c, n }) => (
                <li key={c.id}>
                  <span className="fst-front">{c.front}</span>
                  <span className="muted small">{dmap.get(c.deckId)?.name ?? ''} · {n} {n === 1 ? 'esquecimento' : 'esquecimentos'}</span>
                </li>
              ))}
            </ul>
          ) : <p className="muted">Nenhum cartão esquecido até agora.</p>}
        </section>

        <section className="card">
          <h3 className="card-title">Histórico de sessões</h3>
          <ul className="fst-hist">
            {recent.map((s) => (
              <li key={s.id}>
                <span className="mono">{fmtShort(s.date)}</span>
                <span className="fst-name">{tmap.get(s.topicId)?.name ?? 'Tema removido'}</span>
                <span className="muted small">{s.questions} cartões · {pct(s.correct ?? 0, s.questions ?? 0)}%</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
