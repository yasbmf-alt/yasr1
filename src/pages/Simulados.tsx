import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../data/store';
import { Modal, Field, ConfirmButton, numOrNull, useUI } from '../components/ui';
import { Icon } from '../components/Icon';
import { EventEditor, type EventDraft } from '../components/EventEditor';
import { BIG_AREAS, type BigArea, type Simulado } from '../types';
import { addDays, fmtLong, fmtMinutes, fmtShort, today, uid, weekStart } from '../logic/dates';
import { occurrences } from '../logic/agenda';
import { Diagnostico } from './Diagnostico';
import { ErrorGroups } from '../components/ErrorGroups';
import { AreaErrors } from '../components/AreaErrors';
import { areaWrong, categorized, finalizeGroup, isMistake, linkTopics, withItems } from '../logic/simErrors';

// Cores de gráfico por grande área (validadas para daltonismo com rótulo direto).
export const AREA_CHART: Record<BigArea, { label: string; short: string; color: string }> = {
  clinica: { label: 'Clínica Médica', short: 'Clínica', color: '#D9578F' },
  cirurgia: { label: 'Cirurgia', short: 'Cirurgia', color: '#4F79C2' },
  pediatria: { label: 'Pediatria', short: 'Pediatria', color: '#E09A2E' },
  go: { label: 'Ginecologia e Obstetrícia', short: 'GO', color: '#8E6AD8' },
  preventiva: { label: 'Preventiva', short: 'Preventiva', color: '#6E8F3A' },
};

const pct = (c: number | null | undefined, t: number | null | undefined) => (t && c != null ? c / t : null);
const fmtPct = (v: number | null) => (v == null ? '—' : `${Math.round(v * 100)}%`);

export function Simulados() {
  const { data } = useStore();
  const [editing, setEditing] = useState<Simulado | 'new' | null>(null);
  const [agendaDraft, setAgendaDraft] = useState<EventDraft | null>(null);
  const [tab, setTab] = useState<'provas' | 'diag'>(() => {
    try {
      return localStorage.getItem('yasr1-sim-tab') === 'diag' ? 'diag' : 'provas';
    } catch {
      return 'provas';
    }
  });
  const pickTab = (t: 'provas' | 'diag') => {
    setTab(t);
    try {
      localStorage.setItem('yasr1-sim-tab', t);
    } catch {
      /* ignore */
    }
  };
  const list = useMemo(() => [...data.simulados].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)), [data.simulados]);
  const ws = weekStart(today());
  const weekDone = list.filter((s) => s.date >= ws && s.date <= addDays(ws, 6)).length;
  const weekPlanned = occurrences(data.events.filter((e) => e.type === 'simulado'), ws, addDays(ws, 6)).filter((o) => o.date >= ws).length;

  return (
    <div className="page page-sim">
      <header className="ag-head">
        <div className="ag-nav">
          <h1 className="h1">Simulados</h1>
          <span className="sim-week">
            Esta semana: {weekDone} feito{weekDone === 1 ? '' : 's'}{weekPlanned ? ` · ${weekPlanned} na agenda` : ''} <span className="muted">· meta de 1 por semana</span>
          </span>
        </div>
        <div className="btn-row wrap">
          <button className="btn btn-quiet" onClick={() => setAgendaDraft({ date: today() < addDays(ws, 5) ? addDays(ws, 5) : today(), start: '08:00', end: '12:00', type: 'simulado', title: 'Simulado' })}>
            <Icon name="agenda" size={17} /> Agendar
          </button>
          <button className="btn btn-primary" onClick={() => setEditing('new')}><Icon name="plus" size={18} /> Registrar simulado</button>
        </div>
      </header>

      <div className="seg seg-tabs" role="tablist" aria-label="Seções">
        <button role="tab" aria-selected={tab === 'provas'} className={tab === 'provas' ? 'is-on' : ''} onClick={() => pickTab('provas')}>Provas</button>
        <button role="tab" aria-selected={tab === 'diag'} className={tab === 'diag' ? 'is-on' : ''} onClick={() => pickTab('diag')}>🧠 Meu Diagnóstico</button>
      </div>

      {tab === 'diag' ? (
        <Diagnostico />
      ) : list.length === 0 ? (
        <div className="empty-big">
          <h2>Nenhum simulado registrado</h2>
          <p>Registre o resultado de cada prova: total, acertos, tempo e o desempenho em cada grande área. Os gráficos aparecem a partir do primeiro.</p>
          <button className="btn btn-primary" onClick={() => setEditing('new')}><Icon name="plus" size={18} /> Registrar simulado</button>
        </div>
      ) : (
        <>
          <Summary list={list} />
          <div className="sim-grid">
            <TrendChart list={list} />
            <AreaBars list={list} />
          </div>
          <Compare list={list} />
          <History list={list} onEdit={setEditing} />
        </>
      )}

      <SimuladoForm value={editing} onClose={() => setEditing(null)} />
      <EventEditor draft={agendaDraft} onClose={() => setAgendaDraft(null)} />
    </div>
  );
}

function Summary({ list }: { list: Simulado[] }) {
  const ps = list.map((s) => pct(s.correct, s.total)).filter((x): x is number => x != null);
  const avg = ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : null;
  const best = ps.length ? Math.max(...ps) : null;
  const last = ps.at(-1) ?? null;
  const prev = ps.length > 1 ? ps[ps.length - 2] : null;
  const delta = last != null && prev != null ? Math.round((last - prev) * 100) : null;
  return (
    <div className="sim-kpis">
      <div className="sk"><span className="sk-v">{list.length}</span><span className="sk-l">simulados</span></div>
      <div className="sk"><span className="sk-v">{fmtPct(avg)}</span><span className="sk-l">média de acertos</span></div>
      <div className="sk"><span className="sk-v">{fmtPct(best)}</span><span className="sk-l">melhor resultado</span></div>
      <div className="sk">
        <span className="sk-v">{fmtPct(last)}</span>
        <span className="sk-l">último{delta != null ? ` · ${delta >= 0 ? '+' : ''}${delta} p.p. vs anterior` : ''}</span>
      </div>
    </div>
  );
}

// ── Evolução (linha) ──────────────────────────────────────────

function TrendChart({ list }: { list: Simulado[] }) {
  const pts = list.map((s) => ({ s, v: pct(s.correct, s.total) })).filter((p): p is { s: Simulado; v: number } => p.v != null);
  const [hover, setHover] = useState<number | null>(null);
  const Wd = 560;
  const Ht = 240;
  const pad = { l: 40, r: 16, t: 16, b: 30 };
  const iw = Wd - pad.l - pad.r;
  const ih = Ht - pad.t - pad.b;
  const lo = Math.max(0, Math.floor((Math.min(...pts.map((p) => p.v), 0.5) - 0.05) * 10) / 10);
  const hi = 1;
  const x = (i: number) => pad.l + (pts.length === 1 ? iw / 2 : (i / (pts.length - 1)) * iw);
  const y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo)) * ih;
  const ticks = [];
  for (let t = lo; t <= hi + 1e-9; t += 0.1) ticks.push(Math.round(t * 10) / 10);
  const path = pts.map((p, i) => `${i ? 'L' : 'M'} ${x(i)} ${y(p.v)}`).join(' ');
  const area = pts.length > 1 ? `${path} L ${x(pts.length - 1)} ${pad.t + ih} L ${x(0)} ${pad.t + ih} Z` : '';
  const h = hover != null ? pts[hover] : null;

  return (
    <section className="card chart-card">
      <h2 className="card-title">Evolução do percentual de acertos</h2>
      {pts.length === 0 ? (
        <p className="muted">Preencha total e acertos para ver a evolução.</p>
      ) : (
        <div className="chart-wrap">
          <svg viewBox={`0 0 ${Wd} ${Ht}`} className="chart" role="img" aria-label="Percentual de acertos por simulado ao longo do tempo"
            onMouseLeave={() => setHover(null)}
            onMouseMove={(e) => {
              const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
              const px = ((e.clientX - r.left) / r.width) * Wd;
              let best = 0;
              pts.forEach((_, i) => { if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i; });
              setHover(best);
            }}
          >
            {ticks.map((t) => (
              <g key={t}>
                <line x1={pad.l} x2={Wd - pad.r} y1={y(t)} y2={y(t)} className="grid-line" />
                <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" className="axis-txt">{Math.round(t * 100)}%</text>
              </g>
            ))}
            {area && <path d={area} fill="#2E4A7F" opacity="0.08" />}
            <motion.path d={path} fill="none" stroke="#2E4A7F" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8 }} />
            {pts.map((p, i) => (
              <circle key={p.s.id} cx={x(i)} cy={y(p.v)} r={i === pts.length - 1 || hover === i ? 6 : 4.5} fill="#2E4A7F" stroke="var(--surface)" strokeWidth="2" />
            ))}
            {pts.map((p, i) => (
              (pts.length <= 8 || i === 0 || i === pts.length - 1) && (
                <text key={`d${p.s.id}`} x={x(i)} y={Ht - 8} textAnchor="middle" className="axis-txt">{fmtShort(p.s.date)}</text>
              )
            ))}
            <text x={x(pts.length - 1)} y={y(pts.at(-1)!.v) - 12} textAnchor={pts.length > 1 ? 'end' : 'middle'} className="val-txt">{fmtPct(pts.at(-1)!.v)}</text>
            {h && hover != null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} className="cross" />}
          </svg>
          {h && hover != null && (
            <div className="tip" style={{ left: `${(x(hover) / Wd) * 100}%`, top: `${(y(h.v) / Ht) * 100}%` }}>
              <strong>{h.s.name}</strong>
              <span>{fmtLong(h.s.date)} · {fmtPct(h.v)} ({h.s.correct}/{h.s.total})</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ── Por grande área (barras horizontais) ──────────────────────

function areaAverages(list: Simulado[]) {
  return BIG_AREAS.map((a) => {
    let c = 0;
    let t = 0;
    for (const s of list) {
      const sc = s.areas?.[a];
      if (sc?.total && sc.correct != null) {
        c += sc.correct;
        t += sc.total;
      }
    }
    const lastSim = [...list].reverse().find((s) => s.areas?.[a]?.total);
    return { a, avg: t ? c / t : null, last: lastSim ? pct(lastSim.areas[a].correct, lastSim.areas[a].total) : null, t };
  });
}

function AreaBars({ list }: { list: Simulado[] }) {
  const rows = areaAverages(list);
  const [hover, setHover] = useState<BigArea | null>(null);
  return (
    <section className="card chart-card">
      <h2 className="card-title">Desempenho por grande área</h2>
      <div className="abars" role="table" aria-label="Média de acertos por grande área">
        {rows.map((r, i) => (
          <div key={r.a} className="abar-row" role="row" onMouseEnter={() => setHover(r.a)} onMouseLeave={() => setHover(null)}>
            <span className="abar-name" role="cell"><i style={{ background: AREA_CHART[r.a].color }} />{AREA_CHART[r.a].short}</span>
            <span className="abar-track" role="cell">
              {r.avg != null && (
                <motion.span
                  className="abar-fill"
                  style={{ background: AREA_CHART[r.a].color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${r.avg * 100}%` }}
                  transition={{ delay: i * 0.05, type: 'spring', stiffness: 120, damping: 20 }}
                />
              )}
              {r.last != null && <span className="abar-last" style={{ left: `${r.last * 100}%` }} title={`Último: ${fmtPct(r.last)}`} />}
              {hover === r.a && r.avg != null && (
                <span className="tip tip-inline">média {fmtPct(r.avg)} · último {fmtPct(r.last)} · {r.t} questões</span>
              )}
            </span>
            <span className="abar-val" role="cell">{fmtPct(r.avg)}</span>
          </div>
        ))}
      </div>
      <p className="field-hint"><span className="legend-bar" /> média de todos os simulados <span className="legend-tick" /> último simulado</p>
    </section>
  );
}

// ── Comparar duas provas ──────────────────────────────────────

function Compare({ list }: { list: Simulado[] }) {
  const [a, setA] = useState<string>(list.length > 1 ? list[list.length - 2].id : list[0].id);
  const [b, setB] = useState<string>(list[list.length - 1].id);
  useEffect(() => {
    if (!list.some((s) => s.id === a)) setA(list[0].id);
    if (!list.some((s) => s.id === b)) setB(list[list.length - 1].id);
  }, [list, a, b]);
  const A = list.find((s) => s.id === a);
  const B = list.find((s) => s.id === b);
  if (list.length < 2 || !A || !B) return null;
  const rows: { label: string; va: number | null; vb: number | null; color: string }[] = [
    { label: 'Total', va: pct(A.correct, A.total), vb: pct(B.correct, B.total), color: '#2E4A7F' },
    ...BIG_AREAS.map((x) => ({ label: AREA_CHART[x].short, va: pct(A.areas?.[x]?.correct, A.areas?.[x]?.total), vb: pct(B.areas?.[x]?.correct, B.areas?.[x]?.total), color: AREA_CHART[x].color })),
  ];
  return (
    <section className="card">
      <div className="cmp-head">
        <h2 className="card-title">Comparar provas</h2>
        <div className="cmp-pick">
          <select id="cmp-a" value={a} onChange={(e) => setA(e.target.value)} aria-label="Primeira prova">
            {list.map((s) => <option key={s.id} value={s.id}>{s.name} · {fmtShort(s.date)}</option>)}
          </select>
          <span className="muted">×</span>
          <select id="cmp-b" value={b} onChange={(e) => setB(e.target.value)} aria-label="Segunda prova">
            {list.map((s) => <option key={s.id} value={s.id}>{s.name} · {fmtShort(s.date)}</option>)}
          </select>
        </div>
      </div>
      <div className="cmp">
        {rows.map((r) => {
          const d = r.va != null && r.vb != null ? Math.round((r.vb - r.va) * 100) : null;
          return (
            <div key={r.label} className="cmp-row">
              <span className="cmp-label">{r.label}</span>
              <span className="cmp-bars">
                <span className="cmp-bar cmp-a" style={{ width: `${(r.va ?? 0) * 100}%`, background: r.color }} />
                <span className="cmp-bar cmp-b" style={{ width: `${(r.vb ?? 0) * 100}%`, background: r.color }} />
              </span>
              <span className="cmp-vals">{fmtPct(r.va)} → {fmtPct(r.vb)}</span>
              <span className={`cmp-delta ${d == null ? '' : d > 0 ? 'up' : d < 0 ? 'down' : ''}`}>{d == null ? '' : `${d > 0 ? '+' : ''}${d} p.p.`}</span>
            </div>
          );
        })}
      </div>
      <p className="field-hint">Barra clara: {A.name}. Barra cheia: {B.name}.</p>
    </section>
  );
}

// ── Histórico ─────────────────────────────────────────────────

function History({ list, onEdit }: { list: Simulado[]; onEdit: (s: Simulado) => void }) {
  const { deleteSimulado } = useStore();
  return (
    <section className="card table-card">
      <h2 className="card-title">Histórico</h2>
      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th>Data</th><th>Simulado</th><th className="num">Questões</th><th className="num">Acertos</th><th className="num">%</th><th className="num">Tempo</th>
              {BIG_AREAS.map((a) => <th key={a} className="num">{AREA_CHART[a].short}</th>)}
              <th>Temas errados</th><th aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {[...list].reverse().map((s) => (
              <tr key={s.id}>
                <td className="mono">{fmtShort(s.date)}</td>
                <td><button className="link" onClick={() => onEdit(s)}>{s.name}</button></td>
                <td className="num">{s.total ?? '—'}</td>
                <td className="num">{s.correct ?? '—'}</td>
                <td className="num"><strong>{fmtPct(pct(s.correct, s.total))}</strong></td>
                <td className="num">{fmtMinutes(s.minutes)}</td>
                {BIG_AREAS.map((a) => <td key={a} className="num">{fmtPct(pct(s.areas?.[a]?.correct, s.areas?.[a]?.total))}</td>)}
                <td className="errs">{s.wrongTopics.length ? s.wrongTopics.join(' · ') : <span className="muted">—</span>}</td>
                <td className="row-actions">
                  <button className="icon-btn icon-btn-sm" onClick={() => onEdit(s)} aria-label="Editar"><Icon name="edit" size={16} /></button>
                  <ConfirmButton className="icon-btn icon-btn-sm" label={<Icon name="trash" size={16} />} question="Apagar?" confirmLabel="Apagar" onConfirm={() => deleteSimulado(s.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ── Formulário ────────────────────────────────────────────────

export function emptySim(): Simulado {
  return {
    id: uid(), name: '', date: today(), total: null, correct: null, minutes: null,
    areas: { clinica: { correct: null, total: null }, cirurgia: { correct: null, total: null }, pediatria: { correct: null, total: null }, go: { correct: null, total: null }, preventiva: { correct: null, total: null } },
    wrongTopics: [], errors: [], notes: '', createdAt: new Date().toISOString(),
  };
}

export function SimuladoForm({ value, onClose }: { value: Simulado | 'new' | null; onClose: () => void }) {
  const { data, saveSimulado, saveTopic } = useStore();
  const ui = useUI();
  const [s, setS] = useState<Simulado>(emptySim());
  const [openAreas, setOpenAreas] = useState<BigArea[]>([]);
  const [hh, setHh] = useState('');
  const [mm, setMm] = useState('');
  const [tag, setTag] = useState('');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!value) return;
    const base = value === 'new' ? emptySim() : { ...emptySim(), ...value, areas: { ...emptySim().areas, ...value.areas } };
    base.errors = (base.errors ?? []).map(withItems);
    setS(base);
    setOpenAreas(BIG_AREAS.filter((a) => base.errors!.some((g) => g.area === a)));
    setHh(base.minutes != null ? String(Math.floor(base.minutes / 60)) : '');
    setMm(base.minutes != null ? String(base.minutes % 60) : '');
    setTag('');
    setErr(null);
  }, [value]);

  const setArea = (a: BigArea, k: 'correct' | 'total', v: string) => setS({ ...s, areas: { ...s.areas, [a]: { ...s.areas[a], [k]: numOrNull(v) } } });
  const sumT = BIG_AREAS.reduce((x, a) => x + (s.areas[a].total ?? 0), 0);
  const sumC = BIG_AREAS.reduce((x, a) => x + (s.areas[a].correct ?? 0), 0);
  const addTag = () => {
    const t = tag.trim();
    if (t && !s.wrongTopics.includes(t)) setS({ ...s, wrongTopics: [...s.wrongTopics, t] });
    setTag('');
  };

  return (
    <Modal open={!!value} onClose={onClose} title={value === 'new' ? 'Registrar simulado' : 'Editar simulado'} wide>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!s.name.trim()) return setErr('Dê um nome ao simulado.');
          if (s.total != null && s.correct != null && s.correct > s.total) return setErr('Os acertos passam do total de questões.');
          for (const a of BIG_AREAS) {
            const x = s.areas[a];
            if (x.total != null && x.correct != null && x.correct > x.total) return setErr(`Em ${AREA_CHART[a].short}, os acertos passam do total.`);
          }
          const h = numOrNull(hh) ?? 0;
          const m = numOrNull(mm) ?? 0;
          const total = s.total ?? (sumT || null);
          const correct = s.correct ?? (sumT ? sumC : null);
          const kept = (s.errors ?? []).filter((g) => (isMistake(g) ? g.count > 0 : !!(g.subject?.trim() || g.topicId)));
          for (const a of BIG_AREAS) {
            const w = areaWrong(s, a);
            if (w != null && categorized(kept, a) > w) return setErr(`Em ${AREA_CHART[a].short}, há mais erros categorizados do que erros na área.`);
          }
          if (total != null && correct != null && kept.filter(isMistake).reduce((a, g) => a + g.count, 0) > total - correct) return setErr('Há mais erros classificados do que erros na prova.');
          // liga cada tema à Biblioteca (reaproveita o tema existente; cria só os que faltam)
          const { groups, created } = linkTopics(kept.map(finalizeGroup), data.topics);
          for (const t of created) saveTopic(t);
          saveSimulado({ ...s, errors: groups, name: s.name.trim(), total, correct, minutes: hh || mm ? h * 60 + m : null });
          ui.toast(created.length ? `Simulado registrado · ${created.length} tema${created.length > 1 ? 's novos' : ' novo'} na Biblioteca.` : 'Simulado registrado.');
          onClose();
        }}
      >
        <div className="register-grid">
          <Field label="Nome">
            <input id="sim-name" value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} placeholder="ex.: Simulado Medway 3" autoFocus />
          </Field>
          <Field label="Data">
            <input id="sim-date" type="date" value={s.date} onChange={(e) => setS({ ...s, date: e.target.value || today() })} />
          </Field>
          <Field label="Tempo gasto">
            <span className="time-pair">
              <input id="sim-h" inputMode="numeric" value={hh} onChange={(e) => setHh(e.target.value)} aria-label="Horas" placeholder="h" /> h
              <input id="sim-m" inputMode="numeric" value={mm} onChange={(e) => setMm(e.target.value)} aria-label="Minutos" placeholder="min" /> min
            </span>
          </Field>
        </div>
        <div className="register-grid">
          <Field label="Total de questões">
            <input id="sim-t" inputMode="numeric" value={s.total ?? ''} onChange={(e) => setS({ ...s, total: numOrNull(e.target.value) })} placeholder={sumT ? String(sumT) : ''} />
          </Field>
          <Field label="Acertos">
            <input id="sim-c" inputMode="numeric" value={s.correct ?? ''} onChange={(e) => setS({ ...s, correct: numOrNull(e.target.value) })} placeholder={sumT ? String(sumC) : ''} />
          </Field>
          <Field label="Erros">
            <span className="static-field">{s.total != null && s.correct != null ? s.total - s.correct : sumT ? sumT - sumC : '—'}</span>
          </Field>
          <Field label="Percentual">
            <span className="static-field">{fmtPct(pct(s.correct ?? (sumT ? sumC : null), s.total ?? (sumT || null)))}</span>
          </Field>
        </div>

        <div className="area-form">
          <span className="field-label">Por grande área (acertos / total)</span>
          {BIG_AREAS.map((a) => {
            const open = openAreas.includes(a);
            const mine = (s.errors ?? []).filter((g) => g.area === a);
            const n = categorized(mine, a);
            return (
              <div key={a} className={`area-block ${open ? 'is-open' : ''}`}>
                <div className="area-line">
                  <button
                    type="button"
                    className="area-name area-toggle"
                    onClick={() => setOpenAreas(open ? openAreas.filter((x) => x !== a) : [...openAreas, a])}
                    aria-expanded={open}
                    title="Temas e motivos dos erros"
                  >
                    <Icon name={open ? 'chevronD' : 'chevronR'} size={14} />
                    <i style={{ background: AREA_CHART[a].color }} />{AREA_CHART[a].label}
                    {n > 0 && <span className="area-badge">{n} erro{n > 1 ? 's' : ''} detalhado{n > 1 ? 's' : ''}</span>}
                  </button>
                  <input id={`sa-${a}-c`} inputMode="numeric" value={s.areas[a].correct ?? ''} onChange={(e) => setArea(a, 'correct', e.target.value)} aria-label={`Acertos em ${AREA_CHART[a].short}`} />
                  <span className="muted">/</span>
                  <input id={`sa-${a}-t`} inputMode="numeric" value={s.areas[a].total ?? ''} onChange={(e) => setArea(a, 'total', e.target.value)} aria-label={`Total em ${AREA_CHART[a].short}`} />
                  <span className="area-pct">{fmtPct(pct(s.areas[a].correct, s.areas[a].total))}</span>
                </div>
                {open && (
                  <AreaErrors
                    area={a}
                    groups={mine}
                    wrong={areaWrong(s, a)}
                    onChange={(g) => setS({ ...s, errors: [...(s.errors ?? []).filter((x) => x.area !== a), ...g] })}
                  />
                )}
              </div>
            );
          })}
          {sumT > 0 && s.total != null && sumT !== s.total && (
            <p className="field-hint">As áreas somam {sumT} questões e o total informado é {s.total}.</p>
          )}
        </div>

        {(s.errors ?? []).some((g) => !g.area) && (
        <ErrorGroups
          value={(s.errors ?? []).filter((g) => !g.area)}
          onChange={(g) => setS({ ...s, errors: [...(s.errors ?? []).filter((x) => x.area), ...g] })}
          wrong={(s.total ?? (sumT || null)) != null && (s.correct ?? (sumT ? sumC : null)) != null ? ((s.total ?? sumT) as number) - ((s.correct ?? sumC) as number) : null}
          withSubject
        />
        )}
        <Field label="Principais temas errados (lista rápida)">
          <div className="tags">
            {s.wrongTopics.map((t) => (
              <span key={t} className="tag">
                {t}
                <button type="button" onClick={() => setS({ ...s, wrongTopics: s.wrongTopics.filter((x) => x !== t) })} aria-label={`Remover ${t}`}><Icon name="close" size={12} /></button>
              </span>
            ))}
            <input
              id="sim-tag"
              list="sim-topics"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  addTag();
                }
              }}
              onBlur={addTag}
              placeholder="digite e aperte Enter"
            />
            <datalist id="sim-topics">
              {data.topics.map((t) => <option key={t.id} value={t.name} />)}
            </datalist>
          </div>
        </Field>
        <Field label="Anotações">
          <textarea id="sim-notes" rows={2} value={s.notes} onChange={(e) => setS({ ...s, notes: e.target.value })} placeholder="opcional" />
        </Field>
        {err && <p className="form-error">{err}</p>}
        <div className="register-actions">
          <button type="button" className="btn btn-quiet" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary">Salvar</button>
        </div>
      </form>
    </Modal>
  );
}
