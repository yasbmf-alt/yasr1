import type { DataSnapshot, MimoType, RewardImage, Voucher } from '../types';
import { DEFAULT_MIMOS } from '../types';
import { diffDays, today, uid } from './dates';

const LAST_IMG = 'yasr1-last-reward-img';

/** sorteia uma imagem ativa da coleção, evitando repetir a última */
export function pickRewardImage(images: RewardImage[] | undefined): RewardImage | null {
  const act = (images ?? []).filter((i) => i.active);
  if (!act.length) return null;
  let last: string | null = null;
  try {
    last = localStorage.getItem(LAST_IMG);
  } catch {
    /* ignore */
  }
  const pool = act.length > 1 ? act.filter((i) => i.id !== last) : act;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  try {
    localStorage.setItem(LAST_IMG, pick.id);
  } catch {
    /* ignore */
  }
  return pick;
}

export const mimoTypes = (d: DataSnapshot): MimoType[] => d.settings.mimos?.length ? d.settings.mimos : DEFAULT_MIMOS;

/**
 * Sorteio raro de um vale de mimo. Respeita o intervalo mínimo desde o último
 * vale, a chance configurada e não repete o mimo anterior.
 */
export function rollMimo(d: DataSnapshot, source: string, opts: { force?: boolean; only?: string } = {}): Voucher | null {
  const active = mimoTypes(d).filter((m) => m.active && (!opts.only || m.id === opts.only));
  if (!active.length) return null;
  const sorted = [...d.vouchers].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  const last = sorted[0];
  if (!opts.force) {
    if (last && diffDays(today(), last.receivedAt.slice(0, 10)) < (d.settings.mimoMinDays ?? 14)) return null;
    if (Math.random() >= (d.settings.mimoChance ?? 0.3)) return null;
  }
  const pool = active.length > 1 && last ? active.filter((m) => m.id !== last.mimoId) : active;
  const m = pool[Math.floor(Math.random() * pool.length)];
  return {
    id: uid(), mimoId: m.id, emoji: m.emoji, name: m.name, message: m.message, receivedAt: new Date().toISOString(),
    status: 'disponivel', usedAt: null, source,
  };
}
