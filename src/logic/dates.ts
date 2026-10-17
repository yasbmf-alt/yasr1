// Datas sempre como 'YYYY-MM-DD' no fuso local, para evitar deslocamentos de UTC.

export const pad = (n: number) => String(n).padStart(2, '0');

export const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const fromKey = (k: string) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const today = () => toKey(new Date());

export const addDays = (k: string, n: number) => {
  const d = fromKey(k);
  d.setDate(d.getDate() + n);
  return toKey(d);
};

export const diffDays = (a: string, b: string) =>
  Math.round((fromKey(a).getTime() - fromKey(b).getTime()) / 86400000);

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const MESES_LONGOS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];
export const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

export const fmtShort = (k: string | null | undefined) => {
  if (!k) return '—';
  const d = fromKey(k);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
};

export const fmtLong = (k: string | null | undefined) => {
  if (!k) return '—';
  const d = fromKey(k);
  return `${d.getDate()} de ${MESES_LONGOS[d.getMonth()]}`;
};

export const fmtRange = (a: string, b: string) => {
  const da = fromKey(a);
  const db = fromKey(b);
  if (da.getMonth() === db.getMonth()) return `${da.getDate()}–${db.getDate()} ${MESES[db.getMonth()]}`;
  return `${da.getDate()} ${MESES[da.getMonth()]} – ${db.getDate()} ${MESES[db.getMonth()]}`;
};

export const fmtMinutes = (m: number | null | undefined) => {
  if (m == null) return '—';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h${pad(r)}` : `${h}h`;
};

export const relDay = (k: string | null) => {
  if (!k) return '—';
  const d = diffDays(k, today());
  if (d === 0) return 'hoje';
  if (d === 1) return 'amanhã';
  if (d === -1) return 'ontem';
  if (d > 1 && d < 7) return `em ${d} dias`;
  if (d < -1 && d > -7) return `há ${-d} dias`;
  return fmtShort(k);
};

/** Segunda-feira da semana de k */
export const weekStart = (k: string) => {
  const d = fromKey(k);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return toKey(d);
};

export type Season = 'primavera' | 'verao' | 'outono' | 'inverno';

/** Estações do hemisfério sul */
export const seasonOf = (d = new Date()): Season => {
  const m = d.getMonth();
  if (m >= 8 && m <= 10) return 'primavera';
  if (m === 11 || m <= 1) return 'verao';
  if (m >= 2 && m <= 4) return 'outono';
  return 'inverno';
};

export const SEASON_LABEL: Record<Season, string> = {
  primavera: 'Primavera',
  verao: 'Verão',
  outono: 'Outono',
  inverno: 'Inverno',
};

export const uid = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)
  ).replace(/[^a-zA-Z0-9-]/g, '');
