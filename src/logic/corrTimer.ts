// Cronômetro da correção de simulado. Guarda só o tempo ativo, separado por
// dia (o trecho que passa da meia-noite é dividido), para cada dia contar no
// total diário e na sequência. Tempo pausado nunca entra.
import type { CorrectionTimer } from '../types';
import { toKey } from './dates';

export const emptyTimer = (): CorrectionTimer => ({ runningSince: null, days: {} });

/** soma um trecho ativo [from, to) nos dias em que ele aconteceu */
function addSpan(days: Record<string, number>, from: number, to: number) {
  const out = { ...days };
  let a = from;
  while (a < to) {
    const d = new Date(a);
    const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
    const b = Math.min(to, midnight);
    const k = toKey(d);
    out[k] = (out[k] ?? 0) + (b - a);
    a = b;
  }
  return out;
}

export const timerMs = (t: CorrectionTimer | undefined, now = Date.now()) =>
  !t ? 0 : Object.values(t.days).reduce((a, b) => a + b, 0) + (t.runningSince ? Math.max(0, now - new Date(t.runningSince).getTime()) : 0);

export const startTimer = (t: CorrectionTimer | undefined, now = Date.now()): CorrectionTimer => ({ ...(t ?? emptyTimer()), runningSince: new Date(now).toISOString() });

export function pauseTimer(t: CorrectionTimer | undefined, now = Date.now()): CorrectionTimer {
  if (!t?.runningSince) return t ?? emptyTimer();
  return { runningSince: null, days: addSpan(t.days, new Date(t.runningSince).getTime(), now) };
}

/**
 * Minutos por dia para registrar ao finalizar. Se a pessoa ajustar o total,
 * a diferença vai para o último dia (o tempo nunca fica negativo).
 */
export function minutesByDay(t: CorrectionTimer, total?: number): [string, number][] {
  const rows = Object.entries(t.days).filter(([, ms]) => ms > 0).sort(([a], [b]) => a.localeCompare(b)).map(([d, ms]) => [d, Math.round(ms / 60000)] as [string, number]);
  if (total == null) return rows.filter(([, m]) => m > 0);
  const sum = rows.reduce((a, [, m]) => a + m, 0);
  if (!rows.length) return total > 0 ? [[toKey(new Date()), total]] : [];
  let diff = total - sum;
  for (let i = rows.length - 1; i >= 0 && diff !== 0; i--) {
    const next = Math.max(0, rows[i][1] + diff);
    diff -= next - rows[i][1];
    rows[i][1] = next;
  }
  return rows.filter(([, m]) => m > 0);
}

export function fmtClock(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${h ? `${h}:` : ''}${String(m).padStart(h ? 2 : 1, '0')}:${String(ss).padStart(2, '0')}`;
}
