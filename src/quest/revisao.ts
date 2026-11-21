// Revisão-relâmpago (post-it por questão) e fala do vilão ao acertar.
// Entra pelo Porto como JSON ({ "missions": [ { "trigger_question_id": ..., "review_popup": ...,
// "villain_dialogue_on_correct": ... } ] }) e fica num único documento "yl:yq:revisao",
// indexado pelo id da questão. Não mexe nas questões, no histórico nem nos baralhos.
import type { YqQuestion } from './data';

export const REVISAO_ID = 'yl:yq:revisao';
export interface RevisaoItem {
  qid: string; // id da questão no banco (ex.: "uesm-a-001")
  titulo: string;
  texto: string; // post-it: conceito resumido, sem gabarito
  fala: string; // fala do vilão quando a questão é acertada
  boss?: string;
  flashcards: string[]; // rastreabilidade com o dossiê
  fonte?: string;
}
export interface YqRevisao {
  id: string; kind: 'yq-revisao'; createdAt: string; updatedAt: string; versao: string;
  itens: Record<string, RevisaoItem>;
}
export interface RevisaoImport { doc: YqRevisao | null; associados: string[]; naoEncontrados: string[]; invalidos: string[]; total: number }

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export function isRevisaoPack(raw: unknown): boolean {
  const r = raw as { missions?: unknown[] } | null;
  return !!r && typeof r === 'object' && Array.isArray(r.missions) && r.missions.some((m) => !!(m as { trigger_question_id?: unknown })?.trigger_question_id);
}

export function parseRevisao(raw: unknown, questions: YqQuestion[], existing?: YqRevisao): RevisaoImport {
  const r = raw as { missions: Record<string, unknown>[]; schema_version?: unknown };
  const byQid = new Set(questions.map((q) => q.qid));
  const itens: Record<string, RevisaoItem> = { ...(existing?.itens ?? {}) };
  const res: RevisaoImport = { doc: null, associados: [], naoEncontrados: [], invalidos: [], total: r.missions.length };
  for (const m of r.missions) {
    const qid = str(m.trigger_question_id);
    const pop = (m.review_popup ?? {}) as Record<string, unknown>;
    const texto = str(pop.text); const fala = str(m.villain_dialogue_on_correct);
    if (!qid || !texto || !fala) { res.invalidos.push(qid || '(sem id)'); continue; }
    // só associa ao id exato; o que não existe no banco fica de fora (nunca vai para outra questão)
    if (!byQid.has(qid)) { res.naoEncontrados.push(qid); continue; }
    itens[qid] = {
      qid, titulo: str(pop.title) || 'Revisão-relâmpago', texto, fala,
      ...(str(m.boss) ? { boss: str(m.boss) } : {}),
      flashcards: Array.isArray(m.source_flashcard_ids) ? (m.source_flashcard_ids as unknown[]).map(str).filter(Boolean) : [],
      ...(str(m.source_file) ? { fonte: str(m.source_file) } : {}),
    };
    res.associados.push(qid);
  }
  const now = new Date().toISOString();
  if (res.associados.length) res.doc = { id: REVISAO_ID, kind: 'yq-revisao', createdAt: existing?.createdAt ?? now, updatedAt: now, versao: str(r.schema_version) || '1', itens };
  return res;
}
