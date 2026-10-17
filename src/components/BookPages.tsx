import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue } from 'framer-motion';
import { useStore } from '../data/store';
import { ConfirmButton, Field, useUI } from './ui';
import { Icon } from './Icon';
import { AREAS, type Area, type Macete, type Note, type NoteColor, type Topic } from '../types';
import { uid } from '../logic/dates';
import { play } from '../logic/sound';

import { NOTE_HEX } from '../logic/colors';
export { NOTE_HEX };
const COLORS = Object.keys(NOTE_HEX) as NoteColor[];

// ── Lembretes (post-its) dentro do livro ──────────────────────

export function BookNotes({ topic }: { topic: Topic }) {
  const { data, saveNote } = useStore();
  const pageRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<string | null>(null);
  const notes = data.notes.filter((n) => n.topicId === topic.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const add = () => {
    const i = notes.length;
    const n: Note = {
      id: uid(), text: '', color: COLORS[i % COLORS.length], x: 7, y: 140, rot: Math.round(Math.random() * 8 - 4), chapterId: null,
      createdAt: new Date().toISOString(), topicId: topic.id, onTrail: false, bx: 6 + (i % 3) * 31, by: 8 + (Math.floor(i / 3) % 3) * 30,
    };
    saveNote(n);
    play('note');
    setOpen(n.id);
  };

  return (
    <div className="bn">
      <div className="bn-head">
        <span className="muted small">{notes.length ? 'Arraste para organizar. Clique para ler ou editar.' : 'Lembretes pessoais desta matéria.'}</span>
        <button className="btn btn-note btn-sm" onClick={add}><Icon name="plus" size={14} /> Post-it</button>
      </div>
      <div className="bn-page" ref={pageRef}>
        {notes.length === 0 && <p className="bn-empty">Nenhum lembrete ainda. Post-its da trilha ligados a esta matéria também aparecem aqui.</p>}
        {notes.map((n, i) => (
          <BookNote key={n.id} n={n} i={i} pageRef={pageRef} onOpen={() => { play('note'); setOpen(n.id); }} />
        ))}
        <AnimatePresence>{open && <NoteEditor key={open} id={open} onClose={() => setOpen(null)} />}</AnimatePresence>
      </div>
    </div>
  );
}

function BookNote({ n, i, pageRef, onOpen }: { n: Note; i: number; pageRef: React.RefObject<HTMLDivElement>; onOpen: () => void }) {
  const { saveNote } = useStore();
  const ref = useRef<HTMLButtonElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const dragged = useRef(false);
  const bx = n.bx ?? 6 + (i % 3) * 31;
  const by = n.by ?? 8 + (Math.floor(i / 3) % 3) * 30;
  return (
    <motion.button
      ref={ref}
      className="bnote"
      style={{ left: `${bx}%`, top: `${by}%`, x: mx, y: my, rotate: n.rot, background: NOTE_HEX[n.color] }}
      drag
      dragMomentum={false}
      dragConstraints={pageRef}
      dragElastic={0.04}
      whileHover={{ scale: 1.04, rotate: 0 }}
      whileDrag={{ scale: 1.08, zIndex: 20 }}
      onDragStart={() => { dragged.current = true; }}
      onDragEnd={() => {
        const box = pageRef.current?.getBoundingClientRect();
        const r = ref.current?.getBoundingClientRect();
        if (box && r) {
          mx.set(0);
          my.set(0);
          saveNote({ ...n, bx: Math.round(Math.min(72, Math.max(0, ((r.left - box.left) / box.width) * 100))), by: Math.round(Math.min(78, Math.max(0, ((r.top - box.top) / box.height) * 100))) });
        }
        setTimeout(() => { dragged.current = false; }, 0);
      }}
      onClick={() => { if (!dragged.current) onOpen(); }}
      aria-label={n.text ? `Post-it: ${n.text.slice(0, 60)}` : 'Post-it vazio'}
    >
      <span className="bnote-txt">{n.text || <em className="muted">vazio</em>}</span>
      {n.onTrail !== false && <span className="bnote-tag" title="Também aparece na trilha">trilha</span>}
    </motion.button>
  );
}

/** Editor compartilhado: o mesmo post-it pode estar na trilha e no livro, sem cópia. */
export function NoteEditor({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, saveNote, deleteNote } = useStore();
  const n = data.notes.find((x) => x.id === id);
  const [text, setText] = useState(n?.text ?? '');
  useEffect(() => setText(n?.text ?? ''), [n?.text]);
  if (!n) return null;
  const close = () => {
    if (!text.trim() && !n.text.trim()) deleteNote(n.id);
    else if (text !== n.text) saveNote({ ...n, text });
    onClose();
  };
  return (
    <motion.div className="note-editor" style={{ background: NOTE_HEX[n.color] }} initial={{ scale: 0.6, opacity: 0, rotate: n.rot }} animate={{ scale: 1, opacity: 1, rotate: 0 }} exit={{ scale: 0.7, opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 26 }} role="dialog" aria-label="Post-it">
      <textarea id={`ne-${n.id}`} className="postit-text" value={text} autoFocus placeholder="Escreva aqui…" onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && close()} />
      <div className="postit-colors" role="radiogroup" aria-label="Cor">
        {COLORS.map((c) => (
          <button key={c} role="radio" aria-checked={n.color === c} aria-label={c} className={`swatch ${n.color === c ? 'is-on' : ''}`} style={{ background: NOTE_HEX[c] }} onClick={() => saveNote({ ...n, text, color: c })} />
        ))}
      </div>
      <label className="postit-all">
        <input type="checkbox" checked={n.onTrail !== false} onChange={(e) => saveNote({ ...n, text, onTrail: e.target.checked })} />
        Mostrar também na trilha
      </label>
      <div className="postit-actions">
        <ConfirmButton className="icon-btn icon-btn-sm" label={<Icon name="trash" size={16} />} question="Jogar fora?" confirmLabel="Sim" onConfirm={() => { deleteNote(n.id); onClose(); }} />
        <button className="btn btn-sm btn-dark" onClick={close}>Fechar</button>
      </div>
    </motion.div>
  );
}

// ── Macetes ───────────────────────────────────────────────────

export function BookMacetes({ topic }: { topic: Topic }) {
  const { data } = useStore();
  const [editing, setEditing] = useState<Macete | 'new' | null>(null);
  const list = data.macetes.filter((m) => m.topicId === topic.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return (
    <div className="bm">
      {editing ? (
        <MaceteForm value={editing === 'new' ? null : editing} preset={{ topicId: topic.id, area: topic.area }} onDone={() => setEditing(null)} />
      ) : (
        <>
          <div className="bn-head">
            <span className="muted small">{list.length ? `${list.length} macete${list.length === 1 ? '' : 's'}` : 'Os macetes ligados a esta matéria aparecem aqui.'}</span>
            <button className="btn btn-secondary btn-sm" onClick={() => setEditing('new')}><Icon name="plus" size={14} /> Macete</button>
          </div>
          <ul className="bm-list">
            {list.map((m) => (
              <li key={m.id}>
                <button onClick={() => setEditing(m)}>
                  <strong>{m.title}</strong>
                  <span>{m.text}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export function MaceteForm({ value, preset, onDone }: { value: Macete | null; preset?: { topicId?: string | null; area?: Area }; onDone: () => void }) {
  const { data, saveMacete, deleteMacete } = useStore();
  const ui = useUI();
  const [m, setM] = useState<Macete>(
    () => value ?? { id: uid(), title: '', text: '', area: preset?.area ?? 'clinica', topicId: preset?.topicId ?? null, tags: [], createdAt: new Date().toISOString() },
  );
  const [tags, setTags] = useState((value?.tags ?? []).join(', '));
  return (
    <form
      className="form macete-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!m.title.trim() && !m.text.trim()) return;
        saveMacete({ ...m, title: m.title.trim() || m.text.trim().slice(0, 40), text: m.text.trim(), tags: tags.split(',').map((x) => x.trim()).filter(Boolean) });
        play('page');
        ui.toast(value ? 'Macete atualizado.' : 'Macete guardado.');
        onDone();
      }}
    >
      <Field label="Título">
        <input id="mf-title" value={m.title} onChange={(e) => setM({ ...m, title: e.target.value })} placeholder="ex.: Critérios de Light" autoFocus />
      </Field>
      <Field label="Macete">
        <textarea id="mf-text" rows={4} value={m.text} onChange={(e) => setM({ ...m, text: e.target.value })} placeholder="Escreva do seu jeito" />
      </Field>
      <div className="register-grid">
        <Field label="Especialidade">
          <select id="mf-area" value={m.area} onChange={(e) => setM({ ...m, area: e.target.value as Area })}>
            {AREAS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
        </Field>
        <Field label="Matéria (livro)">
          <select
            id="mf-topic"
            value={m.topicId ?? ''}
            onChange={(e) => {
              const t = data.topics.find((x) => x.id === e.target.value);
              setM({ ...m, topicId: e.target.value || null, area: t?.area ?? m.area });
            }}
          >
            <option value="">Sem matéria</option>
            {[...data.topics].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Palavras-chave" hint="Separadas por vírgula. Ajudam na busca.">
        <input id="mf-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="ex.: derrame pleural, exsudato" />
      </Field>
      <div className="register-actions spread">
        {value ? (
          <ConfirmButton label={<><Icon name="trash" size={15} /> Excluir</>} question="Excluir este macete?" confirmLabel="Excluir" onConfirm={() => { deleteMacete(value.id); onDone(); }} />
        ) : <span />}
        <div className="btn-row">
          <button type="button" className="btn btn-quiet" onClick={onDone}>Cancelar</button>
          <button type="submit" className="btn btn-primary">Salvar</button>
        </div>
      </div>
    </form>
  );
}
