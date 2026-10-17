import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../../data/store';
import { ConfirmButton, Field, useUI } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { achievements } from '../../logic/achievements';
import { chapterProgress, missionCompletedAt, missionProgress } from '../../logic/progress';
import { addDays, fmtLong, fmtMinutes, fmtShort, fromKey, MESES_LONGOS, pad, today, toKey, uid } from '../../logic/dates';
import { play } from '../../logic/sound';
import type { Rotation, Voucher } from '../../types';

// ── Pote de conquistas ───────────────────────────────────────

const STAR = ['#FFF3B0', '#F8C9F1', '#D9EE76', '#E9D8FF', '#FFAEB1', '#CFE4FF'];

export function Pote() {
  const { data } = useStore();
  const list = achievements(data);
  const got = list.filter((a) => a.date).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  const next = list.filter((a) => !a.date);
  const [showNext, setShowNext] = useState(false);
  return (
    <div className="pote">
      <div className="jar-wrap">
        <div className="jar" aria-label={`${got.length} conquistas no pote`}>
          <span className="jar-lid" />
          <div className="jar-glass">
            {got.slice(0, 60).map((a, i) => (
              <motion.span
                key={a.id}
                className="jar-star"
                title={`${a.title} · ${fmtLong(a.date)}`}
                style={{ left: `${8 + ((i * 37) % 76)}%`, bottom: `${4 + Math.floor(i / 6) * 9 + ((i * 13) % 5)}%`, background: STAR[i % STAR.length], rotate: `${(i * 29) % 60 - 30}deg` }}
                initial={{ y: -260, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 + i * 0.05, type: 'spring', stiffness: 160, damping: 14 }}
              />
            ))}
          </div>
          <span className="jar-label">{got.length} conquista{got.length === 1 ? '' : 's'}</span>
        </div>
      </div>
      <section className="card">
        <h3 className="card-title">Guardadas no pote</h3>
        {got.length ? (
          <ul className="ach">
            {got.map((a) => <li key={a.id}><span className="ach-e">{a.emoji}</span><span>{a.title}</span><span className="muted small">{fmtLong(a.date)}</span></li>)}
          </ul>
        ) : <p className="muted">As conquistas entram aqui sozinhas conforme você estuda.</p>}
        <button className="link small" onClick={() => setShowNext(!showNext)}>{showNext ? 'Esconder' : 'Ver'} o que ainda pode chegar ({next.length})</button>
        {showNext && <ul className="ach ach-next">{next.map((a) => <li key={a.id}><span className="ach-e">{a.emoji}</span><span>{a.title}</span></li>)}</ul>}
      </section>
    </div>
  );
}

// ── Retrospectiva mensal ─────────────────────────────────────

function monthStats(data: ReturnType<typeof useStore>['data'], ym: string) {
  const inM = (d: string | null | undefined) => !!d && d.startsWith(ym);
  const sess = data.sessions.filter((s) => inM(s.date));
  const sims = data.simulados.filter((s) => inM(s.date));
  const minutes = sess.reduce((a, s) => a + (s.minutes ?? 0), 0) + sims.reduce((a, s) => a + (s.minutes ?? 0), 0);
  const q = sess.filter((s) => s.type !== 'flashcards').reduce((a, s) => a + (s.questions ?? 0), 0) + sims.reduce((a, s) => a + (s.total ?? 0), 0);
  const c = sess.filter((s) => s.type !== 'flashcards').reduce((a, s) => a + (s.questions ? s.correct ?? 0 : 0), 0) + sims.reduce((a, s) => a + (s.total ? s.correct ?? 0 : 0), 0);
  const days = new Set([...sess.map((s) => s.date), ...sims.map((s) => s.date)]).size;
  const missions = data.missions.filter((m) => missionProgress(m).complete && inM(missionCompletedAt(m))).length;
  const chapters = data.chapters.filter((ch) => {
    if (!chapterProgress(ch, data.missions).complete) return false;
    const last = data.missions.filter((m) => m.chapterId === ch.id).map((m) => missionCompletedAt(m)).filter(Boolean).sort().at(-1);
    return inM(last);
  }).length;
  const firstByTopic = new Map<string, string>();
  for (const s of [...data.sessions].sort((a, b) => a.date.localeCompare(b.date))) if (s.topicId && !firstByTopic.has(s.topicId)) firstByTopic.set(s.topicId, s.date);
  const newBooks = [...firstByTopic.values()].filter((d) => inM(d)).length;
  const ach = achievements(data).filter((a) => inM(a.date));
  const byTopic = new Map<string, number>();
  for (const s of sess) if (s.topicId) byTopic.set(s.topicId, (byTopic.get(s.topicId) ?? 0) + (s.minutes ?? 0) + (s.questions ?? 0));
  const topTopic = [...byTopic.entries()].sort((a, b) => b[1] - a[1])[0];
  return { minutes, q, acc: q ? c / q : null, days, missions, chapters, newBooks, sims: sims.length, ach, topTopic: topTopic ? data.topics.find((t) => t.id === topTopic[0])?.name ?? null : null };
}

export function Retrospectiva() {
  const { data } = useStore();
  const [ym, setYm] = useState(today().slice(0, 7));
  const [y, m] = ym.split('-').map(Number);
  const prev = toKey(new Date(y, m - 2, 1)).slice(0, 7);
  const cur = useMemo(() => monthStats(data, ym), [data, ym]);
  const before = useMemo(() => monthStats(data, prev), [data, prev]);
  const shift = (n: number) => setYm(toKey(new Date(y, m - 1 + n, 1)).slice(0, 7));
  const daysIn = new Date(y, m, 0).getDate();
  const studied = new Set([...data.sessions, ...data.simulados].map((s) => s.date).filter((d) => d.startsWith(ym)));
  const delta = (a: number, b: number, unit = '') => (b ? `${a >= b ? '+' : ''}${Math.round(a - b)}${unit} vs. ${MESES_LONGOS[m - 2 < 0 ? 11 : m - 2]}` : '');
  const empty = !cur.minutes && !cur.q && !cur.missions && !cur.sims;
  return (
    <div className="retro">
      <div className="cal-nav">
        <button className="icon-btn" onClick={() => shift(-1)} aria-label="Mês anterior"><Icon name="chevronL" /></button>
        <h2 className="h2 cal-month">{MESES_LONGOS[m - 1]} <span className="muted">{y}</span></h2>
        <button className="icon-btn" onClick={() => shift(1)} aria-label="Próximo mês" disabled={ym >= today().slice(0, 7)}><Icon name="chevronR" /></button>
      </div>
      {empty ? (
        <p className="chart-empty">Nenhum registro em {MESES_LONGOS[m - 1]}.</p>
      ) : (
        <motion.div key={ym} className="postcard" initial={{ opacity: 0, rotate: -2, y: 10 }} animate={{ opacity: 1, rotate: -0.6, y: 0 }}>
          <div className="pc-left">
            <span className="pc-stamp">{MESES_LONGOS[m - 1].slice(0, 3).toUpperCase()}</span>
            <p className="pc-hello">Seu mês, Yas:</p>
            <div className="pc-big"><b>{fmtMinutes(cur.minutes || null)}</b><span>de estudo</span><small>{delta(cur.minutes / 60, before.minutes / 60, 'h')}</small></div>
            <div className="pc-grid">
              <span><b>{cur.days}</b> dias estudados</span>
              <span><b>{cur.q}</b> questões</span>
              <span><b>{cur.acc == null ? '—' : `${Math.round(cur.acc * 100)}%`}</b> de acertos</span>
              <span><b>{cur.missions}</b> missões</span>
              <span><b>{cur.chapters}</b> capítulos</span>
              <span><b>{cur.sims}</b> simulados</span>
              <span><b>{cur.newBooks}</b> livros novos</span>
            </div>
            {cur.topTopic && <p className="pc-note">O tema em que você mais mergulhou: <b>{cur.topTopic}</b>.</p>}
          </div>
          <div className="pc-right">
            <div className="pc-days" aria-label={`${studied.size} dias com estudo`}>
              {Array.from({ length: daysIn }, (_, i) => `${ym}-${pad(i + 1)}`).map((d) => <span key={d} className={studied.has(d) ? 'on' : ''} title={fmtShort(d)} />)}
            </div>
            {cur.ach.length > 0 && (
              <ul className="pc-ach">{cur.ach.map((a) => <li key={a.id}>{a.emoji} {a.title}</li>)}</ul>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ── Rotações do internato ────────────────────────────────────

export function Rotacoes() {
  const { data, saveSettings } = useStore();
  const list = [...(data.settings.rotations ?? [])].sort((a, b) => a.start.localeCompare(b.start));
  const [editing, setEditing] = useState<Rotation | null>(null);
  const t = today();
  const save = (r: Rotation) => {
    const rest = (data.settings.rotations ?? []).filter((x) => x.id !== r.id);
    saveSettings({ rotations: [...rest, r] });
    setEditing(null);
  };
  const remove = (id: string) => saveSettings({ rotations: (data.settings.rotations ?? []).filter((x) => x.id !== id) });
  const cur = list.find((r) => r.start <= t && r.end >= t);
  const min = list[0]?.start;
  const max = list.at(-1)?.end;
  const span = min && max ? Math.max(1, (fromKey(max).getTime() - fromKey(min).getTime()) / 86400000) : 1;
  const pos = (d: string) => (min ? ((fromKey(d).getTime() - fromKey(min).getTime()) / 86400000 / span) * 100 : 0);
  const COLORS = ['#F8C9F1', '#CFE4FF', '#E9D8FF', '#D9EE76', '#FFF3B0', '#FFAEB1'];

  return (
    <div className="rot">
      {cur && (
        <div className="rot-now">
          <span className="eyebrow">Rotação atual</span>
          <strong>{cur.name}</strong>
          <span className="muted">{cur.place ? `${cur.place} · ` : ''}até {fmtLong(cur.end)}</span>
        </div>
      )}
      {list.length > 0 && (
        <div className="rot-line" aria-hidden="true">
          {list.map((r, i) => (
            <span key={r.id} className="rot-seg" style={{ left: `${pos(r.start)}%`, width: `${Math.max(2, pos(r.end) - pos(r.start))}%`, background: COLORS[i % COLORS.length] }} title={r.name}>{r.name}</span>
          ))}
          {min && max && t >= min && t <= max && <span className="rot-today" style={{ left: `${pos(t)}%` }} />}
        </div>
      )}
      <section className="card">
        <div className="dd-head">
          <h3 className="card-title">Minhas rotações</h3>
          <button className="btn btn-secondary btn-sm" onClick={() => setEditing({ id: uid(), name: '', place: '', start: t, end: addDays(t, 30), notes: '' })}><Icon name="plus" size={14} /> Rotação</button>
        </div>
        {editing && <RotForm value={editing} onSave={save} onCancel={() => setEditing(null)} />}
        {list.length ? (
          <ul className="rot-list">
            {list.map((r, i) => (
              <li key={r.id} className={r === cur ? 'is-now' : r.end < t ? 'is-past' : ''}>
                <i style={{ background: COLORS[i % COLORS.length] }} />
                <div>
                  <strong>{r.name}</strong>
                  <span className="muted small">{fmtShort(r.start)} – {fmtShort(r.end)}{r.place ? ` · ${r.place}` : ''}</span>
                  {r.notes && <span className="small">{r.notes}</span>}
                </div>
                <button className="icon-btn icon-btn-sm" onClick={() => setEditing(r)} aria-label="Editar"><Icon name="edit" size={15} /></button>
                <ConfirmButton className="icon-btn icon-btn-sm" label={<Icon name="trash" size={15} />} question="Apagar?" confirmLabel="Apagar" onConfirm={() => remove(r.id)} />
              </li>
            ))}
          </ul>
        ) : !editing && <p className="muted">Cadastre suas rotações (APS, urgência, GO, clínica, pediatria…) para ver qual está acontecendo agora.</p>}
      </section>
    </div>
  );
}

function RotForm({ value, onSave, onCancel }: { value: Rotation; onSave: (r: Rotation) => void; onCancel: () => void }) {
  const [r, setR] = useState(value);
  return (
    <form className="form rot-form" onSubmit={(e) => { e.preventDefault(); if (r.name.trim() && r.end >= r.start) onSave({ ...r, name: r.name.trim() }); }}>
      <div className="register-grid">
        <Field label="Rotação"><input id="rt-name" value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })} placeholder="ex.: Pediatria" autoFocus required /></Field>
        <Field label="Local"><input id="rt-place" value={r.place} onChange={(e) => setR({ ...r, place: e.target.value })} placeholder="opcional" /></Field>
        <Field label="Início"><input id="rt-s" type="date" value={r.start} onChange={(e) => setR({ ...r, start: e.target.value })} required /></Field>
        <Field label="Fim"><input id="rt-e" type="date" value={r.end} onChange={(e) => setR({ ...r, end: e.target.value })} required /></Field>
      </div>
      <Field label="Anotações"><input id="rt-n" value={r.notes} onChange={(e) => setR({ ...r, notes: e.target.value })} placeholder="preceptor, horários, o que levar…" /></Field>
      {r.end < r.start && <p className="form-error">O fim precisa ser depois do início.</p>}
      <div className="register-actions">
        <button type="button" className="btn btn-quiet" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn-primary">Salvar</button>
      </div>
    </form>
  );
}

// ── Meus mimos ───────────────────────────────────────────────

export function Mimos() {
  const { data, saveVoucher, deleteVoucher } = useStore();
  const ui = useUI();
  const [tab, setTab] = useState<Voucher['status']>('disponivel');
  const list = data.vouchers.filter((v) => v.status === tab).sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  const count = (s: Voucher['status']) => data.vouchers.filter((v) => v.status === s).length;
  return (
    <div className="mimos">
      <div className="seg seg-tabs" role="tablist">
        {([['disponivel', 'Disponíveis'], ['aproveitado', 'Aproveitados'], ['arquivado', 'Arquivados']] as [Voucher['status'], string][]).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'is-on' : ''} onClick={() => setTab(k)}>{l} · {count(k)}</button>
        ))}
      </div>
      {list.length === 0 ? (
        <p className="chart-empty">{tab === 'disponivel' ? 'Nenhum vale guardado agora. Eles aparecem de vez em quando, de surpresa, ao fechar capítulos e conquistas.' : 'Nada aqui.'}</p>
      ) : (
        <div className="tickets">
          <AnimatePresence>
            {list.map((v, i) => (
              <motion.div key={v.id} layout className={`ticket ticket-sm st-${v.status}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, rotate: ((i * 7) % 5) - 2 }} exit={{ opacity: 0, scale: 0.9 }}>
                <span className="tk-notch tk-l" />
                <span className="tk-notch tk-r" />
                <span className="tk-emoji">{v.emoji}</span>
                <strong className="tk-name">{v.name.toUpperCase()}</strong>
                <p className="tk-msg">{v.message}</p>
                <span className="tk-foot">{v.status === 'aproveitado' && v.usedAt ? `aproveitado em ${fmtLong(v.usedAt.slice(0, 10))}` : `ganho em ${fmtLong(v.receivedAt.slice(0, 10))}${v.source ? ` · ${v.source}` : ''}`}</span>
                <div className="btn-row wrap center-row">
                  {v.status === 'disponivel' && <button className="btn btn-primary btn-sm" onClick={() => { saveVoucher({ ...v, status: 'aproveitado', usedAt: new Date().toISOString() }); play('kiss'); ui.toast('Aproveita muito, diva 💋', 'diva'); }}>Aproveitei!</button>}
                  {v.status !== 'arquivado' && <button className="btn btn-quiet btn-sm" onClick={() => saveVoucher({ ...v, status: 'arquivado' })}>Arquivar</button>}
                  {v.status !== 'disponivel' && <button className="btn btn-quiet btn-sm" onClick={() => saveVoucher({ ...v, status: 'disponivel', usedAt: null })}>Voltar a disponível</button>}
                  {v.status === 'arquivado' && <ConfirmButton className="icon-btn icon-btn-sm" label={<Icon name="trash" size={14} />} question="Apagar?" confirmLabel="Apagar" onConfirm={() => deleteVoucher(v.id)} />}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
      <p className="muted small center">Os tipos de mimo, a chance e o intervalo entre vales ficam em Configurações → Recompensas.</p>
    </div>
  );
}
