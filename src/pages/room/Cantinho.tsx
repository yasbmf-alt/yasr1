import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../data/store';
import { useUI } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { elapsedMs, focus, isActive, useFocus } from '../../components/focus';
import { AMBIENTS, ambientKind, onAmbient, setAmbientVolume, startAmbient, stopAmbient, type AmbientKind } from '../../logic/ambient';
import { play } from '../../logic/sound';
import { today, uid } from '../../logic/dates';
import { fmtHM } from '../../components/HoursJar';

const PRESETS = [25, 30, 45, 50, 60];
const two = (n: number) => String(Math.floor(n)).padStart(2, '0');
const clock = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600);
  return h ? `${h}:${two((s % 3600) / 60)}:${two(s % 60)}` : `${two(s / 60)}:${two(s % 60)}`;
};

export function Cantinho() {
  const { data, saveSession, saveSettings } = useStore();
  const ui = useUI();
  const st = useFocus(250);
  const [, force] = useState(0);
  const [mode, setMode] = useState<number | null>(st.countdown);
  const [topicId, setTopicId] = useState<string>(st.topicId ?? '');
  const [kind, setKind] = useState<'estudo' | 'simulado'>(st.kind ?? 'estudo');
  const [amb, setAmb] = useState<AmbientKind | null>(ambientKind());
  const [vol, setVol] = useState(data.settings.ambientVolume ?? 0.5);
  const finishing = useRef(false);
  const el = elapsedMs(st);
  const remaining = st.countdown ? st.countdown * 60000 - el : null;

  useEffect(() => onAmbient(() => { setAmb(ambientKind()); force((x) => x + 1); }), []);
  useEffect(() => setAmbientVolume(vol), [vol]);

  const finish = (auto = false) => {
    if (finishing.current) return;
    finishing.current = true;
    const isSim = st.kind === 'simulado';
    const minutes = focus.consume();
    if (minutes >= 1 && isSim) {
      saveSession({
        id: uid(), date: today(), topicId: '', missionId: null, activityId: null, type: 'foco', minutes, questions: null, correct: null,
        errorTopics: [], errors: [], notes: 'Simulado (cronômetro do Cantinho)', createdAt: new Date().toISOString(), focus: true, simTimer: true,
      });
      play('mission');
      ui.toast(`${fmtHM(minutes)} de simulado contadas no seu dia. Ao registrar o simulado, esse tempo já vem preenchido (sem contar duas vezes).`, 'diva');
    } else if (minutes >= 1) {
      const id = uid();
      saveSession({
        id, date: today(), topicId: st.topicId ?? '', missionId: null, activityId: null, type: 'foco', minutes, questions: null, correct: null,
        errorTopics: [], errors: [], notes: 'Cantinho de concentração', createdAt: new Date().toISOString(), focus: true,
      });
      play(auto ? 'mission' : 'check');
      ui.toast(`${minutes} min registrados no seu estudo.${st.topicId ? '' : ' Sem tema, eles contam nas horas mas não no jardim.'}`, 'diva');
    } else ui.toast('Sessão curtinha demais para registrar (menos de 1 minuto).');
    setTimeout(() => { finishing.current = false; }, 300);
  };

  useEffect(() => {
    if (remaining != null && remaining <= 0 && st.running) finish(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, st.running]);

  const active = isActive(st);
  const pct = st.countdown ? Math.min(1, el / (st.countdown * 60000)) : (el % 3600000) / 3600000;
  const R = 118;
  const C = 2 * Math.PI * R;

  return (
    <div className="focus">
      <div className={`focus-scene ${st.running ? 'is-running' : ''}`}>
        <div className="fs-window" aria-hidden="true">
          {amb === 'chuva' && Array.from({ length: 18 }).map((_, i) => <span key={i} className="rain" style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 6) * 0.17}s` }} />)}
          {amb === 'natureza' && <span className="fs-bird">〰</span>}
        </div>
        {amb === 'lareira' && <span className="fs-fire" aria-hidden="true"><i /><i /><i /></span>}
        <span className="fs-lamp" aria-hidden="true" />
        <div className="fs-timer">
          <svg viewBox="0 0 280 280" className="ring-big" aria-hidden="true">
            <circle cx="140" cy="140" r={R} className="rb-track" />
            <motion.circle cx="140" cy="140" r={R} className="rb-fill" strokeDasharray={C} animate={{ strokeDashoffset: C * (1 - pct) }} transition={{ duration: 0.3 }} transform="rotate(-90 140 140)" />
          </svg>
          <div className="fs-time" aria-live="polite">
            <span className="fs-clock">{clock(remaining != null ? remaining : el)}</span>
            <span className="fs-sub">{st.countdown ? (remaining != null && remaining > 0 ? `de ${st.countdown} min` : 'tempo!') : active ? (st.kind === 'simulado' ? 'simulado · sem limite' : 'sem limite') : 'pronta?'}</span>
          </div>
        </div>
        <span className="fs-mug" aria-hidden="true"><i className="steam1" /><i className="steam2" /></span>
      </div>

      <div className="focus-controls card">
        <div className="fc-row">
          <span className="field-label">Modo</span>
          <div className="seg seg-wrap">
            <button className={mode == null ? 'is-on' : ''} disabled={active} onClick={() => setMode(null)}>∞ Sem limite</button>
            {PRESETS.map((p) => <button key={p} className={mode === p ? 'is-on' : ''} disabled={active} onClick={() => setMode(p)}>{p} min</button>)}
          </div>
        </div>
        <div className="fc-row">
          <span className="field-label">O que vou fazer</span>
          <div className="seg seg-wrap">
            <button className={kind === 'estudo' ? 'is-on' : ''} disabled={active} onClick={() => setKind('estudo')}>📚 Estudo</button>
            <button className={kind === 'simulado' ? 'is-on' : ''} disabled={active} onClick={() => { setKind('simulado'); setMode(null); }}>📝 Simulado</button>
          </div>
        </div>
        {kind === 'estudo' && <div className="fc-row">
          <label className="field-label" htmlFor="fc-topic">Estudando</label>
          <select id="fc-topic" value={topicId} onChange={(e) => { setTopicId(e.target.value); if (active) focus.setTopic(e.target.value || null); }}>
            <option value="">Sem tema (conta nas horas)</option>
            {[...data.topics].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>}
        <div className="fc-buttons">
          {!active && <button className="btn btn-primary btn-lg" onClick={() => { play('pop'); focus.start(kind === 'simulado' ? null : topicId || null, mode, kind); }}><span aria-hidden="true">▶</span> Iniciar</button>}
          {active && st.running && <button className="btn btn-secondary btn-lg" onClick={() => focus.pause()}>❚❚ Pausar</button>}
          {active && !st.running && <button className="btn btn-primary btn-lg" onClick={() => focus.resume()}>▶ Continuar</button>}
          {active && <button className="btn btn-quiet btn-lg" onClick={() => finish()}>■ Encerrar e registrar</button>}
        </div>
        {kind === 'simulado' && <p className="field-hint">No simulado o cronômetro corre sem limite. Ao encerrar, o tempo entra nas horas do dia e já vem preenchido quando você registrar a prova.</p>}
        <p className="field-hint">Se você concluir uma atividade da trilha com o cronômetro ligado, o tempo vai para ela e o cronômetro zera, para não contar duas vezes.</p>
      </div>

      <div className="card focus-amb">
        <span className="field-label">Som ambiente</span>
        <div className="amb-row">
          {AMBIENTS.map((a) => (
            <button key={a.id} className={`amb ${amb === a.id ? 'is-on' : ''}`} onClick={() => (amb === a.id ? stopAmbient() : startAmbient(a.id))} aria-pressed={amb === a.id}>
              <span className="amb-emoji">{a.emoji}</span>{a.label}
            </button>
          ))}
        </div>
        <label className="vol" htmlFor="amb-vol">
          <span className="small muted">Volume do ambiente</span>
          <input id="amb-vol" type="range" min={0} max={1} step={0.05} value={vol} onChange={(e) => setVol(Number(e.target.value))} onMouseUp={() => saveSettings({ ambientVolume: vol })} onTouchEnd={() => saveSettings({ ambientVolume: vol })} />
        </label>
        {amb && <button className="link small" onClick={() => stopAmbient()}><Icon name="close" size={12} /> Desligar som ambiente</button>}
      </div>
    </div>
  );
}
