import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../data/store';
import { Modal, Field, ConfirmButton } from '../components/ui';
import { Icon } from '../components/Icon';
import { TopicPicker } from '../components/SessionForm';
import type { Activity, ActivityType, Chapter, Mission, Topic } from '../types';
import { chapterMissions } from '../logic/progress';
import { addDays, today, uid } from '../logic/dates';

// ── Edição de capítulo ────────────────────────────────────────

export function ChapterEditor({ value, onClose, onSaved }: { value: Chapter | 'new' | null; onClose: () => void; onSaved: (id: string) => void }) {
  const { data, saveChapter, deleteChapter } = useStore();
  const isNew = value === 'new';
  const base: Chapter | null = useMemo(() => {
    if (!value) return null;
    if (value !== 'new') return value;
    const last = [...data.chapters].sort((a, b) => b.number - a.number)[0];
    const n = (last?.number ?? 0) + 1;
    const start = last ? addDays(last.endDate, 1) : today();
    return { id: uid(), number: n, title: `Semana ${n}`, startDate: start, endDate: addDays(start, 6) };
  }, [value, data.chapters]);
  const [draft, setDraft] = useState<Chapter | null>(base);
  useEffect(() => setDraft(base), [base]);

  return (
    <Modal open={!!value} onClose={onClose} title={isNew ? 'Novo capítulo' : 'Editar capítulo'}>
      {draft && (
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.endDate < draft.startDate) return;
            saveChapter(draft);
            onSaved(draft.id);
            onClose();
          }}
        >
          <div className="register-grid">
            <Field label="Número">
              <input id="ch-n" type="number" min={1} value={draft.number} onChange={(e) => setDraft({ ...draft, number: Number(e.target.value) || 1 })} />
            </Field>
            <Field label="Título">
              <input id="ch-t" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} required />
            </Field>
            <Field label="Início">
              <input id="ch-s" type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} required />
            </Field>
            <Field label="Fim">
              <input id="ch-e" type="date" value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} required />
            </Field>
          </div>
          {draft.endDate < draft.startDate && <p className="form-error">O fim precisa ser depois do início.</p>}
          <div className="register-actions spread">
            {!isNew ? (
              <ConfirmButton
                label={<><Icon name="trash" size={16} /> Excluir capítulo</>}
                question="Excluir o capítulo e as missões dele? Os registros ficam."
                confirmLabel="Excluir"
                onConfirm={() => { deleteChapter(draft.id); onClose(); }}
              />
            ) : <span />}
            <div className="btn-row">
              <button type="button" className="btn btn-quiet" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn btn-primary">Salvar</button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}

// ── Nova missão ───────────────────────────────────────────────

const DEFAULT_ACTS: { type: ActivityType; label: string }[] = [
  { type: 'videoaula', label: 'Videoaula' },
  { type: 'questoes', label: 'Questões' },
  { type: 'revisao', label: 'Revisão' },
  { type: 'flashcards', label: 'Flashcards' },
];

export function NewMission({ open, chapter, defaultKind = 'medway', onClose, onCreated }: { open: boolean; chapter: Chapter; defaultKind?: Mission['kind']; onClose: () => void; onCreated: (id: string) => void }) {
  const { data, saveMission, saveTopic } = useStore();
  const [topicId, setTopicId] = useState('');
  const [pending, setPending] = useState<Topic | null>(null);
  const [label, setLabel] = useState('');
  const [kind, setKind] = useState<Mission['kind']>(defaultKind);
  const [acts, setActs] = useState<ActivityType[]>(DEFAULT_ACTS.map((a) => a.type));
  useEffect(() => {
    if (open) { setTopicId(''); setPending(null); setLabel(''); setKind(defaultKind); setActs(DEFAULT_ACTS.map((a) => a.type)); }
  }, [open]);
  const topicName = data.topics.find((t) => t.id === topicId)?.name ?? pending?.name ?? '';

  return (
    <Modal open={open} onClose={onClose} title={`Nova missão · ${chapter.title}`}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!topicId) return;
          if (pending) saveTopic(pending);
          const ms = chapterMissions(chapter.id, data.missions);
          const id = uid();
          const activities: Activity[] = DEFAULT_ACTS.filter((a) => acts.includes(a.type)).map((a) => ({
            id: uid(), type: a.type, label: a.label, plannedMinutes: null, plannedQuestions: null, required: true,
            done: false, doneAt: null, sessionId: null, scheduledDate: null,
          }));
          saveMission({
            id, chapterId: chapter.id, topicId, kind, label: label.trim() || topicName, order: (ms.at(-1)?.order ?? -1) + 1,
            scheduledDate: null, activities, notes: '', coverAssetId: null,
          });
          onClose();
          onCreated(id);
        }}
      >
        <Field label="Tema" hint="Se o tema já existe em outra semana, escolha o mesmo para somar o histórico.">
          <TopicPicker idBase="nm" value={topicId} onChange={(id, t) => { setTopicId(id); setPending(t ?? null); }} />
        </Field>
        {pending && <p className="field-hint">Tema novo: {pending.name}</p>}
        <Field label="Nome na trilha" hint="Deixe vazio para usar o nome do tema. Ex.: “… (Intensivo)”.">
          <input id="nm-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder={topicName} />
        </Field>
        <Field label="Tipo">
          <div className="seg">
            <button type="button" className={kind === 'medway' ? 'is-on' : ''} onClick={() => setKind('medway')}>Medway</button>
            <button type="button" className={kind === 'internato' ? 'is-on' : ''} onClick={() => setKind('internato')}>Missão do internato</button>
          </div>
        </Field>
        <Field label="Atividades iniciais">
          <div className="chips">
            {DEFAULT_ACTS.map((a) => (
              <button
                type="button"
                key={a.type}
                className={`chip chip-toggle ${acts.includes(a.type) ? 'is-on' : ''}`}
                onClick={() => setActs(acts.includes(a.type) ? acts.filter((x) => x !== a.type) : [...acts, a.type])}
              >
                {a.label}
              </button>
            ))}
          </div>
        </Field>
        <div className="register-actions">
          <button type="button" className="btn btn-quiet" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={!topicId}>Criar missão</button>
        </div>
      </form>
    </Modal>
  );
}
