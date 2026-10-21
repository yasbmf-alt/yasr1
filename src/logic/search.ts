// Busca da Biblioteca: título do tema, subtópicos e lacunas dos simulados,
// texto do mapa conceitual, lembretes e macetes ligados ao tema.
import type { DataSnapshot, Topic } from '../types';
import { normName } from './simErrors';

export interface SearchHit {
  topic: Topic;
  where: string; // onde achou, para mostrar ao lado do resultado
  text: string;
  nodeId?: string;
  simId?: string; // o nó está no mapa deste simulado
}

const snippet = (text: string, q: string) => {
  const i = normName(text).indexOf(q);
  if (i < 0 || text.length <= 90) return text.slice(0, 90);
  const a = Math.max(0, i - 30);
  return `${a ? '…' : ''}${text.slice(a, a + 90)}${a + 90 < text.length ? '…' : ''}`;
};

export function searchLibrary(d: DataSnapshot, raw: string, limit = 30): SearchHit[] {
  const q = normName(raw);
  if (q.length < 2) return [];
  const has = (s: string | undefined | null) => !!s && normName(s).includes(q);
  const hits: SearchHit[] = [];
  const byTopic = new Map<string, number>();
  const push = (h: SearchHit) => {
    const n = byTopic.get(h.topic.id) ?? 0;
    if (n >= 3) return;
    byTopic.set(h.topic.id, n + 1);
    hits.push(h);
  };
  const tmap = new Map(d.topics.map((t) => [t.id, t]));
  // 1. títulos primeiro
  for (const t of d.topics) if (has(t.name) || has(t.specialty)) push({ topic: t, where: 'Tema', text: t.specialty ? `${t.name} · ${t.specialty}` : t.name });
  // 2. mapa conceitual
  for (const t of d.topics) {
    for (const n of t.map?.nodes ?? []) {
      if (n.id === t.map!.rootId && !has(n.explanation) && !has(n.notes)) continue;
      const field = [n.title, n.explanation, n.notes, ...(n.list ?? [])].find((x) => has(x));
      if (field) push({ topic: t, where: 'Mapa', text: n.title && field !== n.title ? `${n.title}: ${snippet(field, q)}` : snippet(field, q), nodeId: n.id });
    }
  }
  // 2b. mapas dos simulados: o resultado aponta para o tema do ramo
  for (const sim of d.simulados) {
    const nodes = sim.map?.nodes ?? [];
    const byId = new Map(nodes.map((n) => [n.id, n]));
    for (const n of nodes) {
      if (n.ref || n.area || n.id === sim.map!.rootId) continue;
      const field = [n.title, n.explanation, n.notes, ...(n.list ?? [])].find((x) => has(x));
      if (!field) continue;
      let up = n.parentId ? byId.get(n.parentId) : undefined;
      while (up && !up.ref) up = up.parentId ? byId.get(up.parentId) : undefined;
      const t = up?.ref ? tmap.get(up.ref) : null;
      if (t) push({ topic: t, where: 'Mapa', text: n.title && field !== n.title ? `${n.title}: ${snippet(field, q)}` : snippet(field, q), nodeId: n.id, simId: sim.id });
    }
  }
  // 3. subtópicos e lacunas dos simulados
  for (const sim of d.simulados) {
    for (const g of sim.errors ?? []) {
      const t = g.topicId ? tmap.get(g.topicId) : null;
      if (!t) continue;
      if (has(g.subtopic)) push({ topic: t, where: 'Subtópico', text: `${g.subtopic} · ${sim.name}` });
      for (const it of g.items ?? []) if (has(it.gap)) push({ topic: t, where: 'Lacuna', text: snippet(it.gap!, q) });
    }
  }
  // 4. lembretes e macetes
  for (const n of d.notes) {
    const t = n.topicId ? tmap.get(n.topicId) : null;
    if (t && has(n.text)) push({ topic: t, where: 'Lembrete', text: snippet(n.text, q) });
  }
  for (const m of d.macetes) {
    const t = m.topicId ? tmap.get(m.topicId) : null;
    if (t && (has(m.title) || has(m.text))) push({ topic: t, where: 'Macete', text: m.title || snippet(m.text, q) });
  }
  return hits.slice(0, limit);
}
