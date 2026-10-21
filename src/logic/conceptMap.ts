// Mapa conceitual: árvore de nós livres (cada nó guarda a própria posição).
// Cada simulado tem um mapa (simulado → grandes áreas → temas). Nada aqui inventa conteúdo.
import type { BigArea, ConceptMap, MapColor, MapNode, Simulado, Topic } from '../types';
import { BIG_AREAS } from '../types';
import { uid } from './dates';

export const NODE_W = 200; // largura de referência para posicionar nós novos
export const NODE_H = 44;

export function emptyMap(topic: Topic): ConceptMap {
  const rootId = uid();
  return { rootId, nodes: [{ id: rootId, parentId: null, title: topic.name, x: 0, y: 0, color: 'azul' }], updatedAt: new Date().toISOString() };
}

export const childrenOf = (nodes: MapNode[], id: string) => nodes.filter((n) => n.parentId === id).sort((a, b) => a.y - b.y || a.x - b.x);

export function descendants(nodes: MapNode[], id: string): Set<string> {
  const out = new Set<string>();
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const n of nodes) if (n.parentId === cur && !out.has(n.id)) { out.add(n.id); stack.push(n.id); }
  }
  return out;
}

/** nós visíveis: some tudo abaixo de um nó recolhido */
export function visibleNodes(nodes: MapNode[]): MapNode[] {
  const hidden = new Set<string>();
  for (const n of nodes) if (n.collapsed) for (const d of descendants(nodes, n.id)) hidden.add(d);
  return nodes.filter((n) => !hidden.has(n.id));
}

export type Size = { w: number; h: number };
const sz = (sizes: Map<string, Size>, id: string) => sizes.get(id) ?? { w: NODE_W, h: NODE_H };

/** posição para um filho novo: à direita do pai, abaixo dos irmãos */
export function childSpot(nodes: MapNode[], parent: MapNode, sizes: Map<string, Size>) {
  const kids = childrenOf(nodes, parent.id);
  const ps = sz(sizes, parent.id);
  const left = kids.length > 0 && kids.every((k) => k.x < parent.x);
  const x = kids.length ? kids[0].x : parent.x + ps.w + 70;
  if (!kids.length) return { x: left ? parent.x - NODE_W - 70 : x, y: parent.y + ps.h / 2 - NODE_H / 2 };
  const last = kids.reduce((a, b) => (b.y + sz(sizes, b.id).h > a.y + sz(sizes, a.id).h ? b : a));
  return { x, y: last.y + sz(sizes, last.id).h + 18 };
}

export function newNode(p: Partial<MapNode> & { parentId: string | null; x: number; y: number }): MapNode {
  return { id: uid(), title: '', ...p };
}

/** organiza a partir da raiz: galhos para a direita, irmãos empilhados sem sobrepor */
export function tidy(nodes: MapNode[], rootId: string, sizes: Map<string, Size>): MapNode[] {
  const pos = new Map<string, { x: number; y: number }>();
  const GAP_X = 70;
  const GAP_Y = 16;
  const height = (id: string): number => {
    const n = nodes.find((x) => x.id === id);
    const own = sz(sizes, id).h;
    if (!n || n.collapsed) return own;
    const kids = childrenOf(nodes, id);
    if (!kids.length) return own;
    const sum = kids.reduce((a, k) => a + height(k.id), 0) + GAP_Y * (kids.length - 1);
    return Math.max(own, sum);
  };
  const place = (id: string, x: number, top: number) => {
    const n = nodes.find((v) => v.id === id)!;
    const h = height(id);
    const own = sz(sizes, id);
    pos.set(id, { x, y: top + h / 2 - own.h / 2 });
    if (n.collapsed) return;
    let y = top;
    for (const k of childrenOf(nodes, id)) {
      const kh = height(k.id);
      place(k.id, x + own.w + GAP_X, y);
      y += kh + GAP_Y;
    }
  };
  const root = nodes.find((n) => n.id === rootId);
  if (!root) return nodes;
  place(rootId, root.x, root.y + sz(sizes, rootId).h / 2 - height(rootId) / 2);
  return nodes.map((n) => (pos.has(n.id) ? { ...n, ...pos.get(n.id)! } : n));
}

export const MAP_COLORS: { id: MapColor; label: string; bg: string; line: string }[] = [
  { id: 'neutro', label: 'Branco', bg: '#FFFFFF', line: '#D9D2E0' },
  { id: 'azul', label: 'Azul', bg: '#E8F1FF', line: '#8FB2E8' },
  { id: 'rosa', label: 'Rosa', bg: '#FDEBF6', line: '#EE9CCB' },
  { id: 'lilas', label: 'Lilás', bg: '#F2EBFF', line: '#B9A0EE' },
  { id: 'lima', label: 'Verde', bg: '#F1F8DA', line: '#AFCB62' },
  { id: 'manteiga', label: 'Amarelo', bg: '#FFF8D8', line: '#E6C95E' },
  { id: 'pessego', label: 'Pêssego', bg: '#FFEDEC', line: '#F2A2A6' },
];
export const colorOf = (c: MapColor | undefined) => MAP_COLORS.find((x) => x.id === c) ?? MAP_COLORS[0];

// ── Mapa do simulado: simulado → grandes áreas → temas errados ──

const AREA_COLOR: Record<BigArea, MapColor> = { clinica: 'rosa', cirurgia: 'azul', pediatria: 'manteiga', go: 'lilas', preventiva: 'lima' };
const AREA_LABEL: Record<BigArea, string> = { clinica: 'Clínica Médica', cirurgia: 'Cirurgia', pediatria: 'Pediatria', go: 'Ginecologia e Obstetrícia', preventiva: 'Preventiva' };

/** chave do tema de um grupo de erros (o tema, ou o próprio grupo quando não há tema) */
export const refOf = (g: { topicId?: string | null; id: string }) => g.topicId ?? `g:${g.id}`;

/** tamanho aproximado de um nó pelo texto (antes de medir na tela) */
const guess = (nodes: MapNode[]) => new Map(nodes.map((n) => [n.id, { w: Math.min(260, 34 + n.title.length * 7.4), h: n.title.length > 30 ? 58 : 40 }]));

/** copia os ramos de um mapa antigo do tema para baixo de um nó (com ids novos) */
function cloneBranches(src: ConceptMap, under: string): MapNode[] {
  const ids = new Map<string, string>();
  const out: MapNode[] = [];
  const walk = (id: string, parent: string) => {
    for (const k of childrenOf(src.nodes, id)) {
      const nid = uid();
      ids.set(k.id, nid);
      out.push({ ...k, id: nid, parentId: parent });
      walk(k.id, nid);
    }
  };
  walk(src.rootId, under);
  return out;
}

/**
 * Cria o mapa do simulado ou acrescenta o que falta (áreas e temas novos).
 * Nunca apaga nem muda o que a pessoa escreveu. Devolve null se nada mudou.
 */
export function syncSimMap(sim: Simulado, topics: Topic[]): ConceptMap | null {
  const fresh = !sim.map;
  const map: ConceptMap = sim.map
    ? { ...sim.map, nodes: [...sim.map.nodes] }
    : { rootId: uid(), nodes: [], updatedAt: '' };
  if (fresh) map.nodes.push({ id: map.rootId, parentId: null, title: sim.name, x: 0, y: 0, color: 'azul' });
  let changed = fresh;
  const tmap = new Map(topics.map((t) => [t.id, t]));
  for (const a of BIG_AREAS) {
    const groups = (sim.errors ?? []).filter((g) => g.area === a);
    let an = map.nodes.find((n) => n.area === a);
    if (!an) {
      const sib = map.nodes.filter((n) => n.parentId === map.rootId);
      const y = sib.length ? Math.max(...sib.map((n) => n.y)) + 60 : 0;
      an = { id: uid(), parentId: map.rootId, title: AREA_LABEL[a], x: 260, y, color: AREA_COLOR[a], area: a };
      map.nodes.push(an);
      changed = true;
    }
    const seen = new Set<string>();
    for (const g of groups) {
      const ref = refOf(g);
      if (seen.has(ref) || map.nodes.some((n) => n.ref === ref)) continue;
      seen.add(ref);
      const t = g.topicId ? tmap.get(g.topicId) : null;
      const kids = childrenOf(map.nodes, an.id);
      const last = kids.at(-1);
      const tn: MapNode = {
        id: uid(), parentId: an.id, title: t?.name ?? (g.subject?.trim() || 'Sem tema'),
        x: an.x + 300, y: last ? last.y + 56 : an.y, color: AREA_COLOR[a], ref,
      };
      map.nodes.push(tn);
      // quem já tinha começado um mapa no próprio tema não perde nada
      if (t?.map && t.map.nodes.length > 1) map.nodes.push(...cloneBranches(t.map, tn.id));
      changed = true;
    }
  }
  if (!changed) return null;
  const nodes = fresh ? tidy(map.nodes, map.rootId, guess(map.nodes)) : map.nodes;
  return { ...map, nodes, updatedAt: new Date().toISOString() };
}

/** onde um tema aparece nos mapas dos simulados */
export function topicInSimMaps(sims: Simulado[], topicId: string) {
  const out: { sim: Simulado; nodeId: string }[] = [];
  for (const s of sims) {
    const n = s.map?.nodes.find((x) => x.ref === topicId);
    if (n) out.push({ sim: s, nodeId: n.id });
  }
  return out.sort((a, b) => b.sim.date.localeCompare(a.sim.date));
}
