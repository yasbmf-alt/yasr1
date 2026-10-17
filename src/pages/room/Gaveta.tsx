import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../../data/store';
import { ConfirmButton, Field, useUI } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { AREAS, REASONS, SUBTEMAS, areaOf, subtemaLabel, type Area, type ErrNote, type ErrorReason, type Subtema } from '../../types';
import { errorRecords } from '../../logic/analytics';
import { fmtShort, uid } from '../../logic/dates';
import { play } from '../../logic/sound';

const NOTE_TINTS = ['#FFF3B0', '#F8C9F1', '#CFE4FF', '#E9D8FF', '#E6F3A6', '#FFD0D1'];

interface SubjectAgg {
  key: string;
  name: string;
  topicId: string | null;
  count: number;
  subtemas: Map<Subtema, number>;
  reasons: Map<ErrorReason, number>;
  obs: { date: string; text: string; source: string }[];
  manual: ErrNote[];
  last: string;
}

function useDrawer() {
  const { data } = useStore();
  return useMemo(() => {
    const recs = errorRecords(data);
    const byArea = new Map<Area, Map<string, SubjectAgg>>();
    const get = (area: Area, key: string, name: string, topicId: string | null) => {
      const m = byArea.get(area) ?? new Map<string, SubjectAgg>();
      byArea.set(area, m);
      const a: SubjectAgg = m.get(key) ?? { key, name, topicId, count: 0, subtemas: new Map(), reasons: new Map(), obs: [], manual: [], last: '' };
      m.set(key, a);
      return a;
    };
    for (const r of recs) {
      const key = r.topicId ?? `txt:${r.subject.trim().toLowerCase()}`;
      const a = get(r.area, key, r.subject, r.topicId);
      a.count += r.count;
      if (r.subtema) a.subtemas.set(r.subtema, (a.subtemas.get(r.subtema) ?? 0) + r.count);
      for (const x of r.reasons) a.reasons.set(x, (a.reasons.get(x) ?? 0) + r.count);
      if (r.note.trim()) a.obs.push({ date: r.date, text: r.note.trim(), source: r.source === 'simulado' ? 'simulado' : 'questões' });
      if (r.date > a.last) a.last = r.date;
    }
    for (const n of data.errnotes) {
      const t = n.topicId ? data.topics.find((x) => x.id === n.topicId) : null;
      const key = n.topicId ?? `txt:${n.subject.trim().toLowerCase()}`;
      const a = get(t?.area ?? n.area, key, t?.name ?? n.subject, n.topicId);
      a.manual.push(n);
      if (n.createdAt.slice(0, 10) > a.last) a.last = n.createdAt.slice(0, 10);
    }
    return byArea;
  }, [data]);
}

export function Gaveta() {
  const byArea = useDrawer();
  const [area, setArea] = useState<Area | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="drawer-scene">
      <div className="drawer-stage">
        <motion.div
          className="drawer-front"
          initial={{ y: 0, opacity: 1 }}
          animate={{ y: 70, scaleY: 0.55, opacity: 0 }}
          transition={{ delay: 0.15, duration: 0.55, ease: [0.4, 0.1, 0.3, 1] }}
          onAnimationStart={() => play('drawer')}
          aria-hidden="true"
        >
          <span className="df-label">erros</span>
          <span className="df-handle" />
        </motion.div>
        <motion.div
          className="drawer-box"
          initial={{ opacity: 0, rotateX: 48, y: -50, scale: 0.92 }}
          animate={{ opacity: 1, rotateX: 0, y: 0, scale: 1 }}
          transition={{ delay: 0.45, type: 'spring', stiffness: 120, damping: 18 }}
        >
          <div className="drawer-grid">
            {AREAS.map((a, i) => {
              const subs = [...(byArea.get(a.id)?.values() ?? [])].sort((x, y) => y.count + y.manual.length - (x.count + x.manual.length));
              const total = subs.reduce((s, x) => s + x.count, 0);
              return (
                <motion.button
                  key={a.id}
                  className={`compart ${area === a.id ? 'is-on' : ''}`}
                  onClick={() => { play('page'); setArea(area === a.id ? null : a.id); setAdding(false); }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + i * 0.05 }}
                  whileHover={{ y: -3 }}
                  aria-expanded={area === a.id}
                >
                  <span className="compart-tab" style={{ background: a.color, color: a.ink }}>{a.short}</span>
                  <span className="compart-notes">
                    {subs.slice(0, 3).map((s, k) => (
                      <span key={s.key} className="paper" style={{ background: NOTE_TINTS[(i + k) % NOTE_TINTS.length], rotate: `${(k - 1) * 4}deg`, top: k * 10, left: 10 + k * 14 }}>
                        <b>{s.name}</b>
                        <small>{s.count ? `${s.count} erro${s.count === 1 ? '' : 's'}` : `${s.manual.length} obs.`}</small>
                      </span>
                    ))}
                    {!subs.length && <span className="compart-empty">vazio</span>}
                  </span>
                  <span className="compart-count">{total ? `${total} erros · ${subs.length} matéria${subs.length === 1 ? '' : 's'}` : subs.length ? `${subs.length} observações` : ''}</span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </div>

      <div className="drawer-actions">
        <button className="btn btn-note btn-sm" onClick={() => { setAdding(true); setArea(area ?? 'clinica'); }}><Icon name="plus" size={14} /> Observação</button>
        <span className="muted small">Os erros entram aqui sozinhos quando você classifica questões ou simulados.</span>
      </div>

      <AnimatePresence mode="wait">
        {area && (
          <motion.section key={area + String(adding)} className="card drawer-detail" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {adding ? <ErrNoteForm area={area} onDone={() => setAdding(false)} /> : <AreaDetail area={area} subs={[...(byArea.get(area)?.values() ?? [])]} onAdd={() => setAdding(true)} />}
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

function top<K>(m: Map<K, number>) {
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function AreaDetail({ area, subs, onAdd }: { area: Area; subs: SubjectAgg[]; onAdd: () => void }) {
  const { deleteErrNote } = useStore();
  const ui = useUI();
  const [open, setOpen] = useState<string | null>(null);
  const a = areaOf(area);
  const sorted = [...subs].sort((x, y) => y.count - x.count || y.last.localeCompare(x.last));
  return (
    <>
      <div className="dd-head">
        <h3 className="card-title"><span className="dot" style={{ background: a.color }} /> {a.label}</h3>
        <button className="btn btn-quiet btn-sm" onClick={onAdd}><Icon name="plus" size={14} /> Observação</button>
      </div>
      {!sorted.length ? (
        <p className="muted">Nenhum erro registrado nesta área ainda.</p>
      ) : (
        <ul className="dd-list">
          {sorted.map((s) => {
            const rs = top(s.reasons);
            const isOpen = open === s.key;
            return (
              <li key={s.key} className={isOpen ? 'is-open' : ''}>
                <button className="dd-row" onClick={() => setOpen(isOpen ? null : s.key)} aria-expanded={isOpen}>
                  <span className="dd-name">{s.name}</span>
                  <span className="dd-subs">
                    {top(s.subtemas).slice(0, 3).map(([k, n]) => <span key={k} className="chip-mini is-on">{subtemaLabel(k)} · {n}</span>)}
                  </span>
                  <span className="dd-count">{s.count || ''}</span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div className="dd-more" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                      {rs.length > 0 && (
                        <p className="dd-reasons">Motivos recorrentes: {rs.map(([k, n]) => `${REASONS.find((r) => r.id === k)?.label} (${n})`).join(' · ')}</p>
                      )}
                      {s.subtemas.size > 3 && <p className="small muted">Outros subtemas: {top(s.subtemas).slice(3).map(([k, n]) => `${subtemaLabel(k)} (${n})`).join(', ')}</p>}
                      {(s.obs.length > 0 || s.manual.length > 0) ? (
                        <ul className="obs">
                          {s.manual.map((n) => (
                            <li key={n.id} className="obs-manual">
                              <span>{n.subtema ? <b>{subtemaLabel(n.subtema)}: </b> : null}{n.text}</span>
                              <span className="muted small">{fmtShort(n.createdAt.slice(0, 10))}</span>
                              <ConfirmButton className="icon-btn icon-btn-sm" label={<Icon name="trash" size={14} />} question="Apagar?" confirmLabel="Apagar" onConfirm={() => deleteErrNote(n.id)} />
                            </li>
                          ))}
                          {s.obs.sort((x, y) => y.date.localeCompare(x.date)).map((o, i) => (
                            <li key={i}><span>{o.text}</span><span className="muted small">{fmtShort(o.date)} · {o.source}</span></li>
                          ))}
                        </ul>
                      ) : <p className="small muted">Sem observações.</p>}
                      {s.topicId && <button className="link small" onClick={() => ui.openTopic(s.topicId)}>Ver ficha da matéria</button>}
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function ErrNoteForm({ area, onDone }: { area: Area; onDone: () => void }) {
  const { data, saveErrNote } = useStore();
  const [n, setN] = useState<ErrNote>({ id: uid(), area, topicId: null, subject: '', subtema: null, text: '', createdAt: new Date().toISOString() });
  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!n.text.trim() || (!n.topicId && !n.subject.trim())) return;
        saveErrNote({ ...n, text: n.text.trim(), subject: n.subject.trim() });
        play('note');
        onDone();
      }}
    >
      <h3 className="card-title">Nova observação</h3>
      <div className="register-grid">
        <Field label="Grande área">
          <select id="en-area" value={n.area} onChange={(e) => setN({ ...n, area: e.target.value as Area })}>
            {AREAS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
        </Field>
        <Field label="Matéria ou doença">
          <input
            id="en-subject"
            list="en-topics"
            value={n.topicId ? data.topics.find((t) => t.id === n.topicId)?.name ?? n.subject : n.subject}
            onChange={(e) => {
              const t = data.topics.find((x) => x.name.toLowerCase() === e.target.value.trim().toLowerCase());
              setN({ ...n, subject: e.target.value, topicId: t?.id ?? null, area: t?.area ?? n.area });
            }}
            required
          />
          <datalist id="en-topics">{data.topics.map((t) => <option key={t.id} value={t.name} />)}</datalist>
        </Field>
      </div>
      <div className="eg-chips" role="radiogroup" aria-label="Subtema">
        {SUBTEMAS.map((s) => (
          <button type="button" key={s.id} role="radio" aria-checked={n.subtema === s.id} className={`chip-mini ${n.subtema === s.id ? 'is-on' : ''}`} onClick={() => setN({ ...n, subtema: n.subtema === s.id ? null : s.id })}>{s.label}</button>
        ))}
      </div>
      <Field label="Observação">
        <textarea id="en-text" rows={3} value={n.text} onChange={(e) => setN({ ...n, text: e.target.value })} placeholder="ex.: confundo a dose de ataque com a de manutenção" required />
      </Field>
      <div className="register-actions">
        <button type="button" className="btn btn-quiet" onClick={onDone}>Cancelar</button>
        <button type="submit" className="btn btn-primary">Guardar na gaveta</button>
      </div>
    </form>
  );
}
