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

const REVIEW_STEPS = [1, 7, 15, 30, 60, 90];

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

  let suggestedReview: string | null = null;
  if (lastDate) {
    const step = REVIEW_STEPS[Math.min(reviews, REVIEW_STEPS.length - 1)];
    let factor = 1;
    if (accuracy != null) factor = accuracy < 0.6 ? 0.5 : accuracy < 0.8 ? 1 : 1.3;
    if (topic.priority === 'alta') factor *= 0.8;
    if (topic.priority === 'baixa') factor *= 1.2;
    suggestedReview = addDays(lastDate, Math.max(1, Math.round(step * factor)));
  }
  const nextReview = topic.nextReviewOverride ?? suggestedReview;

  let stage: TopicStats['stage'] = 0;
  if (sessions.length) stage = 1;
  if (points >= 3) stage = 2;
  if (points >= 6) stage = 3;
  if (points >= 10 && (accuracy == null || accuracy >= 0.7)) stage = 4;

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
  };
}

export const STAGE_LABEL = ['Ainda não plantado', 'Semente', 'Broto', 'Planta', 'Em flor'] as const;
export const STAGE_NEXT = [1, 3, 6, 10, Infinity];

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
