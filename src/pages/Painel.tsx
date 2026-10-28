import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../data/store';
import { useUI } from '../components/ui';
import { Icon } from '../components/Icon';
import { StackBar } from '../components/charts';
import { DEFAULT_GOAL, HoursJar, dayStudyMinutes, fmtHM } from '../components/HoursJar';
import { StationIcon } from '../assets/art';
import { AREA_CHART } from './Simulados';
import { ACTIVITY_TYPES, BIG_AREAS, CORRECTION_TYPE, activityLabel, areaOf, type BigArea, type Session } from '../types';
import { streakInfo } from '../logic/progress';
import { addDays, DIAS_CURTOS, fmtShort, fromKey, today } from '../logic/dates';

// Painel numa página só: hoje (horas no pote), a semana, os últimos 14 dias,
// acerto em questões (nunca mistura flashcards), onde investir e para onde
// foi o tempo. Tudo recalculado dos registros.

const AREA_HEX: Record<string, string> = { ...Object.fromEntries(Object.entries(AREA_CHART).map(([k, v]) => [k, v.color])), geral: '#B79A86' };
const TYPE_COLORS = ['#4F79C2', '#D9578F', '#8E6AD8', '#E09A2E', '#6E8F3A', '#B79A86', '#5AA9A6', '#2E4A7F'];
const isQ = (s: Session) => !!s.questions && s.type !== 'flashcards';
const pctOf = (c: number, q: number) => (q ? Math.round((c / q) * 100) : null);
const sumMin = (list: Session[]) => list.reduce((a, s) => a + (s.minutes ?? 0), 0);

export function Painel() {
  const { data, saveSettings } = useStore();
  const ui = useUI();
  const t0 = today();
  const goal = data.settings.dailyGoalMinutes ?? DEFAULT_GOAL;
  const [hover, setHover] = useState<string | null>(null);
  const tmap = useMemo(() => new Map(data.topics.map((t) => [t.id, t])), [data.topics]);
  const inRange = (s: Session, from: string, to: string) => s.date >= from && s.date <= to;

  // hoje
  const todayS = data.sessions.filter((s) => s.date === t0);
  const todayMin = dayStudyMinutes(data.sessions, data.simulados, t0);
  const byType = new Map<string, number>();
  for (const s of todayS) if (s.minutes) byType.set(s.type, (byType.get(s.type) ?? 0) + s.minutes);
  const simToday = data.simulados.reduce((a, s) => a + (s.date === t0 ? s.minutes ?? 0 : 0), 0);
  const byTopic = new Map<string, number>();
  for (const s of todayS) if (s.minutes && s.topicId) byTopic.set(s.topicId, (byTopic.get(s.topicId) ?? 0) + s.minutes);
  const topToday = [...byTopic.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

  // semana (7 dias) × 7 dias anteriores
  const w0 = addDays(t0, -6);
  const wk = data.sessions.filter((s) => inRange(s, w0, t0));
  const pw = data.sessions.filter((s) => inRange(s, addDays(t0, -13), addDays(t0, -7)));
  const wkMin = sumMin(wk);
  const pwMin = sumMin(pw);
  const wkQ = wk.filter(isQ).reduce((a, s) => ({ q: a.q + s.questions!, c: a.c + (s.correct ?? 0) }), { q: 0, c: 0 });
  const st = streakInfo(data.sessions);
  const daysHit = Array.from({ length: 7 }, (_, i) => addDays(t0, -i)).filter((d) => dayStudyMinutes(data.sessions, data.simulados, d) >= goal).length;

  // últimos 14 dias
  const days14 = Array.from({ length: 14 }, (_, i) => {
    const d = addDays(t0, i - 13);
    return { d, m: dayStudyMinutes(data.sessions, data.simulados, d) };
  });
  const max14 = Math.max(goal, ...days14.map((x) => x.m), 60);

  // acerto em questões por grande área: 30 dias × 30 anteriores
  const areaAcc = (from: string, to: string) => {
    const m = new Map<BigArea, { q: number; c: number }>(BIG_AREAS.map((a) => [a, { q: 0, c: 0 }]));
    for (const s of data.sessions) {
      if (!isQ(s) || !inRange(s, from, to)) continue;
      const a = tmap.get(s.topicId)?.area;
      if (!a || a === 'geral') continue;
      const x = m.get(a as BigArea)!;
      x.q += s.questions!;
      x.c += s.correct ?? 0;
    }
    return m;
  };
  const acc30 = areaAcc(addDays(t0, -29), t0);
  const accPrev = areaAcc(addDays(t0, -59), addDays(t0, -30));
  const all30 = [...acc30.values()].reduce((a, x) => ({ q: a.q + x.q, c: a.c + x.c }), { q: 0, c: 0 });
  const allPrev = [...accPrev.values()].reduce((a, x) => ({ q: a.q + x.q, c: a.c + x.c }), { q: 0, c: 0 });
  const accNow = pctOf(all30.c, all30.q);
  const accDelta = accNow != null && allPrev.q ? accNow - pctOf(allPrev.c, allPrev.q)! : null;

  // onde investir: menor acerto (≥ 10 questões em 30 dias) e temas parados há mais tempo
  const topicAcc = new Map<string, { q: number; c: number }>();
  for (const s of data.sessions) {
    if (!isQ(s) || !inRange(s, addDays(t0, -29), t0)) continue;
    const x = topicAcc.get(s.topicId) ?? { q: 0, c: 0 };
    x.q += s.questions!;
    x.c += s.correct ?? 0;
    topicAcc.set(s.topicId, x);
  }
  const weak = [...topicAcc.entries()].filter(([, x]) => x.q >= 10).map(([id, x]) => ({ t: tmap.get(id), p: pctOf(x.c, x.q)!, q: x.q })).filter((x) => x.t && x.p < 75).sort((a, b) => a.p - b.p).slice(0, 4);

  // para onde foi o tempo (30 dias)
  const m30 = data.sessions.filter((s) => inRange(s, addDays(t0, -29), t0) && s.minutes);
  const tArea = new Map<string, number>();
  const tType = new Map<string, number>();
  for (const s of m30) {
    const a = s.type === 'correcao' ? 'geral' : tmap.get(s.topicId)?.area ?? 'geral';
    tArea.set(a, (tArea.get(a) ?? 0) + s.minutes!);
    tType.set(s.type, (tType.get(s.type) ?? 0) + s.minutes!);
  }

  // simulados
  const sims = [...data.simulados].filter((s) => s.total && s.correct != null).sort((a, b) => a.date.localeCompare(b.date)).slice(-5);
  const lastSim = sims.at(-1);
  const simDelta = sims.length > 1 ? Math.round(((sims.at(-1)!.correct! / sims.at(-1)!.total!) - (sims.at(-2)!.correct! / sims.at(-2)!.total!)) * 100) : null;

  const setGoal = (m: number) => saveSettings({ dailyGoalMinutes: Math.max(30, Math.min(16 * 60, m)) });

  return (
    <div className="page pn">
      <header className="ag-head">
        <h1 className="h1">Painel</h1>
      </header>

      {/* hoje */}
      <section className="pn-today">
        <HoursJar minutes={todayMin} goal={goal} size={150} />
        <div className="pn-today-main">
          <span className="pn-k">Hoje você estudou</span>
          <motion.span className="pn-big" key={todayMin} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>{fmtHM(todayMin)}</motion.span>
          <span className="pn-goal">
            {todayMin >= goal ? 'meta do dia batida! 🎉' : `faltam ${fmtHM(goal - todayMin)} para a meta de`}
            <span className="pn-goal-ctl">
              <button className="icon-btn icon-btn-sm" onClick={() => setGoal(goal - 30)} aria-label="Diminuir meta">−</button>
              <b>{fmtHM(goal)}</b>
              <button className="icon-btn icon-btn-sm" onClick={() => setGoal(goal + 30)} aria-label="Aumentar meta">+</button>
            </span>
          </span>
          {byType.size > 0 || simToday > 0 ? (
            <div className="pn-chips">
              {[...byType.entries()].sort((a, b) => b[1] - a[1]).map(([k, m]) => <span key={k} className="pn-chip">{activityLabel(k as Session['type'])} <b>{fmtHM(m)}</b></span>)}
              {simToday > 0 && <span className="pn-chip">Simulado <b>{fmtHM(simToday)}</b></span>}
            </div>
          ) : <p className="muted pn-none">Nenhum tempo registrado hoje ainda. Bora começar? 🌷</p>}
          {topToday.length > 0 && (
            <p className="pn-topics">Hoje: {topToday.map(([id, m]) => `${tmap.get(id)?.name ?? 'tema'} (${fmtHM(m)})`).join(' · ')}</p>
          )}
        </div>
      </section>

      {/* semana */}
      <div className="fs2-hero">
        <div className="fs2-tile">
          <span className="fs2-k">Últimos 7 dias</span>
          <span className="fs2-v">{fmtHM(wkMin)}</span>
          <span className="fs2-s">{pwMin ? <b className={wkMin >= pwMin ? 'up' : 'down'}>{wkMin >= pwMin ? '▲' : '▼'} {fmtHM(Math.abs(wkMin - pwMin))}</b> : null} {pwMin ? 'vs semana anterior' : 'de estudo'}</span>
        </div>
        <div className="fs2-tile">
          <span className="fs2-k">Média por dia</span>
          <span className="fs2-v">{fmtHM(Math.round(wkMin / 7))}</span>
          <span className="fs2-s">meta batida em {daysHit} de 7 dias</span>
        </div>
        <div className="fs2-tile">
          <span className="fs2-k">Questões (7 dias)</span>
          <span className="fs2-v">{wkQ.q}</span>
          <span className="fs2-s">{wkQ.q ? `${pctOf(wkQ.c, wkQ.q)}% de acerto` : 'nenhuma ainda'}</span>
        </div>
        <div className="fs2-tile">
          <span className="fs2-k">Dias seguidos</span>
          <span className="fs2-v">{st.current}<small> {st.current === 1 ? 'dia' : 'dias'}</small></span>
          <span className="fs2-s">melhor sequência: {st.best}</span>
        </div>
      </div>

      <div className="pn-row">
        {/* 14 dias */}
        <section className="card pn-card">
          <h3 className="card-title">Horas por dia · últimos 14 dias</h3>
          <div className="pn-days" onMouseLeave={() => setHover(null)}>
            <span className="pn-goal-line" style={{ bottom: `calc(${(goal / max14) * 100}% * 0.78 + 34px)` }}><i>meta {fmtHM(goal)}</i></span>
            {days14.map((x) => (
              <div key={x.d} className={`pn-day ${x.d === t0 ? 'is-today' : ''} ${x.m >= goal ? 'is-hit' : ''}`} onMouseEnter={() => setHover(x.d)}>
                <span className="pn-day-v">{hover === x.d || x.d === t0 ? (x.m ? fmtHM(x.m) : '0') : ''}</span>
                <span className="pn-day-bar"><motion.span initial={{ height: 0 }} animate={{ height: `${(x.m / max14) * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 18 }} /></span>
                <span className="pn-day-d">{x.d === t0 ? 'hoje' : `${DIAS_CURTOS[fromKey(x.d).getDay()].slice(0, 1)}${fromKey(x.d).getDate()}`}</span>
              </div>
            ))}
          </div>
        </section>

        {/* acerto em questões */}
        <section className="card pn-card">
          <div className="pn-head">
            <h3 className="card-title">Acerto em questões · 30 dias</h3>
            <span className="pn-acc">{accNow != null ? `${accNow}%` : '—'}{accDelta != null && <b className={accDelta >= 0 ? 'up' : 'down'}>{accDelta >= 0 ? '▲' : '▼'}{Math.abs(accDelta)}</b>}</span>
          </div>
          <ul className="pn-areas">
            {BIG_AREAS.map((a) => {
              const x = acc30.get(a)!;
              const p = pctOf(x.c, x.q);
              return (
                <li key={a}>
                  <span className="pn-area-n"><i style={{ background: AREA_CHART[a].color }} />{AREA_CHART[a].short}</span>
                  <span className="fst-track"><motion.span style={{ background: AREA_CHART[a].color }} initial={{ width: 0 }} animate={{ width: `${p ?? 0}%` }} /></span>
                  <span className="fst-val">{p != null ? `${p}%` : '—'}</span>
                  <span className="muted small">{x.q ? `${x.q} q.` : ''}</span>
                </li>
              );
            })}
          </ul>
          <p className="field-hint">Só questões (sem flashcards). ▲▼ compara com os 30 dias anteriores.</p>
        </section>
      </div>

      <div className="pn-row">
        {/* onde investir */}
        <section className="card pn-card">
          <h3 className="card-title">Onde investir agora</h3>
          {weak.length ? (
            <ul className="pn-weak">
              {weak.map((w) => {
                const a = areaOf(w.t!.area);
                return (
                  <li key={w.t!.id} style={{ ['--c' as string]: a.color }}>
                    <span className="pn-weak-icon" aria-hidden="true"><StationIcon area={w.t!.area} /></span>
                    <span className="pn-weak-main"><strong>{w.t!.name}</strong><span className="muted small">{w.q} questões em 30 dias</span></span>
                    <span className={`pn-weak-p ${w.p < 60 ? 'low' : ''}`}>{w.p}%</span>
                    <button className="btn btn-quiet btn-sm" onClick={() => ui.openTopic(w.t!.id)}>Abrir</button>
                  </li>
                );
              })}
            </ul>
          ) : <p className="muted">Nenhum tema abaixo de 75% de acerto (com 10+ questões) nos últimos 30 dias. 👏</p>}
          <button className="link small pn-link" onClick={() => ui.go('revisoes')}>Ver revisões de hoje →</button>
        </section>

        {/* simulados */}
        <section className="card pn-card">
          <h3 className="card-title">Simulados</h3>
          {lastSim ? (
            <>
              <div className="pn-sim">
                <span className="pn-big pn-big-sm">{Math.round((lastSim.correct! / lastSim.total!) * 100)}%</span>
                <span className="muted small">no último ({lastSim.name}, {fmtShort(lastSim.date)}){simDelta != null && <b className={simDelta >= 0 ? 'up' : 'down'}> {simDelta >= 0 ? '▲' : '▼'} {Math.abs(simDelta)} p.p.</b>}</span>
              </div>
              <div className="pn-spark">
                {sims.map((s) => {
                  const p = s.correct! / s.total!;
                  return <span key={s.id} title={`${s.name}: ${Math.round(p * 100)}%`}><motion.i initial={{ height: 0 }} animate={{ height: `${Math.max(8, (p - 0.4) / 0.6) * 100}%` }} /><em>{Math.round(p * 100)}</em></span>;
                })}
              </div>
            </>
          ) : <p className="muted">Nenhum simulado com nota ainda.</p>}
          <button className="link small pn-link" onClick={() => ui.go('simulados')}>Abrir simulados →</button>
        </section>
      </div>

      {/* tempo */}
      <section className="card pn-card">
        <h3 className="card-title">Para onde foi o tempo · 30 dias</h3>
        <div className="pn-time">
          <div>
            <span className="fs2-k">Por área</span>
            <StackBar parts={[...tArea.entries()].map(([k, v]) => ({ id: k, label: areaOf(k as never).short, value: v, color: AREA_HEX[k] ?? '#B79A86' }))} format={fmtHM} />
          </div>
          <div>
            <span className="fs2-k">Por atividade</span>
            <StackBar parts={[...ACTIVITY_TYPES, CORRECTION_TYPE].map((x, i) => ({ id: x.id as string, label: x.label, value: tType.get(x.id) ?? 0, color: TYPE_COLORS[i % TYPE_COLORS.length] }))} format={fmtHM} />
          </div>
        </div>
        {!m30.length && <p className="muted">Sem tempo registrado nos últimos 30 dias.</p>}
      </section>
      <button className="btn btn-quiet btn-sm pn-more" onClick={() => ui.go('evolucao')}><Icon name="calendar" size={15} /> Ver calendário e registros no Jardim</button>
    </div>
  );
}
