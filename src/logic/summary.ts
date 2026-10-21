// Resumo escrito gerado a partir do mapa conceitual. Só reorganiza o que a
// pessoa escreveu (títulos, explicações, listas, notas e links), na ordem
// dos ramos: nada é inventado nem completado.
import type { ConceptMap, MapLink } from '../types';
import { childrenOf } from './conceptMap';

export interface SumBlock {
  nodeId: string;
  depth: number; // 0 = tema
  title: string;
  explanation: string;
  list: string[];
  notes: string;
  links: MapLink[];
  images: number;
}

const hasContent = (b: Omit<SumBlock, 'depth' | 'nodeId'>) => !!(b.title || b.explanation || b.list.length || b.notes || b.links.length || b.images);

/** resumo a partir de um nó (padrão: a raiz, incluindo os nós soltos) */
export function summarize(map: ConceptMap | undefined, fromId?: string): SumBlock[] {
  if (!map) return [];
  const out: SumBlock[] = [];
  const seen = new Set<string>();
  const walk = (id: string, depth: number) => {
    if (seen.has(id)) return;
    seen.add(id);
    const n = map.nodes.find((x) => x.id === id);
    if (!n) return;
    const b = {
      nodeId: n.id, depth, title: n.title.trim(), explanation: n.explanation?.trim() ?? '', list: n.list ?? [], notes: n.notes?.trim() ?? '',
      links: (n.links ?? []).filter((l) => l.url.trim() || l.label.trim()), images: n.images?.length ?? 0,
    };
    const kids = childrenOf(map.nodes, id);
    if (hasContent(b) || kids.length) out.push(b);
    for (const k of kids) walk(k.id, depth + 1);
  };
  walk(fromId ?? map.rootId, 0);
  if (fromId && fromId !== map.rootId) return out;
  // nós soltos (fora da árvore) entram no fim, cada um como uma seção
  const loose = map.nodes.filter((n) => !n.parentId && n.id !== map.rootId).sort((a, b) => a.y - b.y || a.x - b.x);
  for (const n of loose) walk(n.id, 1);
  return out;
}

/** texto do resumo em Markdown ou texto simples */
export function summaryText(blocks: SumBlock[], fmt: 'md' | 'txt'): string {
  const lines: string[] = [];
  for (const b of blocks) {
    const title = b.title || '(sem título)';
    if (fmt === 'md') lines.push(`${'#'.repeat(Math.min(6, b.depth + 1))} ${title}`);
    else lines.push(b.depth === 0 ? title.toUpperCase() : `${'  '.repeat(b.depth - 1)}${b.depth === 1 ? '■' : '•'} ${title}`);
    const pad = fmt === 'txt' ? '  '.repeat(Math.max(0, b.depth)) : '';
    if (b.explanation) lines.push(...b.explanation.split('\n').map((l) => pad + l));
    for (const it of b.list) lines.push(`${pad}- ${it}`);
    if (b.notes) lines.push(...b.notes.split('\n').map((l, i) => `${pad}${fmt === 'md' ? '> ' : i ? '  ' : 'Nota: '}${l}`));
    for (const l of b.links) lines.push(fmt === 'md' ? `${pad}- [${l.label || l.url}](${l.url})` : `${pad}Link: ${l.label ? `${l.label} — ` : ''}${l.url}`);
    if (b.images) lines.push(`${pad}(${b.images} imagem${b.images > 1 ? 'ns' : ''} no mapa)`);
    lines.push('');
  }
  return lines.join('\n').trim() + '\n';
}
