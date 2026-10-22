// Pote de conquistas: marcos derivados dos registros, nada a preencher.
import type { DataSnapshot } from '../types';
import { chapterProgress, missionCompletedAt, missionProgress, topicStats } from './progress';
import { addDays, diffDays } from './dates';

export interface Achievement {
  id: string;
  emoji: string;
  title: string;
  date: string | null; // quando foi conquistado (null = ainda não)
  group: 'estudo' | 'trilha' | 'provas' | 'jardim';
}

/** data em que uma soma acumulada passou do limite */
function crossing(items: { date: string; v: number }[], limit: number) {
  let acc = 0;
  for (const it of [...items].sort((a, b) => a.date.localeCompare(b.date))) {
    acc += it.v;
    if (acc >= limit) return it.date;
  }
  return null;
}

export function bestStreakDate(dates: string[], len: number) {
  const s = [...new Set(dates)].sort();
  let run = 0;
  let prev: string | null = null;
  for (const d of s) {
    run = prev && diffDays(d, prev) === 1 ? run + 1 : 1;
    if (run >= len) return d;
    prev = d;
  }
  return null;
}

export function achievements(d: DataSnapshot): Achievement[] {
  const out: Achievement[] = [];
  const sess = d.sessions;
  const minutes = [...sess.map((s) => ({ date: s.date, v: s.minutes ?? 0 })), ...d.simulados.map((s) => ({ date: s.date, v: s.minutes ?? 0 }))];
  const qs = [...sess.filter((s) => s.type !== 'flashcards').map((s) => ({ date: s.date, v: s.questions ?? 0 })), ...d.simulados.map((s) => ({ date: s.date, v: s.total ?? 0 }))];
  const firstSess = [...sess].sort((a, b) => a.date.localeCompare(b.date))[0];
  out.push({ id: 'primeira-sessao', emoji: '🌱', title: 'Primeiro registro de estudo', date: firstSess?.date ?? null, group: 'estudo' });
  for (const h of [10, 50, 100, 250, 500]) out.push({ id: `horas-${h}`, emoji: '⏳', title: `${h} horas estudadas`, date: crossing(minutes, h * 60), group: 'estudo' });
  for (const q of [100, 500, 1000, 2500, 5000]) out.push({ id: `questoes-${q}`, emoji: '✍️', title: `${q.toLocaleString('pt-BR')} questões resolvidas`, date: crossing(qs, q), group: 'estudo' });
  const dates = [...sess.map((s) => s.date), ...d.simulados.map((s) => s.date)];
  for (const n of [7, 14, 30]) out.push({ id: `sequencia-${n}`, emoji: '🔥', title: `${n} dias seguidos estudando`, date: bestStreakDate(dates, n), group: 'estudo' });
  const uniq = [...new Set(dates)].sort();
  out.push({ id: 'dias-30', emoji: '📅', title: '30 dias com estudo', date: uniq[29] ?? null, group: 'estudo' });

  const done = d.missions.filter((m) => missionProgress(m).complete).map((m) => missionCompletedAt(m)).filter(Boolean).sort() as string[];
  out.push({ id: 'primeira-missao', emoji: '⭐', title: 'Primeira missão concluída', date: done[0] ?? null, group: 'trilha' });
  out.push({ id: 'missoes-10', emoji: '🌟', title: '10 missões concluídas', date: done[9] ?? null, group: 'trilha' });
  const internato = d.missions.filter((m) => m.kind === 'internato' && missionProgress(m).complete).map((m) => missionCompletedAt(m)).filter(Boolean).sort() as string[];
  out.push({ id: 'internato-1', emoji: '🏥', title: 'Primeira missão do internato', date: internato[0] ?? null, group: 'trilha' });
  for (const c of [...d.chapters].sort((a, b) => a.number - b.number)) {
    const p = chapterProgress(c, d.missions);
    const ms = d.missions.filter((m) => m.chapterId === c.id).map((m) => missionCompletedAt(m)).filter(Boolean).sort() as string[];
    out.push({ id: `cap-${c.id}`, emoji: '📖', title: `${c.title} concluída`, date: p.complete ? ms.at(-1) ?? null : null, group: 'trilha' });
  }

  const sims = [...d.simulados].sort((a, b) => a.date.localeCompare(b.date));
  out.push({ id: 'simulado-1', emoji: '📝', title: 'Primeiro simulado', date: sims[0]?.date ?? null, group: 'provas' });
  out.push({ id: 'simulado-5', emoji: '🗂️', title: '5 simulados feitos', date: sims[4]?.date ?? null, group: 'provas' });
  for (const p of [70, 80]) {
    const s = sims.find((x) => x.total && (x.correct ?? 0) / x.total >= p / 100);
    out.push({ id: `simulado-${p}`, emoji: '🏅', title: `Simulado com ${p}% ou mais`, date: s?.date ?? null, group: 'provas' });
  }

  const flowerDates = d.topics
    .map((t) => {
      const st = topicStats(t, d.sessions);
      return st.stage === 4 ? st.lastDate : null;
    })
    .filter(Boolean)
    .sort() as string[];
  out.push({ id: 'flor-1', emoji: '🌸', title: 'Primeira planta em flor', date: flowerDates[0] ?? null, group: 'jardim' });
  out.push({ id: 'flor-5', emoji: '💐', title: '5 plantas em flor', date: flowerDates[4] ?? null, group: 'jardim' });
  const reviewed = d.cards.filter((c) => c.fsrs.lastReview).map((c) => c.fsrs.lastReview!.slice(0, 10)).sort();
  out.push({ id: 'flashcards-1', emoji: '🃏', title: 'Primeira revisão de flashcards', date: reviewed[0] ?? null, group: 'jardim' });
  const mac = d.macetes.map((m) => m.createdAt.slice(0, 10)).sort();
  out.push({ id: 'macetes-10', emoji: '💡', title: '10 macetes guardados', date: mac[9] ?? null, group: 'jardim' });
  return out;
}

export const earned = (d: DataSnapshot) => achievements(d).filter((a) => a.date);

/** missões concluídas nos últimos 3 dias que ainda não renderam pop-up */
export function recentPair(d: DataSnapshot, today: string) {
  const used = new Set(d.settings.rewardUsedMissions ?? []);
  return d.missions
    .filter((m) => missionProgress(m).complete && !used.has(m.id))
    .map((m) => ({ m, date: missionCompletedAt(m) }))
    .filter((x) => x.date && x.date >= addDays(today, -2))
    .map((x) => x.m.id);
}
