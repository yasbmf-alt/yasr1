// Arquipélago dos flashcards: cada especialidade é uma ilha. O baralho vai para
// a ilha pela grande área do tema (psiquiatria e urgência pelo nome/especialidade);
// dentro da ilha, a subárea vem da especialidade do tema (ex.: GO → Obstetrícia).
import type { Area, Deck, Topic } from '../../types';
import arquipelago from '../../assets/fc/arquipelago.webp';
import iPed from '../../assets/fc/ilha-pediatria.webp';
import iCli from '../../assets/fc/ilha-clinica.webp';
import iCir from '../../assets/fc/ilha-cirurgia.webp';
import iGo from '../../assets/fc/ilha-go.webp';
import iPsi from '../../assets/fc/ilha-psiquiatria.webp';
import iPre from '../../assets/fc/ilha-preventiva.webp';
import iUrg from '../../assets/fc/ilha-urgencia.webp';
import iOut from '../../assets/fc/ilha-outros.webp';

export { arquipelago };
export type IslandId = 'pediatria' | 'clinica' | 'cirurgia' | 'go' | 'psiquiatria' | 'preventiva' | 'urgencia' | 'outros';

export const MAP_W = 941;
export const MAP_H = 856;

export const ISLANDS: { id: IslandId; name: string; emoji: string; color: string; ink: string; img: string; box: [number, number, number, number]; pin: [number, number] }[] = [
  { id: 'pediatria', name: 'Pediatria', emoji: '🧸', color: '#FFE9B8', ink: '#8A5A12', img: iPed, box: [145, 43, 295, 235], pin: [400, 70] },
  { id: 'clinica', name: 'Clínica Médica', emoji: '🏥', color: '#FDE2EE', ink: '#8A2763', img: iCli, box: [500, 55, 305, 230], pin: [770, 90] },
  { id: 'cirurgia', name: 'Cirurgia', emoji: '🔪', color: '#DCEBFF', ink: '#23406F', img: iCir, box: [25, 280, 275, 250], pin: [250, 300] },
  { id: 'go', name: 'GO', emoji: '🌸', color: '#F3E6FF', ink: '#5A3D99', img: iGo, box: [330, 305, 280, 230], pin: [565, 318] },
  { id: 'psiquiatria', name: 'Psiquiatria', emoji: '💭', color: '#E9E3FF', ink: '#4B3A8C', img: iPsi, box: [640, 305, 270, 230], pin: [835, 318] },
  { id: 'preventiva', name: 'Preventiva', emoji: '📋', color: '#E8F6D6', ink: '#4B5C0E', img: iPre, box: [130, 550, 320, 215], pin: [420, 560] },
  { id: 'urgencia', name: 'Urgência', emoji: '🚑', color: '#FFE2E2', ink: '#8F2C36', img: iUrg, box: [495, 565, 345, 200], pin: [800, 575] },
  { id: 'outros', name: 'Farol · outros', emoji: '🗼', color: '#FFF1E6', ink: '#7A4A1E', img: iOut, box: [750, 0, 185, 120], pin: [740, 30] },
];
export const islandMeta = (id: IslandId) => ISLANDS.find((i) => i.id === id)!;

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const AREA_ISLAND: Record<Area, IslandId> = { clinica: 'clinica', cirurgia: 'cirurgia', go: 'go', pediatria: 'pediatria', preventiva: 'preventiva', geral: 'outros' };

export function islandOf(deck: Deck, topic: Topic | null): IslandId {
  const txt = norm(`${topic?.specialty ?? ''} ${topic?.name ?? ''} ${deck.name}`);
  if (/psiq|depress|ansiedad|esquizo|bipolar|psicos|suicid|tdah|autismo/.test(txt)) return 'psiquiatria';
  if (/urgenc|emergenc|trauma|atls|acls|choque|\buti\b|intoxic|parada|\bpcr\b|queimad/.test(txt)) return 'urgencia';
  return AREA_ISLAND[topic?.area ?? deck.area] ?? 'outros';
}

const OBST = /obst|gesta|gravid|pre-?eclamp|eclamp|parto|puerper|pre-?natal|placent|abort|prematur|gemelar|hellp|diabetes gestac/;
export function subareaOf(island: IslandId, deck: Deck, topic: Topic | null): string {
  const spec = topic?.specialty?.trim();
  if (island === 'go') {
    const t = norm(`${spec ?? ''} ${topic?.name ?? ''} ${deck.name}`);
    return OBST.test(t) ? 'Obstetrícia' : 'Ginecologia';
  }
  if (spec) return spec[0].toUpperCase() + spec.slice(1);
  return 'Geral';
}

// ── ilustração de cada cartão de tema: emoji pelo assunto + paleta e enfeite pelo nome ──
const ART: [RegExp, string][] = [
  [/asma|dpoc|pneum|pulm|bronq|tuberc|respir/, '🫁'], [/cardi|coraca|infart|\biam\b|arritm|hipertens|\bhas\b|valv|endocard|insuf.*card/, '🫀'],
  [/avc|neuro|cefale|epilep|convuls|menin|demenc|parkins/, '🧠'], [/diabet|insulin|glic/, '🍬'], [/tireo|hipotir|hipertir|endocr|hormon|adrenal/, '🦋'],
  [/renal|rim|nefr|dialis|litias/, '🫘'], [/hepat|figad|cirros|ictericia/, '🍂'], [/colecist|vesicul|biliar|pancrea/, '🫒'], [/apendic|abdom|hernia|intestin|colon|obstru/, '🌀'],
  [/sepse|infec|antibiot|hiv|sifil|dengue|malaria|vacina|imuniz/, '🦠'], [/anemi|sangue|hemat|leucem|linfom|coagul|trombo/, '🩸'], [/fratur|osso|ortop|artrit|reumat|lupus|gota/, '🦴'],
  [/pele|derm|queimad/, '🧴'], [/olho|oftal|visao/, '👁️'], [/ouvido|otite|garganta|amigdal|sinusit/, '👂'],
  [/pre-?eclamp|eclamp|gesta|gravid|pre-?natal|placent/, '🤰'], [/parto|puerper|neonat|recem|rn\b/, '👶'], [/mama|mastit/, '🎀'], [/utero|ovario|endometri|mioma|colo|hpv|menstru|contracep/, '🌷'],
  [/crianc|infant|pediat|crescim|desenvolv|aleitament/, '🧸'], [/epidemi|estatist|vigilanc|sus\b|saude publ|indicador/, '📊'], [/etica|lei|legal/, '⚖️'],
  [/depress|ansied|psic|esquizo|bipolar/, '💭'], [/trauma|choque|parada|pcr|urgenc|emergenc/, '🚑'], [/cirurg|operat|anestes/, '🔪'], [/onco|cancer|tumor|neoplas/, '🎗️'],
];
const PALETTES: [string, string][] = [['#FFE3EE', '#F7A6BC'], ['#E3F0FF', '#8CC7FF'], ['#F1E6FF', '#B79AF0'], ['#FFF3C9', '#F4C430'], ['#E4F6DA', '#9FC46A'], ['#FFE6D6', '#F4A770'], ['#E2F6F4', '#7FCFC7']];
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export function cardArt(name: string, fallback: string) {
  const t = norm(name);
  const emoji = ART.find(([re]) => re.test(t))?.[1] ?? fallback;
  const h = hash(name);
  const [c1, c2] = PALETTES[h % PALETTES.length];
  return { emoji, c1, c2, deco: h % 4, tilt: ((h >> 3) % 7) - 3 };
}
