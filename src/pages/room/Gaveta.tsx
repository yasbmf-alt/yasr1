import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../../data/store';
import { ConfirmButton, Field, useUI } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { AREAS, SUBTEMAS, areaOf, subtemaLabel, type Area, type ErrNote, type ErrorReason, type Subtema } from '../../types';
import { errorRecords } from '../../logic/analytics';
import { refOf } from '../../logic/conceptMap';
import { summarize } from '../../logic/summary';
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
  // o que foi escrito na correção dos simulados (ramo do tema no mapa + lacunas)
  notes: { key: string; simId: string; simName: string; date: string; nodeId: string | null; gaps: string[] }[];
}

function useDrawer() {
  const { data } = useStore();
  return useMemo(() => {
    const recs = errorRecords(data);
    const byArea = new Map<Area, Map<string, SubjectAgg>>();
    const get = (area: Area, key: string, name: string, topicId: string | null) => {
      const m = byArea.get(area) ?? new Map<string, SubjectAgg>();
      byArea.set(area, m);
      const a: SubjectAgg = m.get(key) ?? { key, name, topicId, count: 0, subtemas: new Map(), reasons: new Map(), obs: [], manual: [], last: '', notes: [] };
      m.set(key, a);
      return a;
    };
    for (const r of recs) {
      const key = r.topicId ?? `txt:${r.subject.trim().toLowerCase()}`;
      const a = get(r.area, key, r.subject, r.topicId);
      a.count += r.count;
      if (r.subtema) a.subtemas.set(r.subtema, (a.subtemas.get(r.subtema) ?? 0) + r.count);
      for (const x of r.reasons) a.reasons.set(x, (a.reasons.get(x) ?? 0) + r.count);
      if (r.source === 'simulado') {
        const sim = data.simulados.find((x) => x.id === r.sourceId);
        const g = sim?.errors?.find((x) => x.id === r.key.slice(r.sourceId.length + 1));
        if (sim && g) {
          const nodeId = sim.map?.nodes.find((n) => n.ref === refOf(g))?.id ?? null;
          const key = `${sim.id}:${nodeId ?? g.id}`;
          const n = a.notes.find((x) => x.key === key) ?? { key, simId: sim.id, simName: sim.name, date: sim.date, nodeId, gaps: [] };
          if (!a.notes.includes(n)) a.notes.push(n);
          for (const it of g.items ?? []) if (it.gap?.trim()) n.gaps.push(it.gap.trim());
          if (g.note.trim()) n.gaps.push(g.note.trim());
        } else if (r.note.trim()) a.obs.push({ date: r.date, text: r.note.trim(), source: 'simulado' });
      } else if (r.note.trim()) a.obs.push({ date: r.date, text: r.note.trim(), source: 'questões' });
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
        <span className="muted small">O que você escreve na correção dos simulados (mapa e resumo) fica guardado aqui, por tema.</span>
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

function AreaDetail({ area, subs, onAdd }: { area: Area; subs: SubjectAgg[]; onAdd: () => void }) {
  const { data, deleteErrNote } = useStore();
  const ui = useUI();
  const a = areaOf(area);
  const sorted = [...subs].sort((x, y) => y.last.localeCompare(x.last) || y.count - x.count);
  return (
    <>
      <div className="dd-head">
        <h3 className="card-title"><span className="dot" style={{ background: a.color }} /> {a.label}</h3>
        <button className="btn btn-quiet btn-sm" onClick={onAdd}><Icon name="plus" size={14} /> Observação</button>
      </div>
      {!sorted.length ? (
        <p className="muted">Nenhum erro registrado nesta área ainda.</p>
      ) : (
        <div className="dd-cards">
          {sorted.map((s, i) => {
            const written = s.notes
              .sort((x, y) => y.date.localeCompare(x.date))
              .map((n) => {
                const sim = data.simulados.find((x) => x.id === n.simId);
                // o 1º bloco é o próprio tema: o título dele já está no cartão
                const blocks = n.nodeId ? summarize(sim?.map, n.nodeId) : [];
                const own = blocks[0];
                const rest = blocks.slice(1);
                const has = rest.length || own?.explanation || own?.list.length || own?.notes || n.gaps.length;
                return { n, own, rest, has, sim };
              })
              .filter((x) => x.has);
            const empty = !written.length && !s.manual.length && !s.obs.length;
            return (
              <motion.article key={s.key} className="dd-card" style={{ ['--tint' as string]: NOTE_TINTS[i % NOTE_TINTS.length] }} initial={{ opacity: 0, y: 8, rotate: i % 2 ? 0.6 : -0.6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.04 }}>
                <header className="dd-card-head">
                  <strong>{s.name}</strong>
                  {s.count > 0 && <span className="dd-count">{s.count} erro{s.count > 1 ? 's' : ''}</span>}
                </header>
                {written.map(({ n, own, rest, sim }) => (
                  <section key={n.key} className="dd-written">
                    <span className="dd-from">{n.simName} · {fmtShort(n.date)}</span>
                    {own?.explanation && own.explanation.split('\n').map((l, k) => <p key={k}>{l}</p>)}
                    {own && own.list.length > 0 && <ul>{own.list.map((l, k) => <li key={k}>{l}</li>)}</ul>}
                    {own?.notes && <blockquote>{own.notes}</blockquote>}
                    {rest.map((b) => (
                      <div key={b.nodeId} className={`dd-b d${Math.min(b.depth, 3)}`}>
                        <b>{b.title}</b>
                        {b.explanation && b.explanation.split('\n').map((l, k) => <p key={k}>{l}</p>)}
                        {b.list.length > 0 && <ul>{b.list.map((l, k) => <li key={k}>{l}</li>)}</ul>}
                        {b.notes && <blockquote>{b.notes}</blockquote>}
                      </div>
                    ))}
                    {n.gaps.length > 0 && (
                      <ul className="dd-gaps" aria-label="O que eu precisava saber">
                        {n.gaps.map((g, k) => <li key={k}>{g}</li>)}
                      </ul>
                    )}
                    {sim && (
                      <button
                        className="link small"
                        onClick={() => {
                          try {
                            localStorage.setItem('yasr1-corr-sim', sim.id);
                            localStorage.setItem('yasr1-sim-tab', 'corr');
                          } catch {
                            /* ignore */
                          }
                          ui.go('simulados');
                        }}
                      >
                        Abrir a correção
                      </button>
                    )}
                  </section>
                ))}
                {(s.manual.length > 0 || s.obs.length > 0) && (
                  <ul className="obs">
                    {s.manual.map((n) => (
                      <li key={n.id} className="obs-manual">
                        <span>{n.subtema ? <b>{subtemaLabel(n.subtema)}: </b> : null}{n.text}</span>
                        <span className="muted small">{fmtShort(n.createdAt.slice(0, 10))}</span>
                        <ConfirmButton className="icon-btn icon-btn-sm" label={<Icon name="trash" size={14} />} question="Apagar?" confirmLabel="Apagar" onConfirm={() => deleteErrNote(n.id)} />
                      </li>
                    ))}
                    {s.obs.sort((x, y) => y.date.localeCompare(x.date)).map((o, k) => (
                      <li key={k}><span>{o.text}</span><span className="muted small">{fmtShort(o.date)} · {o.source}</span></li>
                    ))}
                  </ul>
                )}
                {empty && <p className="small muted">Nada escrito ainda. O que você anotar no mapa da correção aparece aqui.</p>}
                {s.topicId && <button className="link small" onClick={() => ui.openTopic(s.topicId!)}>Ver ficha do tema</button>}
              </motion.article>
            );
          })}
        </div>
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
