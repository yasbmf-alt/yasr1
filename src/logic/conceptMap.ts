// Mapa conceitual: árvore de nós livres (cada nó guarda a própria posição).
// Um mapa por tema; o tema é a raiz. Nada aqui inventa conteúdo.
import type { ConceptMap, MapColor, MapNode, Topic } from '../types';
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
