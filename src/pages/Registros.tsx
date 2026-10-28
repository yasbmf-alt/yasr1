// Registro de estudos: cabeçalho limpo, filtros, cartões que expandem e
// visão em calendário. Sessões e simulados aparecem juntos, sem campos vazios.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useStore } from '../data/store';
import { useUI, Modal, ConfirmButton } from '../components/ui';
import { Icon } from '../components/Icon';
import { DEFAULT_GOAL, DayHours, dayStudyMinutes } from '../components/HoursJar';
import { SessionEditor } from '../components/SessionForm';
import { SimuladoForm, AREA_CHART } from './Simulados';
import { play } from '../logic/sound';
import { topicStats } from '../logic/progress';
import { groupPct, groupStudy, type StudyGroup } from '../logic/studyGroups';
import {
  ACTIVITY_TYPES, AREAS, BIG_AREAS, CORRECTION_TYPE, MASTERY, activityLabel, areaOf, reasonLabel, subtemaLabel,
  type ActivityType, type Area, type Session, type Simulado, type Topic,
} from '../types';
import { addDays, DIAS_CURTOS, fmtMinutes, fmtShort, fromKey, MESES_LONGOS, pad, toKey, today } from '../logic/dates';

type Period = '7' | '30' | '90' | 'mes' | 'tudo';
type Status = '' | 'vencida' | 'proxima' | 'sem' | 'missao' | 'avulso';
type TypeFilter = ActivityType | 'simulado' | '';

const PERIODS: { id: Period; label: string }[] = [
  { id: '7', label: '7 dias' },
  { id: '30', label: '30 dias' },
  { id: '90', label: '90 dias' },
  { id: 'mes', label: 'Este mês' },
  { id: 'tudo', label: 'Tudo' },
];

const STATUS: { id: Status; label: string }[] = [
  { id: '', label: 'Qualquer status' },
  { id: 'vencida', label: 'Revisão vencida' },
  { id: 'proxima', label: 'Revisão nos próximos 7 dias' },
  { id: 'sem', label: 'Sem revisão marcada' },
  { id: 'missao', label: 'Veio de uma missão' },
  { id: 'avulso', label: 'Registro avulso' },
];

type Entry =
  | { kind: 'session'; id: string; date: string; createdAt: string; s: Session; topic?: Topic }
  | { kind: 'simulado'; id: string; date: string; createdAt: string; sim: Simulado };

const pctOf = (c: number | null | undefined, t: number | null | undefined) => (t && c != null ? Math.round((c / t) * 100) : null);
const pctTone = (p: number | null) => (p == null ? '' : p >= 80 ? 'pct-ok' : p >= 60 ? 'pct-mid' : 'pct-low');

function dayLabel(k: string) {
  const t = today();
  if (k === t) return 'Hoje';
  if (k === addDays(t, -1)) return 'Ontem';
  const d = fromKey(k);
  const base = `${DIAS_CURTOS[d.getDay()]}, ${d.getDate()} de ${MESES_LONGOS[d.getMonth()].toLowerCase()}`;
  return d.getFullYear() === new Date().getFullYear() ? base : `${base} de ${d.getFullYear()}`;
}

function readPref<T extends string>(key: string, fallback: T): T {
  try {
    return (localStorage.getItem(key) as T) || fallback;
  } catch {
    return fallback;
  }
}
function writePref(key: string, v: string) {
  try {
    localStorage.setItem(key, v);
  } catch {
    /* sem armazenamento */
  }
}

export function Registros() {
  const { data, saving, mode } = useStore();
  const reduce = useReducedMotion();
  const ui = useUI();
  const [q, setQ] = useState('');
  const [period, setPeriodRaw] = useState<Period>(() => readPref<Period>('yasr1-reg-period', 'tudo'));
  const [area, setArea] = useState<Area | ''>('');
  const [type, setType] = useState<TypeFilter>('');
  const [status, setStatus] = useState<Status>('');
  const [view, setViewRaw] = useState<'lista' | 'calendario'>(() => readPref('yasr1-reg-view', 'lista'));
  const [day, setDay] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const [limit, setLimit] = useState(40);
  const [editing, setEditing] = useState<{ s?: Session; dup?: boolean } | null>(null);
  const [simEditing, setSimEditing] = useState<Simulado | 'new' | null>(null);
  const [newType, setNewType] = useState<'sessao' | 'simulado' | null>(null);
  const setPeriod = (p: Period) => {
    setPeriodRaw(p);
    writePref('yasr1-reg-period', p);
  };
  const setView = (v: 'lista' | 'calendario') => {
    setViewRaw(v);
    writePref('yasr1-reg-view', v);
  };

  const tmap = useMemo(() => new Map(data.topics.map((t) => [t.id, t])), [data.topics]);
  const reviews = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const t of data.topics) m.set(t.id, topicStats(t, data.sessions).nextReview);
    return m;
  }, [data.topics, data.sessions]);

  const all: Entry[] = useMemo(() => {
    const out: Entry[] = data.sessions.map((s) => ({ kind: 'session' as const, id: s.id, date: s.date, createdAt: s.createdAt, s, topic: tmap.get(s.topicId) }));
    for (const sim of data.simulados) out.push({ kind: 'simulado', id: sim.id, date: sim.date, createdAt: sim.createdAt, sim });
    return out.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }, [data.sessions, data.simulados, tmap]);

  const t0 = today();
  const since = period === 'tudo' ? null : period === 'mes' ? `${t0.slice(0, 7)}-01` : addDays(t0, -(Number(period) - 1));
  const filtersOn = !!(q || area || type || status || day || period !== 'tudo');

  const matches = (e: Entry, ignoreDay = false) => {
    if (!ignoreDay && day && e.date !== day) return false;
    if (since && e.date < since) return false;
    if (e.kind === 'simulado') {
      if (type && type !== 'simulado') return false;
      if (area) return false;
      if (status) return false;
      if (q && !e.sim.name.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    }
    const { s, topic } = e;
    if (type && s.type !== type) return false;
    if (area && topic?.area !== area) return false;
    if (q) {
      const hay = `${topic?.name ?? 'estudo livre'} ${topic?.specialty ?? ''} ${s.notes} ${s.source ?? ''}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    if (status) {
      const nr = reviews.get(s.topicId) ?? null;
      if (status === 'vencida' && !(nr && nr < t0)) return false;
      if (status === 'proxima' && !(nr && nr >= t0 && nr <= addDays(t0, 7))) return false;
      if (status === 'sem' && nr) return false;
      if (status === 'missao' && !s.missionId) return false;
      if (status === 'avulso' && s.missionId) return false;
    }
    return true;
  };

  const rows = all.filter((e) => matches(e));
  const forCalendar = all.filter((e) => matches(e, true));

  // resumo do período filtrado
  const sums = rows.reduce(
    (a, e) => {
      if (e.kind === 'session') {
        a.min += e.s.minutes ?? 0;
        if (e.s.questions && e.s.type !== 'flashcards') {
          a.q += e.s.questions;
          a.c += e.s.correct ?? 0;
        }
      } else {
        a.min += e.sim.minutes ?? 0;
      }
      return a;
    },
    { min: 0, q: 0, c: 0 },
  );

  const clear = () => {
    setQ('');
    setArea('');
    setType('');
    setStatus('');
    setDay(null);
    setPeriod('tudo');
  };

  const flash = (id: string) => {
    setFresh(id);
    setOpen(null);
    play('pop');
    setTimeout(() => setFresh((f) => (f === id ? null : f)), 2200);
  };

  // simulados novos aparecem destacados também
  const simCount = useRef(data.simulados.length);
  useEffect(() => {
    if (data.simulados.length > simCount.current) {
      const newest = [...data.simulados].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      if (newest) flash(newest.id);
    }
    simCount.current = data.simulados.length;
  }, [data.simulados]);

  // correção de simulado se edita na própria Correção de Simulados
  const openCorrection = (s: Session) => {
    try {
      localStorage.setItem('yasr1-sim-tab', 'corr');
      if (s.simuladoId) localStorage.setItem('yasr1-corr-sim', s.simuladoId);
    } catch {
      /* ignore */
    }
    ui.go('simulados');
  };

  // no dia, as atividades do mesmo tema viram um cartão só (os registros continuam separados por dentro)
  const dayRows = (items: Entry[]) => {
    const sess = items.filter((e): e is Extract<Entry, { kind: 'session' }> => e.kind === 'session');
    const byId = new Map(sess.map((e) => [e.s.id, e]));
    const out: ({ kind: 'group'; g: StudyGroup; entries: Entry[]; at: string } | { kind: 'sim'; e: Entry; at: string })[] = [
      ...groupStudy(sess.map((e) => e.s), data.topics, data.simulados).map((g) => ({ kind: 'group' as const, g, entries: g.sessions.map((x) => byId.get(x.id)!), at: g.createdAt })),
      ...items.filter((e) => e.kind === 'simulado').map((e) => ({ kind: 'sim' as const, e, at: e.createdAt })),
    ];
    return out.sort((a, b) => b.at.localeCompare(a.at));
  };

  // agrupado por dia
  const groups: { date: string; items: Entry[] }[] = [];
  for (const e of rows.slice(0, limit)) {
    const g = groups[groups.length - 1];
    if (g && g.date === e.date) g.items.push(e);
    else groups.push({ date: e.date, items: [e] });
  }

  return (
    <section className="reg">
      <header className="reg-head">
        <div className="reg-title">
          <h2 className="h2">Registro de estudos</h2>
          <p className="muted reg-summary">
            {rows.length === 0
              ? all.length ? 'Nenhum registro com esses filtros.' : 'Nada por aqui ainda.'
              : `${rows.length} ${rows.length === 1 ? 'registro' : 'registros'}${sums.min ? ` · ${fmtMinutes(sums.min)}` : ''}${sums.q ? ` · ${sums.q} questões, ${pctOf(sums.c, sums.q)}% de acerto` : ''}`}
          </p>
        </div>
        <div className="reg-head-actions">
          {mode === 'db' || mode === 'local' || mode === 'cloud' ? (
            <span className={`save-pill ${saving ? 'is-saving' : ''}`} role="status" aria-live="polite">
              {saving ? <span className="save-spin" aria-hidden="true" /> : <Icon name="cloudCheck" size={16} />}
              {saving ? 'Salvando…' : 'Tudo salvo'}
            </span>
          ) : null}
          <button className="btn btn-primary btn-lg reg-add" onClick={() => setNewType('sessao')}>
            <Icon name="plus" size={20} /> Novo registro
          </button>
        </div>
      </header>

      <div className="reg-tools">
        <label className="reg-search">
          <Icon name="search" size={18} />
          <input id="reg-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por tema, especialidade ou anotação" aria-label="Buscar registros" />
          {q && <button type="button" className="icon-btn icon-btn-sm" onClick={() => setQ('')} aria-label="Limpar busca"><Icon name="close" size={14} /></button>}
        </label>
        <div className="seg reg-view" role="tablist" aria-label="Visualização">
          <button role="tab" aria-selected={view === 'lista'} className={view === 'lista' ? 'is-on' : ''} onClick={() => setView('lista')}><Icon name="list" size={16} /> Lista</button>
          <button role="tab" aria-selected={view === 'calendario'} className={view === 'calendario' ? 'is-on' : ''} onClick={() => setView('calendario')}><Icon name="calendar" size={16} /> Calendário</button>
        </div>
      </div>

      <div className="reg-filters">
        <div className="chip-row" role="radiogroup" aria-label="Período">
          {PERIODS.map((p) => (
            <button key={p.id} role="radio" aria-checked={period === p.id} className={`chip-toggle ${period === p.id ? 'is-on' : ''}`} onClick={() => setPeriod(p.id)}>{p.label}</button>
          ))}
        </div>
        <select id="reg-area" value={area} onChange={(e) => setArea(e.target.value as Area | '')} aria-label="Especialidade">
          <option value="">Todas as áreas</option>
          {AREAS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
        </select>
        <select id="reg-type" value={type} onChange={(e) => setType(e.target.value as TypeFilter)} aria-label="Tipo de atividade">
          <option value="">Todos os tipos</option>
          {ACTIVITY_TYPES.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          <option value={CORRECTION_TYPE.id}>{CORRECTION_TYPE.label}</option>
          <option value="simulado">Simulado</option>
        </select>
        <select id="reg-status" value={status} onChange={(e) => setStatus(e.target.value as Status)} aria-label="Status">
          {STATUS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <AnimatePresence>
          {filtersOn && (
            <motion.button className="btn btn-quiet btn-sm" onClick={clear} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              <Icon name="close" size={14} /> Limpar filtros
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {view === 'calendario' ? (
          <motion.div key="cal" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            <RegCalendar
              entries={forCalendar}
              selected={day}
              onSelect={(d) => {
                setDay(d === day ? null : d);
              }}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {day && (
        <div className="reg-dayfilter">
          Mostrando só {dayLabel(day).toLowerCase()}
          <button className="btn btn-quiet btn-sm" onClick={() => setDay(null)}><Icon name="close" size={14} /> ver todos</button>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState filtered={all.length > 0} onClear={clear} onAdd={() => setNewType('sessao')} />
      ) : (
        <div className="reg-list">
          <AnimatePresence initial={false}>
            {groups.map((g) => (
              <motion.div key={g.date} className="reg-day" layout={!reduce} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <h3 className="reg-day-title">{dayLabel(g.date)}<DayHours minutes={dayStudyMinutes(data.sessions, data.simulados, g.date)} goal={data.settings.dailyGoalMinutes ?? DEFAULT_GOAL} /></h3>
                <AnimatePresence initial={false}>
                  {dayRows(g.items).map((r) =>
                    r.kind === 'group' ? (
                      <GroupCard
                        key={r.g.key}
                        g={r.g}
                        entries={r.entries}
                        open={open === r.g.key}
                        fresh={!!fresh && r.entries.some((e) => e.id === fresh)}
                        reviews={reviews}
                        onToggle={() => setOpen(open === r.g.key ? null : r.g.key)}
                        onEdit={(s) => (s.type === 'correcao' ? openCorrection(s) : setEditing({ s }))}
                        onDuplicate={(s) => (s.type === 'correcao' ? openCorrection(s) : setEditing({ s, dup: true }))}
                      />
                    ) : (
                      <EntryCard
                        key={r.e.id}
                        e={r.e}
                        open={open === r.e.id}
                        fresh={fresh === r.e.id}
                        nextReview={null}
                        onToggle={() => setOpen(open === r.e.id ? null : r.e.id)}
                        onEdit={() => r.e.kind === 'simulado' && setSimEditing(r.e.sim)}
                        onDuplicate={() => undefined}
                      />
                    ),
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
          {rows.length > limit && (
            <button className="btn btn-quiet reg-more" onClick={() => setLimit(limit + 40)}>Mostrar mais {Math.min(40, rows.length - limit)}</button>
          )}
        </div>
      )}

      <Modal open={newType === 'sessao' || !!editing} onClose={() => { setNewType(null); setEditing(null); }} title={editing?.s && !editing.dup ? 'Editar registro' : editing?.dup ? 'Duplicar registro' : 'Novo registro'}>
        {!editing && newType === 'sessao' && (
          <div className="reg-kind">
            <span className="field-label">O que você quer registrar?</span>
            <div className="chip-row">
              <button className="chip-toggle is-on" type="button">Sessão de estudo</button>
              <button className="chip-toggle" type="button" onClick={() => { setNewType(null); setSimEditing('new'); }}>Simulado</button>
            </div>
          </div>
        )}
        {(newType === 'sessao' || editing) && (
          <SessionEditor
            key={editing?.s?.id ?? 'new'}
            session={editing?.s}
            duplicate={editing?.dup}
            onSaved={(s) => flash(s.id)}
            onDone={() => { setNewType(null); setEditing(null); }}
          />
        )}
      </Modal>
      <SimuladoForm value={simEditing} onClose={() => setSimEditing(null)} />
    </section>
  );
}

// ── Cartão de um tema no dia (várias atividades) ──────────────

function GroupCard({ g, entries, open, fresh, reviews, onToggle, onEdit, onDuplicate }: {
  g: StudyGroup; entries: Entry[]; open: boolean; fresh: boolean; reviews: Map<string, string | null>;
  onToggle: () => void; onEdit: (s: Session) => void; onDuplicate: (s: Session) => void;
}) {
  const reduce = useReducedMotion();
  const [inner, setInner] = useState<string | null>(null);
  const p = groupPct(g);
  const a = areaOf(g.area);
  const correction = g.sessions[0]?.type === 'correcao';
  return (
    <motion.article
      layout={!reduce ? 'position' : false}
      className={`reg-card reg-group ${open ? 'is-open' : ''} ${fresh ? 'is-fresh' : ''}`}
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
    >
      <button className="reg-row" onClick={onToggle} aria-expanded={open} aria-label={`${g.title}: ${entries.length} atividade${entries.length > 1 ? 's' : ''}`}>
        <span className="reg-dot" style={{ background: correction ? 'var(--azul)' : a.color }} aria-hidden="true" />
        <span className="reg-main">
          <span className="reg-name">{g.title}</span>
          <span className="reg-meta">
            <span>{g.minutes ? `Tempo total: ${fmtMinutes(g.minutes)}` : 'Sem tempo registrado'}</span>
          </span>
        </span>
        {p != null && <span className={`pct ${pctTone(p)}`} title="Acerto geral do tema no dia">{p}%</span>}
        <motion.span className="reg-chev" animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} aria-hidden="true">
          <Icon name="chevronD" size={18} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="reg-detail-wrap reg-group-items"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.26, ease: [0.3, 0.7, 0.2, 1] }}
          >
            {entries.map((e) =>
              e.kind === 'session' ? (
                <EntryCard
                  key={e.id}
                  e={e}
                  open={inner === e.id}
                  fresh={false}
                  nextReview={reviews.get(e.s.topicId) ?? null}
                  onToggle={() => setInner(inner === e.id ? null : e.id)}
                  onEdit={() => onEdit(e.s)}
                  onDuplicate={() => onDuplicate(e.s)}
                />
              ) : null,
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

// ── Cartão de registro ────────────────────────────────────────

function EntryCard({ e, open, fresh, nextReview, onToggle, onEdit, onDuplicate }: {
  e: Entry; open: boolean; fresh: boolean; nextReview: string | null;
  onToggle: () => void; onEdit: () => void; onDuplicate: () => void;
}) {
  const reduce = useReducedMotion();
  const t0 = today();
  const reviewTone = nextReview ? (nextReview < t0 ? 'is-late' : nextReview <= addDays(t0, 7) ? 'is-soon' : 'is-later') : '';
  const isSim = e.kind === 'simulado';
  const a = isSim ? null : areaOf(e.topic?.area ?? 'geral');
  const title = isSim ? e.sim.name : e.s.type === 'correcao' ? 'Correção de simulado' : e.topic?.name ?? (e.s.topicId ? 'Tema removido' : 'Estudo livre');
  const minutes = isSim ? e.sim.minutes : e.s.minutes;
  const q = isSim ? e.sim.total : e.s.questions;
  const c = isSim ? e.sim.correct : e.s.correct;
  const p = pctOf(c, q);
  const typeLabel = isSim ? 'Simulado' : activityLabel(e.s.type);

  return (
    <motion.article
      layout={!reduce ? 'position' : false}
      className={`reg-card ${open ? 'is-open' : ''} ${fresh ? 'is-fresh' : ''}`}
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
    >
      <button className="reg-row" onClick={onToggle} aria-expanded={open}>
        <span className="reg-dot" style={{ background: isSim ? 'var(--azul)' : a!.color }} aria-hidden="true" />
        <span className="reg-main">
          <span className="reg-name">{title}</span>
          <span className="reg-meta">
            <span className="reg-type">{typeLabel}</span>
            {!isSim && e.s.missionId && <span className="tiny-tag">missão</span>}
            {!isSim && e.s.focus && <span className="tiny-tag">foco</span>}
            {minutes ? <span>{fmtMinutes(minutes)}</span> : null}
            {q ? <span>{q} {!isSim && e.s.type === 'flashcards' ? 'cartões' : 'questões'}</span> : null}
            {!isSim && e.s.type === 'videoaula' && e.s.watched && <span>{e.s.watched === 'completa' ? 'aula completa' : 'aula parcial'}</span>}
            {!isSim && e.s.type === 'revisao' && e.s.method && <span>{e.s.method}</span>}
          </span>
        </span>
        {p != null && <span className={`pct ${pctTone(p)}`}>{p}%</span>}
        {nextReview && (
          <span className={`reg-review ${reviewTone}`} title={`Próxima revisão: ${fmtShort(nextReview)}`}>
            <Icon name="revisao" size={14} />
            <span className="sr-only">Próxima revisão em {fmtShort(nextReview)}</span>
          </span>
        )}
        <motion.span className="reg-chev" animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} aria-hidden="true">
          <Icon name="chevronD" size={18} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="reg-detail-wrap"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.26, ease: [0.3, 0.7, 0.2, 1] }}
          >
            {isSim ? <SimDetail sim={e.sim} onEdit={onEdit} /> : <SessionDetail s={e.s} topic={e.topic} nextReview={nextReview} onEdit={onEdit} onDuplicate={onDuplicate} />}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

function SessionDetail({ s, topic, nextReview, onEdit, onDuplicate }: { s: Session; topic?: Topic; nextReview: string | null; onEdit: () => void; onDuplicate: () => void }) {
  const { saveSession, deleteSession } = useStore();
  const ui = useUI();
  const [notes, setNotes] = useState(s.notes);
  const [savedTick, setSavedTick] = useState(false);
  useEffect(() => setNotes(s.notes), [s.notes]);
  const facts: [string, React.ReactNode][] = [];
  facts.push(['Data', fmtShort(s.date)]);
  if (topic) facts.push(['Área', `${areaOf(topic.area).short}${topic.specialty ? ` · ${topic.specialty}` : ''}`]);
  if (s.minutes) facts.push([s.type === 'videoaula' ? 'Duração' : 'Tempo', fmtMinutes(s.minutes)]);
  if (s.type === 'videoaula' && s.watched) facts.push(['Conclusão', s.watched === 'completa' ? 'Assistiu tudo' : 'Assistiu uma parte']);
  if (s.questions) {
    facts.push([s.type === 'flashcards' ? 'Cartões' : 'Questões', String(s.questions)]);
    if (s.correct != null) {
      facts.push(['Acertos', String(s.correct)]);
      facts.push(['Erros', String(s.questions - s.correct)]);
    }
  }
  if (s.source) facts.push(['Fonte', s.source]);
  if (s.method) facts.push(['Método', s.method]);
  if (s.mastery) facts.push(['Domínio', MASTERY.find((m) => m.v === s.mastery)?.label ?? `${s.mastery}/5`]);
  if (nextReview) facts.push(['Próxima revisão do tema', fmtShort(nextReview)]);
  const groups = (s.errors ?? []).filter((g) => g.count > 0);

  const commitNotes = () => {
    if (notes === s.notes) return;
    saveSession({ ...s, notes });
    setSavedTick(true);
    setTimeout(() => setSavedTick(false), 1600);
  };

  return (
    <div className="reg-detail">
      <dl className="reg-facts">
        {facts.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {(groups.length > 0 || s.errorTopics.length > 0) && (
        <div className="reg-errors">
          <span className="field-label">Erros e dificuldades</span>
          {groups.length ? (
            <ul>
              {groups.map((g) => (
                <li key={g.id}>
                  <strong>{g.count}×</strong> {subtemaLabel(g.subtema)}
                  {g.reasons.length > 0 && <span className="muted"> · {g.reasons.map(reasonLabel).join(', ')}</span>}
                  {g.note && <span className="reg-err-note">“{g.note}”</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p>{s.errorTopics.join(' · ')}</p>
          )}
        </div>
      )}
      <label className="reg-notes">
        <span className="field-label">Anotações {savedTick && <motion.span className="saved-tick" initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}>✓ salvo</motion.span>}</span>
        <textarea
          id={`reg-notes-${s.id}`}
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={commitNotes}
          placeholder="Escreva aqui; salva quando você clicar fora."
        />
      </label>
      <div className="reg-actions">
        <div className="reg-links">
          {s.missionId && <button className="btn btn-quiet btn-sm" onClick={() => ui.openMission(s.missionId!)}><Icon name="trilha" size={16} /> Ver na trilha</button>}
          {topic && <button className="btn btn-quiet btn-sm" onClick={() => ui.openBook(topic.id)}><Icon name="book" size={16} /> Abrir livro</button>}
        </div>
        <div className="reg-buttons">
          <button className="btn btn-secondary btn-sm" onClick={onEdit}><Icon name="edit" size={16} /> Editar</button>
          <button className="btn btn-quiet btn-sm" onClick={onDuplicate}><Icon name="copy" size={16} /> Duplicar</button>
          <ConfirmButton
            className="btn btn-ghost-danger btn-sm"
            label={<><Icon name="trash" size={16} /> Excluir</>}
            question={s.activityId ? 'Excluir e desmarcar a atividade da missão?' : 'Excluir este registro?'}
            confirmLabel="Excluir"
            onConfirm={() => {
              deleteSession(s.id);
              ui.toast('Registro excluído.');
            }}
          />
        </div>
      </div>
    </div>
  );
}

function SimDetail({ sim, onEdit }: { sim: Simulado; onEdit: () => void }) {
  const { deleteSimulado } = useStore();
  const ui = useUI();
  const areas = BIG_AREAS.filter((a) => sim.areas?.[a]?.total);
  const groups = (sim.errors ?? []).filter((g) => g.count > 0);
  return (
    <div className="reg-detail">
      <dl className="reg-facts">
        <div><dt>Data</dt><dd>{fmtShort(sim.date)}</dd></div>
        {sim.total != null && <div><dt>Questões</dt><dd>{sim.total}</dd></div>}
        {sim.correct != null && <div><dt>Acertos</dt><dd>{sim.correct}</dd></div>}
        {sim.total != null && sim.correct != null && <div><dt>Erros</dt><dd>{sim.total - sim.correct}</dd></div>}
        {sim.minutes ? <div><dt>Tempo</dt><dd>{fmtMinutes(sim.minutes)}</dd></div> : null}
      </dl>
      {areas.length > 0 && (
        <div className="reg-areas">
          {areas.map((a) => {
            const p = pctOf(sim.areas[a].correct, sim.areas[a].total) ?? 0;
            return (
              <div key={a} className="reg-area">
                <span>{AREA_CHART[a].short}</span>
                <span className="reg-area-bar"><motion.i style={{ background: AREA_CHART[a].color }} initial={{ width: 0 }} animate={{ width: `${p}%` }} transition={{ duration: 0.5 }} /></span>
                <b>{p}%</b>
              </div>
            );
          })}
        </div>
      )}
      {(groups.length > 0 || sim.wrongTopics.length > 0) && (
        <div className="reg-errors">
          <span className="field-label">Erros e dificuldades</span>
          {groups.length > 0 && (
            <ul>
              {groups.map((g) => (
                <li key={g.id}>
                  <strong>{g.count}×</strong> {g.subject || subtemaLabel(g.subtema)}
                  {g.subject && g.subtema && <span className="muted"> · {subtemaLabel(g.subtema)}</span>}
                  {g.reasons.length > 0 && <span className="muted"> · {g.reasons.map(reasonLabel).join(', ')}</span>}
                </li>
              ))}
            </ul>
          )}
          {sim.wrongTopics.length > 0 && <p>{sim.wrongTopics.join(' · ')}</p>}
        </div>
      )}
      {sim.notes && <p className="reg-sim-notes">{sim.notes}</p>}
      <div className="reg-actions">
        <div className="reg-links">
          <button className="btn btn-quiet btn-sm" onClick={() => ui.go('simulados')}><Icon name="simulados" size={16} /> Ver em Simulados</button>
        </div>
        <div className="reg-buttons">
          <button className="btn btn-secondary btn-sm" onClick={onEdit}><Icon name="edit" size={16} /> Editar</button>
          <ConfirmButton
            className="btn btn-ghost-danger btn-sm"
            label={<><Icon name="trash" size={16} /> Excluir</>}
            question="Excluir este simulado?"
            confirmLabel="Excluir"
            onConfirm={() => {
              deleteSimulado(sim.id);
              ui.toast('Simulado excluído.');
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Calendário do registro ────────────────────────────────────

function RegCalendar({ entries, selected, onSelect }: { entries: Entry[]; selected: string | null; onSelect: (d: string) => void }) {
  const [cursor, setCursor] = useState(() => (selected ?? today()).slice(0, 7));
  const [y, m] = cursor.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const offset = (first.getDay() + 6) % 7;
  const daysIn = new Date(y, m, 0).getDate();
  const cells: (string | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysIn }, (_, i) => `${y}-${pad(m)}-${pad(i + 1)}`)];
  while (cells.length % 7) cells.push(null);
  const byDay = new Map<string, Entry[]>();
  for (const e of entries) byDay.set(e.date, [...(byDay.get(e.date) ?? []), e]);
  const t = today();
  const shift = (n: number) => setCursor(toKey(new Date(y, m - 1 + n, 1)).slice(0, 7));
  return (
    <div className="card reg-cal">
      <div className="cal-nav">
        <button className="icon-btn" onClick={() => shift(-1)} aria-label="Mês anterior"><Icon name="chevronL" /></button>
        <h3 className="h2 cal-month">{MESES_LONGOS[m - 1]} <span className="muted">{y}</span></h3>
        <button className="icon-btn" onClick={() => shift(1)} aria-label="Próximo mês"><Icon name="chevronR" /></button>
      </div>
      <div className="reg-cal-grid">
        {['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'].map((d) => <span key={d} className="cal-dow">{d}</span>)}
        {cells.map((k, i) => {
          if (!k) return <span key={`e${i}`} />;
          const list = byDay.get(k) ?? [];
          const mins = list.reduce((a, e) => a + ((e.kind === 'session' ? e.s.minutes : e.sim.minutes) ?? 0), 0);
          return (
            <motion.button
              key={k}
              className={`reg-cal-cell ${list.length ? 'has' : ''} ${k === t ? 'is-today' : ''} ${k === selected ? 'is-sel' : ''}`}
              onClick={() => onSelect(k)}
              whileTap={{ scale: 0.94 }}
              aria-label={`${fromKey(k).getDate()} de ${MESES_LONGOS[m - 1]}: ${list.length ? `${list.length} registros` : 'sem registros'}`}
            >
              <span className="reg-cal-n">{fromKey(k).getDate()}</span>
              {list.length > 0 && (
                <span className="reg-cal-dots" aria-hidden="true">
                  {list.slice(0, 4).map((e) => (
                    <i key={e.id} style={{ background: e.kind === 'simulado' ? 'var(--azul)' : areaOf(e.topic?.area ?? 'geral').color }} />
                  ))}
                  {list.length > 4 && <b>+{list.length - 4}</b>}
                </span>
              )}
              {mins > 0 && <span className="reg-cal-min">{fmtMinutes(mins)}</span>}
            </motion.button>
          );
        })}
      </div>
      <p className="muted reg-cal-hint">Toque num dia para ver só os registros dele.</p>
    </div>
  );
}

// ── Estados vazios ────────────────────────────────────────────

function EmptyState({ filtered, onClear, onAdd }: { filtered: boolean; onClear: () => void; onAdd: () => void }) {
  return (
    <motion.div className="reg-empty" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <svg viewBox="0 0 160 120" width="150" aria-hidden="true" className="reg-empty-art">
        <ellipse cx="80" cy="108" rx="56" ry="7" fill="var(--line)" />
        <g className="reg-empty-book">
          <path d="M28 30 q26 -10 52 2 v66 q-26 -12 -52 -2z" fill="#FFF6D6" stroke="#E8D9A8" strokeWidth="2" />
          <path d="M132 30 q-26 -10 -52 2 v66 q26 -12 52 -2z" fill="#FFFDF4" stroke="#E8D9A8" strokeWidth="2" />
          {filtered ? (
            <>
              <circle cx="104" cy="58" r="13" fill="none" stroke="var(--azul)" strokeWidth="4" />
              <path d="M113 68 l10 10" stroke="var(--azul)" strokeWidth="5" strokeLinecap="round" />
            </>
          ) : (
            <>
              <path d="M92 50 h28 M92 60 h22 M92 70 h26" stroke="#E2D3B8" strokeWidth="3" strokeLinecap="round" />
              <path d="M40 48 h26 M40 58 h20" stroke="#E8DCC0" strokeWidth="3" strokeLinecap="round" />
            </>
          )}
        </g>
        <g className="reg-empty-pencil">
          <rect x="54" y="62" width="40" height="8" rx="3" fill="var(--rosa-medio)" transform="rotate(-35 74 66)" />
          <path d="M57 80 l-6 7 l9 -2z" fill="#F3D9B1" />
        </g>
        <path d="M122 22 l3 6 6 1 -5 4 2 6 -6 -3 -6 3 2 -6 -5 -4 6 -1z" fill="var(--manteiga)" className="reg-empty-star" />
      </svg>
      {filtered ? (
        <>
          <p className="reg-empty-title">Nada com esses filtros.</p>
          <p className="muted">Tente outro período ou limpe a busca.</p>
          <button className="btn btn-secondary" onClick={onClear}>Limpar filtros</button>
        </>
      ) : (
        <>
          <p className="reg-empty-title">Seu caderninho está esperando a primeira página.</p>
          <p className="muted">O que você conclui nas missões entra aqui sozinho. Sessões avulsas e simulados também.</p>
          <button className="btn btn-primary" onClick={onAdd}><Icon name="plus" size={18} /> Novo registro</button>
        </>
      )}
    </motion.div>
  );
}
