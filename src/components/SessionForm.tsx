import React, { useEffect, useId, useState } from 'react';
import type { ActivityType, Area, ErrorGroup, Session, Topic } from '../types';
import { MASTERY, QUESTION_SOURCES, REVIEW_METHODS } from '../types';
import { ErrorGroups, groupsToLegacy } from './ErrorGroups';
import { useFocusPrefill, focus as focusTimer } from './focus';
import { ACTIVITY_TYPES, AREAS } from '../types';
import { today, uid } from '../logic/dates';
import { Field, numOrNull } from './ui';
import { useStore, type SessionDraft } from '../data/store';

const pctOf = (q: number | null, c: number | null) => (q && c != null ? `${Math.round((c / q) * 100)}%` : '—');

/** Campos extras do rascunho que vão direto para o registro. */
export function draftFields(d: SessionDraft): Partial<Session> {
  return {
    errors: d.errors ?? [],
    ...(d.source ? { source: d.source } : {}),
    ...(d.method ? { method: d.method } : {}),
    ...(d.mastery ? { mastery: d.mastery } : {}),
    ...(d.watched ? { watched: d.watched } : {}),
  };
}

const TYPE_HINT: Partial<Record<ActivityType, string>> = {
  videoaula: 'Data, duração e se você assistiu tudo.',
  questoes: 'Quantas fez, quantas acertou e onde errou.',
  revisao: 'Como revisou e quão seguro você se sente.',
  flashcards: 'Quantos cartões e quantos acertou.',
  leitura: 'Data e duração.',
  foco: 'Data e duração.',
  outro: 'Data e duração.',
};

/** Formulário de registro. Os campos mudam conforme o tipo de atividade. */
export function RegisterForm({ type, initial, onSubmit, onCancel, submitLabel = 'Concluir atividade', plannedQuestions, showNotes = false }: {
  type: ActivityType;
  initial?: Partial<SessionDraft>;
  onSubmit: (d: SessionDraft) => void;
  onCancel: () => void;
  submitLabel?: string;
  plannedQuestions?: number | null;
  showNotes?: boolean;
}) {
  const fid = useId();
  const [date, setDate] = useState(initial?.date ?? today());
  const [minutes, setMinutes] = useState(initial?.minutes?.toString() ?? '');
  const [questions, setQuestions] = useState(initial?.questions?.toString() ?? plannedQuestions?.toString() ?? '');
  const [correct, setCorrect] = useState(initial?.correct?.toString() ?? '');
  const [groups, setGroups] = useState<ErrorGroup[]>(initial?.errors ?? []);
  const [source, setSource] = useState(initial?.source ?? '');
  const [method, setMethod] = useState(initial?.method ?? '');
  const [mastery, setMastery] = useState<number | null>(initial?.mastery ?? null);
  const [watched, setWatched] = useState<'completa' | 'parcial' | null>(initial?.watched ?? null);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [revQ, setRevQ] = useState(type === 'revisao' && initial?.questions != null);
  const legacy = !initial?.errors?.length ? (initial?.errorTopics ?? []).filter(Boolean) : [];
  const [err, setErr] = useState<string | null>(null);
  const focus = useFocusPrefill();
  useEffect(() => {
    if (!initial?.minutes && focus && !minutes) setMinutes(String(focus));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const withQ = type === 'questoes' || type === 'flashcards' || (type === 'revisao' && revQ);
  const qN = numOrNull(questions);
  const cN = numOrNull(correct);
  const wrong = qN != null && cN != null ? qN - cN : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = withQ ? qN : null;
    const c = withQ ? cN : null;
    if (q != null && c != null && c > q) return setErr('Os acertos não podem passar do total de questões.');
    const g = withQ && type !== 'flashcards' ? groups.filter((x) => x.count > 0) : [];
    const classified = g.reduce((a, x) => a + x.count, 0);
    if (q != null && c != null && classified > q - c) return setErr('Há mais erros classificados do que erros na sessão.');
    if (focus != null && !initial?.minutes && numOrNull(minutes) === focus) focusTimer.consume();
    onSubmit({
      date, minutes: numOrNull(minutes), questions: q, correct: c,
      errorTopics: g.length ? groupsToLegacy(g) : legacy, errors: g, notes: showNotes ? notes : initial?.notes ?? '',
      source: type === 'questoes' ? source.trim() : '',
      method: type === 'revisao' ? method : '',
      mastery: type === 'revisao' ? mastery : null,
      watched: type === 'videoaula' ? watched : null,
    });
  };

  return (
    <form className="register" onSubmit={submit}>
      {TYPE_HINT[type] && <p className="register-hint">{TYPE_HINT[type]}</p>}
      <div className="register-grid">
        <Field label="Data">
          <input id={`${fid}-d`} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
        <Field label={type === 'videoaula' ? 'Duração (min)' : 'Tempo (min)'}>
          <input id={`${fid}-m`} inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="opcional" />
        </Field>
        {withQ && (
          <>
            <Field label={type === 'flashcards' ? 'Cartões' : 'Questões'}>
              <input id={`${fid}-q`} inputMode="numeric" value={questions} onChange={(e) => setQuestions(e.target.value)} placeholder="opcional" />
            </Field>
            <Field label="Acertos">
              <input id={`${fid}-c`} inputMode="numeric" value={correct} onChange={(e) => setCorrect(e.target.value)} placeholder="opcional" />
            </Field>
            <Field label="Erros">
              <span className="static-field">{wrong != null && wrong >= 0 ? wrong : '—'}</span>
            </Field>
            <Field label="Aproveitamento">
              <span className="static-field">{pctOf(qN, cN)}</span>
            </Field>
          </>
        )}
        {type === 'questoes' && (
          <Field label="Fonte">
            <input id={`${fid}-src`} list={`${fid}-srcs`} value={source} onChange={(e) => setSource(e.target.value)} placeholder="opcional" />
            <datalist id={`${fid}-srcs`}>{QUESTION_SOURCES.map((x) => <option key={x} value={x} />)}</datalist>
          </Field>
        )}
      </div>

      {type === 'videoaula' && (
        <div className="chip-field">
          <span className="field-label">Conclusão</span>
          <div className="chip-row" role="radiogroup" aria-label="Conclusão da aula">
            {([['completa', 'Assisti tudo'], ['parcial', 'Assisti uma parte']] as const).map(([v, l]) => (
              <button key={v} type="button" role="radio" aria-checked={watched === v} className={`chip-toggle ${watched === v ? 'is-on' : ''}`} onClick={() => setWatched(watched === v ? null : v)}>{l}</button>
            ))}
          </div>
        </div>
      )}

      {type === 'revisao' && (
        <>
          <div className="chip-field">
            <span className="field-label">Método</span>
            <div className="chip-row" role="radiogroup" aria-label="Método de revisão">
              {REVIEW_METHODS.map((m) => (
                <button key={m} type="button" role="radio" aria-checked={method === m} className={`chip-toggle ${method === m ? 'is-on' : ''}`} onClick={() => setMethod(method === m ? '' : m)}>{m}</button>
              ))}
            </div>
          </div>
          <div className="chip-field">
            <span className="field-label">Percepção de domínio</span>
            <div className="mastery-row" role="radiogroup" aria-label="Percepção de domínio">
              {MASTERY.map((m) => (
                <button key={m.v} type="button" role="radio" aria-checked={mastery === m.v} className={`mastery-dot ${mastery != null && m.v <= mastery ? 'is-on' : ''}`} onClick={() => setMastery(mastery === m.v ? null : m.v)} title={m.label}>
                  <span aria-hidden="true" />
                  <small>{m.label}</small>
                </button>
              ))}
            </div>
          </div>
          {!revQ && <button type="button" className="btn btn-quiet btn-sm" onClick={() => setRevQ(true)}>+ Fiz questões nessa revisão</button>}
        </>
      )}

      {focus != null && !initial?.minutes && <p className="field-hint">Tempo preenchido pelo cronômetro do Cantinho. Ele será zerado ao salvar, para não contar duas vezes.</p>}
      {withQ && type !== 'flashcards' && (
        <>
          {legacy.length > 0 && <p className="field-hint">Anotado antes: {legacy.join(' · ')}</p>}
          <ErrorGroups value={groups} onChange={setGroups} wrong={wrong} />
        </>
      )}
      {showNotes && (
        <Field label={type === 'videoaula' ? 'Observações' : 'Anotações'}>
          <textarea id={`${fid}-notes`} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="opcional" />
        </Field>
      )}
      {err && <p className="form-error" role="alert">{err}</p>}
      <div className="register-actions">
        <button type="button" className="btn btn-quiet" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

/** Seleção de tema com criação rápida de tema novo. */
export function TopicPicker({ value, onChange, idBase }: { value: string; onChange: (topicId: string, newTopic?: Topic) => void; idBase: string }) {
  const { data } = useStore();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [area, setArea] = useState<Area>('clinica');
  const [spec, setSpec] = useState('');
  const sorted = [...data.topics].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  if (creating)
    return (
      <div className="topic-new">
        <div className="register-grid">
          <Field label="Nome do tema">
            <input id={`${idBase}-tn`} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </Field>
          <Field label="Grande área">
            <select id={`${idBase}-ta`} value={area} onChange={(e) => setArea(e.target.value as Area)}>
              {AREAS.map((a) => (
                <option key={a.id} value={a.id}>{a.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Especialidade">
            <input id={`${idBase}-ts`} value={spec} onChange={(e) => setSpec(e.target.value)} placeholder="ex.: Cardiologia" />
          </Field>
        </div>
        <div className="register-actions">
          <button type="button" className="btn btn-quiet" onClick={() => setCreating(false)}>
            Usar tema existente
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!name.trim()}
            onClick={() => {
              const t: Topic = {
                id: uid(), name: name.trim(), area, specialty: spec.trim(), priority: 'media',
                nextReviewOverride: null, coverAssetId: null, createdAt: new Date().toISOString(),
              };
              onChange(t.id, t);
              setCreating(false);
            }}
          >
            Criar tema
          </button>
        </div>
      </div>
    );

  return (
    <div className="topic-pick">
      <select id={`${idBase}-tp`} value={value} onChange={(e) => onChange(e.target.value)} required>
        <option value="" disabled>
          Escolha o tema
        </option>
        {sorted.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      <button type="button" className="btn btn-quiet btn-sm" onClick={() => setCreating(true)}>
        + Tema novo
      </button>
    </div>
  );
}

/** Formulário completo de sessão (registro independente ou edição). */
export function SessionEditor({ session, presetTopic, presetType, onDone, onSaved, duplicate }: {
  session?: Session; presetTopic?: string; presetType?: ActivityType; onDone: () => void; onSaved?: (s: Session) => void; duplicate?: boolean;
}) {
  const { saveSession, saveTopic, data } = useStore();
  const fid = useId();
  const [topicId, setTopicId] = useState(session?.topicId ?? presetTopic ?? '');
  const [pendingTopic, setPendingTopic] = useState<Topic | null>(null);
  const [type, setType] = useState<ActivityType>(session?.type ?? presetType ?? 'questoes');
  const [err, setErr] = useState<string | null>(null);
  const linked = !!session?.activityId && !duplicate;
  const topicName = data.topics.find((t) => t.id === topicId)?.name ?? pendingTopic?.name;

  return (
    <div className="session-editor">
      <Field label="Tema">
        {linked ? (
          <span className="static-field">{topicName} · registro de missão</span>
        ) : (
          <TopicPicker
            idBase={fid}
            value={topicId}
            onChange={(id, t) => {
              setTopicId(id);
              setPendingTopic(t ?? null);
              setErr(null);
            }}
          />
        )}
      </Field>
      {pendingTopic && <p className="field-hint">Tema novo: {pendingTopic.name}</p>}
      <Field label="Tipo de atividade">
        <select id={`${fid}-type`} value={type} disabled={linked} onChange={(e) => setType(e.target.value as ActivityType)}>
          {ACTIVITY_TYPES.map((a) => (
            <option key={a.id} value={a.id}>{a.label}</option>
          ))}
        </select>
      </Field>
      <RegisterForm
        key={type}
        type={type}
        initial={session}
        showNotes
        submitLabel={session && !duplicate ? 'Salvar alterações' : 'Registrar sessão'}
        onCancel={onDone}
        onSubmit={(d) => {
          if (!topicId) return setErr('Escolha ou crie um tema.');
          if (pendingTopic) saveTopic(pendingTopic);
          const keep = session && !duplicate;
          const base: Session = {
            id: keep ? session.id : uid(),
            topicId,
            missionId: keep ? session.missionId ?? null : null,
            activityId: keep ? session.activityId ?? null : null,
            type,
            date: d.date,
            minutes: d.minutes,
            questions: d.questions,
            correct: d.correct,
            errorTopics: d.errorTopics.filter((x) => x.trim()).slice(0, 2),
            notes: d.notes,
            createdAt: keep ? session.createdAt : new Date().toISOString(),
            ...(keep && session.focus ? { focus: true } : {}),
            ...draftFields(d),
          };
          saveSession(base);
          onSaved?.(base);
          onDone();
        }}
      />
      {err && <p className="form-error">{err}</p>}
    </div>
  );
}
