// Yas Quest — o "cérebro" do jogo: ilhas, zonas, chefões, rota da maratona,
// domínio por zona, montagem das ondas, importação do Porto e falas do Doutor Bigode.
// Os documentos ficam na coleção "meta" com id "yl:yq:..." (mesmo canal da antiga
// Yasland), então sincronizam e entram no backup sem tabela nova.
import { today, addDays } from '../logic/dates';

export type Zona = 'diagnostico' | 'tratamento' | 'conduta' | 'mecanismo' | 'pegadinha';
export type Regiao = 'resp' | 'emerg' | 'mente' | 'cuidado';
export type Deboche = 'fofo' | 'acido' | 'sem';
export type Why = 'naosabia' | 'confundi' | 'pegadinha' | 'desatencao';

export interface Attempt { at: string; pick: string; ok: boolean; why?: Why }
export interface YqQuestion {
  id: string; // yl:yq:q:<qid>
  kind: 'yq-q';
  createdAt: string;
  qid: string;
  tema: string;
  zona: Zona;
  prioridade: number;
  origem: string;
  enunciado: string;
  alternativas: Record<string, string>;
  gabarito: string;
  comentario: string;
  hist: Attempt[];
  cardId?: string | null;
}
export interface IslandCfg { pdfId?: string | null; page?: number | null; pages?: Partial<Record<Zona, number>> }
export interface PdfRef { id: string; name: string; url?: string; assetId?: string }
export interface Visit { estudar?: boolean; batalha?: boolean; grimorio?: boolean }
export interface YqState {
  id: 'yl:yq:state';
  kind: 'yq-state';
  createdAt: string;
  xp: number;
  coins: number;
  owned: string[];
  wear: { hat?: string; boat?: string; cat?: string };
  deboche: Deboche;
  pdfs: PdfRef[];
  islands: Record<string, IslandCfg>;
  visits: Record<string, Record<string, Visit>>; // data → tema → etapas
  family: Record<string, boolean>; // data → modo dia com família
  skipped: Record<string, string[]>; // data → ilhas puladas (vão pro fim)
  decks: Record<string, string>; // tema → baralho das cartas de feitiço
  bossesBeaten: string[];
  bestCombo: number;
  waves: number;
  nightShown?: Record<string, boolean>;
  missions?: Record<string, MissionProg>; // data:tema → progresso da missão (modo história)
  introDay?: string; // dia em que a abertura do Bigode já foi vista
  historia?: Record<string, string>; // capítulos do modo história já assistidos (tema → data)
}

export const STATE_ID = 'yl:yq:state';
export const emptyState = (): YqState => ({
  id: STATE_ID, kind: 'yq-state', createdAt: new Date().toISOString(), xp: 0, coins: 0, owned: [], wear: {}, deboche: 'acido',
  pdfs: [], islands: {}, visits: {}, family: {}, skipped: {}, decks: {}, bossesBeaten: [], bestCombo: 0, waves: 0,
});

// ── Mundo ──────────────────────────────────────────────────────

export const ZONAS: { id: Zona; nome: string; lugar: string; emoji: string; valor: number }[] = [
  { id: 'diagnostico', nome: 'Diagnóstico', lugar: 'Floresta do Diagnóstico', emoji: '🔍', valor: 3 },
  { id: 'tratamento', nome: 'Tratamento', lugar: 'Vila do Tratamento', emoji: '💊', valor: 3 },
  { id: 'conduta', nome: 'Conduta', lugar: 'Torre da Conduta', emoji: '🚨', valor: 3 },
  { id: 'mecanismo', nome: 'Mecanismo', lugar: 'Caverna do Mecanismo', emoji: '⚙️', valor: 2 },
  { id: 'pegadinha', nome: 'Pegadinha', lugar: 'Pântano das Pegadinhas', emoji: '🪤', valor: 2 },
];
export const zonaOf = (z: Zona) => ZONAS.find((x) => x.id === z)!;

export const REGIOES: { id: Regiao; nome: string; emoji: string; mar: string }[] = [
  { id: 'resp', nome: 'Região Respiratória', emoji: '🫁', mar: '#cfe4ff' },
  { id: 'emerg', nome: 'Região Emergência', emoji: '🚑', mar: '#ffd9dc' },
  { id: 'mente', nome: 'Região Mente', emoji: '🧠', mar: '#e9d8ff' },
  { id: 'cuidado', nome: 'Região Cuidado', emoji: '🕯️', mar: '#fff3b0' },
];

export interface Island {
  tema: string; short: string; slug: string; regiao: Regiao; prio: number; banco: number;
  boss: string; bossAntigo?: string; bossEmoji: string; capital?: boolean; serious?: boolean; gentle?: boolean;
  taunts: string[];
}
export const ISLANDS: Island[] = [
  { tema: 'SRAG', short: 'SRAG', slug: 'srag', regiao: 'resp', prio: 3, banco: 8, boss: 'Dragão Hipoxêmico', bossAntigo: 'Dragão Hipoxêmico', bossEmoji: '🐉', capital: true,
    taunts: ['Sua PEEP é tão baixa quanto suas chances!', 'Volume corrente pelo peso real? Hehehe.', 'PaO₂/FiO₂ de 90 é leve, né? Confia.'] },
  { tema: 'Insuficiência respiratória', short: 'Insuf. respiratória', slug: 'ir', regiao: 'resp', prio: 3, banco: 9, boss: 'Saturaldo', bossAntigo: 'Fantasma Sem Fôlego', bossEmoji: '👻',
    taunts: ['Tipo I ou tipo II? Buuu… nem eu sei.', 'Shunt ou V/Q? Escolhe rápido, tô sem ar!'] },
  { tema: 'Distúrbios do equilíbrio acidobásico', short: 'Acidobásico', slug: 'acido', regiao: 'resp', prio: 3, banco: 10, boss: 'pHantasminha', bossAntigo: 'Alquimista do pH', bossEmoji: '⚗️',
    taunts: ['pH normal? Então tá tudo normal… ou não?', 'Calculou o ânion gap? Eu escondi o cloro.'] },
  { tema: 'Ventilação mecânica e traqueostomia', short: 'Ventilação mecânica', slug: 'vm', regiao: 'resp', prio: 2, banco: 7, boss: 'PEEP Vader', bossAntigo: 'Maestro do Ventilador', bossEmoji: '🎛️',
    taunts: ['Desmame hoje? Só se passar no meu teste.', 'Platô acima de 30 e tá tudo bem, relaxa.'] },
  { tema: 'Vias aéreas básica e avançada', short: 'Vias aéreas', slug: 'va', regiao: 'resp', prio: 2, banco: 8, boss: 'Glotilda', bossAntigo: 'Serpente da Glote', bossEmoji: '🐍',
    taunts: ['Não intubo, não oxigeno… e agora?', 'Sssequência rápida? Qual droga primeiro?'] },
  { tema: 'Intoxicações exógenas agudas', short: 'Intoxicações', slug: 'tox', regiao: 'emerg', prio: 3, banco: 11, boss: 'Toxana', bossAntigo: 'Bruxa do Caldeirão', bossEmoji: '🧙‍♀️',
    taunts: ['Pele seca ou suada? Hihihi, adivinha!', 'Qual antídoto? Tem um no meu caldeirão… talvez.'] },
  { tema: 'Lesão renal aguda', short: 'LRA', slug: 'lra', regiao: 'emerg', prio: 3, banco: 10, boss: 'Golem da Creatinina', bossAntigo: 'Golem de Creatinina', bossEmoji: '🗿',
    taunts: ['Pré, renal ou pós? Eu sou feito de creatinina!', 'FeNa? Nunca ouvi falar. Nem você, aposto.'] },
  { tema: 'PCR: BLS, ACLS e PALS', short: 'PCR', slug: 'pcr', regiao: 'emerg', prio: 2, banco: 7, boss: 'Robô Sem Pulso', bossAntigo: 'Robô Sem Pulso', bossEmoji: '🤖',
    taunts: ['Me dá choque em AESP, vai… confia.', 'Amiodarona 300 de novo? Bip bop.'] },
  { tema: 'Drogas vasoativas', short: 'Drogas vasoativas', slug: 'dva', regiao: 'emerg', prio: 2, banco: 7, boss: 'Noradrenalinda', bossAntigo: 'Vampiro da Noradrenalina', bossEmoji: '🧛',
    taunts: ['Quero sua pressão arterial… em mcg/kg/min.', 'Vasopressina antes da nora? Que ousadia.'] },
  { tema: 'Psicofarmacologia: antidepressivos', short: 'Antidepressivos', slug: 'ad', regiao: 'mente', prio: 3, banco: 11, boss: 'Polvo Serotoninérgico', bossAntigo: 'Polvo Serotonina', bossEmoji: '🐙',
    taunts: ['Tricíclico ou ISRS? Tenho 8 braços e 8 efeitos colaterais.', 'Trocou o remédio na primeira semana? Hehe.'] },
  { tema: 'Emergências em psiquiatria', short: 'Emergências psiq.', slug: 'ep', regiao: 'mente', prio: 3, banco: 10, boss: 'Tempestoso', bossAntigo: 'Tempestade da Crise', bossEmoji: '⛈️', serious: true,
    taunts: ['Avalie o risco com calma.', 'Segurança do paciente primeiro.'] },
  { tema: 'Psicopatologia e exame do estado mental', short: 'Psicopatologia', slug: 'pp', regiao: 'mente', prio: 2, banco: 9, boss: 'Espelho Distorcente', bossAntigo: 'Espelho Distorcido', bossEmoji: '🪞',
    taunts: ['Ilusão ou alucinação? Olha bem pro espelho.', 'Delírio é ideia… ou percepção? Hihi.'] },
  { tema: 'Esquizofrenia e transtornos psicóticos', short: 'Psicóticos', slug: 'psi', regiao: 'mente', prio: 2, banco: 8, boss: 'Rei das Vozes', bossAntigo: 'Senhor dos Critérios', bossEmoji: '🎭',
    taunts: ['1 mês, 6 meses… quanto tempo mesmo?', 'Esquizoafetivo ou esquizofrenia com humor? Hmm.'] },
  { tema: 'Cuidados paliativos e manejo da dor', short: 'Paliativos', slug: 'pal', regiao: 'cuidado', prio: 2, banco: 9, boss: 'Guardiã Guerreira', bossAntigo: 'Guardiã da Lamparina', bossEmoji: '🕯️', gentle: true,
    taunts: ['Vou iluminar o caminho. Vamos com cuidado.', 'Conforto também é tratamento.'] },
];
export const islandOf = (tema: string) => ISLANDS.find((i) => i.tema === tema);
export const FINAL = '__final__';
export const REVANCHE = '__revanche__';

// ── Rota da maratona (fila, sem horário) ───────────────────────
// * = cai primeiro no "dia com família"
export const ROUTES: Record<string, { temas: string[]; family: string[]; label: string }> = {
  '2026-11-21': { label: 'Sábado', family: [], temas: ['SRAG', 'Insuficiência respiratória', 'Ventilação mecânica e traqueostomia', 'Distúrbios do equilíbrio acidobásico', 'PCR: BLS, ACLS e PALS', 'Drogas vasoativas', 'Lesão renal aguda', 'Intoxicações exógenas agudas'] },
  '2026-11-22': { label: 'Domingo', family: ['Vias aéreas básica e avançada', 'Cuidados paliativos e manejo da dor'], temas: ['Psicofarmacologia: antidepressivos', 'Emergências em psiquiatria', 'Psicopatologia e exame do estado mental', 'Esquizofrenia e transtornos psicóticos', 'Vias aéreas básica e avançada', 'Cuidados paliativos e manejo da dor', REVANCHE] },
  '2026-11-23': { label: 'Segunda', family: [], temas: [FINAL] },
};
export const EXAM = { date: '2026-11-23', start: '14:00', end: '16:00', freezeAfter: '11:00' };

/** rota do dia: puladas vão pro fim; no modo família as marcadas com * caem */
export function routeOf(st: YqState, day = today()) {
  const r = ROUTES[day];
  if (!r) return null;
  const fam = !!st.family[day];
  const skipped = st.skipped[day] ?? [];
  let list = r.temas.filter((t) => !(fam && r.family.includes(t)));
  list = [...list.filter((t) => !skipped.includes(t)), ...list.filter((t) => skipped.includes(t))];
  return { ...r, list, fam };
}
export const visitDone = (v: Visit | undefined, tema: string) => (tema === FINAL || tema === REVANCHE ? !!v?.batalha : !!(v?.estudar && v?.batalha && v?.grimorio));

/** segunda depois das 11h: nada novo */
export function frozen(now = new Date()) {
  const d = today();
  const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return d === EXAM.date && hm >= EXAM.freezeAfter;
}

// ── Domínio ────────────────────────────────────────────────────

export type Nivel = 'vazia' | 'neblina' | 'explorada' | 'defendida' | 'dominada';
export const NIVEL: Record<Nivel, { nome: string; emoji: string; n: number }> = {
  vazia: { nome: 'Neblina eterna', emoji: '🌫️', n: 0 },
  neblina: { nome: 'Neblina', emoji: '🌫️', n: 0 },
  explorada: { nome: 'Explorada', emoji: '🌱', n: 1 },
  defendida: { nome: 'Defendida', emoji: '🛡️', n: 2 },
  dominada: { nome: 'Dominada', emoji: '👑', n: 3 },
};
const DAY = 86400000;
export const last = (q: YqQuestion) => q.hist[q.hist.length - 1];

export interface ZoneStat { zona: Zona; total: number; answered: number; okNow: number; acc: number; cov: number; nivel: Nivel; alerta: boolean; lastAt: number | null; score: number }
export function zoneStat(qs: YqQuestion[], zona: Zona, now = Date.now()): ZoneStat {
  const list = qs.filter((q) => q.zona === zona);
  const answered = list.filter((q) => q.hist.length);
  const okNow = answered.filter((q) => last(q).ok).length;
  const acc = answered.length ? okNow / answered.length : 0;
  const cov = list.length ? answered.length / list.length : 0;
  const all = list.flatMap((q) => q.hist).sort((a, b) => a.at.localeCompare(b.at));
  const lastAt = all.length ? new Date(all[all.length - 1].at).getTime() : null;
  const recent = all.slice(-3);
  const alerta = (recent.length >= 2 && recent.filter((a) => !a.ok).length >= 2) || (answered.length >= 2 && acc < 0.5);
  // dominar pede volume: zona com poucas questões continua pedindo reforço
  let nivel: Nivel = !list.length ? 'vazia' : !answered.length ? 'neblina' : answered.length >= 3 && cov >= 0.8 && acc >= 0.8 ? 'dominada' : answered.length >= 2 && cov >= 0.5 && acc >= 0.6 ? 'defendida' : 'explorada';
  // neblina que volta: zona esquecida há 4 dias desce um nível
  if (lastAt && now - lastAt > 4 * DAY && (nivel === 'dominada' || nivel === 'defendida')) nivel = nivel === 'dominada' ? 'defendida' : 'explorada';
  return { zona, total: list.length, answered: answered.length, okNow, acc, cov, nivel, alerta, lastAt, score: cov * acc };
}
export function islandStat(qs: YqQuestion[], now = Date.now()) {
  const zones = ZONAS.map((z) => zoneStat(qs, z.id, now));
  const w = ZONAS.reduce((a, z) => a + z.valor, 0);
  const pct = zones.reduce((a, s, i) => a + s.score * ZONAS[i].valor, 0) / w;
  const answered = qs.filter((q) => q.hist.length).length;
  const fog = answered === 0;
  const alerts = zones.filter((z) => z.alerta);
  const empty = zones.filter((z) => z.nivel === 'vazia');
  return { zones, pct, answered, total: qs.length, fog, alerts, empty, conquered: zones.every((z) => z.nivel === 'dominada' || z.nivel === 'vazia') && answered > 0 };
}

// ── Ondas ──────────────────────────────────────────────────────

const shuffle = <T,>(a: T[]) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const wrongNow = (q: YqQuestion) => q.hist.length > 0 && !last(q).ok;
const DOSE = /\b\d+([.,]\d+)?\s*(mg|mcg|µg|g|ml|mL|UI|U)(\/(kg|min|h|dia))*\b|\bdose\b/i;
export const isDose = (q: YqQuestion) => DOSE.test(q.enunciado) || Object.values(q.alternativas).some((a) => DOSE.test(a));

/** onda de uma ilha (ou de uma zona): inéditas primeiro, depois revanches; o chefão por último */
export function buildWave(pool: YqQuestion[], size = 7): YqQuestion[] {
  if (!pool.length) return [];
  const fresh = shuffle(pool.filter((q) => !q.hist.length));
  const wrong = shuffle(pool.filter(wrongNow));
  const rest = pool.filter((q) => q.hist.length && last(q).ok).sort((a, b) => last(a).at.localeCompare(last(b).at));
  // chefão: uma que você já errou; senão uma pegadinha; senão qualquer uma
  const boss = wrong[0] ?? fresh.find((q) => q.zona === 'pegadinha') ?? fresh[0] ?? rest[0];
  const body = [...fresh, ...wrong, ...rest].filter((q) => q.id !== boss.id).slice(0, size - 1);
  return [...body, boss];
}
/** Ilha Final: SRAG + revanches + doses de todas as ilhas */
export function buildFinal(all: YqQuestion[]): YqQuestion[] {
  const srag = all.filter((q) => q.tema === 'SRAG');
  const sragPick = [...shuffle(srag.filter((q) => !q.hist.length || wrongNow(q))), ...shuffle(srag.filter((q) => q.hist.length && last(q).ok))].slice(0, 5);
  const used = new Set(sragPick.map((q) => q.id));
  const rev = shuffle(all.filter((q) => wrongNow(q) && !used.has(q.id))).slice(0, 5);
  rev.forEach((q) => used.add(q.id));
  const dose = shuffle(all.filter((q) => isDose(q) && !used.has(q.id))).slice(0, 4);
  const boss = sragPick.shift();
  return [...shuffle([...sragPick, ...rev, ...dose]), ...(boss ? [boss] : [])];
}
export function buildRevanche(all: YqQuestion[]) {
  const wrong = shuffle(all.filter(wrongNow));
  return wrong.slice(0, 10);
}

// ── Pontos ─────────────────────────────────────────────────────

export const xpFor = (q: YqQuestion, revanche: boolean, boss: boolean) => (zonaOf(q.zona).valor * 10 + (q.prioridade >= 3 ? 10 : 0)) * (revanche ? 2 : 1) + (boss ? 50 : 0);
export const levelOf = (xp: number) => Math.floor(Math.sqrt(xp / 60)) + 1;
export const levelXp = (lv: number) => (lv - 1) * (lv - 1) * 60;

// ── Porto (importação) ─────────────────────────────────────────

const ZONA_OK: Zona[] = ['diagnostico', 'tratamento', 'conduta', 'mecanismo', 'pegadinha'];
const normZona = (z: unknown): Zona | null => {
  const n = String(z ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  return (ZONA_OK as string[]).includes(n) ? (n as Zona) : null;
};
export interface ImportResult { ok: YqQuestion[]; out: { id: string; why: string }[]; perTema: Record<string, number> }
export function parseImport(text: string, existing: Map<string, YqQuestion>): ImportResult {
  const res: ImportResult = { ok: [], out: [], perTema: {} };
  let raw: unknown;
  const t = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try { raw = JSON.parse(t); } catch (e) {
    res.out.push({ id: '(arquivo)', why: `não é um JSON válido: ${(e as Error).message.slice(0, 120)}` });
    return res;
  }
  const list = Array.isArray(raw) ? raw : raw && typeof raw === 'object' && Array.isArray((raw as { questoes?: unknown }).questoes) ? (raw as { questoes: unknown[] }).questoes : null;
  if (!list) { res.out.push({ id: '(arquivo)', why: 'o JSON precisa ser uma lista [ … ] de questões' }); return res; }
  const seen = new Set<string>();
  list.forEach((o, i) => {
    const r = (o ?? {}) as Record<string, unknown>;
    const qid = String(r.id ?? '').trim() || `sem-id-${i + 1}`;
    const fail = (why: string) => res.out.push({ id: qid, why });
    if (!r.id) return fail('sem "id"');
    if (seen.has(qid)) return fail('id repetido no arquivo');
    const tema = String(r.tema ?? '').trim();
    if (!islandOf(tema)) return fail(`tema "${tema}" não é uma das 14 ilhas`);
    const zona = normZona(r.zona);
    if (!zona) return fail(`zona "${String(r.zona ?? '')}" inválida`);
    const alts = r.alternativas && typeof r.alternativas === 'object' ? Object.fromEntries(Object.entries(r.alternativas as Record<string, unknown>).map(([k, v]) => [k.trim().toUpperCase(), String(v ?? '').trim()]).filter(([, v]) => v)) : {};
    if (Object.keys(alts).length < 2) return fail('menos de 2 alternativas');
    const gab = String(r.gabarito ?? '').trim().toUpperCase().replace(/[^A-Z]/g, '');
    if (!gab || !alts[gab]) return fail(`gabarito "${String(r.gabarito ?? '')}" não bate com as alternativas`);
    const enun = String(r.enunciado ?? '').trim();
    if (enun.length < 5) return fail('enunciado vazio');
    seen.add(qid);
    const prev = existing.get(qid);
    const prio = Number(r.prioridade) >= 3 ? 3 : 2;
    res.ok.push({
      id: `yl:yq:q:${qid}`, kind: 'yq-q', createdAt: prev?.createdAt ?? new Date().toISOString(), qid, tema, zona, prioridade: prio,
      origem: String(r.origem ?? '').trim() || 'inédita', enunciado: enun, alternativas: alts, gabarito: gab,
      comentario: String(r.comentario ?? '').trim(), hist: prev?.hist ?? [], cardId: prev?.cardId ?? null,
    });
    res.perTema[tema] = (res.perTema[tema] ?? 0) + 1;
  });
  return res;
}
export const isOld = (q: YqQuestion) => !!q.origem && !/in[eé]dita/i.test(q.origem);

export const SAMPLE = JSON.stringify([
  { id: 'uesm-a-031', tema: 'SRAG', zona: 'conduta', prioridade: 3, origem: '2025.2 ROT.1-12T Q.17',
    enunciado: 'Mulher de 46 anos, previamente hígida, com febre alta há 2 dias, tosse seca, mialgia intensa, dispneia progressiva e SpO₂ 89% em ar ambiente. FR 32 irpm, uso de musculatura acessória, infiltrado bilateral difuso. Colhido RT-PCR para SARS-CoV-2 e outros vírus. Está na emergência geral, com outros pacientes em observação. Considerando suspeita de SRAG por agente de alta transmissibilidade, qual a conduta inicial mais adequada?',
    alternativas: { A: 'Manter em observação com máscara cirúrgica e aguardar o RT-PCR para iniciar isolamento.', B: 'Antibiótico empírico, gasometria e O₂ por cateter nasal comum, sem isolamento respiratório imediato.', C: 'Internar direto na UTI e iniciar ventilação mecânica invasiva, sem necessidade de notificação imediata.', D: 'Isolamento respiratório com precauções de aerossóis, notificar imediatamente e iniciar oxigenoterapia conforme necessidade.' },
    gabarito: 'D', comentario: 'Suspeita de SRAG por agente de alta transmissibilidade: isolar já (aerossol, sem esperar exame), notificar imediatamente (notificação compulsória) e dar suporte de O₂ conforme a necessidade. Esperar o PCR para isolar é a pegadinha.' },
  { id: 'uesm-a-028', tema: 'SRAG', zona: 'diagnostico', prioridade: 3, origem: '2025.2 ROT.3-14T Q.7',
    enunciado: 'Homem de 45 anos com pneumonia viral piora mesmo em máscara com reservatório (FiO₂ 0,60). Gasometria: pH 7,47, PaCO₂ 31, PaO₂ 58. Opacidades bilaterais difusas; ecocardiograma com função preservada. Qual a conduta mais indicada?',
    alternativas: { A: 'Manter máscara e repetir gasometria em 1 h: SDRA leve (PaO₂/FiO₂ > 200).', B: 'Cateter nasal de alto fluxo antes de pensar em intubação: SDRA moderada (100–200).', C: 'Intubação e ventilação mecânica protetora: SDRA grave (PaO₂/FiO₂ < 100).', D: 'Não há SDRA, pois o infiltrado não atinge 75% dos campos.' },
    gabarito: 'C', comentario: 'PaO₂/FiO₂ = 58/0,6 ≈ 97 → SDRA grave pela classificação de Berlim (≤ 100). Origem não cardiogênica (eco normal) e infiltrado bilateral fecham o critério. Conduta: IOT e ventilação protetora (VC 4–6 mL/kg do peso predito).' },
  { id: 'uesm-a-001', tema: 'PCR: BLS, ACLS e PALS', zona: 'tratamento', prioridade: 2, origem: '2024.2 ROT.1-14T Q.29',
    enunciado: 'Homem de 50 anos no pós-operatório de artroplastia de quadril evolui com dor torácica, dispneia súbita e depois irresponsividade sem pulso. Monitor: assistolia confirmada (cabos, ganho e derivação checados). Qual medicação deve ser administrada?',
    alternativas: { A: 'Atropina 1 mg.', B: 'Lidocaína 1 a 1,5 mg/kg.', C: 'Epinefrina 1 mg.', D: 'Sulfato de magnésio 2 g.' },
    gabarito: 'C', comentario: 'Assistolia é ritmo não chocável: RCP + epinefrina 1 mg IV/IO o quanto antes, a cada 3–5 min. Atropina saiu do algoritmo de PCR. Lembrar das causas reversíveis — aqui, TEP pós-operatório.' },
], null, 2);

/** pedido pronto para a IA gerar questões de reforço de uma zona */
export function reforcoPrompt(tema: string, zona: Zona | null, n = 10) {
  const z = zona ? zonaOf(zona) : null;
  const slug = islandOf(tema)?.slug ?? 'tema';
  return `Crie ${n} questões INÉDITAS de múltipla escolha, nível prova de internato de Urgência e Emergência / Saúde Mental, sobre o tema "${tema}"${z ? `, todas focadas em ${z.nome.toUpperCase()} (${z.id === 'pegadinha' ? 'detalhes, números, exceções e "exceto"' : z.id === 'mecanismo' ? 'fisiopatologia e mecanismos' : z.id === 'conduta' ? 'o que fazer agora e a ordem das condutas' : z.id === 'tratamento' ? 'drogas, doses e primeira escolha' : 'reconhecer o quadro e critérios diagnósticos'})` : ', variando entre diagnóstico, tratamento, conduta, mecanismo e pegadinha'}.
Casos clínicos curtos, 4 alternativas (A a D), uma só correta, com pegadinhas plausíveis, e comentário explicando por que a certa é certa e por que as outras estão erradas.

Responda SÓ com um JSON (lista), sem texto antes ou depois, exatamente neste formato:
[
  { "id": "ined-${slug}-${zona ?? 'mix'}-01", "tema": "${tema}", "zona": "${zona ?? 'diagnostico'}", "prioridade": ${islandOf(tema)?.prio ?? 2},
    "origem": "inédita",
    "enunciado": "...", "alternativas": {"A":"...","B":"...","C":"...","D":"..."},
    "gabarito": "B", "comentario": "..." }
]
Regras: "tema" exatamente "${tema}"; "zona" uma de: diagnostico, tratamento, conduta, mecanismo, pegadinha (sem acento); ids únicos numerados (…-01, …-02…).`;
}

// ── Doutor Bigode ──────────────────────────────────────────────

type Ctx = 'abrir' | 'acerto' | 'erro' | 'combo' | 'desmaio' | 'onda-boa' | 'onda-ruim' | 'pegadinha' | 'noite' | 'ilha' | 'reforco' | 'loja';
const LINES: Record<Deboche, Record<Ctx, string[]>> = {
  fofo: {
    abrir: ['Oi, Yas! Bora conquistar umas ilhas? 🐾', 'Eu separei um café pra você. Vamos?'],
    acerto: ['Isso! Mandou bem 💛', 'Acertou! Orgulho.'],
    erro: ['Tudo bem, errar aqui é melhor que errar na prova 💛', 'Lê o grimório com calma, você pega essa.'],
    combo: ['Que sequência linda!', 'Tá voando hoje!'],
    desmaio: ['Respira, toma uma água. Depois a gente volta.'],
    'onda-boa': ['Onda vencida! Que orgulho de você.'],
    'onda-ruim': ['Ondas difíceis ensinam mais. Bora pro grimório?'],
    pegadinha: ['Essa pegadinha era malvada mesmo. Agora você conhece ela.'],
    noite: ['Rota cumprida! Vai curtir sua noite 💛'],
    ilha: ['Ilha nova! Calma e foco.'],
    reforco: ['Essa zona precisa de reforço. Chama a IA!'],
    loja: ['Ficou uma graça!'],
  },
  acido: {
    abrir: ['Ah, você voltou. A prova é segunda, caso tenha esquecido.', 'Eu já desisti de você umas 3 vezes hoje. Vamos lá.', 'As ilhas não vão se conquistar sozinhas. Eu verifiquei.'],
    acerto: ['Acertou. Anotei, caso ninguém acredite.', 'Olha só. Estudou mesmo.'],
    erro: ['Hm. O professor ia adorar essa resposta.', 'Errou. O Dragão mandou um beijo.', 'Lê o grimório antes que eu conte pra todo mundo.'],
    combo: ['…tá, admito. Você tá impossível hoje.', 'Quem é você e o que fez com a Yasmim?'],
    desmaio: ['Desmaiou depois de um plantão de 36h. Clássico.'],
    'onda-boa': ['Onda vencida. Não se acostume com elogio.'],
    'onda-ruim': ['Essa onda foi… uma experiência. Grimório, agora.'],
    pegadinha: ['Caiu na pegadinha? Tá fazendo coleção?'],
    noite: ['Rota cumprida. Vai lá ver o namorado, eu fico vigiando as ilhas.'],
    ilha: ['Mais uma ilha. Tente não afundar o barco.'],
    reforco: ['Essa zona tá sendo invadida e você aí parada.'],
    loja: ['Gastou moeda com chapéu. Prioridades.'],
  },
  sem: {
    abrir: ['Não quer passar não, porra? Bora.', 'A R1 não vai cair do céu. Senta e joga.'],
    acerto: ['Até que enfim, caralho.', 'Acertou. Milagre registrado.'],
    erro: ['Puta merda, Yasmim.', 'Errou essa? Na segunda o professor não vai ter dó.', 'Sério isso? Grimório. Agora.'],
    combo: ['Caralho, quem tá jogando por você?', 'Tá possuída hoje, hein.'],
    desmaio: ['Morreu. Levanta, toma café e volta, porra.'],
    'onda-boa': ['Mandou bem pra cacete. Não vai se achar.'],
    'onda-ruim': ['Que onda horrorosa. Vai pro grimório e para de chorar.'],
    pegadinha: ['Caiu na pegadinha de novo? Puta que pariu.'],
    noite: ['Cumpriu a rota. Agora sim pode ir namorar, porra.'],
    ilha: ['Ilha nova. Não me faz passar vergonha.'],
    reforco: ['Essa zona tá apanhando feio. Chama a IA, caramba.'],
    loja: ['Comprou chapéu. A R1 agradece. Só que não.'],
  },
};
const SERIOUS: Partial<Record<Ctx, string>> = {
  abrir: 'Aqui a gente vai com calma e cuidado.',
  acerto: 'Correto. Segurança do paciente primeiro.',
  erro: 'Revise o comentário com atenção.',
  combo: 'Ótima sequência.',
  desmaio: 'Pausa, respira, e volte quando puder.',
  'onda-boa': 'Onda concluída.',
  'onda-ruim': 'Vale revisar o grimório desta ilha.',
  pegadinha: 'Esse detalhe é importante. Revise.',
  ilha: 'Tema sério: foco em conduta e segurança.',
  reforco: 'Esta zona pede reforço.',
};
export function bigode(level: Deboche, ctx: Ctx, serious = false): string {
  if (serious && SERIOUS[ctx]) return SERIOUS[ctx]!;
  const l = LINES[level][ctx];
  return l[Math.floor(Math.random() * l.length)];
}

// ── Loja ───────────────────────────────────────────────────────

export const SHOP: { id: string; slot: 'hat' | 'boat' | 'cat'; emoji: string; nome: string; preco: number }[] = [
  { id: 'hat-laco', slot: 'hat', emoji: '🎀', nome: 'Laço', preco: 20 },
  { id: 'hat-capelo', slot: 'hat', emoji: '🎓', nome: 'Capelo de R1', preco: 40 },
  { id: 'hat-flor', slot: 'hat', emoji: '🌸', nome: 'Flor no cabelo', preco: 25 },
  { id: 'hat-coroa', slot: 'hat', emoji: '👑', nome: 'Coroa', preco: 90 },
  { id: 'boat-pato', slot: 'boat', emoji: '🦆', nome: 'Barco-pato', preco: 25 },
  { id: 'boat-lancha', slot: 'boat', emoji: '🚤', nome: 'Lancha', preco: 45 },
  { id: 'boat-navio', slot: 'boat', emoji: '🛳️', nome: 'Navio de cruzeiro', preco: 110 },
  { id: 'cat-oculos', slot: 'cat', emoji: '🕶️', nome: 'Óculos escuros do Bigode', preco: 30 },
  { id: 'cat-cartola', slot: 'cat', emoji: '🎩', nome: 'Cartola do Bigode', preco: 55 },
];
export const wearEmoji = (st: YqState, slot: 'hat' | 'boat' | 'cat') => SHOP.find((s) => s.id === st.wear[slot])?.emoji ?? (slot === 'boat' ? '⛵' : '');

export const dayLabel = (d: string) => ROUTES[d]?.label ?? d;
export const tomorrow = () => addDays(today(), 1);

// ══ Modo história ══════════════════════════════════════════════

export type Step = 'chamado' | 'dojo' | 'arena' | 'cicatrizes' | 'chefao' | 'oraculo' | 'fim';
export interface Res { id: string; ok: boolean; pick: string; why?: Why }
export interface MissionProg {
  step: Step;
  dojoStart?: string | null; // ISO de quando começou a leitura
  dojoMin?: number; // minutos registrados de leitura
  dojoPausedAt?: string | null; // pausado desde (ISO); null = rodando
  dojoPausedMs?: number; // tempo total já pausado
  arena?: string[]; // ids das questões da arena
  aRes?: Res[];
  arenaStart?: string | null;
  boss?: string[]; // fila do chefão (errou → volta pro fim)
  bRes?: Res[];
  wins?: number;
}
export const missionKey = (tema: string, day = today()) => `${day}:${tema}`;

/** fala do Bigode ao apresentar cada missão */
export const CHAMADO: Record<string, string[]> = {
  SRAG: ['Missão: SRAG. O professor JUROU que caem 3 questões. Eu chamo isso de presente com laço.', 'Lembra: PaO₂/FiO₂ abaixo de 100 não é "levinha". É o dragão acordado.'],
  'Insuficiência respiratória': ['Insuficiência respiratória. Respira fundo. Literalmente, que ajuda.', 'Tipo I, tipo II, mista… parece nome de sorvete, mas cai na prova.'],
  'Distúrbios do equilíbrio acidobásico': ['Acidobásico: onde a gasometria mente e só a fórmula de Winter fala a verdade.', 'Se o pH tá normal e o resto tá doido, desconfia. Eu desconfio de tudo.'],
  'Ventilação mecânica e traqueostomia': ['Ventilação mecânica. Hoje você é a máquina. Platô abaixo de 30, combinado?', 'Desmame: o paciente precisa passar no teste. Você também.'],
  'Vias aéreas básica e avançada': ['Vias aéreas. "Não intubo, não oxigeno": decora isso como se fosse seu CPF.', 'Hoje tem sequência rápida. De estudo, no caso.'],
  'Intoxicações exógenas agudas': ['Intoxicações. Pele seca ou suada? Pupila grande ou pequena? Eu sou um gato, eu vejo tudo.', 'Cada veneno tem seu antídoto. O seu é estudar.'],
  'Lesão renal aguda': ['LRA: pré, renal ou pós. Tipo novela, só que com creatinina.', 'FeNa abaixo de 1%… guarda esse número no bolso do jaleco.'],
  'PCR: BLS, ACLS e PALS': ['PCR. Se o ritmo não choca, você não choca. Simples assim.', 'Adrenalina a cada 3 a 5 min. Café a cada 45, no seu caso.'],
  'Drogas vasoativas': ['Drogas vasoativas. Noradrenalina primeiro, drama depois.', 'mcg/kg/min: a unidade que separa a R1 de "quase R1".'],
  'Psicofarmacologia: antidepressivos': ['Antidepressivos. Tricíclico, IMAO, ISRS… parece sigla de banco, mas é ponto na prova.', 'Lembra: antidepressivo leva semanas. Paciência com ele e com você.'],
  'Emergências em psiquiatria': ['Emergências em psiquiatria. Aqui a gente vai com calma e cuidado: avaliação de risco e segurança primeiro.'],
  'Psicopatologia e exame do estado mental': ['Psicopatologia. Ilusão tem objeto, alucinação não. Eu sou real, juro.', 'Exame do estado mental: o checklist que o professor ama.'],
  'Esquizofrenia e transtornos psicóticos': ['Transtornos psicóticos. Hoje é dia de decorar tempo de duração. 1 mês, 6 meses… anota.', 'Esquizoafetivo x esquizofrenia: a pegadinha preferida do professor.'],
  'Cuidados paliativos e manejo da dor': ['Paliativos e dor. Conforto também é tratamento. Escada da OMS, degrau por degrau… ou não.'],
};
export const DOJO_NAGS = [
  'Tá lendo ou tá no Instagram? Eu sei de tudo.',
  'Grifa só o que cai, não o livro inteiro.',
  'Água. Agora. Médica desidratada não passa.',
  'Se bater sono, levanta e lê em pé. Eu fico olhando.',
  'Anota a pegadinha quando achar uma. Elas voltam.',
  'Lembra: depois daqui tem arena. Estuda com raiva.',
];
export const CICATRIZ_LINE = (n: number) =>
  n === 0 ? 'Zero cicatrizes?! Quem é você e o que fez com a Yasmim?'
    : n === 1 ? '1 cicatriz. Charme, quase.'
      : n <= 3 ? `${n} cicatrizes. Tô montando um álbum.`
        : `${n} cicatrizes. Ainda bem que foi aqui e não segunda.`;
export const WIN_LINES = ['Chefão no chão. Eu sempre acreditei em você. (Mentira, mas agora acredito.)', 'YOU WIN! Pode comemorar por 30 segundos. Contei.', 'Vitória. O professor nem sabe o que vem por aí.'];
export const INTRO = (dias: number) => [
  'Ah, finalmente. Já tava achando que você ia fazer a prova só com fé e PEEP baixa.',
  `${dias <= 0 ? 'A prova é HOJE' : dias === 1 ? 'A prova é amanhã' : `Faltam ${dias} dias pra prova`}: Urgência e Emergência e Saúde Mental. 14 temas. Um dragão. E você.`,
  'Regras do jogo: primeiro o Dojo (leitura), depois a Arena (questões), as Cicatrizes (seus erros), o Chefão e o Oráculo.',
  'Vamos nos preparar pra prova?',
];
export const SNOOZE = ['Claro. O professor também vai te dar mais 5 pontinhos. Só que não.', 'Mais 5 minutinhos? Os temas tão aqui, esperando. Igual a sua aprovação.', 'Tô contando. 1… 2… tá bom, bora logo.'];

/** extras do chefão: difíceis do tema fora da arena (pegadinha e já-erradas primeiro) */
export function bossExtras(pool: YqQuestion[], arena: string[], n = 3) {
  const out = pool.filter((q) => !arena.includes(q.id));
  const score = (q: YqQuestion) => (q.hist.some((h) => !h.ok) ? 3 : 0) + (q.zona === 'pegadinha' ? 2 : 0) + (q.hist.length ? 0 : 1);
  return [...out].sort((a, b) => score(b) - score(a)).slice(0, n);
}

/** pedido do Oráculo: questões novas + perguntas e respostas sobre exatamente o que errei */
export function oraculoPrompt(tema: string, wrong: { q: YqQuestion; why?: Why; pick?: string }[]) {
  const WHYTXT: Record<Why, string> = { naosabia: 'não sabia o conteúdo', confundi: 'confundiu com outra coisa', pegadinha: 'caiu numa pegadinha', desatencao: 'errou por desatenção' };
  const slug = islandOf(tema)?.slug ?? 'tema';
  const lista = wrong.length
    ? wrong.map(({ q, why, pick }, i) => `${i + 1}. [${q.zona}] ${q.enunciado.slice(0, 260)}${q.enunciado.length > 260 ? '…' : ''}\n   Marquei ${pick ?? '?'}; a certa era ${q.gabarito}) ${q.alternativas[q.gabarito]}. Motivo: ${why ? WHYTXT[why] : 'não informado'}.`).join('\n')
    : '(não errei nada; reforce os pontos que mais caem e as pegadinhas clássicas do tema)';
  return `Sou estudante de medicina e tenho prova de Urgência e Emergência / Saúde Mental. No tema "${tema}" eu errei estas questões:
${lista}

Crie um REFORÇO focado exatamente no que eu errei (e no motivo do erro), cobrindo também os detalhes vizinhos que o professor pode cobrar.
Responda SÓ com um JSON (objeto), sem texto antes ou depois, neste formato:
{
  "questoes": [
    { "id": "ined-${slug}-01", "tema": "${tema}", "zona": "pegadinha", "prioridade": ${islandOf(tema)?.prio ?? 2}, "origem": "inédita",
      "enunciado": "...", "alternativas": {"A":"...","B":"...","C":"...","D":"..."}, "gabarito": "C", "comentario": "..." }
  ],
  "flashcards": [
    { "pergunta": "...", "resposta": "...", "zona": "tratamento" }
  ]
}
Quero 6 questões de múltipla escolha (casos curtos, nível prova, com pegadinhas plausíveis e comentário) e 10 flashcards de pergunta e resposta CURTA e específica (uma ideia por card).
Regras: "tema" exatamente "${tema}"; "zona" uma de diagnostico, tratamento, conduta, mecanismo, pegadinha (sem acento); ids únicos (…-01, …-02…) e diferentes de reforços anteriores (pode usar a data no id).`;
}

export interface Duel { pergunta: string; resposta: string; zona: Zona }
export function parseOraculo(text: string, existing: Map<string, YqQuestion>) {
  const t = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  let raw: unknown;
  try { raw = JSON.parse(t); } catch (e) { return { error: `não é um JSON válido: ${(e as Error).message.slice(0, 100)}`, q: null as ImportResult | null, duels: [] as Duel[] }; }
  const obj = (Array.isArray(raw) ? { questoes: raw } : raw) as { questoes?: unknown[]; flashcards?: unknown[] };
  const q = Array.isArray(obj.questoes) && obj.questoes.length ? parseImport(JSON.stringify(obj.questoes), existing) : null;
  const duels: Duel[] = (Array.isArray(obj.flashcards) ? obj.flashcards : []).map((f) => {
    const r = (f ?? {}) as Record<string, unknown>;
    return { pergunta: String(r.pergunta ?? r.frente ?? '').trim(), resposta: String(r.resposta ?? r.verso ?? '').trim(), zona: normZona(r.zona) ?? 'pegadinha' };
  }).filter((d) => d.pergunta && d.resposta);
  return { error: null as string | null, q, duels };
}
