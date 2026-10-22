import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../data/store';
import { useUI } from '../components/ui';
import { Icon } from '../components/Icon';
import { ColumnChart, LineChart, PctBars, PeriodFilter, Stat, StackBar, usePeriod } from '../components/charts';
import { RankBars } from './Diagnostico';
import { AREA_CHART } from './Simulados';
import { ACTIVITY_TYPES, AREAS, BIG_AREAS, CORRECTION_TYPE, type DataSnapshot } from '../types';
import { areaQA, diagnose, errorRecords, inPeriod, reasonRanking, subtemaRanking, topicQA, totals } from '../logic/analytics';
import { addDays, DIAS_CURTOS, fmtMinutes, fmtShort, fromKey, today, weekStart } from '../logic/dates';
import { duration, occurrences } from '../logic/agenda';

type Tab = 'geral' | 'desempenho' | 'constancia' | 'simulados';
const TABS: { id: Tab; label: string }[] = [
  { id: 'geral', label: 'Visão geral' },
  { id: 'desempenho', label: 'Desempenho' },
  { id: 'constancia', label: 'Constância' },
  { id: 'simulados', label: 'Simulados' },
];
const pct = (v: number | null) => (v == null ? '—' : `${Math.round(v * 100)}%`);
const hours = (m: number) => (m >= 60 ? `${(m / 60).toFixed(1).replace('.', ',')}h` : `${Math.round(m)}min`);
const AREA_HEX: Record<string, string> = { ...Object.fromEntries(Object.entries(AREA_CHART).map(([k, v]) => [k, v.color])), geral: '#B79A86' };

export function Painel() {
  const [tab, setTab] = useState<Tab>(() => {
    try {
      return (localStorage.getItem('yasr1-painel-tab') as Tab) || 'geral';
    } catch {
      return 'geral';
    }
  });
  const [days, setDays] = usePeriod('painel', 30);
  const pick = (t: Tab) => {
    setTab(t);
    try {
      localStorage.setItem('yasr1-painel-tab', t);
    } catch {
      /* ignore */
    }
  };
  return (
    <div className="page page-painel">
      <header className="ag-head">
        <h1 className="h1">Painel</h1>
        <PeriodFilter value={days} onChange={setDays} />
      </header>
      <div className="seg seg-tabs" role="tablist" aria-label="Seções do painel">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'is-on' : ''} onClick={() => pick(t.id)}>{t.label}</button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="painel-body">
          {tab === 'geral' && <Geral days={days as number} />}
          {tab === 'desempenho' && <Desempenho days={days as number} />}
          {tab === 'constancia' && <Constancia days={days as number} />}
          {tab === 'simulados' && <SimTab days={days as number} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ── Cartinha de incentivo quando o período está difícil ──────

const ENCOURAGE = [
  'Semana difícil não define a residente que você vai ser. Errar agora é exatamente o que faz a prova ficar mais fácil depois.',
  'Esses números só mostram onde dá pra crescer. Você está aprendendo justamente onde mais errou, e isso é estudar de verdade.',
  'Respira, diva. Aproveitamento sobe com revisão, e revisão você sabe fazer muito bem.',
  'Todo mundo que passou teve semanas assim. O que conta é continuar, no seu ritmo.',
];

function Cartinha({ acc, q, days }: { acc: number | null; q: number; days: number }) {
  const key = `yasr1-cartinha-${days}-${today()}`;
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(key) === '1';
    } catch {
      return false;
    }
  });
  if (acc == null || q < 20 || acc >= 0.55 || hidden) return null;
  const msg = ENCOURAGE[Math.floor(q) % ENCOURAGE.length];
  return (
    <motion.div className="cartinha" initial={{ opacity: 0, y: 10, rotate: -1.5 }} animate={{ opacity: 1, y: 0, rotate: -1 }}>
      <span className="cartinha-seal" aria-hidden="true">♥</span>
      <p className="cartinha-to">Pra Yas,</p>
      <p>{msg}</p>
      <button className="btn btn-quiet btn-sm" onClick={() => { setHidden(true); try { localStorage.setItem(key, '1'); } catch { /* */ } }}>Guardar cartinha</button>
    </motion.div>
  );
}

// ── Visão geral ───────────────────────────────────────────────

function dailySeries(d: DataSnapshot, days: number) {
  const t = today();
  const start = addDays(t, -(days - 1));
  const map = new Map<string, number>();
  for (const s of d.sessions) if (s.date >= start && s.date <= t) map.set(s.date, (map.get(s.date) ?? 0) + (s.minutes ?? 0));
  for (const sim of d.simulados) if (sim.date >= start && sim.date <= t && sim.minutes) map.set(sim.date, (map.get(sim.date) ?? 0) + sim.minutes);
  return Array.from({ length: days }, (_, i) => {
    const k = addDays(start, i);
    return { k, m: map.get(k) ?? 0 };
  });
}

function weeklyAcc(d: DataSnapshot, days: number) {
  const start = weekStart(addDays(today(), -(days - 1)));
  const weeks: { w: string; q: number; c: number }[] = [];
  for (let w = start; w <= today(); w = addDays(w, 7)) weeks.push({ w, q: 0, c: 0 });
  const idx = new Map(weeks.map((x, i) => [x.w, i]));
  for (const s of d.sessions) {
    if (!s.questions || s.type === 'flashcards' || !inPeriod(s.date, days)) continue;
    const i = idx.get(weekStart(s.date));
    if (i == null) continue;
    weeks[i].q += s.questions;
    weeks[i].c += s.correct ?? 0;
  }
  for (const sim of d.simulados) {
    if (!sim.total || !inPeriod(sim.date, days)) continue;
    const i = idx.get(weekStart(sim.date));
    if (i == null) continue;
    weeks[i].q += sim.total;
    weeks[i].c += sim.correct ?? 0;
  }
  return weeks.filter((w) => w.q > 0);
}

function Geral({ days }: { days: number }) {
  const { data } = useStore();
  const t = totals(data, days);
  const daily = dailySeries(data, days);
  const wk = weeklyAcc(data, days);
  const simMin = data.simulados.filter((s) => inPeriod(s.date, days)).reduce((a, s) => a + (s.minutes ?? 0), 0);
  return (
    <>
      <Cartinha acc={t.accuracy} q={t.q + t.sq} days={days} />
      <div className="sim-kpis">
        <Stat value={t.minutes + simMin ? fmtMinutes(t.minutes + simMin) : '—'} label="horas estudadas" />
        <Stat value={String(t.q + t.sq)} label="questões resolvidas" sub={t.sq ? `${t.sq} em simulados` : undefined} />
        <Stat value={pct(t.accuracy)} label="aproveitamento geral" />
        <Stat value={`${t.days}`} label={`dias com estudo em ${days}`} />
      </div>
      <div className="painel-grid">
        <section className="card chart-card">
          <h2 className="card-title">Horas por dia</h2>
          <p className="chart-sub">Tempo registrado em sessões e simulados, dia a dia.</p>
          {daily.some((x) => x.m > 0) ? (
            <ColumnChart
              bars={daily.map((x) => ({ x: days <= 15 ? DIAS_CURTOS[fromKey(x.k).getDay()] : fmtShort(x.k), y: x.m, tip: `${fmtShort(x.k)} · ${x.m ? fmtMinutes(x.m) : 'sem registro'}`, highlight: x.k === today() }))}
              yFormat={hours}
              label="Horas estudadas por dia"
              showValues={days <= 15}
            />
          ) : <Empty text="Nenhum tempo registrado neste período." />}
        </section>
        <section className="card chart-card">
          <h2 className="card-title">Evolução do aproveitamento</h2>
          <p className="chart-sub">Percentual de acertos por semana (questões e simulados).</p>
          {wk.length >= 2 ? (
            <LineChart points={wk.map((w) => ({ x: fmtShort(w.w), y: w.c / w.q, tip: `semana de ${fmtShort(w.w)} · ${Math.round((w.c / w.q) * 100)}% em ${w.q} questões` }))} yFormat={(v) => `${Math.round(v * 100)}%`} yMin={0} yMax={1} label="Aproveitamento semanal" />
          ) : <Empty text="Precisa de questões em pelo menos duas semanas do período." />}
        </section>
      </div>
    </>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="chart-empty">{text}</p>;
}

// ── Desempenho ────────────────────────────────────────────────

function Desempenho({ days }: { days: number }) {
  const { data } = useStore();
  const ui = useUI();
  const aq = areaQA(data, days);
  const tq = topicQA(data, days);
  const recs = errorRecords(data).filter((r) => inPeriod(r.date, days));
  const dg = useMemo(() => diagnose(data, days), [data, days]);
  const t = totals(data, days);
  const topics = [...tq.entries()]
    .map(([id, x]) => ({ id, t: data.topics.find((y) => y.id === id), q: x.q, acc: x.q ? x.c / x.q : 0 }))
    .filter((x) => x.t)
    .sort((a, b) => a.acc - b.acc);
  const [all, setAll] = useState(false);
  const withHistory = data.topics.filter((tp) => data.sessions.some((s) => s.topicId === tp.id && s.questions && s.type !== 'flashcards'));
  const [topicId, setTopicId] = useState<string>(() => withHistory[0]?.id ?? '');
  const series = data.sessions
    .filter((s) => s.topicId === topicId && s.questions && s.type !== 'flashcards')
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));

  return (
    <>
      <Cartinha acc={t.accuracy} q={t.q + t.sq} days={days} />
      <div className="painel-grid">
        <section className="card chart-card">
          <h2 className="card-title">Acertos por grande área</h2>
          <p className="chart-sub">Questões das sessões (pela área do tema) somadas aos simulados.</p>
          <PctBars
            rows={BIG_AREAS.map((a) => {
              const x = aq.get(a)!;
              return { id: a, label: AREA_CHART[a].short, value: x.q ? x.c / x.q : null, n: x.q, color: AREA_CHART[a].color, sub: x.q ? `${x.q} q` : undefined };
            })}
            empty="Sem questões neste período."
          />
        </section>
        <section className="card chart-card">
          <h2 className="card-title">Pontos de atenção</h2>
          {dg.alerts.length ? (
            <ul className="alerts">{dg.alerts.map((a) => <li key={a}>{a}</li>)}</ul>
          ) : <Empty text="Nenhum ponto de atenção com os dados deste período." />}
          {dg.notes.slice(0, 1).map((n) => <p key={n} className="diag-note">{n}</p>)}
        </section>
        <section className="card chart-card">
          <h2 className="card-title">Acertos por matéria</h2>
          <p className="chart-sub">Da menor para a maior taxa de acerto.</p>
          {topics.length ? (
            <>
              <ul className="weak">
                {(all ? topics : topics.slice(0, 8)).map((x) => (
                  <li key={x.id}>
                    <button onClick={() => ui.openTopic(x.id)}>
                      <i style={{ background: AREA_HEX[x.t!.area] }} />
                      <span className="weak-name">{x.t!.name}</span>
                      <span className="muted small">{x.q} q</span>
                      <span className="mini-meter"><span style={{ width: `${x.acc * 100}%`, background: AREA_HEX[x.t!.area] }} /></span>
                      <strong>{Math.round(x.acc * 100)}%</strong>
                    </button>
                  </li>
                ))}
              </ul>
              {topics.length > 8 && <button className="btn btn-quiet btn-sm" onClick={() => setAll(!all)}>{all ? 'Mostrar menos' : `Ver todas (${topics.length})`}</button>}
            </>
          ) : <Empty text="Sem questões registradas por matéria neste período." />}
        </section>
        <section className="card chart-card">
          <h2 className="card-title">Erros por subtema</h2>
          <p className="chart-sub">Somente erros classificados ao registrar questões ou simulados.</p>
          <RankBars items={subtemaRanking(recs)} color="#D9578F" empty="Nenhum erro classificado neste período." />
        </section>
        <section className="card chart-card span-2">
          <div className="cmp-head">
            <div>
              <h2 className="card-title">Evolução por assunto</h2>
              <p className="chart-sub">Acerto em cada sessão de questões do tema escolhido (todo o histórico).</p>
            </div>
            <select id="evo-topic" value={topicId} onChange={(e) => setTopicId(e.target.value)} aria-label="Assunto" className="select-inline">
              {withHistory.length === 0 && <option value="">Sem assuntos com questões</option>}
              {withHistory.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map((tp) => <option key={tp.id} value={tp.id}>{tp.name}</option>)}
            </select>
          </div>
          {series.length >= 2 ? (
            <LineChart
              points={series.map((s) => ({ x: fmtShort(s.date), y: (s.correct ?? 0) / (s.questions as number), tip: `${fmtShort(s.date)} · ${s.correct ?? 0}/${s.questions} (${Math.round(((s.correct ?? 0) / (s.questions as number)) * 100)}%)` }))}
              yFormat={(v) => `${Math.round(v * 100)}%`}
              yMin={0}
              yMax={1}
              label="Evolução por assunto"
              color="#8E6AD8"
              wide
            />
          ) : <Empty text={topicId ? 'Esse assunto precisa de pelo menos duas sessões de questões.' : 'Registre questões para acompanhar a evolução de cada assunto.'} />}
        </section>
      </div>
    </>
  );
}

// ── Constância ────────────────────────────────────────────────

const PLANNED_TYPES = new Set(['estudo', 'missao', 'internato', 'simulado']);

function Constancia({ days }: { days: number }) {
  const { data } = useStore();
  const nWeeks = Math.max(4, Math.ceil(days / 7));
  const start = addDays(weekStart(today()), -7 * (nWeeks - 1));
  const weeks = Array.from({ length: nWeeks }, (_, i) => ({ w: addDays(start, 7 * i), done: 0, plan: 0 }));
  const wi = new Map(weeks.map((x, i) => [x.w, i]));
  for (const s of data.sessions) {
    const i = wi.get(weekStart(s.date));
    if (i != null) weeks[i].done += s.minutes ?? 0;
  }
  for (const sim of data.simulados) {
    const i = wi.get(weekStart(sim.date));
    if (i != null) weeks[i].done += sim.minutes ?? 0;
  }
  for (const o of occurrences(data.events.filter((e) => PLANNED_TYPES.has(e.type)), start, addDays(start, nWeeks * 7 - 1))) {
    const i = wi.get(weekStart(o.date));
    if (i != null) weeks[i].plan += duration(o.ev);
  }
  const hasPlan = weeks.some((w) => w.plan > 0);
  const t = today();
  const studied = new Set([...data.sessions.map((s) => s.date), ...data.simulados.map((s) => s.date)]);
  const strip = Array.from({ length: days }, (_, i) => addDays(t, -(days - 1) + i));
  const count = strip.filter((d) => studied.has(d)).length;

  const byArea = new Map<string, number>();
  const byType = new Map<string, number>();
  const tmap = new Map(data.topics.map((x) => [x.id, x]));
  for (const s of data.sessions) {
    if (!inPeriod(s.date, days) || !s.minutes) continue;
    const a = tmap.get(s.topicId)?.area ?? 'geral';
    byArea.set(a, (byArea.get(a) ?? 0) + s.minutes);
    byType.set(s.type, (byType.get(s.type) ?? 0) + s.minutes);
  }
  const simMin = data.simulados.filter((s) => inPeriod(s.date, days)).reduce((a, s) => a + (s.minutes ?? 0), 0);
  if (simMin) byType.set('simulado', simMin);
  const TYPE_COLORS = ['#4F79C2', '#D9578F', '#8E6AD8', '#E09A2E', '#6E8F3A', '#B79A86', '#5AA9A6', '#2E4A7F'];

  return (
    <div className="painel-grid">
      <section className="card chart-card">
        <h2 className="card-title">Horas por semana</h2>
        <p className="chart-sub">Últimas {nWeeks} semanas. A semana atual aparece destacada.</p>
        {weeks.some((w) => w.done > 0) ? (
          <ColumnChart bars={weeks.map((w, i) => ({ x: fmtShort(w.w), y: w.done, tip: `semana de ${fmtShort(w.w)} · ${w.done ? fmtMinutes(w.done) : 'sem registro'}`, highlight: i === weeks.length - 1 }))} yFormat={hours} label="Horas por semana" />
        ) : <Empty text="Nenhum tempo registrado nessas semanas." />}
      </section>
      <section className="card chart-card">
        <h2 className="card-title">Dias estudados</h2>
        <p className="chart-sub">{count} de {days} dias com algum registro.</p>
        <div className={`day-strip d${days}`} role="img" aria-label={`${count} de ${days} dias com estudo`}>
          {strip.map((d) => (
            <span key={d} className={`ds ${studied.has(d) ? 'on' : ''} ${d === t ? 'today' : ''}`} title={`${fmtShort(d)}${studied.has(d) ? ' · estudou' : ''}`} />
          ))}
        </div>
      </section>
      <section className="card chart-card">
        <h2 className="card-title">Distribuição do tempo por área</h2>
        {byArea.size ? (
          <StackBar parts={AREAS.map((a) => ({ id: a.id, label: a.short, value: byArea.get(a.id) ?? 0, color: AREA_HEX[a.id] }))} format={fmtMinutes} />
        ) : <Empty text="Sem tempo registrado neste período." />}
      </section>
      <section className="card chart-card">
        <h2 className="card-title">Distribuição do tempo por atividade</h2>
        {byType.size ? (
          <StackBar
            parts={[...ACTIVITY_TYPES.map((x) => ({ id: x.id as string, label: x.label })), { id: CORRECTION_TYPE.id as string, label: CORRECTION_TYPE.label }, { id: 'simulado', label: 'Simulados' }].map((x, i) => ({ id: x.id, label: x.label, value: byType.get(x.id) ?? 0, color: TYPE_COLORS[i % TYPE_COLORS.length] }))}
            format={fmtMinutes}
          />
        ) : <Empty text="Sem tempo registrado neste período." />}
      </section>
      <section className="card chart-card span-2">
        <h2 className="card-title">Planejado × realizado</h2>
        <p className="chart-sub">Horas de estudo marcadas na agenda (blocos de estudo, missões e simulados) comparadas às horas registradas.</p>
        {hasPlan ? (
          <div className="pvr">
            {weeks.map((w) => {
              const max = Math.max(...weeks.map((x) => Math.max(x.plan, x.done)), 1);
              return (
                <div key={w.w} className="pvr-col" title={`semana de ${fmtShort(w.w)} · planejado ${fmtMinutes(w.plan || null)} · realizado ${fmtMinutes(w.done || null)}`}>
                  <div className="pvr-bars">
                    <motion.span className="pvr-plan" initial={{ height: 0 }} animate={{ height: `${(w.plan / max) * 100}%` }} />
                    <motion.span className="pvr-done" initial={{ height: 0 }} animate={{ height: `${(w.done / max) * 100}%` }} />
                  </div>
                  <span className="axis-label">{fmtShort(w.w)}</span>
                </div>
              );
            })}
          </div>
        ) : <Empty text="Aparece quando houver blocos de estudo ou missões marcados na agenda." />}
        {hasPlan && <p className="legend-row"><i className="lg-plan" /> planejado <i className="lg-done" /> realizado</p>}
      </section>
    </div>
  );
}

// ── Simulados ─────────────────────────────────────────────────

function SimTab({ days }: { days: number }) {
  const { data } = useStore();
  const list = data.simulados.filter((s) => inPeriod(s.date, days)).sort((a, b) => a.date.localeCompare(b.date));
  const withPct = list.filter((s) => s.total && s.correct != null);
  const withTime = list.filter((s) => s.total && s.minutes);
  const aq = areaQA(data, days, 'simulados');
  const recs = errorRecords(data).filter((r) => r.source === 'simulado' && inPeriod(r.date, days));
  const areaErr = BIG_AREAS.map((a) => {
    const x = aq.get(a)!;
    return { id: a, label: AREA_CHART[a].short, count: x.q - x.c, share: 0 };
  }).filter((x) => x.count > 0).sort((a, b) => b.count - a.count);
  const totErr = areaErr.reduce((s, x) => s + x.count, 0);
  areaErr.forEach((x) => (x.share = totErr ? x.count / totErr : 0));
  if (!list.length)
    return <div className="card"><Empty text="Nenhum simulado registrado neste período. Os simulados entram em Simulados → Registrar simulado." /></div>;
  return (
    <div className="painel-grid">
      <section className="card chart-card">
        <h2 className="card-title">Histórico de notas</h2>
        <p className="chart-sub">Percentual de acertos de cada simulado.</p>
        {withPct.length ? (
          <LineChart points={withPct.map((s) => ({ x: fmtShort(s.date), y: (s.correct as number) / (s.total as number), tip: `${s.name} · ${s.correct}/${s.total}` }))} yFormat={(v) => `${Math.round(v * 100)}%`} yMin={0} yMax={1} label="Notas dos simulados" />
        ) : <Empty text="Informe total e acertos para ver as notas." />}
      </section>
      <section className="card chart-card">
        <h2 className="card-title">Aproveitamento por grande área</h2>
        <p className="chart-sub">Soma de todas as provas do período.</p>
        <PctBars rows={BIG_AREAS.map((a) => { const x = aq.get(a)!; return { id: a, label: AREA_CHART[a].short, value: x.q ? x.c / x.q : null, n: x.q, color: AREA_CHART[a].color }; })} empty="Preencha os acertos por área no registro do simulado." />
      </section>
      <section className="card chart-card">
        <h2 className="card-title">Tempo por questão</h2>
        <p className="chart-sub">Minutos por questão em cada prova, quando o tempo foi registrado.</p>
        {withTime.length ? (
          <ColumnChart bars={withTime.map((s) => ({ x: fmtShort(s.date), y: (s.minutes as number) / (s.total as number), tip: `${s.name} · ${((s.minutes as number) / (s.total as number)).toFixed(1).replace('.', ',')} min por questão` }))} yFormat={(v) => `${v.toFixed(1).replace('.', ',')}`} label="Minutos por questão" color="#CFE4FF" accent="#4F79C2" />
        ) : <Empty text="Registre o tempo gasto nos simulados para ver este gráfico." />}
      </section>
      <section className="card chart-card">
        <h2 className="card-title">Evolução do tempo de prova</h2>
        <p className="chart-sub">Duração total de cada simulado.</p>
        {withTime.length >= 2 ? (
          <LineChart points={withTime.map((s) => ({ x: fmtShort(s.date), y: s.minutes as number, tip: `${s.name} · ${fmtMinutes(s.minutes)}` }))} yFormat={(v) => fmtMinutes(Math.round(v))} label="Duração dos simulados" color="#4F79C2" />
        ) : <Empty text="Precisa do tempo de pelo menos dois simulados." />}
      </section>
      <section className="card chart-card">
        <h2 className="card-title">Grande área com mais erros</h2>
        <RankBars items={areaErr} colorOf={(id) => AREA_CHART[id as keyof typeof AREA_CHART]?.color} empty="Preencha os acertos por área para ver onde estão os erros." />
      </section>
      <section className="card chart-card">
        <h2 className="card-title">Tipo de erro mais cometido</h2>
        <RankBars items={reasonRanking(recs)} colorOf={(id) => ({ conceito: '#8E6AD8', desatencao: '#E09A2E', interpretacao: '#4F79C2', esquecimento: '#D9578F' } as Record<string, string>)[id]} empty="Classifique os erros dos simulados para ver os motivos." note="Um erro pode ter mais de um motivo." />
      </section>
    </div>
  );
}

export { Icon };
