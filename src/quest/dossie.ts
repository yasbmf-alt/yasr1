// Dossiês de missão: conteúdo de estudo de cada ilha (resumo-mestre, story, falas do
// Dr. Bigodes, flashcards e mapa de recuperação). Entram pelo Porto como JSON
// ({ "tipo": "yq-dossies", "dossies": [...] }) e ficam na coleção "meta" com id
// "yl:yq:dossie:<slug>". Sem IA no app: tudo é conteúdo pronto, ligado às questões
// já cadastradas pelo id (ex.: "uesm-a-001").
import { islandOf, type YqQuestion, type Zona } from './data';

export type DossieBloco =
  | { t: 'p' | 'li'; texto: string; nivel?: number }
  | { t: 'h'; texto: string }
  | { t: 'tabela'; cab: string[]; linhas: string[][] };
export interface DossieSecao { titulo: string; zona?: Zona; blocos: DossieBloco[] }
export interface DossieCard { id: string; subtopico: string; pergunta: string; resposta: string; zonas: Zona[]; ref?: string }
export interface DossieFalas {
  apresentacao: string[]; // 1. apresentação da missão
  problema: string[]; // 2. introdução do problema clínico
  preparacao: string[]; // 3. preparação para a batalha
  transicao: string[]; // 4. da revisão para o combate
  acerto: string[]; // 5
  erro: string[]; // 6
  erroRepetido: { subtopico: string; fala: string; cartoes: string[] }[]; // 7
  durante: string[]; // 8. comentários durante a batalha
  derrota: string[]; // 9
  vitoria: string[]; // 10
  recuperacao: string[]; // 11. convite para recuperação
}
export interface DossieMapa {
  subtopicos: Record<string, string[]>;
  zonas: Partial<Record<Zona, string[]>>;
  questoes: Record<string, { cartoes: string[]; assunto?: string }>; // chave = id da questão no banco
}
export interface YqDossie {
  id: string; // yl:yq:dossie:<slug>
  kind: 'yq-dossie';
  createdAt: string;
  updatedAt: string;
  versao: 1;
  tema: string;
  ilha: string; // nome da ilha na história
  resumo: DossieSecao[];
  story: string[];
  dialogos: DossieFalas;
  flashcards: DossieCard[];
  mapa: DossieMapa;
  referencias: string[];
}

export const dossieId = (tema: string) => `yl:yq:dossie:${islandOf(tema)?.slug ?? tema}`;
/** id fixo da carta no FSRS: importar de novo não duplica nem zera a revisão */
export const dossieCardId = (tema: string, cardId: string) => `yqfc-${islandOf(tema)?.slug ?? 'x'}-${cardId}`;

const ZONAS: Zona[] = ['diagnostico', 'tratamento', 'conduta', 'mecanismo', 'pegadinha'];
const FALAS: (keyof Omit<DossieFalas, 'erroRepetido'>)[] = ['apresentacao', 'problema', 'preparacao', 'transicao', 'acerto', 'erro', 'durante', 'derrota', 'vitoria', 'recuperacao'];
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const strs = (v: unknown) => (Array.isArray(v) ? v.map(str).filter(Boolean) : []);
const zonas = (v: unknown) => strs(v).map((z) => z.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')).filter((z): z is Zona => (ZONAS as string[]).includes(z));

export interface DossieImport { ok: YqDossie[]; out: { tema: string; why: string }[]; avisos: string[] }

/** reconhece o pacote de dossiês (ou um dossiê solto) */
export function isDossiePack(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  const r = raw as Record<string, unknown>;
  return r.tipo === 'yq-dossies' || Array.isArray(r.dossies) || (typeof r.tema === 'string' && Array.isArray(r.flashcards));
}

export function parseDossies(raw: unknown, questions: YqQuestion[], existing: YqDossie[]): DossieImport {
  const res: DossieImport = { ok: [], out: [], avisos: [] };
  const r = raw as Record<string, unknown>;
  const list = Array.isArray(r.dossies) ? r.dossies : [r];
  const byQid = new Map(questions.map((q) => [q.qid, q]));
  const now = new Date().toISOString();
  for (const o of list as Record<string, unknown>[]) {
    const tema = str(o?.tema);
    if (!islandOf(tema)) { res.out.push({ tema: tema || '(sem tema)', why: 'o tema não é uma das 14 ilhas' }); continue; }
    const cards: DossieCard[] = [];
    const seen = new Set<string>();
    for (const c of (Array.isArray(o.flashcards) ? o.flashcards : []) as Record<string, unknown>[]) {
      const id = str(c.id); const pergunta = str(c.pergunta); const resposta = str(c.resposta);
      if (!id || !pergunta || !resposta || seen.has(id)) { res.avisos.push(`${islandOf(tema)!.short}: cartão ${id || '?'} ignorado (vazio ou repetido)`); continue; }
      seen.add(id);
      cards.push({ id, subtopico: str(c.subtopico) || 'Geral', pergunta, resposta, zonas: zonas(c.zonas), ...(str(c.ref) ? { ref: str(c.ref) } : {}) });
    }
    const only = (ids: unknown) => strs(ids).filter((x) => seen.has(x));
    const m = (o.mapa ?? {}) as Record<string, Record<string, unknown>>;
    const questoes: DossieMapa['questoes'] = {};
    for (const [k, v] of Object.entries(m.questoes ?? {})) {
      const qid = k.trim().split(/\s+/)[0];
      const val = Array.isArray(v) ? { cartoes: v } : (v as { cartoes?: unknown; assunto?: unknown });
      const q = byQid.get(qid);
      if (!q) res.avisos.push(`${islandOf(tema)!.short}: a questão ${qid} ainda não está no banco (o mapa fica guardado para quando ela chegar)`);
      else if (q.tema !== tema) res.avisos.push(`${islandOf(tema)!.short}: a questão ${qid} é de outro tema (${q.tema})`);
      questoes[qid] = { cartoes: only(val.cartoes), ...(str(val.assunto) ? { assunto: str(val.assunto) } : {}) };
    }
    const d = (o.dialogos ?? {}) as Record<string, unknown>;
    const falas = Object.fromEntries(FALAS.map((k) => [k, strs(d[k])])) as unknown as DossieFalas;
    falas.erroRepetido = ((Array.isArray(d.erroRepetido) ? d.erroRepetido : []) as Record<string, unknown>[])
      .map((e) => ({ subtopico: str(e.subtopico), fala: str(e.fala), cartoes: only(e.cartoes) })).filter((e) => e.fala);
    const prev = existing.find((x) => x.tema === tema);
    res.ok.push({
      id: dossieId(tema), kind: 'yq-dossie', createdAt: prev?.createdAt ?? now, updatedAt: now, versao: 1,
      tema, ilha: str(o.ilha) || islandOf(tema)!.short,
      resumo: (Array.isArray(o.resumo) ? o.resumo : []) as DossieSecao[],
      story: strs(o.story), dialogos: falas, flashcards: cards,
      mapa: {
        subtopicos: Object.fromEntries(Object.entries(m.subtopicos ?? {}).map(([k, v]) => [k, only(v)])),
        zonas: Object.fromEntries(Object.entries(m.zonas ?? {}).filter(([k]) => (ZONAS as string[]).includes(k)).map(([k, v]) => [k, only(v)])),
        questoes,
      },
      referencias: strs(o.referencias),
    });
  }
  return res;
}

/** cartões de recuperação para as questões erradas: primeiro os do mapa da questão,
 *  depois (se a questão não estiver no mapa) os da zona. Sem repetir. */
export function recoveryCards(d: YqDossie, wrong: { qid: string; zona?: Zona }[]): DossieCard[] {
  const byId = new Map(d.flashcards.map((c) => [c.id, c]));
  const ids: string[] = [];
  for (const w of wrong) {
    const viaQ = d.mapa.questoes[w.qid]?.cartoes;
    ids.push(...(viaQ?.length ? viaQ : w.zona ? d.mapa.zonas[w.zona] ?? [] : []));
  }
  return [...new Set(ids)].map((id) => byId.get(id)).filter(Boolean) as DossieCard[];
}

// ── falas contextualizadas: escolhe a fala que mais "conversa" com a questão ──

const STOP = new Set('para pela pelo pelos pelas com sem uma umas uns que qual quais como mais menos você voce isso essa esse esta este aqui ali onde quando porque entre sobre depois antes ainda também tambem muito pouco cada todo toda todos todas outro outra nunca sempre nada'.split(' '));
const tokens = (s: string) => new Set(
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9,/ ]/g, ' ').split(/\s+/)
    .map((w) => w.replace(/^,+|,+$/g, '')).filter((w) => (/\d/.test(w) ? w.length >= 1 : w.length >= 4) && !STOP.has(w)),
);
/** fala com mais palavras/números em comum com o contexto (mínimo 2 pontos; números valem 2) */
export function bestLine(lines: string[], context: string, min = 2): string | null {
  const ctx = tokens(context);
  let best: string | null = null; let score = 0;
  for (const l of lines) {
    let s = 0;
    for (const w of tokens(l)) if (ctx.has(w)) s += /\d/.test(w) ? 2 : 1;
    if (s > score) { score = s; best = l; }
  }
  return score >= min ? best : null;
}
