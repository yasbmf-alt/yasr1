// Diagnóstico dos simulados: tendência, grandes áreas, temas que voltam a
// cair, motivos de erro e correção pendente. Só lê os registros; as sugestões
// saem dos próprios números (nada é inventado).
import { BIG_AREAS, REASONS, type BigArea, type ErrorReason, type Simulado, type Topic } from '../types';
import { isMistake, normName } from './simErrors';

const pctOf = (c: number | null | undefined, t: number | null | undefined) => (t && c != null ? c / t : null);
const avg = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x != null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

export interface AreaDiag {
  area: BigArea;
  series: (number | null)[]; // % nos últimos simulados (antigo → recente)
  recent: number | null; // média dos 3 últimos
  before: number | null; // média dos 3 anteriores
  all: number | null;
}
export interface RepeatTopic {
  key: string;
  topicId: string | null;
  name: string;
  area: BigArea | null;
  sims: number;
  errors: number;
  last: string;
  pending: boolean; // ainda há ocorrência sem correção concluída
}
export interface ReasonDiag {
  id: ErrorReason;
  label: string;
  n: number;
  share: number;
  tip: string;
}
export interface PlanItem {
  text: string;
  topicId?: string | null;
  kind: 'tema' | 'area' | 'motivo' | 'correcao';
}
export interface SimDiagnosis {
  count: number;
  last: { sim: Simulado; pct: number } | null;
  recent: number | null;
  before: number | null;
  best: number | null;
  series: { sim: Simulado; pct: number }[];
  areas: AreaDiag[];
  weakest: AreaDiag | null;
  repeats: RepeatTopic[];
  reasons: ReasonDiag[];
  classified: number; // erros com motivo marcado
  pendingErrors: number;
  pendingSims: Simulado[];
  plan: PlanItem[];
}

export const REASON_TIP: Record<ErrorReason, string> = {
  conceito: 'Falta de base: volte à teoria (videoaula ou resumo) antes de fazer mais questões do tema.',
  raciocinio: 'O conteúdo existe, mas o caminho falha: faça questões comentadas e escreva o passo a passo da conduta.',
  desatencao: 'Leia o enunciado até o fim, sublinhe "exceto/incorreta" e confira a alternativa antes de marcar.',
  interpretacao: 'Treine identificar o que a questão pede: resuma o caso em uma linha antes de olhar as alternativas.',
  esquecimento: 'Você já sabia e esqueceu: revisões espaçadas e flashcards resolvem isso.',
  tempo: 'Treine com cronômetro e marque para voltar depois as questões que travam.',
};

export function simDiagnosis(sims: Simulado[], topics: Topic[]): SimDiagnosis {
  const sorted = [...sims].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  const series = sorted.map((sim) => ({ sim, pct: pctOf(sim.correct, sim.total) })).filter((x): x is { sim: Simulado; pct: number } => x.pct != null);
  const recent = avg(series.slice(-3).map((x) => x.pct));
  const before = series.length > 3 ? avg(series.slice(-6, -3).map((x) => x.pct)) : null;

  const areas: AreaDiag[] = BIG_AREAS.map((area) => {
    const s = sorted.map((sim) => pctOf(sim.areas?.[area]?.correct, sim.areas?.[area]?.total));
    const filled = s.filter((x) => x != null);
    return {
      area,
      series: s.slice(-8),
      recent: avg(filled.slice(-3)),
      before: filled.length > 3 ? avg(filled.slice(-6, -3)) : null,
      all: avg(filled),
    };
  });
  const withData = areas.filter((a) => a.recent != null);
  const weakest = withData.length > 1 ? [...withData].sort((a, b) => a.recent! - b.recent!)[0] : null;

  // temas errados em mais de um simulado
  const tmap = new Map(topics.map((t) => [t.id, t]));
  const rep = new Map<string, RepeatTopic & { simIds: Set<string> }>();
  for (const sim of sorted)
    for (const g of sim.errors ?? []) {
      if (!isMistake(g) || !g.count) continue;
      const t = g.topicId ? tmap.get(g.topicId) : null;
      const name = t?.name ?? g.subject?.trim();
      if (!name) continue;
      const key = t?.id ?? `n:${normName(name)}`;
      const r = rep.get(key) ?? { key, topicId: t?.id ?? null, name, area: g.area ?? null, sims: 0, errors: 0, last: '', pending: false, simIds: new Set<string>() };
      r.simIds.add(sim.id);
      r.errors += g.count;
      if (sim.date > r.last) r.last = sim.date;
      if ((g.status ?? 'nao') !== 'corrigido') r.pending = true;
      rep.set(key, r);
    }
  const repeats = [...rep.values()]
    .map(({ simIds, ...r }) => ({ ...r, sims: simIds.size }))
    .filter((r) => r.sims > 1)
    .sort((a, b) => b.sims - a.sims || b.errors - a.errors || b.last.localeCompare(a.last));

  // motivos (um por erro quando há itens; senão os motivos do grupo)
  const rc = new Map<ErrorReason, number>();
  let classified = 0;
  let pendingErrors = 0;
  for (const sim of sorted)
    for (const g of sim.errors ?? []) {
      if (!isMistake(g)) continue;
      if ((g.status ?? 'nao') !== 'corrigido') pendingErrors += g.count;
      if (g.items?.length) {
        for (const it of g.items)
          if (it.reason) {
            rc.set(it.reason, (rc.get(it.reason) ?? 0) + 1);
            classified++;
          }
      } else if (g.reasons.length) {
        for (const r of g.reasons) rc.set(r, (rc.get(r) ?? 0) + g.count);
        classified += g.count;
      }
    }
  const totalR = [...rc.values()].reduce((a, b) => a + b, 0);
  const reasons = [...rc.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id, n]) => ({ id, label: REASONS.find((x) => x.id === id)?.label ?? id, n, share: totalR ? n / totalR : 0, tip: REASON_TIP[id] }));

  const pendingSims = [...sorted].reverse().filter((s) => !s.correctionDoneAt && (s.errors ?? []).some(isMistake));

  // plano: no máximo 4 passos, do mais concreto para o mais geral
  const plan: PlanItem[] = [];
  for (const r of repeats.filter((x) => x.pending).slice(0, 2))
    plan.push({ kind: 'tema', topicId: r.topicId, text: `Corrigir e revisar ${r.name}: caiu errado em ${r.sims} simulados (${r.errors} erros).` });
  if (weakest && recent != null && weakest.recent! < recent - 0.03)
    plan.push({ kind: 'area', text: `Dar prioridade a ${AREA_NAME[weakest.area]}: ${Math.round(weakest.recent! * 100)}% nos últimos simulados, ${Math.round((recent - weakest.recent!) * 100)} p.p. abaixo da sua média.` });
  if (reasons[0] && reasons[0].share >= 0.3 && classified >= 5)
    plan.push({ kind: 'motivo', text: `${Math.round(reasons[0].share * 100)}% dos erros são de ${reasons[0].label.toLowerCase()}. ${reasons[0].tip}` });
  if (pendingSims.length && plan.length < 4)
    plan.push({ kind: 'correcao', text: `Terminar a correção de ${pendingSims.length === 1 ? pendingSims[0].name : `${pendingSims.length} simulados`} (${pendingErrors} erro${pendingErrors === 1 ? '' : 's'} sem correção concluída).` });

  return {
    count: sorted.length,
    last: series.at(-1) ?? null,
    recent,
    before,
    best: series.length ? Math.max(...series.map((x) => x.pct)) : null,
    series: series.slice(-10),
    areas,
    weakest,
    repeats,
    reasons,
    classified,
    pendingErrors,
    pendingSims,
    plan: plan.slice(0, 4),
  };
}

export const AREA_NAME: Record<BigArea, string> = { clinica: 'Clínica', cirurgia: 'Cirurgia', pediatria: 'Pediatria', go: 'GO', preventiva: 'Preventiva' };
