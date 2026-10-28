import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../data/store';
import { useUI } from '../components/ui';
import { areaOf, subtemaLabel, REASONS } from '../types';
import { diagnose, inPeriod, type Ranked } from '../logic/analytics';
import { simDiagnosis, AREA_NAME } from '../logic/simDiag';
import { AREA_CHART } from './Simulados';
import { Icon } from '../components/Icon';
import { fmtShort } from '../logic/dates';
import { PeriodFilter, usePeriod, LineChart } from '../components/charts';

const REASON_COLOR: Record<string, string> = { conceito: '#8E6AD8', desatencao: '#E09A2E', interpretacao: '#4F79C2', esquecimento: '#D9578F', raciocinio: '#5AA9A6', tempo: '#B79A86' };

export function Diagnostico({ onCorrect }: { onCorrect?: (simId?: string) => void }) {
  const { data } = useStore();
  const ui = useUI();
  const [days, setDays] = usePeriod('diag', null);
  const dg = useMemo(() => diagnose(data, days), [data, days]);
  const sd = useMemo(() => simDiagnosis(data.simulados.filter((x) => inPeriod(x.date, days)), data.topics), [data.simulados, data.topics, days]);
  const p = (v: number | null) => (v == null ? '—' : `${Math.round(v * 100)}%`);
  const delta = (a: number | null, b: number | null) => {
    if (a == null || b == null) return null;
    const d = Math.round((a - b) * 100);
    return d === 0 ? <b className="muted">=</b> : <b className={d > 0 ? 'up' : 'down'}>{d > 0 ? '▲' : '▼'} {Math.abs(d)} p.p.</b>;
  };
  const openCorr = (simId?: string) => onCorrect?.(simId);

  return (
    <div className="diag">
      <div className="diag-top">
        <p className="muted">Leitura automática dos seus simulados e questões: o que está melhorando, o que volta a cair e por onde começar.</p>
        <PeriodFilter value={days} onChange={setDays} allowAll />
      </div>

      {sd.count === 0 ? (
        <section className="card"><p className="muted">Registre um simulado para ver o diagnóstico das provas.</p></section>
      ) : (
        <>
          <div className="fs2-hero">
            <div className="fs2-tile">
              <span className="fs2-k">Último simulado</span>
              <strong className="fs2-v">{p(sd.last?.pct ?? null)}</strong>
              <span className="fs2-s">{sd.last ? `${sd.last.sim.name} · ${fmtShort(sd.last.sim.date)}` : ''}</span>
            </div>
            <div className="fs2-tile">
              <span className="fs2-k">Média dos 3 últimos</span>
              <strong className="fs2-v">{p(sd.recent)}</strong>
              <span className="fs2-s">{sd.before != null ? <>{delta(sd.recent, sd.before)} vs 3 anteriores</> : 'precisa de mais simulados para comparar'}</span>
            </div>
            <div className="fs2-tile">
              <span className="fs2-k">Melhor resultado</span>
              <strong className="fs2-v">{p(sd.best)}</strong>
              <span className="fs2-s">em {sd.count} simulado{sd.count > 1 ? 's' : ''}</span>
            </div>
            <div className="fs2-tile">
              <span className="fs2-k">Correção pendente</span>
              <strong className="fs2-v">{sd.pendingErrors}</strong>
              <span className="fs2-s">{sd.pendingErrors === 1 ? 'erro' : 'erros'} sem correção concluída</span>
            </div>
          </div>

          {sd.plan.length > 0 && (
            <section className="card sd-plan">
              <h2 className="card-title">🧭 O que fazer agora</h2>
              <ol>
                {sd.plan.map((it, i) => (
                  <motion.li key={i} className={`sd-step k-${it.kind}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}>
                    <span className="sd-num">{i + 1}</span>
                    <span>{it.text}</span>
                    {it.kind === 'tema' && it.topicId && <button className="btn btn-quiet btn-sm" onClick={() => ui.openTopic(it.topicId!)}>Abrir tema</button>}
                    {it.kind === 'correcao' && <button className="btn btn-quiet btn-sm" onClick={() => openCorr(sd.pendingSims[0]?.id)}>Ir para a correção</button>}
                  </motion.li>
                ))}
              </ol>
            </section>
          )}

          <div className="diag-grid">
            <section className="card">
              <h2 className="card-title">Grandes áreas nos simulados</h2>
              <ul className="sd-areas">
                {sd.areas.map((a) => {
                  const c = AREA_CHART[a.area].color;
                  const vals = a.series.filter((x): x is number => x != null);
                  return (
                    <li key={a.area} className={sd.weakest?.area === a.area ? 'is-weak' : ''}>
                      <span className="sd-area-n"><i style={{ background: c }} />{AREA_NAME[a.area]}</span>
                      <span className="sd-spark" aria-hidden="true">
                        {vals.map((v, k) => <i key={k} style={{ height: `${Math.max(6, v * 100)}%`, background: c, opacity: 0.35 + (0.65 * (k + 1)) / vals.length }} title={`${Math.round(v * 100)}%`} />)}
                      </span>
                      <strong>{p(a.recent)}</strong>
                      <span className="sd-d">{delta(a.recent, a.before)}</span>
                    </li>
                  );
                })}
              </ul>
              <p className="field-hint">Média dos 3 últimos simulados; ▲▼ compara com os 3 anteriores.{sd.weakest ? ` Destaque: ${AREA_NAME[sd.weakest.area]} é a área mais baixa agora.` : ''}</p>
            </section>

            <section className="card">
              <h2 className="card-title">Temas que voltam a cair</h2>
              {sd.repeats.length ? (
                <ul className="sd-repeat">
                  {sd.repeats.slice(0, 8).map((r) => (
                    <li key={r.key}>
                      <button onClick={() => (r.topicId ? ui.openTopic(r.topicId) : openCorr())}>
                        <i style={{ background: r.area ? AREA_CHART[r.area].color : 'var(--line)' }} />
                        <span className="sd-repeat-n">{r.name}</span>
                        <span className="sd-badge">{r.sims}× em simulados</span>
                        <span className={`sd-st ${r.pending ? 'is-pending' : 'is-ok'}`}>{r.pending ? 'corrigir' : 'corrigido'}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">Nenhum tema errado em mais de um simulado. Quando acontecer, ele aparece aqui para você não deixar passar.</p>
              )}
            </section>
          </div>

          <section className="card">
            <h2 className="card-title">Por que eu erro nos simulados</h2>
            {sd.reasons.length ? (
              <div className="sd-reasons">
                {sd.reasons.map((r, i) => (
                  <motion.div key={r.id} className={`sd-reason r-${r.id}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <div className="sd-reason-top">
                      <span className={`chip-mini chip-reason r-${r.id} is-on`}>{r.label}</span>
                      <strong>{Math.round(r.share * 100)}%</strong>
                      <span className="muted small">{r.n} erro{r.n > 1 ? 's' : ''}</span>
                    </div>
                    <span className="sd-reason-bar"><motion.i style={{ background: REASON_COLOR[r.id] ?? 'var(--azul)' }} initial={{ width: 0 }} animate={{ width: `${r.share * 100}%` }} /></span>
                    <p>{r.tip}</p>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="muted">Marque o motivo de cada erro na correção do simulado (conceito, desatenção…) para ver aqui o que mais te derruba e o que fazer.</p>
            )}
          </section>

          {sd.pendingSims.length > 0 && (
            <section className="card sd-pending">
              <h2 className="card-title">Correções em aberto</h2>
              <div className="sd-chips">
                {sd.pendingSims.slice(0, 6).map((x) => (
                  <button key={x.id} className="chip-mini" onClick={() => openCorr(x.id)}>
                    <Icon name="edit" size={12} /> {x.name} · {fmtShort(x.date)}
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <h2 className="h-section sd-sep">Também nas questões do dia a dia</h2>

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
