import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../data/store';
import { useUI, ConfirmButton, Drawer, Field, LazyInput, ProgressRing, numOrNull } from '../components/ui';
import { Icon, ACTIVITY_ICON } from '../components/Icon';
import { RegisterForm, SessionEditor } from '../components/SessionForm';
import { Asset } from '../assets/registry';
import { ACTIVITY_TYPES, AREAS, areaOf, type Activity, type ActivityType, type Area, type Mission, type Priority } from '../types';
import { missionProgress, topicStats, chapterMissions } from '../logic/progress';
import { fmtMinutes, relDay, today, uid } from '../logic/dates';
import { EventEditor, type EventDraft } from '../components/EventEditor';
import { fromMin, toMin } from '../logic/agenda';
import { play } from '../logic/sound';
import { useRewards } from '../components/useRewards';

export function MissionPanel({ missionId, onClose }: { missionId: string | null; onClose: () => void }) {
  const { data } = useStore();
  const m = data.missions.find((x) => x.id === missionId);
  return (
    <Drawer open={!!m} onClose={onClose} label={m?.label ?? 'Missão'}>
      {m && <PanelBody key={m.id} m={m} onClose={onClose} />}
    </Drawer>
  );
}

function PanelBody({ m, onClose }: { m: Mission; onClose: () => void }) {
  const store = useStore();
  const { data, saveMission, saveTopic, completeActivity, uncompleteActivity, deleteMission } = store;
  const ui = useUI();
  const topic = data.topics.find((t) => t.id === m.topicId);
  const area = areaOf(topic?.area ?? 'geral');
  const prog = missionProgress(m);
  const st = topic ? topicStats(topic, data.sessions) : null;
  const [registering, setRegistering] = useState<string | null>(null);
  const [unchecking, setUnchecking] = useState<string | null>(null);
  const [extra, setExtra] = useState(false);
  const [addType, setAddType] = useState<ActivityType>('revisao');
  const [showTopic, setShowTopic] = useState(false);
  const chapter = data.chapters.find((c) => c.id === m.chapterId);
  const siblings = chapterMissions(m.chapterId, data.missions);
  const idx = siblings.findIndex((x) => x.id === m.id);
  const planned = m.activities.reduce((s, a) => s + (a.plannedMinutes ?? 0), 0);
  const plannedUnknown = m.activities.some((a) => a.plannedMinutes == null);
  const internato = m.kind === 'internato';
  const [agendaDraft, setAgendaDraft] = useState<{ draft: EventDraft; occ: string | null } | null>(null);
  const linked = data.events.filter((e) => e.missionId === m.id).sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
  const schedule = (activityId: string | null) => {
    const act = activityId ? m.activities.find((a) => a.id === activityId) : null;
    const mins = act?.plannedMinutes ?? (activityId ? 60 : planned || 120);
    const date = chapter && chapter.startDate > today() ? chapter.startDate : today();
    setAgendaDraft({
      draft: { date, start: '14:00', end: fromMin(toMin('14:00') + mins), type: internato ? 'internato' : 'missao', missionId: m.id, activityId },
      occ: null,
    });
  };

  const updAct = (id: string, patch: Partial<Activity>) =>
    saveMission({ ...m, activities: m.activities.map((a) => (a.id === id ? { ...a, ...patch } : a)) });

  const move = (dir: -1 | 1) => {
    const other = siblings[idx + dir];
    if (!other) return;
    saveMission({ ...m, order: other.order });
    saveMission({ ...other, order: m.order });
  };

  const rewards = useRewards();
  const onComplete = (a: Activity, d: Parameters<typeof completeActivity>[2]) => {
    const r = completeActivity(m.id, a.id, d);
    setRegistering(null);
    rewards.afterCompletion(r, m, chapter ?? null);
  };

  return (
    <div className="panel">
      <header className="panel-head" style={{ background: internato ? 'var(--pessego)' : area.color }}>
        <button className="icon-btn panel-close" onClick={onClose} aria-label="Fechar painel">
          <Icon name="close" />
        </button>
        <div className="panel-art">
          <Asset slot={internato ? 'trail.station.internato' : `trail.station.${topic?.area ?? 'geral'}`} />
        </div>
        <div className="panel-title">
          <span className="eyebrow">{internato ? 'Missão especial do internato' : 'Missão Medway'} · {chapter?.title}</span>
          <LazyInput id="panel-label" className="title-input" value={m.label} ariaLabel="Nome da missão" onCommit={(v) => v.trim() && saveMission({ ...m, label: v.trim() })} />
          <button className="topic-link" onClick={() => topic && ui.openTopic(topic.id)}>
            {topic?.name ?? 'Tema'} · {area.short}
          </button>
        </div>
      </header>

      <div className="panel-body">
        <section className="panel-summary">
          <ProgressRing pct={prog.pct} size={64} stroke={7} color={prog.complete ? 'var(--salvia-esc)' : 'var(--rosa-medio)'}>
            <span className="ring-num">{prog.done}/{prog.total}</span>
          </ProgressRing>
          <div className="summary-text">
            <strong>{prog.complete ? 'Missão concluída' : `${prog.total - prog.done} atividade${prog.total - prog.done === 1 ? '' : 's'} obrigatória${prog.total - prog.done === 1 ? '' : 's'} pendente${prog.total - prog.done === 1 ? '' : 's'}`}</strong>
            <span className="muted">
              Duração prevista: {planned ? fmtMinutes(planned) : 'a definir'}
              {planned > 0 && plannedUnknown ? ' + itens sem duração' : ''}
            </span>
          </div>
        </section>

        <section className="panel-agenda">
          <div className="perf-head">
            <h3 className="h-section">Na agenda</h3>
            <button className="btn btn-quiet btn-sm" onClick={() => schedule(null)}><Icon name="agenda" size={15} /> Agendar</button>
          </div>
          {linked.length === 0 ? (
            <p className="muted small">{internato ? 'Escolha um horário quando couber na sua rotina.' : 'Ainda sem horário marcado.'}</p>
          ) : (
            <ul className="linked">
              {linked.map((e) => (
                <li key={e.id}>
                  <button onClick={() => setAgendaDraft({ draft: { id: e.id, date: e.date }, occ: null })}>
                    <span className="mono">{e.recurrence ? 'toda semana' : relDay(e.date)}</span>
                    <span>{e.start}–{e.end}</span>
                    <span className="muted">{e.activityId ? m.activities.find((a) => a.id === e.activityId)?.label ?? '' : 'missão inteira'}{e.title.startsWith('Parte') ? ` · ${e.title}` : ''}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3 className="h-section">Atividades</h3>
          <ul className="acts">
            {m.activities.map((a) => (
              <li key={a.id} className={`act ${a.done ? 'is-done' : ''}`}>
                <div className="act-row">
                  <motion.button
                    className="act-check"
                    whileTap={{ scale: 0.85 }}
                    aria-label={a.done ? `Desmarcar ${a.label}` : `Concluir ${a.label}`}
                    aria-pressed={a.done}
                    onClick={() => {
                      if (a.done) setUnchecking(unchecking === a.id ? null : a.id);
                      else {
                        play('pop');
                        setRegistering(registering === a.id ? null : a.id);
                      }
                    }}
                  >
                    <AnimatePresence>
                      {a.done && (
                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 600, damping: 20 }}>
                          <Icon name="check" size={18} />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                  <span className="act-icon"><Icon name={ACTIVITY_ICON[a.type]} size={18} /></span>
                  <LazyInput id={`act-l-${a.id}`} className="act-label" value={a.label} ariaLabel="Nome da atividade" onCommit={(v) => v.trim() && updAct(a.id, { label: v.trim() })} />
                  <button
                    className={`tag-toggle ${a.required ? 'on' : ''}`}
                    onClick={() => updAct(a.id, { required: !a.required })}
                    title="Alternar obrigatória/opcional"
                  >
                    {a.required ? 'obrigatória' : 'opcional'}
                  </button>
                </div>
                <div className="act-meta">
                  <label className="mini">
                    <Icon name="clock" size={14} />
                    <LazyInput id={`act-m-${a.id}`} className="mini-input" value={a.plannedMinutes?.toString() ?? ''} placeholder="—" ariaLabel="Duração prevista em minutos" onCommit={(v) => updAct(a.id, { plannedMinutes: numOrNull(v) })} />
                    min
                  </label>
                  {a.type === 'questoes' && (
                    <label className="mini">
                      <LazyInput id={`act-q-${a.id}`} className="mini-input" value={a.plannedQuestions?.toString() ?? ''} placeholder="—" ariaLabel="Questões planejadas" onCommit={(v) => updAct(a.id, { plannedQuestions: numOrNull(v) })} />
                      questões
                    </label>
                  )}
                  <button className="mini mini-btn" onClick={() => schedule(a.id)} aria-label={`Agendar ${a.label}`}>
                    <Icon name="agenda" size={14} />
                    {(() => {
                      const next = linked.filter((e) => e.activityId === a.id && e.date >= today()).sort((x, y) => x.date.localeCompare(y.date))[0];
                      return next ? `${relDay(next.date)} ${next.start}` : 'agendar';
                    })()}
                  </button>
                  {a.done && <span className="mini done-on">feito {relDay(a.doneAt)}</span>}
                  <ConfirmButton
                    className="icon-btn icon-btn-sm"
                    label={<Icon name="trash" size={16} />}
                    question="Remover?"
                    confirmLabel="Remover"
                    onConfirm={() => {
                      if (a.done) uncompleteActivity(m.id, a.id);
                      saveMission({ ...m, activities: m.activities.filter((x) => x.id !== a.id) });
                    }}
                  />
                </div>
                <AnimatePresence initial={false}>
                  {registering === a.id && !a.done && (
                    <motion.div className="act-expand" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                      <RegisterForm type={a.type} plannedQuestions={a.plannedQuestions} onCancel={() => setRegistering(null)} onSubmit={(d) => onComplete(a, d)} />
                    </motion.div>
                  )}
                  {unchecking === a.id && a.done && (
                    <motion.div className="act-expand" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                      <div className="confirm-box">
                        <span>Desmarcar apaga o registro desta atividade no Registro de estudos.</span>
                        <div className="register-actions">
                          <button className="btn btn-quiet" onClick={() => setUnchecking(null)}>Manter</button>
                          <button className="btn btn-danger" onClick={() => { uncompleteActivity(m.id, a.id); setUnchecking(null); play('uncheck'); }}>
                            Desmarcar
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            ))}
          </ul>
          <div className="add-act">
            <select id="add-act-type" value={addType} onChange={(e) => setAddType(e.target.value as ActivityType)} aria-label="Tipo da nova atividade">
              {ACTIVITY_TYPES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() =>
                saveMission({
                  ...m,
                  activities: [
                    ...m.activities,
                    {
                      id: uid(), type: addType, label: ACTIVITY_TYPES.find((t) => t.id === addType)!.label,
                      plannedMinutes: null, plannedQuestions: null, required: true, done: false, doneAt: null, sessionId: null, scheduledDate: null,
                    },
                  ],
                })
              }
            >
              <Icon name="plus" size={16} /> Adicionar atividade
            </button>
          </div>
        </section>

        {topic && st && (
          <section className="perf">
            <div className="perf-head">
              <h3 className="h-section">Desempenho no tema</h3>
              <button className="btn btn-quiet btn-sm" onClick={() => ui.openTopic(topic.id)}>Ficha completa</button>
            </div>
            <div className="stat-row compact">
              <div className="stat"><span className="stat-v">{st.accuracy == null ? '—' : `${Math.round(st.accuracy * 100)}%`}</span><span className="stat-l">acertos</span></div>
              <div className="stat"><span className="stat-v">{st.questions}</span><span className="stat-l">questões</span></div>
              <div className="stat"><span className="stat-v">{st.reviews}</span><span className="stat-l">revisões</span></div>
              <div className="stat"><span className="stat-v">{st.nextReview ? relDay(st.nextReview) : '—'}</span><span className="stat-l">próx. revisão</span></div>
            </div>
            <p className="field-hint">O histórico é do tema: aparece igual em todas as semanas em que ele se repete.</p>
            {extra ? (
              <div className="inline-panel">
                <SessionEditorForMission missionId={m.id} topicId={topic.id} onDone={() => setExtra(false)} />
              </div>
            ) : (
              <button className="btn btn-secondary" onClick={() => setExtra(true)}>
                <Icon name="plus" size={16} /> Registrar sessão extra
              </button>
            )}
          </section>
        )}

        <section>
          <button className="disclosure" onClick={() => setShowTopic(!showTopic)} aria-expanded={showTopic}>
            <Icon name={showTopic ? 'chevronD' : 'chevronR'} size={16} /> Tema, capítulo e ordem
          </button>
          {showTopic && topic && (
            <div className="register-grid">
              <Field label="Nome do tema" hint="Renomear vale para todas as semanas.">
                <LazyInput id="tp-name" value={topic.name} onCommit={(v) => v.trim() && saveTopic({ ...topic, name: v.trim() })} />
              </Field>
              <Field label="Grande área">
                <select id="tp-area" value={topic.area} onChange={(e) => saveTopic({ ...topic, area: e.target.value as Area })}>
                  {AREAS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                </select>
              </Field>
              <Field label="Especialidade">
                <LazyInput id="tp-spec" value={topic.specialty} onCommit={(v) => saveTopic({ ...topic, specialty: v.trim() })} />
              </Field>
              <Field label="Prioridade">
                <select id="tp-prio" value={topic.priority} onChange={(e) => saveTopic({ ...topic, priority: e.target.value as Priority })}>
                  <option value="alta">Alta</option>
                  <option value="media">Média</option>
                  <option value="baixa">Baixa</option>
                </select>
              </Field>
              <Field label="Vincular a outro tema" hint="Junta o histórico desta missão ao do tema escolhido.">
                <select id="tp-link" value={m.topicId} onChange={(e) => saveMission({ ...m, topicId: e.target.value })}>
                  {[...data.topics].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Capítulo">
                <select id="tp-ch" value={m.chapterId} onChange={(e) => saveMission({ ...m, chapterId: e.target.value, order: 999 })}>
                  {[...data.chapters].sort((a, b) => a.number - b.number).map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </Field>
              <Field label="Tipo de missão">
                <select id="tp-kind" value={m.kind} onChange={(e) => saveMission({ ...m, kind: e.target.value as Mission['kind'] })}>
                  <option value="medway">Medway</option>
                  <option value="internato">Missão especial do internato</option>
                </select>
              </Field>
              <div className="field">
                <span className="field-label">Posição na trilha</span>
                <div className="btn-row">
                  <button className="btn btn-quiet btn-sm" disabled={idx <= 0} onClick={() => move(-1)}><Icon name="up" size={16} /> Antes</button>
                  <button className="btn btn-quiet btn-sm" disabled={idx >= siblings.length - 1} onClick={() => move(1)}><Icon name="down" size={16} /> Depois</button>
                </div>
              </div>
            </div>
          )}
        </section>

        <section>
          <Field label="Anotações da missão">
            <NotesArea value={m.notes} onCommit={(v) => saveMission({ ...m, notes: v })} />
          </Field>
        </section>

        <footer className="panel-foot">
          <span />
          <ConfirmButton
            label={<><Icon name="trash" size={16} /> Excluir missão</>}
            question="Excluir? Os registros de estudo ficam."
            confirmLabel="Excluir"
            onConfirm={() => { deleteMission(m.id); onClose(); }}
          />
        </footer>
      </div>
      <EventEditor draft={agendaDraft?.draft ?? null} occurrence={agendaDraft?.occ} onClose={() => setAgendaDraft(null)} />
    </div>
  );
}

function NotesArea({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  const [v, setV] = useState(value);
  React.useEffect(() => setV(value), [value]);
  return <textarea id="panel-notes" rows={3} value={v} onChange={(e) => setV(e.target.value)} onBlur={() => v !== value && onCommit(v)} placeholder="Links, dúvidas, condutas para lembrar…" />;
}

/** Sessão extra presa à missão (sem atividade). */
function SessionEditorForMission({ missionId, topicId, onDone }: { missionId: string; topicId: string; onDone: () => void }) {
  const { saveSession } = useStore();
  const ui = useUI();
  const [type, setType] = useState<ActivityType>('questoes');
  return (
    <div className="session-editor">
      <Field label="Tipo">
        <select id="extra-type" value={type} onChange={(e) => setType(e.target.value as ActivityType)}>
          {ACTIVITY_TYPES.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
        </select>
      </Field>
      <RegisterForm
        key={type}
        type={type}
        submitLabel="Registrar"
        onCancel={onDone}
        onSubmit={(d) => {
          saveSession({
            id: uid(), topicId, missionId, activityId: null, type, date: d.date, minutes: d.minutes, questions: d.questions,
            correct: d.correct, errorTopics: d.errorTopics.filter((x) => x.trim()).slice(0, 2), notes: '', createdAt: new Date().toISOString(),
          });
          ui.activityDone();
          onDone();
        }}
      />
    </div>
  );
}

export { SessionEditor };
