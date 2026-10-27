import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../data/store';
import { Modal, useUI } from '../components/ui';
import { Icon } from '../components/Icon';
import { SessionEditor } from '../components/SessionForm';
import { activityLabel, areaOf, type Topic } from '../types';
import { topicStats, type TopicStats } from '../logic/progress';
import { addDays, diffDays, fmtShort, fromKey, MESES_LONGOS, pad, relDay, toKey, today, weekStart } from '../logic/dates';
import { play } from '../logic/sound';

// Revisões de todos os temas estudados. As datas são calculadas sozinhas a
// partir do desempenho e das datas reais (ver reviewEvents/scheduleReviews);
// flashcards entram automaticamente, revisões externas são registradas à mão.

interface Row {
  t: Topic;
  st: TopicStats;
  deckId: string | null; // baralho do tema com cartões
}

const pctTxt = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : null);
const STRENGTH = ['', 'fraca', 'frágil', 'boa', 'forte'];

export function Revisoes() {
  const { data } = useStore();
  const ui = useUI();
  const [logging, setLogging] = useState<string | 'any' | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const t0 = today();

  const rows: Row[] = useMemo(
    () =>
      data.topics
        .map((t) => {
          const deck = data.decks.find((d) => d.topicId === t.id && data.cards.some((c) => c.deckId === d.id));
          return { t, st: topicStats(t, data.sessions), deckId: deck?.id ?? null };
        })
        .filter((r) => r.st.sessions.length > 0)
        .sort((a, b) => (a.st.nextReview ?? '9').localeCompare(b.st.nextReview ?? '9') || a.t.name.localeCompare(b.t.name, 'pt-BR')),
    [data.topics, data.sessions, data.decks, data.cards],
  );
  const due = rows.filter((r) => r.st.nextReview && r.st.nextReview <= t0);
  const doneToday = rows.filter((r) => r.st.reviewEvents.some((e) => e.date === t0));
  const ws = weekStart(t0);
  const weekDone = rows.reduce((a, r) => a + r.st.reviewEvents.filter((e) => e.date >= ws).length, 0);

  const start = (r: Row, how: 'flash' | 'questoes') => {
    play('pop');
    if (how === 'flash' && r.deckId) ui.studyDeck(r.deckId);
    else setLogging(r.t.id);
  };

  return (
    <div className="page page-rev">
      <header className="ag-head">
        <div className="ag-nav">
          <h1 className="h1">Revisões</h1>
          <span className="rev-chips">
            <span className="rev-chip">{due.length ? `${due.length} para hoje` : 'tudo em dia'}</span>
            <span className="rev-chip is-soft">{weekDone} feita{weekDone === 1 ? '' : 's'} esta semana</span>
          </span>
        </div>
        <button className="btn btn-quiet" onClick={() => setLogging('any')}><Icon name="plus" size={17} /> Registrar revisão externa</button>
      </header>

      <div className="rev-top">
        <section className="card rev-today">
          <h2 className="card-title">Revisões de hoje</h2>
          {due.length === 0 ? (
            <div className="rev-empty">
              <span className="rev-empty-icon" aria-hidden="true">🌱</span>
              <p>{rows.length ? 'Nenhuma revisão para hoje. Seu jardim agradece!' : 'Estude um tema na trilha: a 1ª revisão aparece aqui no dia seguinte.'}</p>
            </div>
          ) : (
            <ul className="rev-list">
              {due.map((r, i) => {
                const late = diffDays(t0, r.st.nextReview!);
                const first = r.st.nextReviewType === 'flashcards';
                const a = areaOf(r.t.area);
                return (
                  <motion.li key={r.t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} style={{ ['--c' as string]: a.color, ['--i' as string]: a.ink }}>
                    <span className="rev-badge" aria-hidden="true">{r.st.reviews + 1}ª</span>
                    <div className="rev-main">
                      <button className="rev-name" onClick={() => ui.openTopic(r.t.id)}>{r.t.name}</button>
                      <span className="rev-meta">
                        {first ? '1ª revisão · flashcards' : `${r.st.reviews + 1}ª revisão · flashcards ou questões`}
                        {late > 0 && <span className="rev-late">atrasada {late === 1 ? '1 dia' : `${late} dias`}</span>}
                      </span>
                    </div>
                    <div className="rev-actions">
                      {r.deckId ? (
                        <button className="btn btn-primary btn-sm" onClick={() => start(r, 'flash')}>Começar flashcards</button>
                      ) : (
                        <button className="btn btn-secondary btn-sm" onClick={() => ui.go('flashcards')} title="Este tema ainda não tem baralho">Criar flashcards</button>
                      )}
                      {(!first || !r.deckId) && <button className="btn btn-quiet btn-sm" onClick={() => start(r, 'questoes')}>{first ? 'Registrar revisão' : 'Questões'}</button>}
                    </div>
                  </motion.li>
                );
              })}
            </ul>
          )}
          {doneToday.length > 0 && (
            <p className="rev-done">Feitas hoje: {doneToday.map((r) => r.t.name).join(', ')} ✓</p>
          )}
        </section>

        <MiniCal rows={rows} selected={day} onSelect={(d) => setDay(d === day ? null : d)} />
      </div>

      <section className="card rev-table-card">
        <h2 className="card-title">Progresso dos temas</h2>
        {rows.length === 0 ? (
          <p className="muted">Os temas aparecem aqui depois do primeiro registro de estudo.</p>
        ) : (
          <div className="table-scroll">
            <table className="table rev-table">
              <thead>
                <tr>
                  <th>Tema</th><th>Estudo inicial</th><th className="num">Acerto em questões</th><th>Revisões feitas</th><th>Próxima</th><th>Força</th><th aria-label="Abrir" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <TopicRow key={r.t.id} r={r} open={open === r.t.id} onToggle={() => setOpen(open === r.t.id ? null : r.t.id)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal open={!!logging} onClose={() => setLogging(null)} title="Registrar revisão">
        {logging && (
          <SessionEditor presetTopic={logging === 'any' ? undefined : logging} presetType="revisao" onDone={() => { setLogging(null); ui.toast('Revisão registrada. A próxima data foi recalculada.'); }} />
        )}
      </Modal>
    </div>
  );
}

function Strength({ v }: { v: number }) {
  return (
    <span className={`strength s${v}`} title={`Memória ${STRENGTH[v] || '—'}`} aria-label={`Força da memória: ${STRENGTH[v] || 'sem dado'}`}>
      {[1, 2, 3, 4].map((k) => <i key={k} className={k <= v ? 'on' : ''} />)}
    </span>
  );
}

function TopicRow({ r, open, onToggle }: { r: Row; open: boolean; onToggle: () => void }) {
  const ui = useUI();
  const t0 = today();
  const a = areaOf(r.t.area);
  const acc = r.st.questions ? Math.round((r.st.correct / r.st.questions) * 100) : null;
  const next = r.st.nextReview;
  return (
    <>
      <tr className={`rev-row ${open ? 'is-open' : ''}`} onClick={onToggle}>
        <td><span className="review-dot" style={{ background: a.color }} /> <button className="link" onClick={(e) => { e.stopPropagation(); ui.openTopic(r.t.id); }}>{r.t.name}</button></td>
        <td className="mono">{r.st.firstDate ? fmtShort(r.st.firstDate) : '—'}</td>
        <td className="num">{acc != null ? `${acc}%` : <span className="muted">—</span>}</td>
        <td>
          {r.st.reviewEvents.length ? (
            <span className="rev-evs">
              {r.st.reviewEvents.map((e) => (
                <span key={e.date} className="rev-ev" title={`${fmtShort(e.date)}: ${[e.questions ? `${e.correct}/${e.questions} questões` : '', e.cards ? `${e.cardsOk}/${e.cards} flashcards` : ''].filter(Boolean).join(' · ') || 'sem desempenho anotado'}`}>
                  {fmtShort(e.date)}
                  {e.perf != null && <b>{Math.round(e.perf * 100)}%</b>}
                </span>
              ))}
            </span>
          ) : <span className="muted">nenhuma ainda</span>}
        </td>
        <td className={`mono ${next && next < t0 ? 'rev-overdue' : next === t0 ? 'rev-today-cell' : ''}`}>{next ? relDay(next) : '—'}</td>
        <td><Strength v={r.st.strength} /></td>
        <td className="row-actions"><Icon name={open ? 'chevronD' : 'chevronR'} size={16} /></td>
      </tr>
      <AnimatePresence initial={false}>
        {open && (
          <tr className="rev-hist-row">
            <td colSpan={7}>
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="rev-hist">
                <ul>
                  {[...r.st.sessions].reverse().map((s) => {
                    const isRev = (s.type === 'revisao' || s.type === 'flashcards') && r.st.reviewEvents.some((e) => e.date === s.date);
                    return (
                      <li key={s.id}>
                        <span className="mono">{fmtShort(s.date)}</span>
                        <span>{activityLabel(s.type)}{s.date === r.st.firstDate ? ' · estudo inicial' : isRev ? ' · revisão' : ''}</span>
                        <span className="muted">
                          {[s.minutes ? `${s.minutes} min` : null, s.questions ? (s.type === 'flashcards' ? `${s.correct ?? 0}/${s.questions} cartões lembrados` : `${s.correct ?? 0}/${s.questions} questões (${pctTxt(s.correct ?? 0, s.questions)})`) : null].filter(Boolean).join(' · ')}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  );
}

function MiniCal({ rows, selected, onSelect }: { rows: Row[]; selected: string | null; onSelect: (d: string) => void }) {
  const t0 = today();
  const [cursor, setCursor] = useState(() => t0.slice(0, 7));
  const [y, m] = cursor.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const offset = (first.getDay() + 6) % 7;
  const daysIn = new Date(y, m, 0).getDate();
  const cells: (string | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysIn }, (_, i) => `${y}-${pad(m)}-${pad(i + 1)}`)];
  while (cells.length % 7) cells.push(null);
  const doneOn = new Map<string, Topic[]>();
  const planned = new Map<string, Topic[]>();
  for (const r of rows) {
    for (const e of r.st.reviewEvents) doneOn.set(e.date, [...(doneOn.get(e.date) ?? []), r.t]);
    // atrasadas aparecem no dia de hoje
    if (r.st.nextReview) {
      const k = r.st.nextReview < t0 ? t0 : r.st.nextReview;
      planned.set(k, [...(planned.get(k) ?? []), r.t]);
    }
  }
  const late = rows.filter((r) => r.st.nextReview && r.st.nextReview < t0).map((r) => r.t.id);
  const shift = (n: number) => setCursor(toKey(new Date(y, m - 1 + n, 1)).slice(0, 7));
  const sel = selected;
  return (
    <section className="card rev-cal">
      <div className="cal-nav">
        <button className="icon-btn" onClick={() => shift(-1)} aria-label="Mês anterior"><Icon name="chevronL" /></button>
        <h2 className="card-title rev-cal-month">{MESES_LONGOS[m - 1]} <span className="muted">{y}</span></h2>
        <button className="icon-btn" onClick={() => shift(1)} aria-label="Próximo mês"><Icon name="chevronR" /></button>
      </div>
      <div className="rev-grid">
        {['s', 't', 'q', 'q', 's', 's', 'd'].map((d, i) => <span key={i} className="rev-dow">{d}</span>)}
        {cells.map((k, i) => {
          if (!k) return <span key={`e${i}`} />;
          const done = doneOn.get(k)?.length ?? 0;
          const plan = planned.get(k) ?? [];
          const hasLate = k === t0 && plan.some((t) => late.includes(t.id));
          return (
            <button
              key={k}
              className={`rev-day ${k === t0 ? 'is-today' : ''} ${k === sel ? 'is-sel' : ''} ${k < t0 ? 'is-past' : ''}`}
              onClick={() => onSelect(k)}
              aria-label={`${fromKey(k).getDate()}: ${done} feitas, ${plan.length} agendadas`}
            >
              <span>{fromKey(k).getDate()}</span>
              <span className="rev-dots">
                {done > 0 && <i className="d-done" />}
                {plan.length > 0 && <i className={hasLate ? 'd-late' : 'd-plan'} />}
              </span>
            </button>
          );
        })}
      </div>
      <p className="rev-legend"><i className="d-done" /> feita <i className="d-plan" /> agendada <i className="d-late" /> atrasada</p>
      {sel && (
        <div className="rev-dayinfo">
          <strong>{fmtShort(sel)}</strong>
          {(doneOn.get(sel) ?? []).length > 0 && <p>Feitas: {doneOn.get(sel)!.map((t) => t.name).join(', ')}</p>}
          {(planned.get(sel) ?? []).length > 0 && <p>Agendadas: {planned.get(sel)!.map((t) => t.name).join(', ')}</p>}
          {!(doneOn.get(sel) ?? []).length && !(planned.get(sel) ?? []).length && <p className="muted">Nada neste dia.</p>}
        </div>
      )}
      <p className="muted small rev-next7">Próximos 7 dias: {rows.filter((r) => r.st.nextReview && r.st.nextReview > t0 && r.st.nextReview <= addDays(t0, 7)).length} revisões</p>
    </section>
  );
}
