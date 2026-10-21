// Erros detalhados dos simulados: contagem por área, normalização dos grupos
// e vínculo automático com os temas da Biblioteca (sem duplicar temas).
import type { BigArea, ErrorGroup, ErrorReason, MistakeItem, Simulado, Topic } from '../types';
import { uid } from './dates';

export const normName = (s: string) => s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** erros de uma área (total − acertos), ou null se a área não foi preenchida */
export function areaWrong(sim: Simulado, a: BigArea): number | null {
  const sc = sim.areas?.[a];
  return sc?.total != null && sc.correct != null ? Math.max(0, sc.total - sc.correct) : null;
}

export const isMistake = (g: ErrorGroup) => g.kind !== 'revisar';

/** erros já categorizados numa área */
export const categorized = (groups: ErrorGroup[], a: BigArea) =>
  groups.filter((g) => g.area === a && isMistake(g)).reduce((n, g) => n + (g.count || 0), 0);

export const newItem = (p: Partial<MistakeItem> = {}): MistakeItem => ({ id: uid(), question: '', reason: null, gap: '', ...p });

/** garante um item por erro (grupos antigos não tinham itens) */
export function withItems(g: ErrorGroup): ErrorGroup {
  if (!isMistake(g)) return g;
  const items = [...(g.items ?? [])];
  const legacyReason = !g.items && g.reasons.length === 1 ? g.reasons[0] : null;
  while (items.length < g.count) items.push(newItem({ reason: legacyReason }));
  return { ...g, items: items.slice(0, Math.max(0, g.count)) };
}

/** antes de salvar: motivos do grupo = união dos motivos de cada erro */
export function finalizeGroup(g: ErrorGroup): ErrorGroup {
  if (!isMistake(g)) return { ...g, count: 0, reasons: [], items: [] };
  const items = (g.items ?? []).map((it) => ({ ...it, question: it.question?.trim() ?? '', gap: it.gap?.trim() ?? '' }));
  const fromItems = [...new Set(items.map((it) => it.reason).filter((r): r is ErrorReason => !!r))];
  return { ...g, items, reasons: fromItems.length || g.items ? fromItems : g.reasons };
}

/**
 * Liga cada grupo a um tema da Biblioteca: reaproveita o tema com o mesmo nome
 * (sem acento/maiúsculas) e só cria um tema novo quando ele ainda não existe.
 */
export function linkTopics(groups: ErrorGroup[], topics: Topic[]): { groups: ErrorGroup[]; created: Topic[] } {
  const byName = new Map(topics.map((t) => [normName(t.name), t]));
  const created: Topic[] = [];
  const out = groups.map((g) => {
    if (g.topicId && topics.some((t) => t.id === g.topicId)) return g;
    const name = g.subject?.trim();
    if (!name) return { ...g, topicId: null };
    let t = byName.get(normName(name));
    if (!t) {
      t = {
        id: uid(), name, area: g.area ?? 'geral', specialty: '', priority: 'media',
        nextReviewOverride: null, coverAssetId: null, createdAt: new Date().toISOString(),
      };
      byName.set(normName(name), t);
      created.push(t);
    }
    return { ...g, topicId: t.id, subject: t.name };
  });
  return { groups: out, created };
}

/** todas as ocorrências de um tema nos simulados (mais recentes primeiro) */
export function topicOccurrences(sims: Simulado[], topicId: string) {
  const out: { sim: Simulado; group: ErrorGroup }[] = [];
  for (const sim of sims) for (const g of sim.errors ?? []) if (g.topicId === topicId) out.push({ sim, group: g });
  return out.sort((a, b) => b.sim.date.localeCompare(a.sim.date));
}
