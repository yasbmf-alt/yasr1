import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../data/store';
import { Icon } from '../components/Icon';
import { EventEditor, type EventDraft } from '../components/EventEditor';
import type { AgendaEvent } from '../types';
import { daySegments, duration, EVENT_TYPES, eventTitle, eventType, fromMin, occurrences, toMin, type Occurrence, type Segment } from '../logic/agenda';
import { addDays, diffDays, DIAS_CURTOS, fmtRange, fromKey, MESES_LONGOS, pad, today, toKey, uid, weekStart } from '../logic/dates';
import { missionProgress } from '../logic/progress';
import { play } from '../logic/sound';

const HH = 48; // px por hora
const SNAP = 15;
const snap = (m: number) => Math.round(m / SNAP) * SNAP;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

interface PendingMove {
  ev: AgendaEvent;
  occDate: string;
  date: string;
  start: string;
  end: string;
}

export function Agenda() {
  const { data, saveSettings, saveEvent } = useStore();
  const view = data.settings.agendaView ?? 'semana';
  const [cursor, setCursor] = useState(today());
  const [editing, setEditing] = useState<{ draft: EventDraft; occurrence: string | null } | null>(null);
  const [pending, setPending] = useState<PendingMove | null>(null);

  const ws = weekStart(cursor);
  const title =
    view === 'semana'
      ? fmtRange(ws, addDays(ws, 6))
      : `${MESES_LONGOS[fromKey(cursor).getMonth()]} ${fromKey(cursor).getFullYear()}`;

  const shift = (n: number) => {
    if (view === 'semana') setCursor(addDays(cursor, 7 * n));
    else {
      const d = fromKey(cursor);
      setCursor(toKey(new Date(d.getFullYear(), d.getMonth() + n, 1)));
    }
  };

  /** aplica um arrasto/redimensionamento; recorrentes perguntam o alcance */
  const commit = (p: PendingMove) => {
    if (p.ev.recurrence) {
      setPending(p);
      return;
    }
    saveEvent({ ...p.ev, date: p.date, start: p.start, end: p.end });
    play('drop');
  };

  const applyPending = (scope: 'one' | 'all') => {
    if (!pending) return;
    const { ev, occDate, date, start, end } = pending;
    if (scope === 'one') {
      saveEvent({ ...ev, exceptions: [...ev.exceptions, occDate] });
      saveEvent({ ...ev, id: uid(), date, start, end, recurrence: null, exceptions: [], createdAt: new Date().toISOString() });
    } else {
      const delta = diffDays(date, occDate);
      const rec = ev.recurrence!;
      saveEvent({
        ...ev,
        date: addDays(ev.date, delta),
        start,
        end,
        recurrence: { ...rec, weekdays: rec.weekdays.map((w) => (((w + delta) % 7) + 7) % 7) },
      });
    }
    play('drop');
    setPending(null);
  };

  return (
    <div className="page page-agenda">
      <header className="ag-head">
        <div className="ag-nav">
          <h1 className="h1">Agenda</h1>
          <div className="btn-row">
            <button className="icon-btn" onClick={() => shift(-1)} aria-label="Anterior"><Icon name="chevronL" /></button>
            <button className="btn btn-quiet btn-sm" onClick={() => setCursor(today())}>Hoje</button>
            <button className="icon-btn" onClick={() => shift(1)} aria-label="Próximo"><Icon name="chevronR" /></button>
          </div>
          <span className="ag-title">{title}</span>
        </div>
        <div className="btn-row wrap">
          <div className="seg" role="tablist" aria-label="Visualização">
            <button role="tab" aria-selected={view === 'semana'} className={view === 'semana' ? 'is-on' : ''} onClick={() => saveSettings({ agendaView: 'semana' })}>Semana</button>
            <button role="tab" aria-selected={view === 'mes'} className={view === 'mes' ? 'is-on' : ''} onClick={() => saveSettings({ agendaView: 'mes' })}>Mês</button>
          </div>
          <button className="btn btn-primary" onClick={() => setEditing({ draft: { date: view === 'semana' && ws > today() ? ws : today(), start: '08:00', end: '09:00' }, occurrence: null })}>
            <Icon name="plus" size={18} /> Novo evento
          </button>
        </div>
      </header>

      <div className="ag-legend" aria-label="Legenda">
        {EVENT_TYPES.map((t) => (
          <span key={t.id}><i style={{ background: t.color }} />{t.label}</span>
        ))}
      </div>

      {view === 'semana' ? (
        <WeekView start={ws} onEdit={(draft, occurrence) => setEditing({ draft, occurrence })} onCommit={commit} />
      ) : (
        <MonthView cursor={cursor} onEdit={(draft, occurrence) => setEditing({ draft, occurrence })} onCommit={commit} onPickWeek={(d) => { setCursor(d); saveSettings({ agendaView: 'semana' }); }} />
      )}

      <AnimatePresence>
        {pending && (
          <motion.div className="scope-pop" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} role="dialog" aria-label="Alterar evento recorrente">
            <span>Este evento se repete. Mudar:</span>
            <button className="btn btn-secondary btn-sm" onClick={() => applyPending('one')}>Só neste dia</button>
            <button className="btn btn-primary btn-sm" onClick={() => applyPending('all')}>Toda a série</button>
            <button className="btn btn-quiet btn-sm" onClick={() => setPending(null)}>Cancelar</button>
          </motion.div>
        )}
      </AnimatePresence>

      <EventEditor draft={editing?.draft ?? null} occurrence={editing?.occurrence} onClose={() => setEditing(null)} />
    </div>
  );
}

// ── Semana ────────────────────────────────────────────────────

interface Drag {
  mode: 'move' | 'resize' | 'create';
  seg?: Segment;
  x0: number;
  y0: number;
  moved: boolean;
}

function WeekView({ start, onEdit, onCommit }: {
  start: string; onEdit: (d: EventDraft, occ: string | null) => void; onCommit: (p: PendingMove) => void;
}) {
  const { data } = useStore();
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const occs = useMemo(() => occurrences(data.events, start, addDays(start, 6)), [data.events, start]);
  const scroller = useRef<HTMLDivElement>(null);
  const cols = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const [ghost, setGhost] = useState<{ day: number; s: number; e: number; id?: string } | null>(null);
  const t = today();
  const [nowMin, setNowMin] = useState(() => new Date().getHours() * 60 + new Date().getMinutes());

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = 7 * HH - 8;
    const id = setInterval(() => setNowMin(new Date().getHours() * 60 + new Date().getMinutes()), 60000);
    return () => clearInterval(id);
  }, []);

  const at = (clientX: number, clientY: number) => {
    const r = cols.current!.getBoundingClientRect();
    const day = clamp(Math.floor(((clientX - r.left) / r.width) * 7), 0, 6);
    const min = ((clientY - r.top) / HH) * 60;
    return { day, min };
  };

  const onDown = (e: React.PointerEvent, mode: Drag['mode'], seg?: Segment) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { mode, seg, x0: e.clientX, y0: e.clientY, moved: false };
    if (mode === 'create') {
      const p = at(e.clientX, e.clientY);
      const s = clamp(Math.floor(p.min / SNAP) * SNAP, 0, 1425);
      setGhost({ day: p.day, s, e: s + 60 });
    }
  };

  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 5) return;
    if (d.seg?.cont === 'ends') return;
    d.moved = true;
    const p = at(e.clientX, e.clientY);
    const dy = snap(((e.clientY - d.y0) / HH) * 60);
    if (d.mode === 'create' && ghost) {
      const s0 = ghost.s;
      setGhost({ ...ghost, e: clamp(snap(p.min), s0 + SNAP, 1440) });
    } else if (d.seg && d.mode === 'move') {
      const len = d.seg.cont === 'starts' ? duration(d.seg.occ.ev) : d.seg.endMin - d.seg.startMin;
      const s = clamp(d.seg.startMin + dy, 0, 1440 - SNAP);
      setGhost({ day: p.day, s, e: Math.min(1440, s + len), id: d.seg.occ.ev.id });
    } else if (d.seg && d.mode === 'resize') {
      const dayIdx = days.indexOf(d.seg.day);
      setGhost({ day: dayIdx, s: d.seg.startMin, e: clamp(d.seg.endMin + dy, d.seg.startMin + SNAP, 1440), id: d.seg.occ.ev.id });
    }
  };

  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const g = ghost;
    setGhost(null);
    if (d.mode === 'create') {
      if (!g) return;
      onEdit({ date: days[g.day], start: fromMin(g.s), end: fromMin(d.moved ? g.e : g.s + 60) }, null);
      return;
    }
    const seg = d.seg!;
    if (!d.moved || !g) {
      onEdit({ id: seg.occ.ev.id, date: seg.occ.ev.date }, seg.occ.ev.recurrence ? seg.occ.date : null);
      return;
    }
    const ev = seg.occ.ev;
    if (d.mode === 'move') {
      const len = duration(ev);
      onCommit({ ev, occDate: seg.occ.date, date: days[g.day], start: fromMin(g.s), end: fromMin(g.s + len) });
    } else {
      onCommit({ ev, occDate: seg.occ.date, date: seg.occ.date, start: ev.start, end: fromMin(g.e) });
    }
  };

  return (
    <section className="card week">
      <div className="week-head">
        <span />
        {days.map((d) => {
          const dt = fromKey(d);
          return (
            <span key={d} className={`wk-day ${d === t ? 'is-today' : ''}`}>
              <span className="wk-dow">{DIAS_CURTOS[dt.getDay()]}</span>
              <span className="wk-n">{dt.getDate()}</span>
            </span>
          );
        })}
      </div>
      <div className="week-scroll" ref={scroller}>
        <div className="week-body" style={{ height: 24 * HH }}>
          <div className="wk-gutter" aria-hidden="true">
            {Array.from({ length: 24 }, (_, h) => (
              <span key={h} style={{ top: h * HH }}>{h ? `${pad(h)}:00` : ''}</span>
            ))}
          </div>
          <div
            className="wk-cols"
            ref={cols}
            onPointerDown={(e) => onDown(e, 'create')}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={() => { drag.current = null; setGhost(null); }}
          >
            {Array.from({ length: 24 }, (_, h) => <span key={h} className="wk-line" style={{ top: h * HH }} />)}
            {days.map((day, i) => (
              <div key={day} className={`wk-col ${day === t ? 'is-today' : ''}`} style={{ left: `${(i / 7) * 100}%`, width: `${100 / 7}%` }}>
                {daySegments(occs, day).map((sg) => (
                  <EventBlock
                    key={`${sg.occ.ev.id}-${sg.occ.date}-${sg.cont}`}
                    sg={sg}
                    dimmed={ghost?.id === sg.occ.ev.id}
                    onDown={(e, mode) => onDown(e, mode, sg)}
                  />
                ))}
                {day === t && <span className="now-line" style={{ top: (nowMin / 60) * HH }} />}
              </div>
            ))}
            {ghost && (
              <span
                className="wk-ghost"
                style={{ left: `calc(${(ghost.day / 7) * 100}% + 3px)`, width: `calc(${100 / 7}% - 6px)`, top: (ghost.s / 60) * HH, height: Math.max(12, ((ghost.e - ghost.s) / 60) * HH) }}
              >
                {fromMin(ghost.s)}–{fromMin(ghost.e)}
              </span>
            )}
          </div>
        </div>
      </div>
      <p className="field-hint ag-hint">Arraste num espaço vazio para criar. Arraste um bloco para mover e puxe a borda de baixo para mudar a duração.</p>
    </section>
  );
}

function EventBlock({ sg, dimmed, onDown }: { sg: Segment; dimmed: boolean; onDown: (e: React.PointerEvent, mode: 'move' | 'resize') => void }) {
  const { data } = useStore();
  const ev = sg.occ.ev;
  const t = eventType(ev.type);
  const h = ((sg.endMin - sg.startMin) / 60) * HH;
  const m = ev.missionId ? data.missions.find((x) => x.id === ev.missionId) : null;
  const done = m ? (ev.activityId ? !!m.activities.find((a) => a.id === ev.activityId)?.done : missionProgress(m).complete) : false;
  return (
    <div
      className={`ev ${sg.overlaps ? 'is-overlap' : ''} ${dimmed ? 'is-dim' : ''} ${done ? 'is-done' : ''} ${h < 34 ? 'is-short' : ''}`}
      style={{
        top: (sg.startMin / 60) * HH,
        height: Math.max(16, h - 2),
        left: `calc(${(sg.col / sg.cols) * 100}% + 2px)`,
        width: `calc(${100 / sg.cols}% - 4px)`,
        ['--c' as string]: t.color,
        ['--i' as string]: t.ink,
      }}
      onPointerDown={(e) => onDown(e, 'move')}
      title={sg.overlaps ? 'Sobrepõe outro compromisso' : undefined}
      role="button"
      tabIndex={0}
    >
      <span className="ev-title">
        {done && <Icon name="check" size={12} />}
        {ev.recurrence && <span className="ev-rep" aria-label="repete">↻</span>}
        {eventTitle(ev, data)}
      </span>
      {h >= 34 && <span className="ev-time">{ev.start}–{ev.end}</span>}
      {sg.overlaps && <span className="ev-clash" aria-label="Sobreposição" />}
      {sg.cont !== 'starts' && <span className="ev-resize" onPointerDown={(e) => onDown(e, 'resize')} aria-hidden="true" />}
    </div>
  );
}

// ── Mês ───────────────────────────────────────────────────────

function MonthView({ cursor, onEdit, onCommit, onPickWeek }: {
  cursor: string; onEdit: (d: EventDraft, occ: string | null) => void; onCommit: (p: PendingMove) => void; onPickWeek: (d: string) => void;
}) {
  const { data } = useStore();
  const d = fromKey(cursor);
  const first = toKey(new Date(d.getFullYear(), d.getMonth(), 1));
  const gridStart = weekStart(first);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const occs = useMemo(() => occurrences(data.events, gridStart, addDays(gridStart, 41)), [data.events, gridStart]);
  const byDay = new Map<string, Occurrence[]>();
  for (const o of occs) {
    const arr = byDay.get(o.date) ?? [];
    arr.push(o);
    byDay.set(o.date, arr);
  }
  const t = today();
  const month = d.getMonth();
  const dragRef = useRef<{ occ: Occurrence; x0: number; y0: number; moved: boolean } | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  const cellAt = (x: number, y: number) => (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>('[data-date]')?.dataset.date ?? null;

  return (
    <section className="card month">
      <div className="mo-grid">
        {['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'].map((x) => <span key={x} className="mo-dow">{x}</span>)}
        {cells.map((k) => {
          const list = (byDay.get(k) ?? []).sort((a, b) => toMin(a.ev.start) - toMin(b.ev.start));
          return (
            <div
              key={k}
              data-date={k}
              className={`mo-cell ${fromKey(k).getMonth() !== month ? 'is-out' : ''} ${k === t ? 'is-today' : ''} ${hover === k && dragging ? 'is-target' : ''}`}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest('.mo-chip, .mo-more')) return;
                onEdit({ date: k, start: '08:00', end: '09:00' }, null);
              }}
            >
              <span className="mo-n">{fromKey(k).getDate()}</span>
              {list.slice(0, 3).map((o) => {
                const tp = eventType(o.ev.type);
                return (
                  <button
                    key={`${o.ev.id}-${o.date}`}
                    className={`mo-chip ${dragging === `${o.ev.id}-${o.date}` ? 'is-dragging' : ''}`}
                    style={{ ['--c' as string]: tp.color, ['--i' as string]: tp.ink }}
                    onPointerDown={(e) => {
                      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                      dragRef.current = { occ: o, x0: e.clientX, y0: e.clientY, moved: false };
                    }}
                    onPointerMove={(e) => {
                      const dr = dragRef.current;
                      if (!dr) return;
                      if (!dr.moved && Math.hypot(e.clientX - dr.x0, e.clientY - dr.y0) < 5) return;
                      dr.moved = true;
                      setDragging(`${o.ev.id}-${o.date}`);
                      setHover(cellAt(e.clientX, e.clientY));
                    }}
                    onPointerUp={(e) => {
                      const dr = dragRef.current;
                      dragRef.current = null;
                      setDragging(null);
                      setHover(null);
                      if (!dr) return;
                      if (!dr.moved) {
                        onEdit({ id: o.ev.id, date: o.ev.date }, o.ev.recurrence ? o.date : null);
                        return;
                      }
                      const target = cellAt(e.clientX, e.clientY);
                      if (target && target !== o.date) onCommit({ ev: o.ev, occDate: o.date, date: target, start: o.ev.start, end: o.ev.end });
                    }}
                  >
                    <span className="mo-time">{o.ev.start}</span> {eventTitle(o.ev, data)}
                  </button>
                );
              })}
              {list.length > 3 && (
                <button className="mo-more" onClick={() => onPickWeek(k)}>+{list.length - 3}</button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
