import React from 'react';
import { useStore } from '../data/store';
import { useUI } from './ui';
import { Icon } from './Icon';
import { CORRECTION_STATUS, REASONS, type CorrectionStatus, type ErrorReason, type MistakeItem, type Topic } from '../types';
import { fmtShort } from '../logic/dates';
import { isMistake, normName, topicOccurrences } from '../logic/simErrors';
import { summarize, summaryText } from '../logic/summary';

const reasonLabel = (r: ErrorReason) => REASONS.find((x) => x.id === r)?.label ?? r;
const statusLabel = (s: CorrectionStatus | undefined) => CORRECTION_STATUS.find((x) => x.id === (s ?? 'nao'))?.label;

/** Histórico do tema nos simulados: erros, motivos, subtópicos e lacunas. */
export function ExamHistory({ topic, onMap }: { topic: Topic; onMap: () => void }) {
  const { data } = useStore();
  const occ = topicOccurrences(data.simulados, topic.id);
  if (!occ.length) return null;
  const mistakes = occ.filter((o) => isMistake(o.group));
  const total = mistakes.reduce((n, o) => n + o.group.count, 0);
  const exams = new Set(mistakes.map((o) => o.sim.id)).size;
  const reasons = new Map<ErrorReason, number>();
  const subs = new Map<string, { label: string; n: number; exams: Set<string> }>();
  const gaps: { gap: string; sim: string; date: string }[] = [];
  for (const o of mistakes) {
    for (const it of o.group.items ?? []) {
      if (it.reason) reasons.set(it.reason, (reasons.get(it.reason) ?? 0) + 1);
      if (it.gap?.trim()) gaps.push({ gap: it.gap.trim(), sim: o.sim.name, date: o.sim.date });
    }
    if (!o.group.items?.length) for (const r of o.group.reasons) reasons.set(r, (reasons.get(r) ?? 0) + 1);
    const sub = o.group.subtopic?.trim();
    if (sub) {
      const k = normName(sub);
      const x = subs.get(k) ?? { label: sub, n: 0, exams: new Set<string>() };
      x.n += o.group.count;
      x.exams.add(o.sim.id);
      subs.set(k, x);
    }
  }
  const repeated = [...subs.values()].filter((s) => s.exams.size > 1 || s.n > 1).sort((a, b) => b.n - a.n);
  const rs = [...reasons.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <section className="ts">
      <h3 className="h-section">Nos simulados</h3>
      <p className="ts-sum">
        {total ? <><strong>{total} erro{total > 1 ? 's' : ''}</strong> em {exams} simulado{exams > 1 ? 's' : ''}</> : 'Sem erros registrados'}
        {occ.some((o) => !isMistake(o.group)) && <> · marcado para revisar</>}
      </p>
      <ul className="ts-occ">
        {occ.map((o) => (
          <li key={`${o.sim.id}:${o.group.id}`}>
            <span className="mono">{fmtShort(o.sim.date)}</span>
            <span className="ts-occ-name">
              {o.sim.name}
              {o.group.subtopic?.trim() && <span className="muted"> · {o.group.subtopic}</span>}
            </span>
            <span className="ts-occ-n">{isMistake(o.group) ? `${o.group.count} erro${o.group.count > 1 ? 's' : ''}` : 'revisar'}</span>
            <span className={`ts-st st-${o.group.status ?? 'nao'}`}>{statusLabel(o.group.status)}</span>
          </li>
        ))}
      </ul>
      {rs.length > 0 && (
        <div className="ts-block">
          <span className="ts-label">Por que errei</span>
          <div className="chips">
            {rs.map(([r, n]) => <span key={r} className={`chip-mini chip-reason r-${r} is-on`}>{reasonLabel(r)} · {n}</span>)}
          </div>
        </div>
      )}
      {repeated.length > 0 && (
        <div className="ts-block">
          <span className="ts-label">Subtópicos que se repetem</span>
          <ul className="err-list">
            {repeated.map((s) => <li key={s.label}><span>{s.label}</span><span className="muted">{s.n} erro{s.n > 1 ? 's' : ''} · {s.exams.size} simulado{s.exams.size > 1 ? 's' : ''}</span></li>)}
          </ul>
        </div>
      )}
      {gaps.length > 0 && (
        <div className="ts-block">
          <span className="ts-label">O que eu precisava saber</span>
          <ul className="ts-gaps">
            {gaps.map((g, i) => (
              <li key={i}>
                <span>{g.gap}</span>
                <span className="muted small">{g.sim} · {fmtShort(g.date)}</span>
                <button className="link small" onClick={onMap}>Abrir no mapa</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/** Resumo escrito do mapa (somente leitura): o mapa é a fonte. */
export function TopicSummary({ topic, onNode }: { topic: Topic; onNode: (id: string) => void }) {
  const ui = useUI();
  const blocks = summarize(topic.map);
  const useful = blocks.filter((b) => b.depth > 0 || b.explanation || b.list.length || b.notes);
  if (!useful.length)
    return (
      <div className="ts-empty">
        <p>O resumo aparece sozinho quando você escrever no mapa conceitual. Ele só organiza o que você anotou, na ordem dos ramos.</p>
      </div>
    );
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summaryText(blocks, 'md'));
      ui.toast('Resumo copiado.');
    } catch {
      ui.toast('Não consegui copiar. Selecione o texto e copie manualmente.', 'erro');
    }
  };
  return (
    <div className="sum">
      <div className="sum-tools">
        <span className="muted small">Gerado a partir do mapa. Para mudar, edite o mapa.</span>
        <button className="btn btn-quiet btn-sm" onClick={copy}><Icon name="copy" size={15} /> Copiar resumo</button>
      </div>
      <article className="sum-doc">
        {blocks.map((b) => {
          const H = (b.depth === 0 ? 'h2' : b.depth === 1 ? 'h3' : b.depth === 2 ? 'h4' : 'h5') as 'h2';
          return (
            <section key={b.nodeId} className={`sum-b d${Math.min(b.depth, 4)}`}>
              <H className="sum-h">
                <button className="sum-h-btn" onClick={() => onNode(b.nodeId)} title="Ver no mapa">{b.title || '(sem título)'}</button>
              </H>
              {b.explanation && b.explanation.split('\n').map((l, i) => <p key={i}>{l}</p>)}
              {b.list.length > 0 && <ul>{b.list.map((l, i) => <li key={i}>{l}</li>)}</ul>}
              {b.notes && <blockquote>{b.notes}</blockquote>}
              {b.links.length > 0 && (
                <ul className="sum-links">
                  {b.links.map((l, i) => <li key={i}>{/^https?:\/\//.test(l.url) ? <a href={l.url} target="_blank" rel="noreferrer noopener">{l.label || l.url}</a> : `${l.label} ${l.url}`}</li>)}
                </ul>
              )}
            </section>
          );
        })}
      </article>
    </div>
  );
}

/** Questões erradas (e marcadas para revisar) ligadas ao tema. */
export function TopicQuestions({ topic }: { topic: Topic }) {
  const { data } = useStore();
  const occ = topicOccurrences(data.simulados, topic.id);
  type Row = { key: string; o: (typeof occ)[number]; it: MistakeItem | null; i: number };
  const rows = occ.flatMap((o): Row[] =>
    isMistake(o.group)
      ? (o.group.items ?? []).map((it, i) => ({ key: `${o.group.id}:${it.id}`, o, it, i }))
      : [{ key: o.group.id, o, it: null, i: 0 }],
  );
  if (!rows.length)
    return <div className="ts-empty"><p>Nenhuma questão ligada a este tema ainda. Elas aparecem quando você detalha os erros de um simulado.</p></div>;
  return (
    <ul className="tq">
      {rows.map(({ key, o, it, i }) => (
        <li key={key} className={it ? '' : 'is-review'}>
          <div className="tq-head">
            <strong>{it ? (it.question ? `Questão ${it.question.replace(/^q/i, '')}` : `Erro ${i + 1}`) : 'Acertei, mas quero revisar'}</strong>
            <span className="muted small">{o.sim.name} · {fmtShort(o.sim.date)}{o.group.subtopic?.trim() ? ` · ${o.group.subtopic}` : ''}</span>
            {it?.reason && <span className={`chip-mini chip-reason r-${it.reason} is-on`}>{reasonLabel(it.reason)}</span>}
          </div>
          {it?.gap && <p className="tq-gap">{it.gap}</p>}
          {!it && o.group.note && <p className="tq-gap">{o.group.note}</p>}
        </li>
      ))}
    </ul>
  );
}
