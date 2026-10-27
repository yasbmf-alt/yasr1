import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../data/store';
import { Modal, useUI } from '../components/ui';
import { Icon } from '../components/Icon';
import { SessionEditor } from '../components/SessionForm';
import { activityLabel, areaOf, type Topic } from '../types';
import { StationIcon } from '../assets/art';
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

      <Journey rows={rows} open={open} onToggle={(id) => setOpen(open === id ? null : id)} />

      <Modal open={!!logging} onClose={() => setLogging(null)} title="Registrar revisão">
        {logging && (
          <SessionEditor presetTopic={logging === 'any' ? undefined : logging} presetType="revisao" onDone={() => { setLogging(null); ui.toast('Revisão registrada. A próxima data foi recalculada.'); }} />
        )}
      </Modal>
    </div>
  );
}

// ── Jornada dos temas ─────────────────────────────────────────

type JFilter = 'todos' | 'hoje' | 'atencao' | 'fortes';

/** estrelas por desempenho: 3 ≥ 90%, 2 ≥ 75%, 1 ≥ 60%, 0 abaixo (null = sem dado) */
const starsOf = (p: number | null) => (p == null ? null : p >= 0.9 ? 3 : p >= 0.75 ? 2 : p >= 0.6 ? 1 : 0);

function Hearts({ v }: { v: number }) {
  return (
    <span className={`hearts h${v}`} title={`Memória ${STRENGTH[v] || '—'}`} aria-label={`Força da memória: ${STRENGTH[v] || 'sem dado'}`}>
      {[1, 2, 3, 4].map((k) => (
        <svg key={k} viewBox="0 0 16 14" className={k <= v ? 'on' : ''} aria-hidden="true"><path d="M8 13 C 3 9 0 7 0 4 a4 4 0 0 1 8 -1 a4 4 0 0 1 8 1 c0 3 -3 5 -8 9z" /></svg>
      ))}
    </span>
  );
}

function Journey({ rows, open, onToggle }: { rows: Row[]; open: string | null; onToggle: (id: string) => void }) {
  const [f, setF] = useState<JFilter>('todos');
  const t0 = today();
  const counts = {
    hoje: rows.filter((r) => r.st.nextReview && r.st.nextReview <= t0).length,
    atencao: rows.filter((r) => r.st.strength <= 2).length,
    fortes: rows.filter((r) => r.st.strength >= 4).length,
  };
  const list = rows.filter((r) => (f === 'hoje' ? r.st.nextReview && r.st.nextReview <= t0 : f === 'atencao' ? r.st.strength <= 2 : f === 'fortes' ? r.st.strength >= 4 : true));
  return (
    <section className="jr">
      <div className="jr-head">
        <h2 className="card-title">Jornada dos temas</h2>
        <div className="chip-row" role="radiogroup" aria-label="Filtrar temas">
          {([['todos', `Todos · ${rows.length}`], ['hoje', `Para hoje · ${counts.hoje}`], ['atencao', `Precisam de atenção · ${counts.atencao}`], ['fortes', `Fortes · ${counts.fortes}`]] as [JFilter, string][]).map(([id, label]) => (
            <button key={id} role="radio" aria-checked={f === id} className={`chip-toggle ${f === id ? 'is-on' : ''}`} onClick={() => setF(id)}>{label}</button>
          ))}
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="muted">Os temas aparecem aqui depois do primeiro registro de estudo.</p>
      ) : list.length === 0 ? (
        <p className="muted">Nenhum tema neste filtro.</p>
      ) : (
        <div className="jr-grid">
          {list.map((r, i) => <JourneyCard key={r.t.id} r={r} i={i} open={open === r.t.id} onToggle={() => onToggle(r.t.id)} />)}
        </div>
      )}
    </section>
  );
}

function JourneyCard({ r, i, open, onToggle }: { r: Row; i: number; open: boolean; onToggle: () => void }) {
  const ui = useUI();
  const t0 = today();
  const a = areaOf(r.t.area);
  const evs = r.st.reviewEvents;
  const shown = evs.slice(-5);
  const hidden = evs.length - shown.length;
  const acc = r.st.questions ? Math.round((r.st.correct / r.st.questions) * 100) : null;
  const next = r.st.nextReview;
  const late = next && next < t0 ? diffDays(t0, next) : 0;
  const nextTxt = !next ? '—' : next === t0 ? 'hoje' : late ? `atrasada ${late}d` : relDay(next);
  return (
    <motion.article
      className={`jc ${open ? 'is-open' : ''} ${late ? 'is-late' : next === t0 ? 'is-today' : ''}`}
      style={{ ['--c' as string]: a.color, ['--i' as string]: a.ink }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(i, 10) * 0.04 }}
      layout="position"
    >
      <button className="jc-top" onClick={onToggle} aria-expanded={open}>
        <span className="jc-icon" aria-hidden="true"><StationIcon area={r.t.area} /></span>
        <span className="jc-title">
          <strong>{r.t.name}</strong>
          <span className="jc-level">Nível {evs.length}{acc != null ? ` · ${acc}% nas questões` : ''}</span>
        </span>
        <Hearts v={r.st.strength} />
      </button>

      <div className="jc-track" aria-label="Estudo, revisões e próxima revisão">
        <span className="jc-step is-start" title={`Estudo inicial em ${r.st.firstDate ? fmtShort(r.st.firstDate) : '—'}`}>
          <span className="jc-dot">🌱</span>
          <span className="jc-date">{r.st.firstDate ? fmtShort(r.st.firstDate) : ''}</span>
        </span>
        {hidden > 0 && <span className="jc-more">+{hidden}</span>}
        {shown.map((e, k) => {
          const st = starsOf(e.perf);
          const n = evs.length - shown.length + k + 1;
          return (
            <span key={e.date} className={`jc-step s${st ?? 'x'}`} title={`${n}ª revisão em ${fmtShort(e.date)}${e.perf != null ? ` · ${Math.round(e.perf * 100)}%` : ''}`}>
              <span className="jc-line" />
              <span className="jc-dot">{n}</span>
              <span className="jc-stars">{st == null ? '·' : st === 0 ? '↺' : '★'.repeat(st)}</span>
              <span className="jc-date">{fmtShort(e.date)}</span>
            </span>
          );
        })}
        <span className={`jc-step is-next ${late ? 'late' : next === t0 ? 'now' : ''}`} title={next ? `Próxima revisão: ${fmtShort(next)}` : ''}>
          <span className="jc-line dashed" />
          <span className="jc-dot">{evs.length + 1}</span>
          <span className="jc-date">{nextTxt}</span>
        </span>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div className="jc-hist" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            <ul>
              {[...r.st.sessions].reverse().map((s) => {
                const isRev = (s.type === 'revisao' || s.type === 'flashcards') && evs.some((e) => e.date === s.date);
                return (
                  <li key={s.id}>
                    <span className="mono">{fmtShort(s.date)}</span>
                    <span>{activityLabel(s.type)}{s.date === r.st.firstDate ? ' · estudo inicial' : isRev && s.type !== 'revisao' ? ' · revisão' : ''}</span>
                    <span className="muted">
                      {[s.minutes ? `${s.minutes} min` : null, s.questions ? (s.type === 'flashcards' ? `${s.correct ?? 0}/${s.questions} lembrados` : `${s.correct ?? 0}/${s.questions} (${pctTxt(s.correct ?? 0, s.questions)})`) : null].filter(Boolean).join(' · ')}
                    </span>
                  </li>
                );
              })}
            </ul>
            <button className="btn btn-quiet btn-sm" onClick={() => ui.openTopic(r.t.id)}>Abrir ficha do tema</button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
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
