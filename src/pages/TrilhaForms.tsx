import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../data/store';
import { Modal, Field, ConfirmButton } from '../components/ui';
import { Icon } from '../components/Icon';
import { TopicPicker } from '../components/SessionForm';
import type { Activity, ActivityType, Chapter, InternatoTheme, Mission, Topic } from '../types';
import { INTERNATO_THEMES } from '../logic/missionTheme';
import { MissionArt } from '../components/MissionArt';
import { chapterMissions } from '../logic/progress';
import { addDays, today, uid } from '../logic/dates';

// ── Edição de capítulo ────────────────────────────────────────

export function ChapterEditor({ value, onClose, onSaved }: { value: Chapter | 'new' | 'new-prova' | null; onClose: () => void; onSaved: (id: string) => void }) {
  const { data, saveChapter, deleteChapter, saveSettings } = useStore();
  const isNew = value === 'new' || value === 'new-prova';
  const base: Chapter | null = useMemo(() => {
    if (!value) return null;
    if (value !== 'new' && value !== 'new-prova') return value;
    const last = [...data.chapters].sort((a, b) => b.number - a.number)[0];
    const n = (last?.number ?? 0) + 1;
    if (value === 'new-prova') {
      // especial: fim de semana que vem (ou hoje e amanhã se já for fim de semana)
      const d = new Date();
      const toSat = (6 - d.getDay() + 7) % 7;
      const start = d.getDay() === 0 ? today() : addDays(today(), toSat);
      return { id: uid(), number: n, title: 'Maratona da prova', startDate: start, endDate: d.getDay() === 0 ? start : addDays(start, 1), kind: 'prova' };
    }
    const start = last ? addDays(last.endDate, 1) : today();
    return { id: uid(), number: n, title: `Semana ${n}`, startDate: start, endDate: addDays(start, 6) };
  }, [value, data.chapters]);
  const [draft, setDraft] = useState<Chapter | null>(base);
  useEffect(() => setDraft(base), [base]);

  return (
    <Modal open={!!value} onClose={onClose} title={draft?.kind === 'prova' ? (isNew ? '🎮 Novo capítulo especial' : '🎮 Capítulo especial') : isNew ? 'Novo capítulo' : 'Editar capítulo'}>
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
          {isNew && (
            <div className="ch-kind-pick" role="radiogroup" aria-label="Tipo de capítulo">
              <button type="button" role="radio" aria-checked={draft.kind !== 'prova'} className={draft.kind !== 'prova' ? 'is-on' : ''} onClick={() => setDraft({ ...draft, kind: 'normal', title: draft.title === 'Maratona da prova' ? `Semana ${draft.number}` : draft.title })}>
                <span aria-hidden="true">🗺️</span><b>Semana normal</b><small>trilha com missões</small>
              </button>
              <button type="button" role="radio" aria-checked={draft.kind === 'prova'} className={`is-special ${draft.kind === 'prova' ? 'is-on' : ''}`} onClick={() => setDraft({ ...draft, kind: 'prova', title: /^Semana \d+$/.test(draft.title) ? 'Maratona da prova' : draft.title })}>
                <span aria-hidden="true">🎮</span><b>Especial · modo prova</b><small>dias de maratona em jogo, com prêmios</small>
              </button>
            </div>
          )}
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
                question={draft.kind === 'prova' ? 'Excluir o capítulo especial e o jogo dele?' : 'Excluir o capítulo e as missões dele? Os registros ficam.'}
                confirmLabel="Excluir"
                onConfirm={() => {
                  if (draft.kind === 'prova') saveSettings({ examRuns: (data.settings.examRuns ?? []).filter((r) => r.chapterId !== draft.id) });
                  deleteChapter(draft.id);
                  onClose();
                }}
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

export function NewMission({ open, chapter, onClose, onCreated }: { open: boolean; chapter: Chapter; onClose: () => void; onCreated: (id: string) => void }) {
  const { data, saveMission, saveTopic } = useStore();
  const [topicId, setTopicId] = useState('');
  const [pending, setPending] = useState<Topic | null>(null);
  const [label, setLabel] = useState('');
  const [kind, setKind] = useState<Mission['kind']>('medway');
  const [theme, setTheme] = useState<InternatoTheme>('hospital');
  const [simTask, setSimTask] = useState<'fazer' | 'corrigir'>('fazer');
  const [simId, setSimId] = useState('');
  const [acts, setActs] = useState<ActivityType[]>(DEFAULT_ACTS.map((a) => a.type));
  useEffect(() => {
    if (open) { setTopicId(''); setPending(null); setLabel(''); setKind('medway'); setTheme('hospital'); setSimTask('fazer'); setSimId(''); setActs(DEFAULT_ACTS.map((a) => a.type)); }
  }, [open]);
  const topicName = data.topics.find((t) => t.id === topicId)?.name ?? pending?.name ?? '';
  const sims = useMemo(() => [...data.simulados].sort((a, b) => b.date.localeCompare(a.date)), [data.simulados]);
  const simName = sims.find((x) => x.id === simId)?.name;
  const simDefault = simTask === 'corrigir' ? `Corrigir ${simName ?? 'o simulado'}` : simName ? `Simulado · ${simName}` : 'Fazer um simulado';
  const isSim = kind === 'simulado';
  const canSave = isSim ? (simTask === 'fazer' || !!simId || !!label.trim()) : !!topicId;

  return (
    <Modal open={open} onClose={onClose} title={`Nova missão · ${chapter.title}`}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSave) return;
          const ms = chapterMissions(chapter.id, data.missions);
          const id = uid();
          const order = (ms.at(-1)?.order ?? -1) + 1;
          if (isSim) {
            // simulado: uma etapa só, sem horas; conclui sozinha quando o simulado ligado é feito/corrigido
            saveMission({
              id, chapterId: chapter.id, topicId: '', kind: 'simulado', label: label.trim() || simDefault, order,
              scheduledDate: null, notes: '', coverAssetId: null, simTask, simuladoId: simId || null,
              activities: [{ id: uid(), type: simTask === 'corrigir' ? 'correcao' : 'outro', label: simTask === 'corrigir' ? 'Corrigir o simulado' : 'Fazer o simulado', plannedMinutes: null, plannedQuestions: null, required: true, done: false, doneAt: null, sessionId: null, scheduledDate: null }],
            });
          } else {
            if (pending) saveTopic(pending);
            const activities: Activity[] = DEFAULT_ACTS.filter((a) => acts.includes(a.type)).map((a) => ({
              id: uid(), type: a.type, label: a.label, plannedMinutes: null, plannedQuestions: null, required: true,
              done: false, doneAt: null, sessionId: null, scheduledDate: null,
            }));
            saveMission({
              id, chapterId: chapter.id, topicId, kind, label: label.trim() || topicName, order,
              scheduledDate: null, activities, notes: '', coverAssetId: null, ...(kind === 'internato' ? { theme } : {}),
            });
          }
          onClose();
          onCreated(id);
        }}
      >
        <Field label="Tipo">
          <div className="seg">
            <button type="button" className={kind === 'medway' ? 'is-on' : ''} onClick={() => setKind('medway')}>Medway</button>
            <button type="button" className={kind === 'internato' ? 'is-on' : ''} onClick={() => setKind('internato')}>Internato</button>
            <button type="button" className={kind === 'simulado' ? 'is-on' : ''} onClick={() => setKind('simulado')}>Simulado</button>
          </div>
        </Field>
        {isSim ? (
          <>
            <Field label="O que vai fazer">
              <div className="seg">
                <button type="button" className={simTask === 'fazer' ? 'is-on' : ''} onClick={() => setSimTask('fazer')}>📝 Fazer o simulado</button>
                <button type="button" className={simTask === 'corrigir' ? 'is-on' : ''} onClick={() => setSimTask('corrigir')}>🔍 Corrigir</button>
              </div>
            </Field>
            <Field label="Qual simulado" hint={simTask === 'corrigir' ? 'Quando você finalizar a correção dele, a missão se completa sozinha.' : 'Opcional: se ainda não registrou, dá para ligar depois no painel da missão.'}>
              <select id="nm-sim" value={simId} onChange={(e) => setSimId(e.target.value)}>
                <option value="">{simTask === 'corrigir' ? 'Escolha o simulado…' : 'Ainda não fiz / não registrei'}</option>
                {sims.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.date.split('-').reverse().slice(0, 2).join('/')}</option>)}
              </select>
            </Field>
            <Field label="Nome na trilha" hint="Deixe vazio para o nome automático.">
              <input id="nm-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder={simDefault} />
            </Field>
          </>
        ) : (
          <>
            <Field label="Tema" hint="Se o tema já existe em outra semana, escolha o mesmo para somar o histórico.">
              <TopicPicker idBase="nm" value={topicId} onChange={(id, t) => { setTopicId(id); setPending(t ?? null); }} />
            </Field>
            {pending && <p className="field-hint">Tema novo: {pending.name}</p>}
            <Field label="Nome na trilha" hint="Deixe vazio para usar o nome do tema. Ex.: “… (Intensivo)”.">
              <input id="nm-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder={topicName} />
            </Field>
            {kind === 'internato' && (
              <Field label="Cara da estação" hint="Muda o ícone e a cor dela na trilha.">
                <ThemePicker value={theme} onChange={setTheme} />
              </Field>
            )}
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
          </>
        )}
        <div className="register-actions">
          <button type="button" className="btn btn-quiet" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={!canSave}>Criar missão</button>
        </div>
      </form>
    </Modal>
  );
}

/** escolha do tema visual de uma missão do internato */
export function ThemePicker({ value, onChange }: { value: InternatoTheme; onChange: (t: InternatoTheme) => void }) {
  return (
    <div className="theme-pick" role="radiogroup" aria-label="Tema da estação">
      {INTERNATO_THEMES.map((t) => (
        <button
          type="button"
          key={t.id}
          role="radio"
          aria-checked={value === t.id}
          className={`theme-chip ${value === t.id ? 'is-on' : ''}`}
          style={{ ['--th' as string]: t.color }}
          onClick={() => onChange(t.id)}
        >
          <span className="theme-chip-art"><MissionArt m={{ kind: 'internato', theme: t.id } as Mission} area="geral" /></span>
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  );
}
