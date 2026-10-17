import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../data/store';
import { useUI } from '../../components/ui';
import { AREAS, REASONS, areaOf, subtemaLabel, type Area } from '../../types';
import { errorRecords, recurrent, subjectRanking } from '../../logic/analytics';
import { NOTE_HEX } from '../../components/BookPages';

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Tudo o que já foi anotado, num só lugar: post-its, macetes e erros recorrentes. */
export function Revisao() {
  const { data } = useStore();
  const ui = useUI();
  const [area, setArea] = useState<Area | null>(null);
  const [q, setQ] = useState('');
  const k = norm(q.trim());
  const topicArea = (id: string | null | undefined) => (id ? data.topics.find((t) => t.id === id)?.area : undefined);
  const tname = (id: string | null | undefined) => (id ? data.topics.find((t) => t.id === id)?.name ?? '' : '');
  const match = (txt: string, a?: Area) => (!area || a === area) && (!k || norm(txt).includes(k));

  const notes = data.notes.filter((n) => n.text.trim() && match(`${n.text} ${tname(n.topicId)}`, topicArea(n.topicId)));
  const macetes = data.macetes.filter((m) => match(`${m.title} ${m.text} ${m.tags.join(' ')} ${tname(m.topicId)}`, m.area));
  const recs = useMemo(() => errorRecords(data), [data]);
  const rec = recurrent(recs).filter((r) => match(`${r.subject} ${subtemaLabel(r.subtema)}`, (topicArea(r.topicId) ?? recs.find((x) => x.subject === r.subject)?.area) as Area));
  const topSubjects = subjectRanking(recs.filter((r) => !area || r.area === area)).filter((s) => !k || norm(s.label).includes(k)).slice(0, 6);

  return (
    <div className="rr">
      <div className="rr-top">
        <div className="chips">
          <button className={`chip chip-toggle ${!area ? 'is-on' : ''}`} onClick={() => setArea(null)}>Todas</button>
          {AREAS.map((a) => (
            <button key={a.id} className={`chip chip-toggle ${area === a.id ? 'is-on' : ''}`} onClick={() => setArea(area === a.id ? null : a.id)}>{a.short}</button>
          ))}
        </div>
        <input id="rr-q" className="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar" aria-label="Buscar na revisão rápida" />
      </div>
      <div className="rr-board">
        <section className="rr-col">
          <h3 className="rr-h">Erros que voltam</h3>
          {rec.length ? rec.slice(0, 12).map((r, i) => (
            <motion.div key={`${r.subject}${r.subtema}`} className="rr-card rr-err" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <strong>{r.subject}</strong>
              <span>{subtemaLabel(r.subtema)}{r.reason ? ` · ${REASONS.find((x) => x.id === r.reason)?.long}` : ''}</span>
              <small>{r.count} erros em {r.dates} dias</small>
            </motion.div>
          )) : <p className="rr-empty">Aparecem quando o mesmo subtema é errado em dias diferentes.</p>}
          {topSubjects.length > 0 && (
            <>
              <h4 className="rr-sub">Matérias com mais erros</h4>
              <ul className="rr-mini">{topSubjects.map((s) => <li key={s.id}><span>{s.label}</span><b>{s.count}</b></li>)}</ul>
            </>
          )}
        </section>
        <section className="rr-col">
          <h3 className="rr-h">Macetes</h3>
          {macetes.length ? macetes.map((m, i) => (
            <motion.div key={m.id} className="rr-card rr-mac" style={{ borderColor: areaOf(m.area).color }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <strong>{m.title}</strong>
              <span>{m.text}</span>
              {m.topicId && <button className="link small" onClick={() => ui.openBook(m.topicId!)}>{tname(m.topicId)}</button>}
            </motion.div>
          )) : <p className="rr-empty">Nenhum macete {k || area ? 'com esse filtro' : 'ainda'}.</p>}
        </section>
        <section className="rr-col">
          <h3 className="rr-h">Post-its</h3>
          <div className="rr-notes">
            {notes.length ? notes.map((n, i) => (
              <motion.div key={n.id} className="rr-postit" style={{ background: NOTE_HEX[n.color], rotate: `${n.rot}deg` }} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}>
                <span>{n.text}</span>
                {n.topicId && <small>{tname(n.topicId)}</small>}
              </motion.div>
            )) : <p className="rr-empty">Nenhum post-it {k || area ? 'com esse filtro' : 'ainda'}.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
