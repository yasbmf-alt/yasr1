import type { AgendaEvent, DataSnapshot, EventType } from '../types';
import { addDays, fromKey } from './dates';

export const EVENT_TYPES: { id: EventType; label: string; color: string; ink: string }[] = [
  { id: 'estudo', label: 'Bloco de estudo', color: '#E9D8FF', ink: '#5a3d99' },
  { id: 'missao', label: 'Missão Medway', color: '#F8C9F1', ink: '#8a2763' },
  { id: 'internato', label: 'Missão do internato', color: '#FFAEB1', ink: '#8f2c36' },
  { id: 'plantao', label: 'Plantão', color: '#CFE4FF', ink: '#23406f' },
  { id: 'fixa', label: 'Atividade fixa', color: '#D9EE76', ink: '#4b5c0e' },
  { id: 'pessoal', label: 'Compromisso pessoal', color: '#FFF3B0', ink: '#735511' },
  { id: 'simulado', label: 'Simulado', color: '#CFE8C9', ink: '#3f6b32' },
];
export const eventType = (t: EventType) => EVENT_TYPES.find((x) => x.id === t) ?? EVENT_TYPES[0];

export const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
export const fromMin = (m: number) => {
  const v = ((Math.round(m) % 1440) + 1440) % 1440;
  return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`;
};
export const duration = (e: Pick<AgendaEvent, 'start' | 'end'>) => {
  const d = toMin(e.end) - toMin(e.start);
  return d <= 0 ? d + 1440 : d;
};

export interface Occurrence {
  ev: AgendaEvent;
  date: string; // data em que a ocorrência começa
}

/** Expande eventos (inclusive recorrentes) entre from e to (inclusive). */
export function occurrences(events: AgendaEvent[], from: string, to: string): Occurrence[] {
  const out: Occurrence[] = [];
  for (const ev of events) {
    if (!ev.recurrence) {
      // inclui a véspera para eventos que atravessam a meia-noite
      if (ev.date >= addDays(from, -1) && ev.date <= to) out.push({ ev, date: ev.date });
      continue;
    }
    const start = ev.date > addDays(from, -1) ? ev.date : addDays(from, -1);
    const end = ev.recurrence.until && ev.recurrence.until < to ? ev.recurrence.until : to;
    for (let d = start; d <= end; d = addDays(d, 1)) {
      if (!ev.recurrence.weekdays.includes(fromKey(d).getDay())) continue;
      if (ev.exceptions.includes(d)) continue;
      out.push({ ev, date: d });
    }
  }
  return out;
}

export interface Segment {
  occ: Occurrence;
  day: string; // dia em que o segmento aparece
  startMin: number;
  endMin: number;
  cont: 'none' | 'starts' | 'ends'; // atravessa a meia-noite
  col: number;
  cols: number;
  overlaps: boolean;
}

/** Segmentos por dia, com colunas para eventos sobrepostos. */
export function daySegments(occs: Occurrence[], day: string): Segment[] {
  const segs: Segment[] = [];
  for (const occ of occs) {
    const s = toMin(occ.ev.start);
    const e = toMin(occ.ev.end);
    const crosses = e <= s;
    if (occ.date === day) segs.push({ occ, day, startMin: s, endMin: crosses ? 1440 : e, cont: crosses ? 'starts' : 'none', col: 0, cols: 1, overlaps: false });
    else if (crosses && addDays(occ.date, 1) === day && e > 0) segs.push({ occ, day, startMin: 0, endMin: e, cont: 'ends', col: 0, cols: 1, overlaps: false });
  }
  segs.sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);
  // agrupa em clusters e distribui colunas
  let cluster: Segment[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const colsEnd: number[] = [];
    for (const sg of cluster) {
      let c = colsEnd.findIndex((end) => end <= sg.startMin);
      if (c === -1) {
        c = colsEnd.length;
        colsEnd.push(sg.endMin);
      } else colsEnd[c] = sg.endMin;
      sg.col = c;
    }
    for (const sg of cluster) {
      sg.cols = colsEnd.length;
      sg.overlaps = cluster.length > 1 && cluster.some((o) => o !== sg && o.startMin < sg.endMin && o.endMin > sg.startMin);
    }
  };
  for (const sg of segs) {
    if (sg.startMin >= clusterEnd && cluster.length) {
      flush();
      cluster = [];
      clusterEnd = -1;
    }
    cluster.push(sg);
    clusterEnd = Math.max(clusterEnd, sg.endMin);
  }
  if (cluster.length) flush();
  return segs;
}

/** Título exibido: eventos de missão usam o nome atual da missão (sem duplicar dados). */
export function eventTitle(ev: AgendaEvent, data: DataSnapshot) {
  if (ev.missionId) {
    const m = data.missions.find((x) => x.id === ev.missionId);
    if (m) {
      const act = ev.activityId ? m.activities.find((a) => a.id === ev.activityId) : null;
      const base = act ? `${act.label} · ${m.label}` : m.label;
      return ev.title && ev.title.startsWith('Parte') ? `${base} (${ev.title})` : base;
    }
  }
  if (ev.simuladoId) {
    const s = data.simulados.find((x) => x.id === ev.simuladoId);
    if (s) return s.name;
  }
  return ev.title || eventType(ev.type).label;
}

export function overlapsWith(events: AgendaEvent[], draft: AgendaEvent, date: string) {
  const occs = occurrences(events.filter((e) => e.id !== draft.id), addDays(date, -1), addDays(date, 1));
  const a0 = toMin(draft.start);
  let a1 = toMin(draft.end);
  if (a1 <= a0) a1 += 1440;
  return occs.filter((o) => {
    let b0 = toMin(o.ev.start);
    let b1 = toMin(o.ev.end);
    if (b1 <= b0) b1 += 1440;
    const shift = (fromKey(o.date).getTime() - fromKey(date).getTime()) / 60000;
    b0 += shift;
    b1 += shift;
    return b0 < a1 && b1 > a0;
  });
}
