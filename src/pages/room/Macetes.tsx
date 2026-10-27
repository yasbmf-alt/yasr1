import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../../data/store';
import { useUI } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { MaceteForm } from '../../components/BookPages';
import { AREAS, areaOf, type Macete } from '../../types';
import { play } from '../../logic/sound';

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function Macetes() {
  const { data } = useStore();
  const ui = useUI();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<Macete | null>(null);
  const [editing, setEditing] = useState<Macete | 'new' | null>(null);
  const tname = (id: string | null) => (id ? data.topics.find((t) => t.id === id)?.name ?? '' : '');
  const filtered = useMemo(() => {
    const k = norm(q.trim());
    if (!k) return data.macetes;
    return data.macetes.filter((m) => norm([m.title, m.text, m.tags.join(' '), tname(m.topicId), areaOf(m.area).label].join(' ')).includes(k));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.macetes, q, data.topics]);

  return (
    <div className="mac">
      <div className="mac-top">
        <label className="mac-search">
          <Icon name="list" size={16} />
          <input id="mac-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por palavra, matéria ou especialidade" aria-label="Buscar macetes" />
        </label>
        <button className="btn btn-primary" onClick={() => { setEditing('new'); setSel(null); }}><Icon name="plus" size={16} /> Novo macete</button>
      </div>

      <div className="mac-case">
        {AREAS.map((a, si) => {
          const list = filtered.filter((m) => m.area === a.id).sort((x, y) => (tname(x.topicId) + x.title).localeCompare(tname(y.topicId) + y.title, 'pt-BR'));
          return (
            <div key={a.id} className="mac-shelf">
              <span className="mac-plaque" style={{ background: a.color, color: a.ink }}>{a.short}</span>
              <div className="mac-books">
                {list.map((m, i) => (
                  <motion.button
                    key={m.id}
                    className={`mac-book ${sel?.id === m.id ? 'is-on' : ''}`}
                    style={{ background: a.color, color: a.ink, height: 86 + ((i * 13 + si * 7) % 4) * 9 }}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: sel?.id === m.id ? -10 : 0 }}
                    transition={{ delay: 0.03 * i }}
                    whileHover={{ y: -8 }}
                    onClick={() => { play('page'); setSel(m); setEditing(null); }}
                    title={m.title}
                  >
                    <span>{m.title}</span>
                  </motion.button>
                ))}
                {!list.length && <span className="mac-empty">{q ? '—' : 'vazio'}</span>}
              </div>
              <span className="mac-plank" />
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {editing && (
          <motion.section key="form" className="card mac-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <MaceteForm value={editing === 'new' ? null : editing} onDone={() => { setEditing(null); setSel(null); }} />
          </motion.section>
        )}
        {!editing && sel && data.macetes.find((m) => m.id === sel.id) && (
          <motion.article key={sel.id} className="card mac-card mac-read" initial={{ opacity: 0, y: 10, rotate: -0.5 }} animate={{ opacity: 1, y: 0, rotate: 0 }} exit={{ opacity: 0 }}>
            {(() => {
              const m = data.macetes.find((x) => x.id === sel.id)!;
              return (
                <>
                  <span className="pl-chip" style={{ ['--cover' as string]: areaOf(m.area).color, ['--ink' as string]: areaOf(m.area).ink }}>{areaOf(m.area).label}{m.topicId ? ` · ${tname(m.topicId)}` : ''}</span>
                  <h3 className="mac-title">{m.title}</h3>
                  <p className="mac-text">{m.text}</p>
                  {m.tags.length > 0 && <p className="small muted">{m.tags.map((t) => `#${t}`).join(' ')}</p>}
                  <div className="btn-row wrap">
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditing(m)}><Icon name="edit" size={14} /> Editar</button>
                    {m.topicId && <button className="btn btn-quiet btn-sm" onClick={() => ui.openBook(m.topicId!, m.id)}>Abrir o livro da matéria</button>}
                    <button className="btn btn-quiet btn-sm" onClick={() => setSel(null)}>Fechar</button>
                  </div>
                </>
              );
            })()}
          </motion.article>
        )}
      </AnimatePresence>
      {!data.macetes.length && !editing && <p className="muted center">Nenhum macete ainda. Cada macete ligado a uma matéria aparece também dentro do livro dela.</p>}
    </div>
  );
}
