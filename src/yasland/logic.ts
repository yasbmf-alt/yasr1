// Contas da Yasland: indicadores de consistência, dias ativos, horta e conquistas.
// Tudo é calculado a partir dos registros; nada é apagado por inatividade.
import { addDays, fromKey, today } from '../logic/dates';
import type { DocOf, YlDoc, YlKind } from './types';

type Of = <K extends YlKind>(k: K) => DocOf<K>[];
const DAY = 86400000;
const ago = (k: string) => Math.max(0, (fromKey(today()).getTime() - fromKey(k).getTime()) / DAY);

// ── Músculo time: consistência recente de cada atividade (0–100) ──
// Cada sessão vale pela duração e perde metade do peso a cada 10 dias.
// Chega a 100 com mais ou menos 3 sessões de 50 min por semana mantidas.
export interface Gauge { id: string; label: string; emoji: string; color: string; value: number; last: string | null; count30: number }

function gauge(sessions: { date: string; minutes: number }[], perWeek = 3, mins = 50) {
  const score = sessions.reduce((a, s) => a + Math.min(2, s.minutes / mins) * Math.pow(0.5, ago(s.date) / 10), 0);
  // estado estável de perWeek sessões/semana com meia-vida de 10 dias ≈ perWeek/7 * 10/ln2
  const full = ((perWeek / 7) * 10) / Math.LN2;
  return Math.round(Math.min(1, score / full) * 100);
}

export function gauges(of: Of): Gauge[] {
  const cardio = of('cardio').map((x) => ({ date: x.date, minutes: x.minutes }));
  const lift = of('lift').map((x) => ({ date: x.date, minutes: x.minutes || 45 }));
  const sport = of('sport');
  const racket = sport.filter((x) => x.modality !== 'pilates').map((x) => ({ date: x.date, minutes: x.minutes }));
  const pilates = sport.filter((x) => x.modality === 'pilates').map((x) => ({ date: x.date, minutes: x.minutes }));
  const mk = (id: string, label: string, emoji: string, color: string, list: { date: string; minutes: number }[], perWeek: number) => {
    const sorted = [...list].sort((a, b) => b.date.localeCompare(a.date));
    return { id, label, emoji, color, value: gauge(list, perWeek), last: sorted[0]?.date ?? null, count30: list.filter((x) => ago(x.date) < 30).length };
  };
  return [
    mk('forca', 'Força', '💪', '#E46AA5', lift, 3),
    mk('cardio', 'Cardio', '🫀', '#F08C5A', cardio, 3),
    mk('raquete', 'Raquete', '🎾', '#9FC46A', racket, 1.5),
    mk('pilates', 'Pilates', '🧘🏻‍♀️', '#9C7FE0', pilates, 2),
  ];
}

// ── Dias ativos (fazem a horta crescer) ──
export function activeDays(of: Of, waterGoal: number): Set<string> {
  const s = new Set<string>();
  for (const k of ['cardio', 'lift', 'sport', 'skin', 'hair', 'sleep', 'hcheck', 'chore'] as const) for (const d of of(k)) s.add((d as { date: string }).date);
  for (const r of of('recipe')) for (const d of r.made) s.add(d);
  const water = new Map<string, number>();
  for (const w of of('water')) water.set(w.date, (water.get(w.date) ?? 0) + w.ml);
  for (const [d, ml] of water) if (ml >= waterGoal * 0.75) s.add(d);
  return s;
}

// ── Horta ──
export const SPECIES: { id: string; name: string; emoji: string; days: number; color: string }[] = [
  { id: 'alface', name: 'Alface', emoji: '🥬', days: 6, color: '#8DC26F' },
  { id: 'rabanete', name: 'Rabanete', emoji: '🌶️', days: 6, color: '#E0607E' },
  { id: 'manjericao', name: 'Manjericão', emoji: '🌿', days: 7, color: '#5FA36A' },
  { id: 'morango', name: 'Morango', emoji: '🍓', days: 9, color: '#E8455F' },
  { id: 'cenoura', name: 'Cenoura', emoji: '🥕', days: 9, color: '#F08C3A' },
  { id: 'tomate', name: 'Tomate', emoji: '🍅', days: 12, color: '#E2513F' },
  { id: 'girassol', name: 'Girassol', emoji: '🌻', days: 12, color: '#F4C430' },
  { id: 'abobora', name: 'Abóbora', emoji: '🎃', days: 15, color: '#E98A2B' },
  { id: 'lavanda', name: 'Lavanda', emoji: '💜', days: 15, color: '#A783D9' },
];
export const speciesOf = (id: string) => SPECIES.find((s) => s.id === id) ?? SPECIES[0];

/** dias ativos desde o plantio → estágio 0 (semente) a 4 (pronta para colher) */
export function plotGrowth(p: DocOf<'plot'>, active: Set<string>) {
  const need = speciesOf(p.species).days;
  let n = 0;
  for (const d of active) if (d >= p.plantedAt.slice(0, 10)) n++;
  const pct = Math.min(1, n / need);
  const stage = pct >= 1 ? 4 : pct >= 0.66 ? 3 : pct >= 0.33 ? 2 : n > 0 ? 1 : 0;
  return { n, need, pct, stage: stage as 0 | 1 | 2 | 3 | 4 };
}

// ── Conquistas (museu) ──
export interface Badge { id: string; name: string; emoji: string; desc: string; room: 'Academia' | 'Cozinha' | 'Mercadinho' | 'Spa' | 'Horta' | 'Hábitos' }
export const BADGES: Badge[] = [
  { id: 'gota', name: 'Primeira gota', emoji: '💧', desc: 'Registrou água pela primeira vez.', room: 'Cozinha' },
  { id: 'hidratada', name: 'Hidratada', emoji: '🫗', desc: 'Bateu a meta de água em um dia.', room: 'Cozinha' },
  { id: 'rio', name: 'Rio que corre', emoji: '🌊', desc: 'Meta de água em 7 dias diferentes.', room: 'Cozinha' },
  { id: 'chef', name: 'Mão na massa', emoji: '🍳', desc: 'Preparou uma receita do livro.', room: 'Cozinha' },
  { id: 'livro', name: 'Livro de família', emoji: '📖', desc: '5 receitas guardadas no livro.', room: 'Cozinha' },
  { id: 'cardio1', name: 'Primeiro passo', emoji: '👟', desc: 'Primeira sessão de cardio.', room: 'Academia' },
  { id: 'ficha', name: 'Ficha completa', emoji: '📋', desc: 'Terminou um treino com todas as séries da ficha.', room: 'Academia' },
  { id: 'dez', name: 'Dez treinos', emoji: '🏅', desc: '10 treinos registrados (qualquer modalidade).', room: 'Academia' },
  { id: 'raquete', name: 'Na quadra', emoji: '🎾', desc: 'Primeira partida de beach tennis ou tênis.', room: 'Academia' },
  { id: 'pilates', name: 'Centro forte', emoji: '🧘🏻‍♀️', desc: 'Primeira aula de pilates.', room: 'Academia' },
  { id: 'semana', name: 'Semana ativa', emoji: '🔥', desc: '3 treinos na mesma semana.', room: 'Academia' },
  { id: 'cesta', name: 'Cesta cheia', emoji: '🧺', desc: 'Primeira compra finalizada no caixa.', room: 'Mercadinho' },
  { id: 'zero', name: 'Nada se perde', emoji: '♻️', desc: '10 alimentos consumidos sem descarte no mês.', room: 'Mercadinho' },
  { id: 'desejo', name: 'Desejo realizado', emoji: '🎁', desc: 'Comprou um item da vitrine de desejos.', room: 'Mercadinho' },
  { id: 'skin', name: 'Pele de seda', emoji: '🧴', desc: 'Rotina de skincare em 7 dias.', room: 'Spa' },
  { id: 'cabelo', name: 'Cronograma em dia', emoji: '💆🏻‍♀️', desc: '4 cuidados de cabelo registrados.', room: 'Spa' },
  { id: 'sono', name: 'Bela adormecida', emoji: '🌙', desc: '7 noites de sono registradas.', room: 'Spa' },
  { id: 'habito', name: 'Hábito de pé', emoji: '✅', desc: 'Um hábito marcado 7 vezes.', room: 'Hábitos' },
  { id: 'habito30', name: 'Raiz profunda', emoji: '🌳', desc: 'Um hábito marcado 30 vezes.', room: 'Hábitos' },
  { id: 'semente', name: 'Mão verde', emoji: '🌱', desc: 'Plantou a primeira semente.', room: 'Horta' },
  { id: 'colheita', name: 'Primeira colheita', emoji: '🧺', desc: 'Colheu uma planta da horta.', room: 'Horta' },
  { id: 'colecao', name: 'Horta variada', emoji: '🌻', desc: 'Colheu 5 espécies diferentes.', room: 'Horta' },
];

/** data em que cada conquista foi obtida (ou ausente) */
export function earned(of: Of, waterGoal: number): Map<string, string> {
  const m = new Map<string, string>();
  const first = (dates: string[]) => dates.filter(Boolean).sort()[0];
  const nth = (dates: string[], n: number) => dates.filter(Boolean).sort()[n - 1];
  const put = (id: string, d: string | undefined) => d && m.set(id, d);

  const water = of('water');
  put('gota', first(water.map((w) => w.date)));
  const perDay = new Map<string, number>();
  for (const w of water) perDay.set(w.date, (perDay.get(w.date) ?? 0) + w.ml);
  const goalDays = [...perDay].filter(([, ml]) => ml >= waterGoal).map(([d]) => d);
  put('hidratada', first(goalDays));
  put('rio', nth(goalDays, 7));
  const made = of('recipe').flatMap((r) => r.made);
  put('chef', first(made));
  put('livro', nth(of('recipe').map((r) => r.createdAt.slice(0, 10)), 5));
  put('cardio1', first(of('cardio').map((x) => x.date)));
  const lifts = of('lift');
  put('ficha', first(lifts.filter((l) => l.complete).map((l) => l.date)));
  const sport = of('sport');
  const allTrain = [...of('cardio').map((x) => x.date), ...lifts.map((x) => x.date), ...sport.map((x) => x.date)];
  put('dez', nth(allTrain, 10));
  put('raquete', first(sport.filter((x) => x.modality !== 'pilates').map((x) => x.date)));
  put('pilates', first(sport.filter((x) => x.modality === 'pilates').map((x) => x.date)));
  const weeks = new Map<string, string[]>();
  for (const d of allTrain) {
    const w = addDays(d, -((fromKey(d).getDay() + 6) % 7));
    weeks.set(w, [...(weeks.get(w) ?? []), d]);
  }
  put('semana', first([...weeks.values()].filter((l) => l.length >= 3).map((l) => l.sort()[2])));
  put('cesta', first(of('purchase').map((p) => p.date)));
  const stock = of('stock');
  const byMonth = new Map<string, { ok: string[]; bad: number }>();
  for (const s of stock) {
    if (!s.closedAt) continue;
    const k = s.closedAt.slice(0, 7);
    const x = byMonth.get(k) ?? { ok: [], bad: 0 };
    if (s.status === 'consumido') x.ok.push(s.closedAt.slice(0, 10));
    if (s.status === 'descartado') x.bad++;
    byMonth.set(k, x);
  }
  put('zero', first([...byMonth.values()].filter((x) => x.ok.length >= 10 && !x.bad).map((x) => x.ok.sort()[9])));
  put('desejo', first(of('wish').map((w) => w.boughtAt ?? '').filter(Boolean)));
  const skinDays = [...new Set(of('skin').filter((s) => s.done.length).map((s) => s.date))];
  put('skin', nth(skinDays, 7));
  put('cabelo', nth(of('hair').map((h) => h.date), 4));
  put('sono', nth(of('sleep').map((s) => s.date), 7));
  const checks = new Map<string, string[]>();
  for (const c of of('hcheck')) checks.set(c.habitId, [...(checks.get(c.habitId) ?? []), c.date]);
  put('habito', first([...checks.values()].map((l) => nth(l, 7))));
  put('habito30', first([...checks.values()].map((l) => nth(l, 30))));
  const plots = of('plot');
  put('semente', first(plots.map((p) => p.plantedAt.slice(0, 10))));
  const harvested = plots.filter((p) => p.harvestedAt);
  put('colheita', first(harvested.map((p) => p.harvestedAt!.slice(0, 10))));
  const firstBySpecies = new Map<string, string>();
  for (const p of harvested.sort((a, b) => a.harvestedAt!.localeCompare(b.harvestedAt!))) if (!firstBySpecies.has(p.species)) firstBySpecies.set(p.species, p.harvestedAt!.slice(0, 10));
  put('colecao', nth([...firstBySpecies.values()], 5));
  return m;
}

export const sumBy = <T,>(list: T[], f: (x: T) => number) => list.reduce((a, x) => a + f(x), 0);
export type { YlDoc };
