import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../../data/store';
import { ConfirmButton, Field, useUI } from '../../components/ui';
import { Icon } from '../../components/Icon';
import type { DataSnapshot, Letter, LetterMode, NoteColor } from '../../types';
import { NOTE_HEX } from '../../logic/colors';
import { achievements } from '../../logic/achievements';
import { addDays, diffDays, fmtLong, today, uid } from '../../logic/dates';
import { play } from '../../logic/sound';

const ENVELOPES: NoteColor[] = ['rosa', 'lilas', 'azul', 'manteiga', 'lima', 'pessego'];

/** data surpresa: pelo menos N dias depois de lacrar e N dias longe das outras surpresas */
export function surpriseDate(d: DataSnapshot, selfId: string) {
  const min = Math.max(1, d.settings.letterMinDays ?? 20);
  let date = addDays(today(), min + Math.floor(Math.random() * Math.ceil(min / 2 + 1)));
  const others = d.letters.filter((l) => l.id !== selfId && l.mode === 'surpresa' && l.sealed && !l.openedAt && l.openDate).map((l) => l.openDate as string);
  for (let guard = 0; guard < 40 && others.some((o) => Math.abs(diffDays(o, date)) < min); guard++) date = addDays(date, 3);
  return date;
}

export function Cartas() {
  const { data } = useStore();
  const ui = useUI();
  const [editing, setEditing] = useState<Letter | 'new' | null>(null);
  const waiting = data.letters.filter((l) => !l.openedAt).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const opened = data.letters.filter((l) => l.openedAt).sort((a, b) => (b.openedAt ?? '').localeCompare(a.openedAt ?? ''));

  return (
    <div className="letters">
      <AnimatePresence mode="wait">
        {editing ? (
          <motion.section key="ed" className="card letter-editor-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <LetterEditor value={editing === 'new' ? null : editing} onDone={() => setEditing(null)} />
          </motion.section>
        ) : (
          <motion.div key="box" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="letters-box">
            <div className="lbox">
              <div className="lbox-in">
                {waiting.map((l, i) => (
                  <motion.button
                    key={l.id}
                    className={`env ${l.sealed ? 'is-sealed' : 'is-draft'}`}
                    style={{ background: NOTE_HEX[l.envelope], rotate: `${((i * 7) % 9) - 4}deg` }}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ y: -8, rotate: 0 }}
                    onClick={() => { play('paper'); setEditing(l); }}
                    title={l.sealed ? 'Carta lacrada' : 'Rascunho'}
                  >
                    <span className="env-flap" style={{ background: NOTE_HEX[l.envelope] }} />
                    {l.sealed ? <span className="env-seal">♥</span> : <span className="env-draft">rascunho</span>}
                    <span className="env-when">{whenLabel(l, data)}</span>
                  </motion.button>
                ))}
                <button className="env env-new" onClick={() => setEditing('new')}><Icon name="plus" size={22} /><span>Escrever carta</span></button>
              </div>
            </div>
            <p className="muted small center">Cartas lacradas ficam fechadas até o dia da entrega. Clique numa delas para editar.</p>

            {opened.length > 0 && (
              <section className="card">
                <h3 className="card-title">Cartas já abertas</h3>
                <ul className="opened">
                  {opened.map((l) => (
                    <li key={l.id}>
                      <button onClick={() => ui.enqueue({ kind: 'letter', letterId: l.id })}>
                        <span className="dot" style={{ background: NOTE_HEX[l.envelope] }} />
                        <span className="op-title">{l.title || 'Carta sem título'}</span>
                        <span className="muted small">aberta em {fmtLong((l.openedAt ?? '').slice(0, 10))}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function whenLabel(l: Letter, d: DataSnapshot) {
  if (!l.sealed) return 'ainda não lacrada';
  if (l.mode === 'surpresa') return 'abre de surpresa';
  if (l.mode === 'data') return `abre em ${fmtLong(l.openDate)}`;
  const a = achievements(d).find((x) => x.id === l.milestone);
  return a ? `abre quando: ${a.title.toLowerCase()}` : 'abre num marco especial';
}

/** Editor da carta. Lacrada, o conteúdo fica escondido até a usuária decidir editar. */
export function LetterEditor({ value, onDone }: { value: Letter | null; onDone: () => void }) {
  const { data, saveLetter, deleteLetter } = useStore();
  const ui = useUI();
  const [reveal, setReveal] = useState(!value?.sealed);
  const [l, setL] = useState<Letter>(
    () => value ?? { id: uid(), title: '', body: '', envelope: 'rosa', mode: 'surpresa', openDate: null, milestone: null, sealed: false, sealedAt: null, openedAt: null, createdAt: new Date().toISOString() },
  );
  const ach = achievements(data);
  const pending = ach.filter((a) => !a.date);

  if (value?.sealed && !reveal)
    return (
      <div className="sealed-view">
        <div className="env big is-sealed" style={{ background: NOTE_HEX[value.envelope] }}>
          <span className="env-flap" style={{ background: NOTE_HEX[value.envelope] }} />
          <span className="env-seal">♥</span>
        </div>
        <p>Esta carta está lacrada ({whenLabel(value, data)}).</p>
        <div className="btn-row wrap center-row">
          <button className="btn btn-quiet" onClick={onDone}>Voltar</button>
          <ConfirmButton className="btn btn-secondary" label="Abrir o lacre para editar" question="Você vai ver o conteúdo. Continuar?" confirmLabel="Sim, editar" onConfirm={() => { setReveal(true); setL({ ...value, sealed: false }); }} />
          <ConfirmButton label={<><Icon name="trash" size={15} /> Excluir</>} question="Excluir esta carta sem ler?" confirmLabel="Excluir" onConfirm={() => { deleteLetter(value.id); onDone(); }} />
        </div>
      </div>
    );

  const save = (seal: boolean) => {
    if (!l.body.trim()) return ui.toast('Escreva a carta antes de guardar.', 'erro');
    let next: Letter = { ...l, title: l.title.trim(), sealed: seal, sealedAt: seal ? new Date().toISOString() : null };
    if (seal) {
      if (l.mode === 'surpresa') next = { ...next, openDate: surpriseDate(data, l.id), milestone: null };
      if (l.mode === 'data') {
        if (!l.openDate || l.openDate <= today()) return ui.toast('Escolha uma data futura para abrir.', 'erro');
        next = { ...next, milestone: null };
      }
      if (l.mode === 'marco') {
        if (!l.milestone) return ui.toast('Escolha o marco que abre a carta.', 'erro');
        next = { ...next, openDate: null };
      }
    }
    saveLetter(next);
    play(seal ? 'envelope' : 'paper');
    ui.toast(seal ? 'Carta lacrada e guardada na caixa.' : 'Rascunho guardado.');
    onDone();
  };

  return (
    <div className="form letter-form">
      <div className="lf-paper" style={{ ['--env' as string]: NOTE_HEX[l.envelope] }}>
        <input id="lt-title" className="lf-title" value={l.title} onChange={(e) => setL({ ...l, title: e.target.value })} placeholder="Título (opcional)" />
        <textarea id="lt-body" className="lf-body" rows={10} value={l.body} onChange={(e) => setL({ ...l, body: e.target.value })} placeholder="Querida Yas do futuro…" autoFocus />
      </div>
      <Field label="Envelope">
        <div className="postit-colors">
          {ENVELOPES.map((c) => (
            <button key={c} type="button" className={`swatch swatch-lg ${l.envelope === c ? 'is-on' : ''}`} style={{ background: NOTE_HEX[c] }} aria-label={c} onClick={() => setL({ ...l, envelope: c })} />
          ))}
        </div>
      </Field>
      <Field label="Quando abrir">
        <div className="seg seg-wrap">
          {([['surpresa', 'Surpresa'], ['data', 'Data escolhida'], ['marco', 'Marco especial']] as [LetterMode, string][]).map(([k, lab]) => (
            <button key={k} type="button" className={l.mode === k ? 'is-on' : ''} onClick={() => setL({ ...l, mode: k })}>{lab}</button>
          ))}
        </div>
      </Field>
      {l.mode === 'surpresa' && <p className="field-hint">O app sorteia o dia, com pelo menos {data.settings.letterMinDays ?? 20} dias depois de lacrar. Você só descobre quando ela chegar.</p>}
      {l.mode === 'data' && (
        <Field label="Data de abertura">
          <input id="lt-date" type="date" min={addDays(today(), 1)} value={l.openDate ?? ''} onChange={(e) => setL({ ...l, openDate: e.target.value || null })} />
        </Field>
      )}
      {l.mode === 'marco' && (
        <Field label="Abrir quando eu conquistar" hint="Os marcos vêm do Pote de conquistas.">
          <select id="lt-ms" value={l.milestone ?? ''} onChange={(e) => setL({ ...l, milestone: e.target.value || null })}>
            <option value="">Escolha o marco</option>
            {pending.map((a) => <option key={a.id} value={a.id}>{a.emoji} {a.title}</option>)}
          </select>
        </Field>
      )}
      <div className="register-actions spread">
        {value ? <ConfirmButton label={<><Icon name="trash" size={15} /> Excluir</>} question="Excluir esta carta?" confirmLabel="Excluir" onConfirm={() => { deleteLetter(value.id); onDone(); }} /> : <span />}
        <div className="btn-row wrap">
          <button type="button" className="btn btn-quiet" onClick={onDone}>Cancelar</button>
          <button type="button" className="btn btn-secondary" onClick={() => save(false)}>Guardar rascunho</button>
          <button type="button" className="btn btn-primary" onClick={() => save(true)}>♥ Lacrar carta</button>
        </div>
      </div>
    </div>
  );
}
