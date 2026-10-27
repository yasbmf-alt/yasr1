import type { Chapter, DataSnapshot, Mission, Session, Topic, Area } from '../types';
import { subtemaLabel } from '../types';
import { addDays, diffDays, today, weekStart } from './dates';

// ── Missões e capítulos ────────────────────────────────────────

export function missionProgress(m: Mission) {
  const req = m.activities.filter((a) => a.required);
  const base = req.length ? req : m.activities;
  const done = base.filter((a) => a.done).length;
  const total = base.length;
  const allDone = m.activities.filter((a) => a.done).length;
  return {
    done,
    total,
    pct: total ? done / total : 0,
    complete: total > 0 && done === total,
    started: allDone > 0,
  };
}

export function missionCompletedAt(m: Mission): string | null {
  const p = missionProgress(m);
  if (!p.complete) return null;
  const dates = m.activities.filter((a) => a.done && a.doneAt).map((a) => a.doneAt as string);
  return dates.sort().at(-1) ?? null;
}

export function chapterMissions(chapterId: string, missions: Mission[]) {
  return missions.filter((m) => m.chapterId === chapterId).sort((a, b) => a.order - b.order);
}

export function chapterProgress(ch: Chapter, missions: Mission[]) {
  const ms = chapterMissions(ch.id, missions);
  const done = ms.filter((m) => missionProgress(m).complete).length;
  const acts = ms.flatMap((m) => m.activities);
  const actsDone = acts.filter((a) => a.done).length;
  return {
    missions: ms.length,
    done,
    complete: ms.length > 0 && done === ms.length,
    pct: acts.length ? actsDone / acts.length : 0,
  };
}

export function currentChapter(chapters: Chapter[]): Chapter | null {
  if (!chapters.length) return null;
  const t = today();
  const sorted = [...chapters].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const inside = sorted.find((c) => c.startDate <= t && c.endDate >= t);
  if (inside) return inside;
  const next = sorted.find((c) => c.startDate > t);
  return next ?? sorted[sorted.length - 1];
}

// ── Temas ──────────────────────────────────────────────────────

// ── Revisões do tema ───────────────────────────────────────────
// Revisão = dia distinto, depois do primeiro estudo, com sessão de flashcards
// ou registro de revisão. A 1ª revisão é sempre no dia seguinte ao estudo (com
// flashcards); depois o intervalo cresce conforme o desempenho e o tempo que
// realmente passou (estabilidade, como no FSRS), e encolhe quando a revisão
// vai mal.

export interface ReviewEvent {
  date: string;
  kinds: ('flashcards' | 'revisao')[];
  questions: number; // questões de verdade (revisão com questões)
  correct: number;
  cards: number; // flashcards respondidos
  cardsOk: number;
  perf: number | null; // desempenho usado no agendamento (questões têm prioridade)
}

const isReviewType = (s: Session) => s.type === 'revisao' || s.type === 'flashcards';

export function reviewEvents(sessions: Session[], firstDate: string | null): ReviewEvent[] {
  if (!firstDate) return [];
  const m = new Map<string, ReviewEvent>();
  for (const s of sessions) {
    if (!isReviewType(s) || s.date <= firstDate) continue;
    const e = m.get(s.date) ?? { date: s.date, kinds: [], questions: 0, correct: 0, cards: 0, cardsOk: 0, perf: null };
    const k = s.type as 'flashcards' | 'revisao';
    if (!e.kinds.includes(k)) e.kinds.push(k);
    if (s.type === 'flashcards') {
      e.cards += s.questions ?? 0;
      e.cardsOk += s.correct ?? 0;
    } else if (s.questions) {
      e.questions += s.questions;
      e.correct += s.correct ?? 0;
    }
    m.set(s.date, e);
  }
  const out = [...m.values()].sort((a, b) => a.date.localeCompare(b.date));
  for (const e of out) e.perf = e.questions ? e.correct / e.questions : e.cards ? e.cardsOk / e.cards : null;
  return out;
}

/** fator de crescimento do intervalo pelo desempenho (De novo / Difícil / Bom / Fácil) */
const growth = (p: number | null) => (p == null ? 3 : p < 0.6 ? 0.5 : p < 0.75 ? 1.5 : p < 0.9 ? 3.5 : 5);

export function scheduleReviews(firstDate: string | null, events: ReviewEvent[], priority: Topic['priority']) {
  if (!firstDate) return { next: null as string | null, interval: 0, stability: 0 };
  let last = firstDate;
  let stability = 1; // dias
  for (const e of events) {
    const elapsed = Math.max(1, diffDays(e.date, last));
    const g = growth(e.perf);
    if (g < 1) stability = Math.max(1, stability * g); // foi mal: o intervalo encolhe
    else {
      // como no FSRS: revisar antes da hora rende pouco; no prazo (ou depois), rende o ganho todo
      const base = Math.max(stability, elapsed);
      stability = base + (base * (g - 1)) * Math.min(1, elapsed / stability);
    }
    stability = Math.min(365, stability);
    last = e.date;
  }
  const pf = priority === 'alta' ? 0.8 : priority === 'baixa' ? 1.2 : 1;
  const interval = events.length ? Math.max(1, Math.round(stability * pf)) : 1; // 1ª revisão: dia seguinte
  return { next: addDays(last, interval), interval, stability };
}

/** força da memória (0–4): quanto ainda deve lembrar hoje, pela curva do FSRS */
export function memoryStrength(lastDate: string | null, stability: number): 0 | 1 | 2 | 3 | 4 {
  if (!lastDate) return 0;
  const t = Math.max(0, diffDays(today(), lastDate));
  const r = Math.pow(1 + (19 / 81) * (t / Math.max(1, stability)), -0.5);
  return r > 0.93 ? 4 : r > 0.85 ? 3 : r > 0.75 ? 2 : 1;
}

export interface TopicStats {
  sessions: Session[];
  minutes: number;
  questions: number;
  correct: number;
  accuracy: number | null;
  reviews: number;
  firstDate: string | null;
  lastDate: string | null;
  topErrors: { name: string; count: number }[];
  suggestedReview: string | null;
  nextReview: string | null;
  overdue: boolean;
  reviewEvents: ReviewEvent[];
  strength: 0 | 1 | 2 | 3 | 4;
  nextReviewType: 'flashcards' | 'misto' | null; // 1ª revisão só com flashcards
  points: number;
  stage: 0 | 1 | 2 | 3 | 4;
}

export function topicStats(topic: Topic, allSessions: Session[]): TopicStats {
  const sessions = allSessions
    .filter((s) => s.topicId === topic.id)
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  let minutes = 0;
  let questions = 0;
  let correct = 0;
  let reviews = 0;
  let points = 0;
  const errs = new Map<string, number>();
  for (const s of sessions) {
    minutes += s.minutes ?? 0;
    // acerto de questões nunca mistura flashcards (cartões lembrados não são questões)
    if (s.questions && s.type !== 'flashcards') {
      questions += s.questions;
      correct += s.correct ?? 0;
    }
    if (s.type === 'revisao') {
      reviews++;
      points += 2;
      const acc = s.questions ? (s.correct ?? 0) / s.questions : null;
      if (acc != null && acc >= 0.7) points += 1;
    } else {
      points += 1;
    }
    if (s.errors?.length) {
      for (const g of s.errors) {
        const k = [subtemaLabel(g.subtema), g.note.trim()].filter((x) => x && x !== 'Sem subtema').join(': ') || 'Sem subtema';
        errs.set(k, (errs.get(k) ?? 0) + g.count);
      }
    } else
      for (const e of s.errorTopics) {
        const k = e.trim();
        if (k) errs.set(k, (errs.get(k) ?? 0) + 1);
      }
  }
  const accuracy = questions ? correct / questions : null;
  const lastDate = sessions.at(-1)?.date ?? null;

  const firstDate = sessions[0]?.date ?? null;
  const events = reviewEvents(sessions, firstDate);
  reviews = events.length;
  const sched = scheduleReviews(firstDate, events, topic.priority);
  const suggestedReview = sched.next;
  // a data escolhida à mão vale até a próxima revisão feita
  const override = topic.nextReviewOverride && (!events.length || topic.nextReviewOverride > events.at(-1)!.date) ? topic.nextReviewOverride : null;
  const nextReview = override ?? suggestedReview;

  // jardim: estudo = broto, 1ª revisão = planta crescendo, 2ª revisão = madura
  let stage: TopicStats['stage'] = 0;
  if (sessions.length) stage = 2;
  if (events.length >= 1) stage = 3;
  if (events.length >= 2) stage = 4;

  return {
    sessions,
    minutes,
    questions,
    correct,
    accuracy,
    reviews,
    firstDate: sessions[0]?.date ?? null,
    lastDate,
    topErrors: [...errs.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    suggestedReview,
    nextReview,
    overdue: !!nextReview && nextReview < today(),
    points,
    stage,
    reviewEvents: events,
    strength: memoryStrength(events.at(-1)?.date ?? firstDate, sched.stability),
    nextReviewType: firstDate ? (events.length ? 'misto' : 'flashcards') : null,
  };
}

export const STAGE_LABEL = ['Ainda não plantado', 'Semente', 'Broto', 'Planta', 'Em flor'] as const;
export const STAGE_NEXT = [1, 3, 6, 10, Infinity]; // (antigo, por pontos)
export const STAGE_BY_REVIEWS = ['Ainda não estudado', 'Broto', 'Broto', 'Planta crescendo', 'Planta madura'] as const;

// ── Volume por dia, constância, XP ─────────────────────────────

export interface DayVolume {
  minutes: number;
  sessions: number;
  byArea: Partial<Record<Area, number>>;
}

export function dayVolumes(sessions: Session[], topics: Topic[]) {
  const tmap = new Map(topics.map((t) => [t.id, t]));
  const map = new Map<string, DayVolume>();
  for (const s of sessions) {
    const v = map.get(s.date) ?? { minutes: 0, sessions: 0, byArea: {} };
    v.minutes += s.minutes ?? 0;
    v.sessions += 1;
    const area = tmap.get(s.topicId)?.area ?? 'geral';
    v.byArea[area] = (v.byArea[area] ?? 0) + Math.max(1, s.minutes ?? 0);
    map.set(s.date, v);
  }
  return map;
}

/** Intensidade 0–4. Usa minutos; um dia com registro sem tempo vale pelo menos 1. */
export function intensity(v: DayVolume | undefined): 0 | 1 | 2 | 3 | 4 {
  if (!v || v.sessions === 0) return 0;
  const m = v.minutes;
  if (m >= 240) return 4;
  if (m >= 120) return 3;
  if (m >= 45) return 2;
  return 1;
}

export function dominantArea(v: DayVolume | undefined): Area {
  if (!v) return 'geral';
  let best: Area = 'geral';
  let max = -1;
  for (const [a, n] of Object.entries(v.byArea)) {
    if ((n ?? 0) > max) {
      max = n ?? 0;
      best = a as Area;
    }
  }
  return best;
}

export function streakInfo(sessions: Session[]) {
  const days = new Set(sessions.map((s) => s.date));
  const t = today();
  let cursor = days.has(t) ? t : addDays(t, -1);
  let current = 0;
  while (days.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }
  const sorted = [...days].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    run = prev && diffDays(d, prev) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return { current, best, studiedToday: days.has(t) };
}

export const XP = { activity: 20, mission: 50, chapter: 200, session: 10, review: 15 };

export function xpInfo(data: DataSnapshot) {
  let xp = 0;
  for (const m of data.missions) {
    xp += m.activities.filter((a) => a.done).length * XP.activity;
    if (missionProgress(m).complete) xp += XP.mission;
  }
  for (const c of data.chapters) if (chapterProgress(c, data.missions).complete) xp += XP.chapter;
  for (const s of data.sessions) xp += s.type === 'revisao' ? XP.review : XP.session;
  const per = 500;
  return { xp, level: Math.floor(xp / per) + 1, into: xp % per, per };
}

export function weeklyMinutes(sessions: Session[], weeks = 8) {
  const start = weekStart(today());
  const out: { week: string; minutes: number }[] = [];
  for (let i = weeks - 1; i >= 0; i--) out.push({ week: addDays(start, -7 * i), minutes: 0 });
  const idx = new Map(out.map((w, i) => [w.week, i]));
  for (const s of sessions) {
    const i = idx.get(weekStart(s.date));
    if (i != null) out[i].minutes += s.minutes ?? 0;
  }
  return out;
}

/** Desbloqueios de decoração do jardim por melhor sequência */
export const DECOR_UNLOCKS: { id: string; label: string; streak: number }[] = [
  { id: 'regador', label: 'Regador', streak: 3 },
  { id: 'banco', label: 'Banquinho', streak: 7 },
  { id: 'lanterna', label: 'Lanterna', streak: 14 },
  { id: 'fonte', label: 'Fonte', streak: 30 },
];
