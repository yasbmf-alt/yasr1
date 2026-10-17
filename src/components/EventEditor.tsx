import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../data/store';
import { Modal, Field, ConfirmButton, useUI } from './ui';
import { Icon } from './Icon';
import type { AgendaEvent, EventType } from '../types';
import { EVENT_TYPES, duration, eventTitle, fromMin, overlapsWith, toMin } from '../logic/agenda';
import { addDays, DIAS_CURTOS, fmtLong, today, uid } from '../logic/dates';

export type EventDraft = Partial<AgendaEvent> & { date: string };

export function blankEvent(d: EventDraft): AgendaEvent {
  return {
    id: uid(),
    type: 'estudo',
    title: '',
    start: '08:00',
    end: '09:00',
    recurrence: null,
    exceptions: [],
    missionId: null,
    activityId: null,
    simuladoId: null,
    notes: '',
    createdAt: new Date().toISOString(),
    ...d,
  };
}

const LINKABLE: EventType[] = ['missao', 'internato'];

export function EventEditor({ draft, occurrence, onClose }: { draft: EventDraft | null; occurrence?: string | null; onClose: () => void }) {
  const { data, saveEvent, deleteEvent } = useStore();
  const ui = useUI();
  const [ev, setEv] = useState<AgendaEvent | null>(null);
  const [parts, setParts] = useState('2');
  const existing = !!draft?.id && data.events.some((e) => e.id === draft.id);

  useEffect(() => {
    if (!draft) return setEv(null);
    const found = draft.id ? data.events.find((e) => e.id === draft.id) : null;
    setEv(found ? { ...found } : blankEvent(draft));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const chapters = useMemo(() => [...data.chapters].sort((a, b) => a.number - b.number), [data.chapters]);
  if (!ev) return <Modal open={false} onClose={onClose} title="">{null}</Modal>;

  const mission = ev.missionId ? data.missions.find((m) => m.id === ev.missionId) : null;
  const dateForCheck = occurrence ?? ev.date;
  const clashes = overlapsWith(data.events, ev, dateForCheck);
  const crosses = toMin(ev.end) <= toMin(ev.start);
  const set = (p: Partial<AgendaEvent>) => setEv({ ...ev, ...p });

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (LINKABLE.includes(ev.type) && !ev.missionId) return;
    saveEvent({ ...ev, title: ev.missionId ? ev.title.startsWith('Parte') ? ev.title : '' : ev.title.trim() });
    onClose();
  };

  const split = () => {
    const n = Math.min(10, Math.max(2, Number(parts) || 2));
    const dur = duration(ev);
    const each = Math.max(15, Math.round(dur / n / 15) * 15);
    for (let i = 0; i < n; i++) {
      saveEvent({
        ...ev,
        id: i === 0 ? ev.id : uid(),
        date: addDays(ev.date, i),
        end: fromMin(toMin(ev.start) + each),
        title: `Parte ${i + 1}/${n}`,
        recurrence: null,
        exceptions: [],
        createdAt: new Date().toISOString(),
      });
    }
    ui.toast(`Dividido em ${n} sessões de ${each} min, uma por dia.`);
    onClose();
  };

  return (
    <Modal open={!!draft} onClose={onClose} title={existing ? 'Editar evento' : 'Novo evento'}>
      <form className="form" onSubmit={save}>
        <div className="type-chips" role="radiogroup" aria-label="Tipo">
          {EVENT_TYPES.map((t) => (
            <button
              type="button"
              key={t.id}
              role="radio"
              aria-checked={ev.type === t.id}
              className={`type-chip ${ev.type === t.id ? 'is-on' : ''}`}
              style={{ ['--c' as string]: t.color, ['--i' as string]: t.ink }}
              onClick={() => set({ type: t.id, ...(LINKABLE.includes(t.id) ? {} : { missionId: null, activityId: null }) })}
            >
              {t.label}
            </button>
          ))}
        </div>

        {LINKABLE.includes(ev.type) ? (
          <>
            <Field label="Missão da trilha" hint="O evento usa a própria missão: nada é copiado.">
              <select
                id="ev-mission"
                value={ev.missionId ?? ''}
                required
                onChange={(e) => {
                  const m = data.missions.find((x) => x.id === e.target.value);
                  set({ missionId: e.target.value || null, activityId: null, type: m?.kind === 'internato' ? 'internato' : 'missao' });
                }}
              >
                <option value="">Escolha a missão</option>
                {chapters.map((c) => (
                  <optgroup key={c.id} label={c.title}>
                    {data.missions
                      .filter((m) => m.chapterId === c.id)
                      .sort((a, b) => a.order - b.order)
                      .map((m) => (
                        <option key={m.id} value={m.id}>{m.kind === 'internato' ? '★ ' : ''}{m.label}</option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </Field>
            {mission && (
              <Field label="Atividade (opcional)">
                <select id="ev-act" value={ev.activityId ?? ''} onChange={(e) => set({ activityId: e.target.value || null })}>
                  <option value="">Missão inteira</option>
                  {mission.activities.map((a) => (
                    <option key={a.id} value={a.id}>{a.label}{a.done ? ' (feita)' : ''}</option>
                  ))}
                </select>
              </Field>
            )}
          </>
        ) : (
          <Field label="Título">
            <input id="ev-title" value={ev.title} onChange={(e) => set({ title: e.target.value })} placeholder={EVENT_TYPES.find((t) => t.id === ev.type)?.label} />
          </Field>
        )}

        {ev.type === 'simulado' && data.simulados.length > 0 && (
          <Field label="Simulado registrado (opcional)">
            <select id="ev-sim" value={ev.simuladoId ?? ''} onChange={(e) => set({ simuladoId: e.target.value || null })}>
              <option value="">Nenhum</option>
              {data.simulados.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
        )}

        <div className="register-grid">
          <Field label={ev.recurrence ? 'Começa em' : 'Data'}>
            <input id="ev-date" type="date" value={ev.date} onChange={(e) => set({ date: e.target.value || today() })} required />
          </Field>
          <Field label="Início">
            <input id="ev-start" type="time" step={900} value={ev.start} onChange={(e) => set({ start: e.target.value })} required />
          </Field>
          <Field label="Fim">
            <input id="ev-end" type="time" step={900} value={ev.end} onChange={(e) => set({ end: e.target.value })} required />
          </Field>
        </div>
        {crosses && <p className="field-hint">Termina no dia seguinte (ex.: plantão noturno).</p>}

        <div className="field">
          <span className="field-label">Repetição</span>
          <div className="seg">
            <button type="button" className={!ev.recurrence ? 'is-on' : ''} onClick={() => set({ recurrence: null })}>Não repete</button>
            <button
              type="button"
              className={ev.recurrence ? 'is-on' : ''}
              onClick={() => set({ recurrence: ev.recurrence ?? { weekdays: [new Date(`${ev.date}T12:00`).getDay()], until: null } })}
            >
              Toda semana
            </button>
          </div>
          {ev.recurrence && (
            <div className="recur">
              <div className="weekdays" role="group" aria-label="Dias da semana">
                {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                  const on = ev.recurrence!.weekdays.includes(d);
                  return (
                    <button
                      type="button"
                      key={d}
                      aria-pressed={on}
                      className={`wd ${on ? 'is-on' : ''}`}
                      onClick={() => {
                        const w = on ? ev.recurrence!.weekdays.filter((x) => x !== d) : [...ev.recurrence!.weekdays, d];
                        if (w.length) set({ recurrence: { ...ev.recurrence!, weekdays: w } });
                      }}
                    >
                      {DIAS_CURTOS[d]}
                    </button>
                  );
                })}
              </div>
              <label className="mini">
                até
                <input id="ev-until" type="date" className="mini-date" value={ev.recurrence.until ?? ''} onChange={(e) => set({ recurrence: { ...ev.recurrence!, until: e.target.value || null } })} />
                <span className="muted">(vazio = sem fim)</span>
              </label>
            </div>
          )}
        </div>

        <Field label="Anotações">
          <textarea id="ev-notes" rows={2} value={ev.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="opcional" />
        </Field>

        {clashes.length > 0 && (
          <p className="clash">
            <Icon name="clock" size={15} /> Sobrepõe {clashes.slice(0, 2).map((c) => eventTitle(c.ev, data)).join(' e ')}
            {clashes.length > 2 ? ` e mais ${clashes.length - 2}` : ''} neste dia.
          </p>
        )}

        {existing && ev.activityId && !ev.recurrence && (
          <div className="split-box">
            <span>Videoaula longa? Divida em</span>
            <input id="ev-parts" className="mini-input" inputMode="numeric" value={parts} onChange={(e) => setParts(e.target.value)} aria-label="Número de partes" />
            <span>partes, uma por dia</span>
            <button type="button" className="btn btn-quiet btn-sm" onClick={split}>Dividir</button>
          </div>
        )}

        {mission && (
          <button type="button" className="link" onClick={() => { onClose(); ui.openMission(mission.id); }}>
            Abrir a missão na trilha
          </button>
        )}

        <div className="register-actions spread">
          {existing ? (
            ev.recurrence && occurrence ? (
              <span className="btn-row wrap">
                <ConfirmButton
                  label="Excluir só neste dia"
                  question={`Pular ${fmtLong(occurrence)}?`}
                  confirmLabel="Pular"
                  onConfirm={() => { saveEvent({ ...ev, exceptions: [...ev.exceptions, occurrence] }); onClose(); }}
                />
                <ConfirmButton label="Excluir todos" question="Excluir a série inteira?" confirmLabel="Excluir" onConfirm={() => { deleteEvent(ev.id); onClose(); }} />
              </span>
            ) : (
              <ConfirmButton label={<><Icon name="trash" size={16} /> Excluir</>} question="Excluir este evento?" confirmLabel="Excluir" onConfirm={() => { deleteEvent(ev.id); onClose(); }} />
            )
          ) : <span />}
          <div className="btn-row">
            <button type="button" className="btn btn-quiet" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={LINKABLE.includes(ev.type) && !ev.missionId}>Salvar</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
