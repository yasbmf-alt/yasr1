import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../data/store';
import { useUI } from '../components/ui';
import { areaOf, subtemaLabel, REASONS } from '../types';
import { diagnose, type Ranked } from '../logic/analytics';
import { fmtShort } from '../logic/dates';
import { PeriodFilter, usePeriod, LineChart } from '../components/charts';

const REASON_COLOR: Record<string, string> = { conceito: '#8E6AD8', desatencao: '#E09A2E', interpretacao: '#4F79C2', esquecimento: '#D9578F' };

export function Diagnostico() {
  const { data } = useStore();
  const ui = useUI();
  const [days, setDays] = usePeriod('diag', null);
  const dg = useMemo(() => diagnose(data, days), [data, days]);

  return (
    <div className="diag">
      <div className="diag-top">
        <p className="muted">Leitura automática dos seus registros de questões e simulados. Nada aqui pede tarefa nova.</p>
        <PeriodFilter value={days} onChange={setDays} allowAll />
      </div>

      <section className="card diag-alerts">
        <h2 className="card-title">Pontos de atenção</h2>
        {dg.alerts.length ? (
          <ul className="alerts">
            {dg.alerts.map((a, i) => (
              <motion.li key={a} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>{a}</motion.li>
            ))}
          </ul>
        ) : (
          <p className="muted">Nenhum ponto de atenção com os dados atuais.</p>
        )}
        {dg.notes.map((n) => <p key={n} className="diag-note">{n}</p>)}
      </section>

      <div className="diag-grid">
        <section className="card">
          <h2 className="card-title">Subtemas com mais erros</h2>
          <RankBars items={dg.subtemas} color="#D9578F" empty="Classifique erros por subtema ao registrar questões." />
        </section>
        <section className="card">
          <h2 className="card-title">Motivos de erro mais frequentes</h2>
          <RankBars items={dg.reasons} colorOf={(id) => REASON_COLOR[id]} empty="Marque o motivo dos erros (conceito, desatenção, interpretação ou esquecimento)." note="Um erro pode ter mais de um motivo." />
        </section>
        <section className="card">
          <h2 className="card-title">Matérias com menor aproveitamento</h2>
          {dg.weakTopics.length ? (
            <ul className="weak">
              {dg.weakTopics.map((w) => (
                <li key={w.id}>
                  <button onClick={() => ui.openTopic(w.id)}>
                    <i style={{ background: areaOf(w.area).color }} />
                    <span className="weak-name">{w.name}</span>
                    <span className="muted small">{w.q} q</span>
                    <strong>{Math.round(w.acc * 100)}%</strong>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Aparece quando uma matéria tiver pelo menos 10 questões registradas.</p>
          )}
        </section>
        <section className="card">
          <h2 className="card-title">Evolução do aproveitamento (8 semanas)</h2>
          {dg.trend.filter((w) => w.acc != null).length >= 2 ? (
            <LineChart
              points={dg.trend.filter((w) => w.acc != null).map((w) => ({ x: fmtShort(w.week), y: w.acc as number, tip: `semana de ${fmtShort(w.week)} · ${Math.round((w.acc as number) * 100)}% em ${w.q} questões` }))}
              yFormat={(v) => `${Math.round(v * 100)}%`}
              yMin={0}
              yMax={1}
              label="Aproveitamento semanal"
            />
          ) : (
            <p className="muted">Precisa de questões em pelo menos duas semanas.</p>
          )}
        </section>
      </div>

      <section className="card">
        <h2 className="card-title">Assuntos com erros recorrentes</h2>
        {dg.recurrent.length ? (
          <ul className="recur-list">
            {dg.recurrent.slice(0, 8).map((r) => (
              <li key={`${r.subject}-${r.subtema}`}>
                <strong>{r.subject}</strong>
                <span className="chip-mini is-on">{subtemaLabel(r.subtema)}</span>
                {r.reason && <span className={`chip-mini chip-reason r-${r.reason} is-on`}>{REASONS.find((x) => x.id === r.reason)?.label}</span>}
                <span className="muted small">{r.count} erros · {r.dates} dias diferentes</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Quando o mesmo subtema de uma matéria for errado em dias diferentes, ele aparece aqui.</p>
        )}
      </section>
    </div>
  );
}

export function RankBars({ items, color, colorOf, empty, note, max = 6 }: {
  items: Ranked[]; color?: string; colorOf?: (id: string) => string | undefined; empty: string; note?: string; max?: number;
}) {
  if (!items.length) return <p className="muted">{empty}</p>;
  const top = items[0].count;
  return (
    <>
      <div className="rank">
        {items.slice(0, max).map((it, i) => (
          <div key={it.id} className="rank-row" title={`${it.count} erros · ${Math.round(it.share * 100)}%`}>
            <span className="rank-label">{it.label}</span>
            <span className="rank-track">
              <motion.span
                className="rank-fill"
                style={{ background: colorOf?.(it.id) ?? color ?? 'var(--azul)' }}
                initial={{ width: 0 }}
                animate={{ width: `${(it.count / top) * 100}%` }}
                transition={{ delay: i * 0.04, type: 'spring', stiffness: 140, damping: 22 }}
              />
            </span>
            <span className="rank-val">{it.count}</span>
          </div>
        ))}
      </div>
      {note && <p className="field-hint">{note}</p>}
    </>
  );
}
