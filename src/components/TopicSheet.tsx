import React, { useState } from 'react';
import { useStore } from '../data/store';
import { useUI, Modal, Field } from './ui';
import { areaOf, activityLabel, type Priority } from '../types';
import { STAGE_LABEL, STAGE_NEXT, topicStats } from '../logic/progress';
import { fmtLong, fmtMinutes, fmtShort, relDay } from '../logic/dates';
import { Asset } from '../assets/registry';
import { SPECIES_BY_AREA, SPECIES_LABEL } from '../assets/art';
import { SessionEditor } from './SessionForm';

/** Ficha do tema — usada pelo jardim, pelas revisões e (na próxima etapa) pela biblioteca. */
export function TopicSheet() {
  const { topicId, openTopic } = useUI();
  const { data, saveTopic } = useStore();
  const [logging, setLogging] = useState(false);
  const topic = data.topics.find((t) => t.id === topicId);
  const close = () => {
    setLogging(false);
    openTopic(null);
  };
  if (!topic) return <Modal open={false} onClose={close} title="">{null}</Modal>;

  const st = topicStats(topic, data.sessions);
  const area = areaOf(topic.area);
  const species = SPECIES_BY_AREA[topic.area];
  const appearsIn = data.missions
    .filter((m) => m.topicId === topic.id)
    .map((m) => data.chapters.find((c) => c.id === m.chapterId))
    .filter(Boolean)
    .map((c) => `Cap. ${c!.number}`);
  const toNext = st.stage < 4 ? Math.max(0, STAGE_NEXT[st.stage] - st.points) : 0;

  return (
    <Modal open={!!topicId} onClose={close} title={topic.name} wide>
      <div className="sheet">
        <div className="sheet-top">
          <div className="sheet-plant" style={{ background: area.color }}>
            {st.stage > 0 ? (
              <Asset slot={`garden.plant.${species}.${st.stage}`} />
            ) : (
              <span className="sheet-plant-empty">Ainda sem registro</span>
            )}
          </div>
          <div className="sheet-meta">
            <div className="chips">
              <span className="chip" style={{ background: area.color, color: area.ink }}>{area.label}</span>
              {topic.specialty && <span className="chip chip-line">{topic.specialty}</span>}
              {appearsIn.length > 0 && <span className="chip chip-line">{[...new Set(appearsIn)].join(' · ')}</span>}
            </div>
            <p className="sheet-stage">
              <strong>{SPECIES_LABEL[species]}</strong> · {STAGE_LABEL[st.stage]}
              {st.stage > 0 && st.stage < 4 && <> · faltam {toNext} ponto{toNext === 1 ? '' : 's'} para crescer</>}
            </p>
            <p className="field-hint">Cada sessão vale 1 ponto; cada revisão vale 2 (3 com 70% ou mais de acertos).</p>
          </div>
        </div>

        <div className="stat-row">
          <div className="stat"><span className="stat-v">{st.accuracy == null ? '—' : `${Math.round(st.accuracy * 100)}%`}</span><span className="stat-l">acertos</span></div>
          <div className="stat"><span className="stat-v">{st.questions}</span><span className="stat-l">questões</span></div>
          <div className="stat"><span className="stat-v">{st.reviews}</span><span className="stat-l">revisões</span></div>
          <div className="stat"><span className="stat-v">{fmtMinutes(st.minutes || null)}</span><span className="stat-l">tempo total</span></div>
          <div className="stat"><span className="stat-v">{relDay(st.lastDate)}</span><span className="stat-l">última sessão</span></div>
        </div>

        <div className="sheet-cols">
          <section>
            <h3 className="h-section">Próxima revisão</h3>
            <div className="register-grid two">
              <Field label="Data" hint={st.suggestedReview ? `Sugestão do app: ${fmtLong(st.suggestedReview)}` : 'Aparece depois do primeiro registro.'}>
                <input
                  id="sheet-next"
                  type="date"
                  value={st.nextReview ?? ''}
                  onChange={(e) => saveTopic({ ...topic, nextReviewOverride: e.target.value || null })}
                />
              </Field>
              <Field label="Prioridade">
                <select id="sheet-prio" value={topic.priority} onChange={(e) => saveTopic({ ...topic, priority: e.target.value as Priority })}>
                  <option value="alta">Alta (revisa antes)</option>
                  <option value="media">Média</option>
                  <option value="baixa">Baixa</option>
                </select>
              </Field>
            </div>
            {topic.nextReviewOverride && (
              <button className="btn btn-quiet btn-sm" onClick={() => saveTopic({ ...topic, nextReviewOverride: null })}>
                Voltar para a sugestão
              </button>
            )}
            <h3 className="h-section">Erros frequentes</h3>
            {st.topErrors.length ? (
              <ul className="err-list">
                {st.topErrors.map((e) => (
                  <li key={e.name}><span>{e.name}</span><span className="muted">{e.count}×</span></li>
                ))}
              </ul>
            ) : (
              <p className="muted">Nenhum assunto registrado ainda.</p>
            )}
          </section>
          <section>
            <h3 className="h-section">Histórico</h3>
            {st.sessions.length ? (
              <ul className="history">
                {[...st.sessions].reverse().slice(0, 12).map((s) => (
                  <li key={s.id}>
                    <span className="mono">{fmtShort(s.date)}</span>
                    <span>{activityLabel(s.type)}</span>
                    <span className="muted">
                      {s.questions ? `${s.correct ?? 0}/${s.questions}` : ''} {s.minutes ? fmtMinutes(s.minutes) : ''}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Sem sessões ainda.</p>
            )}
          </section>
        </div>

        {logging ? (
          <div className="inline-panel">
            <SessionEditor presetTopic={topic.id} presetType="revisao" onDone={() => setLogging(false)} />
          </div>
        ) : (
          <button className="btn btn-primary" onClick={() => setLogging(true)}>
            Regar: registrar revisão
          </button>
        )}
      </div>
    </Modal>
  );
}
