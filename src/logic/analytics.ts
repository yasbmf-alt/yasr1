// Interpretação automática dos registros. Nada aqui é guardado: tudo é
// recalculado a partir das sessões e dos simulados, sem duplicar dados.
import type { Area, BigArea, DataSnapshot, ErrorReason, Subtema } from '../types';
import { BIG_AREAS, REASONS, SUBTEMAS, areaOf } from '../types';
import { addDays, today, weekStart } from './dates';

export interface ErrorRecord {
  key: string;
  date: string;
  source: 'sessao' | 'simulado';
  sourceId: string;
  area: Area;
  topicId: string | null;
  subject: string;
  subtema: Subtema | null;
  reasons: ErrorReason[];
  count: number;
  note: string;
}

const norm = (s: string) => s.trim().toLowerCase();

export function errorRecords(d: DataSnapshot): ErrorRecord[] {
  const out: ErrorRecord[] = [];
  const tmap = new Map(d.topics.map((t) => [t.id, t]));
  for (const s of d.sessions) {
    const t = tmap.get(s.topicId);
    for (const g of s.errors ?? []) {
      out.push({
        key: `${s.id}:${g.id}`, date: s.date, source: 'sessao', sourceId: s.id, area: t?.area ?? 'geral', topicId: s.topicId || null,
        subject: t?.name ?? 'Sem tema', subtema: g.subtema, reasons: g.reasons, count: g.count, note: g.note,
      });
    }
  }
  for (const sim of d.simulados) {
    for (const g of sim.errors ?? []) {
      if (g.kind === 'revisar') continue;
      const t = g.topicId ? tmap.get(g.topicId) : null;
      out.push({
        key: `${sim.id}:${g.id}`, date: sim.date, source: 'simulado', sourceId: sim.id, area: (t?.area ?? g.area ?? 'geral') as Area,
        topicId: t?.id ?? null, subject: t?.name ?? (g.subject?.trim() || 'Sem matéria'), subtema: g.subtema, reasons: g.reasons, count: g.count, note: g.note,
      });
    }
    // temas errados antigos (texto livre) contam como 1 erro sem subtema
    for (const w of sim.wrongTopics ?? []) {
      if (!w.trim()) continue;
      const t = d.topics.find((x) => norm(x.name) === norm(w));
      out.push({
        key: `${sim.id}:w:${w}`, date: sim.date, source: 'simulado', sourceId: sim.id, area: t?.area ?? 'geral', topicId: t?.id ?? null,
        subject: t?.name ?? w.trim(), subtema: null, reasons: [], count: 1, note: '',
      });
    }
  }
  return out;
}

export const inPeriod = (date: string, days: number | null) => days == null || date >= addDays(today(), -(days - 1));

export interface QA {
  q: number;
  c: number;
}
const acc = (x: QA) => (x.q ? x.c / x.q : null);

/** Questões e acertos por tema (sessões) — inclui flashcards? Não: só questões e revisões. */
export function topicQA(d: DataSnapshot, days: number | null) {
  const m = new Map<string, QA>();
  for (const s of d.sessions) {
    if (!s.questions || s.type === 'flashcards' || !inPeriod(s.date, days)) continue;
    const x = m.get(s.topicId) ?? { q: 0, c: 0 };
    x.q += s.questions;
    x.c += s.correct ?? 0;
    m.set(s.topicId, x);
  }
  return m;
}

/** Aproveitamento por grande área somando sessões (pela área do tema) e simulados. */
export function areaQA(d: DataSnapshot, days: number | null, which: 'tudo' | 'sessoes' | 'simulados' = 'tudo') {
  const m = new Map<BigArea, QA>(BIG_AREAS.map((a) => [a, { q: 0, c: 0 }]));
  if (which !== 'simulados') {
    const tmap = new Map(d.topics.map((t) => [t.id, t]));
    for (const s of d.sessions) {
      if (!s.questions || s.type === 'flashcards' || !inPeriod(s.date, days)) continue;
      const a = tmap.get(s.topicId)?.area;
      if (!a || a === 'geral') continue;
      const x = m.get(a as BigArea)!;
      x.q += s.questions;
      x.c += s.correct ?? 0;
    }
  }
  if (which !== 'sessoes') {
    for (const sim of d.simulados) {
      if (!inPeriod(sim.date, days)) continue;
      for (const a of BIG_AREAS) {
        const sc = sim.areas?.[a];
        if (sc?.total && sc.correct != null) {
          const x = m.get(a)!;
          x.q += sc.total;
          x.c += sc.correct;
        }
      }
    }
  }
  return m;
}

export function totals(d: DataSnapshot, days: number | null) {
  let minutes = 0;
  let q = 0;
  let c = 0;
  const daysSet = new Set<string>();
  for (const s of d.sessions) {
    if (!inPeriod(s.date, days)) continue;
    minutes += s.minutes ?? 0;
    daysSet.add(s.date);
    if (s.questions && s.type !== 'flashcards') {
      q += s.questions;
      c += s.correct ?? 0;
    }
  }
  let sq = 0;
  let sc = 0;
  for (const sim of d.simulados) {
    if (!inPeriod(sim.date, days)) continue;
    daysSet.add(sim.date);
    if (sim.total) {
      sq += sim.total;
      sc += sim.correct ?? 0;
    }
  }
  return { minutes, q, c, sq, sc, days: daysSet.size, accuracy: q + sq ? (c + sc) / (q + sq) : null };
}

export interface Ranked {
  id: string;
  label: string;
  count: number;
  share: number;
}

function rank(map: Map<string, number>, label: (k: string) => string): Ranked[] {
  const total = [...map.values()].reduce((a, b) => a + b, 0);
  return [...map.entries()]
    .map(([id, count]) => ({ id, label: label(id), count, share: total ? count / total : 0 }))
    .sort((a, b) => b.count - a.count);
}

export function subtemaRanking(recs: ErrorRecord[]) {
  const m = new Map<string, number>();
  for (const r of recs) if (r.subtema) m.set(r.subtema, (m.get(r.subtema) ?? 0) + r.count);
  return rank(m, (k) => SUBTEMAS.find((s) => s.id === k)?.label ?? k);
}

export function reasonRanking(recs: ErrorRecord[]) {
  const m = new Map<string, number>();
  for (const r of recs) for (const x of r.reasons) m.set(x, (m.get(x) ?? 0) + r.count);
  return rank(m, (k) => REASONS.find((s) => s.id === k)?.label ?? k);
}

export function subjectRanking(recs: ErrorRecord[]) {
  const m = new Map<string, number>();
  const names = new Map<string, string>();
  for (const r of recs) {
    const k = r.topicId ?? `txt:${norm(r.subject)}`;
    names.set(k, r.subject);
    m.set(k, (m.get(k) ?? 0) + r.count);
  }
  return rank(m, (k) => names.get(k) ?? k);
}

export interface Recurrent {
  subject: string;
  topicId: string | null;
  subtema: Subtema;
  count: number;
  dates: number;
  reason: ErrorReason | null;
}

/** Mesmo assunto + subtema errado em pelo menos duas datas diferentes. */
export function recurrent(recs: ErrorRecord[]): Recurrent[] {
  const m = new Map<string, { r: Recurrent; dates: Set<string>; reasons: Map<ErrorReason, number> }>();
  for (const x of recs) {
    if (!x.subtema) continue;
    const k = `${x.topicId ?? norm(x.subject)}|${x.subtema}`;
    const e = m.get(k) ?? { r: { subject: x.subject, topicId: x.topicId, subtema: x.subtema, count: 0, dates: 0, reason: null }, dates: new Set(), reasons: new Map() };
    e.r.count += x.count;
    e.dates.add(x.date);
    for (const rr of x.reasons) e.reasons.set(rr, (e.reasons.get(rr) ?? 0) + x.count);
    m.set(k, e);
  }
  return [...m.values()]
    .filter((e) => e.dates.size >= 2)
    .map((e) => {
      const top = [...e.reasons.entries()].sort((a, b) => b[1] - a[1])[0];
      return { ...e.r, dates: e.dates.size, reason: top ? top[0] : null };
    })
    .sort((a, b) => b.count - a.count);
}

export const MIN_Q = 30; // abaixo disso, nada de conclusões gerais
export const MIN_Q_TOPIC = 10;
export const MIN_ERR = 5;

export interface Diagnosis {
  enough: boolean;
  totalQ: number;
  classified: number;
  subtemas: Ranked[];
  reasons: Ranked[];
  weakTopics: { id: string; name: string; area: Area; q: number; acc: number }[];
  weakAreas: { a: BigArea; q: number; acc: number }[];
  recurrent: Recurrent[];
  trend: { week: string; q: number; acc: number | null }[];
  alerts: string[];
  notes: string[];
}

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export function diagnose(d: DataSnapshot, days: number | null = null): Diagnosis {
  const recs = errorRecords(d).filter((r) => inPeriod(r.date, days));
  const t = totals(d, days);
  const totalQ = t.q + t.sq;
  const classified = recs.filter((r) => r.subtema || r.reasons.length).reduce((a, r) => a + r.count, 0);
  const subtemas = subtemaRanking(recs);
  const reasons = reasonRanking(recs);
  const tq = topicQA(d, days);
  const avg = t.accuracy;
  const weakTopics = [...tq.entries()]
    .filter(([, x]) => x.q >= MIN_Q_TOPIC)
    .map(([id, x]) => {
      const tp = d.topics.find((y) => y.id === id);
      return { id, name: tp?.name ?? 'Tema removido', area: tp?.area ?? 'geral', q: x.q, acc: acc(x) ?? 0 };
    })
    .sort((a, b) => a.acc - b.acc)
    .slice(0, 6);
  const aq = areaQA(d, days);
  const weakAreas = [...aq.entries()].filter(([, x]) => x.q >= MIN_Q_TOPIC).map(([a, x]) => ({ a, q: x.q, acc: acc(x) ?? 0 })).sort((a, b) => a.acc - b.acc);
  const rec = recurrent(recs);

  // tendência semanal
  const start = weekStart(today());
  const trend: Diagnosis['trend'] = [];
  for (let i = 7; i >= 0; i--) trend.push({ week: addDays(start, -7 * i), q: 0, acc: null });
  const wi = new Map(trend.map((w, i) => [w.week, i]));
  const wc = trend.map(() => ({ q: 0, c: 0 }));
  for (const s of d.sessions) {
    if (!s.questions || s.type === 'flashcards') continue;
    const i = wi.get(weekStart(s.date));
    if (i == null) continue;
    wc[i].q += s.questions;
    wc[i].c += s.correct ?? 0;
  }
  for (const sim of d.simulados) {
    const i = wi.get(weekStart(sim.date));
    if (i == null || !sim.total) continue;
    wc[i].q += sim.total;
    wc[i].c += sim.correct ?? 0;
  }
  trend.forEach((w, i) => {
    w.q = wc[i].q;
    w.acc = wc[i].q ? wc[i].c / wc[i].q : null;
  });

  const alerts: string[] = [];
  const notes: string[] = [];
  const enough = totalQ >= MIN_Q;
  if (!enough) notes.push(`Ainda há poucas questões registradas (${totalQ}). Os padrões ficam mais confiáveis a partir de ${MIN_Q}.`);
  if (classified < MIN_ERR) notes.push(classified ? `Só ${classified} erros foram classificados por subtema ou motivo, então os rankings de erro são preliminares.` : 'Nenhum erro foi classificado ainda. Ao registrar questões, use "Classificar erros" para ver subtemas e motivos aqui.');

  for (const r of rec.slice(0, 3)) {
    const st = SUBTEMAS.find((s) => s.id === r.subtema)?.label ?? '';
    const why = r.reason ? `, principalmente por ${REASONS.find((x) => x.id === r.reason)?.long}` : '';
    alerts.push(`Erros recorrentes: ${lower(st)} de ${r.subject}${why} (${r.count} erros em ${r.dates} dias).`);
  }
  if (classified >= MIN_ERR && reasons[0] && reasons[0].share >= 0.4) {
    alerts.push(`${reasons[0].label} aparece em ${Math.round(reasons[0].share * 100)}% dos motivos marcados.`);
  }
  if (classified >= MIN_ERR && subtemas[0] && subtemas[0].share >= 0.35) {
    alerts.push(`${subtemas[0].label} concentra ${Math.round(subtemas[0].share * 100)}% dos erros classificados.`);
  }
  if (enough && avg != null) {
    for (const w of weakAreas.slice(0, 1)) {
      if (w.acc < avg - 0.08) alerts.push(`${areaOf(w.a).label}: ${Math.round(w.acc * 100)}% de acertos, abaixo da sua média geral (${Math.round(avg * 100)}%).`);
    }
    for (const w of weakTopics.slice(0, 2)) {
      if (w.acc < Math.min(0.6, avg - 0.1)) alerts.push(`${w.name}: ${Math.round(w.acc * 100)}% em ${w.q} questões.`);
    }
  }
  const withQ = trend.filter((w) => w.q >= 10);
  if (withQ.length >= 4) {
    const half = Math.floor(withQ.length / 2);
    const a1 = withQ.slice(0, half);
    const a2 = withQ.slice(half);
    const m1 = a1.reduce((s, w) => s + (w.acc ?? 0) * w.q, 0) / a1.reduce((s, w) => s + w.q, 0);
    const m2 = a2.reduce((s, w) => s + (w.acc ?? 0) * w.q, 0) / a2.reduce((s, w) => s + w.q, 0);
    const delta = Math.round((m2 - m1) * 100);
    if (Math.abs(delta) >= 3) alerts.push(`Nas últimas semanas, o aproveitamento ${delta > 0 ? 'subiu' : 'caiu'} ${Math.abs(delta)} pontos em relação às semanas anteriores.`);
  }
  return { enough, totalQ, classified, subtemas, reasons, weakTopics, weakAreas, recurrent: rec, trend, alerts, notes };
}
