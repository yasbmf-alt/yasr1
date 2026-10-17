// Calendário de eventos especiais. Os eventos mudam só a decoração dos
// ambientes; dados e interface continuam iguais. Tudo é editável em
// Configurações → Eventos, e o padrão pode ser restaurado com um clique.
import type { Settings } from '../types';
import { diffDays, today } from './dates';

export type EventKind = 'sazonal' | 'dia';
export type EventScene = 'trilha' | 'jardim' | 'quarto' | 'biblioteca';
export type EventTheme =
  | 'halloween' | 'natal' | 'praia' | 'aniversario' | 'aniversario-yas' | 'reveillon'
  | 'coracoes' | 'flores' | 'natureza' | 'medico' | 'formatura';
export type EventSound = 'nenhum' | 'chapter' | 'mission' | 'musicbox' | 'kiss' | 'candy';
export type EventStyle = 'cartao' | 'carta';

export interface SpecialEvent {
  id: string;
  name: string;
  kind: EventKind;
  start: string; // MM-DD
  end: string; // MM-DD (igual ao início para eventos de um dia)
  enabled: boolean;
  title: string;
  message: string; // escrita por você; vazio = só o título
  theme: EventTheme;
  scenes: EventScene[];
  sound: EventSound;
  style: EventStyle;
  dateFromSettings?: 'graduation'; // formatura usa a data configurável
  hiddenGift?: boolean; // presente escondido no cenário (uma vez por ano)
  countdown?: boolean; // mostra a contagem até a formatura
}

export const ALL_SCENES: { id: EventScene; label: string }[] = [
  { id: 'trilha', label: 'Trilha' },
  { id: 'jardim', label: 'Jardim' },
  { id: 'quarto', label: 'Quarto' },
  { id: 'biblioteca', label: 'Biblioteca' },
];

export const SOUNDS: { id: EventSound; label: string }[] = [
  { id: 'nenhum', label: 'Sem som' },
  { id: 'chapter', label: 'Fanfarra suave' },
  { id: 'mission', label: 'Plim de conquista' },
  { id: 'musicbox', label: 'Caixinha de música' },
  { id: 'kiss', label: 'Beijinhos' },
  { id: 'candy', label: 'Docinho' },
];

const ALL: EventScene[] = ['trilha', 'jardim', 'quarto', 'biblioteca'];

export const DEFAULT_EVENTS: SpecialEvent[] = [
  { id: 'halloween', name: 'Halloween', kind: 'sazonal', start: '10-24', end: '10-31', enabled: true, title: 'Feliz Halloween!', message: '', theme: 'halloween', scenes: ALL, sound: 'musicbox', style: 'cartao', hiddenGift: true },
  { id: 'natal', name: 'Temporada de Natal', kind: 'sazonal', start: '11-20', end: '12-25', enabled: true, title: 'A decoração de Natal chegou', message: '', theme: 'natal', scenes: ALL, sound: 'musicbox', style: 'cartao', hiddenGift: true },
  { id: 'natal-dia', name: 'Natal', kind: 'dia', start: '12-25', end: '12-25', enabled: true, title: 'Feliz Natal!', message: '', theme: 'natal', scenes: ALL, sound: 'chapter', style: 'cartao' },
  { id: 'namoro', name: 'Aniversário de namoro', kind: 'dia', start: '12-21', end: '12-21', enabled: true, title: 'Feliz aniversário de namoro', message: '', theme: 'praia', scenes: ALL, sound: 'kiss', style: 'carta' },
  { id: 'aniv-ikaro', name: 'Aniversário do Ikaro', kind: 'dia', start: '12-23', end: '12-23', enabled: true, title: 'Hoje é aniversário do Ikaro', message: '', theme: 'aniversario', scenes: ALL, sound: 'chapter', style: 'cartao' },
  { id: 'reveillon', name: 'Réveillon', kind: 'dia', start: '12-31', end: '12-31', enabled: true, title: 'Feliz Ano Novo!', message: '', theme: 'reveillon', scenes: ALL, sound: 'chapter', style: 'cartao', countdown: true },
  { id: 'aniv-yas', name: 'Meu aniversário', kind: 'dia', start: '04-20', end: '04-20', enabled: true, title: 'Feliz aniversário, Yas!', message: '', theme: 'aniversario-yas', scenes: ALL, sound: 'kiss', style: 'carta', hiddenGift: true },
  { id: 'valentine', name: "Valentine's Day", kind: 'dia', start: '02-14', end: '02-14', enabled: true, title: "Happy Valentine's Day", message: '', theme: 'coracoes', scenes: ALL, sound: 'kiss', style: 'cartao' },
  { id: 'mulher', name: 'Dia Internacional da Mulher', kind: 'dia', start: '03-08', end: '03-08', enabled: true, title: 'Feliz Dia da Mulher', message: '', theme: 'flores', scenes: ALL, sound: 'mission', style: 'cartao' },
  { id: 'indigenas', name: 'Dia dos Povos Indígenas', kind: 'dia', start: '04-19', end: '04-19', enabled: true, title: 'Dia dos Povos Indígenas', message: '', theme: 'natureza', scenes: ALL, sound: 'nenhum', style: 'cartao' },
  { id: 'namorados', name: 'Dia dos Namorados', kind: 'dia', start: '06-12', end: '06-12', enabled: true, title: 'Feliz Dia dos Namorados', message: '', theme: 'coracoes', scenes: ALL, sound: 'kiss', style: 'cartao' },
  { id: 'medico', name: 'Dia do Médico', kind: 'dia', start: '10-18', end: '10-18', enabled: true, title: 'Feliz Dia do Médico', message: '', theme: 'medico', scenes: ALL, sound: 'mission', style: 'cartao' },
  { id: 'formatura', name: 'Formatura', kind: 'dia', start: '', end: '', enabled: true, title: 'Formada!', message: '', theme: 'formatura', scenes: ALL, sound: 'chapter', style: 'carta', dateFromSettings: 'graduation' },
];

/** eventos atuais: padrão + o que você editou (por id) + eventos criados por você */
export function eventsOf(s: Settings): SpecialEvent[] {
  const saved = s.events ?? [];
  const byId = new Map(saved.map((e) => [e.id, e]));
  const base = DEFAULT_EVENTS.map((d) => ({ ...d, ...(byId.get(d.id) ?? {}) }));
  const extra = saved.filter((e) => !DEFAULT_EVENTS.some((d) => d.id === e.id));
  return [...base, ...extra];
}

const md = (k: string) => k.slice(5); // YYYY-MM-DD → MM-DD

/** data efetiva (MM-DD) de início e fim; a formatura usa a data completa */
export function windowOf(e: SpecialEvent, s: Settings): { start: string; end: string; fullDate?: string } | null {
  if (e.dateFromSettings === 'graduation') {
    if (!s.graduationDate) return null;
    return { start: md(s.graduationDate), end: md(s.graduationDate), fullDate: s.graduationDate };
  }
  if (!e.start) return null;
  return { start: e.start, end: e.end || e.start };
}

export function isActiveOn(e: SpecialEvent, s: Settings, day: string): boolean {
  if (!e.enabled) return false;
  const w = windowOf(e, s);
  if (!w) return false;
  if (w.fullDate) return w.fullDate === day;
  const d = md(day);
  return w.start <= w.end ? d >= w.start && d <= w.end : d >= w.start || d <= w.end; // janelas que viram o ano
}

export interface ActiveEvents {
  seasonal: SpecialEvent | null; // tema de fundo
  day: SpecialEvent | null; // destaque do dia
  preview: boolean;
}

export function activeEvents(s: Settings, day = today(), previewId?: string | null): ActiveEvents {
  const list = eventsOf(s);
  if (previewId) {
    const p = list.find((e) => e.id === previewId);
    if (p) {
      // na prévia de um evento do dia, mantém o tema sazonal que estaria junto (ex.: namoro + Natal)
      const companion = p.kind === 'dia' ? list.find((e) => e.kind === 'sazonal' && e.enabled && e.theme !== p.theme && windowCovers(e, s, p)) ?? null : null;
      return p.kind === 'sazonal' ? { seasonal: p, day: null, preview: true } : { seasonal: companion, day: p, preview: true };
    }
  }
  if (s.eventsOff) return { seasonal: null, day: null, preview: false };
  const on = list.filter((e) => isActiveOn(e, s, day));
  const seasonal = on.filter((e) => e.kind === 'sazonal').sort((a, b) => (b.start > a.start ? 1 : -1))[0] ?? null;
  const dayEv = on.filter((e) => e.kind === 'dia')[0] ?? null;
  return { seasonal, day: dayEv, preview: false };
}

function windowCovers(season: SpecialEvent, s: Settings, dayEv: SpecialEvent) {
  const w = windowOf(dayEv, s);
  if (!w) return false;
  const y = new Date().getFullYear();
  return isActiveOn(season, s, `${y}-${w.start}`);
}

/** chave "visto" por ano: a celebração aparece uma vez e pode ser revista à mão */
export const seenKey = (e: SpecialEvent, day = today()) => `${e.id}:${day.slice(0, 4)}`;

/** dias até a formatura (data real configurada), ou null */
export function daysToGraduation(s: Settings, day = today()): number | null {
  if (!s.graduationDate) return null;
  return diffDays(s.graduationDate, day);
}

// ── Temas: quais ilustrações e partículas cada evento usa ────────

export interface ThemeDef {
  label: string;
  garland?: string; // slot da faixa no topo
  props: string[]; // slots espalhados pelas laterais
  particles?: 'folhas' | 'neve' | 'confete' | 'coracoes' | 'estrelas' | 'petalas' | 'bolhas';
  tint?: string; // leve véu de cor no cenário
}

export const THEMES: Record<EventTheme, ThemeDef> = {
  halloween: { label: 'Halloween', garland: 'event.halloween.morcegos', props: ['event.halloween.abobora', 'event.halloween.fantasma', 'event.halloween.morcego', 'event.halloween.lua', 'event.halloween.teia'], particles: 'folhas', tint: 'rgba(52,73,122,.06)' },
  natal: { label: 'Natal', garland: 'event.natal.luzinhas', props: ['event.natal.arvore', 'event.natal.presente', 'event.natal.estrela', 'event.natal.laco', 'event.natal.enfeite'], particles: 'neve' },
  praia: { label: 'Romance na praia', props: ['event.praia.concha', 'event.praia.estrela-do-mar', 'event.praia.coracao', 'event.praia.hibisco', 'event.praia.coqueiro'], particles: 'coracoes', tint: 'rgba(207,228,255,.18)' },
  aniversario: { label: 'Aniversário', garland: 'event.aniversario.bandeirinhas', props: ['event.aniversario.balao', 'event.aniversario.balao-azul', 'event.aniversario.presente', 'event.aniversario.laco'], particles: 'confete' },
  'aniversario-yas': { label: 'Meu aniversário', garland: 'event.aniversario.bandeirinhas', props: ['event.aniversario.bolo', 'event.aniversario.balao', 'event.aniversario.balao-azul', 'event.aniversario.laco', 'event.flores.margarida'], particles: 'confete' },
  reveillon: { label: 'Réveillon', props: ['event.reveillon.fogos', 'event.reveillon.serpentina', 'event.natal.estrela', 'event.reveillon.fogos'], particles: 'estrelas', tint: 'rgba(52,73,122,.07)' },
  coracoes: { label: 'Corações', props: ['event.praia.coracao', 'event.coracoes.envelope', 'event.praia.coracao', 'event.praia.hibisco'], particles: 'coracoes' },
  flores: { label: 'Flores', props: ['event.flores.margarida', 'event.praia.hibisco', 'event.flores.margarida', 'event.aniversario.laco'], particles: 'petalas' },
  natureza: { label: 'Natureza', props: ['event.natureza.sol', 'event.natureza.broto', 'event.flores.margarida', 'event.natureza.broto'], particles: 'petalas' },
  medico: { label: 'Medicina', props: ['event.medico.estetoscopio', 'event.medico.cruz', 'event.praia.coracao', 'event.medico.estetoscopio'], particles: 'coracoes' },
  formatura: { label: 'Formatura', garland: 'event.aniversario.bandeirinhas', props: ['event.formatura.capelo', 'event.formatura.diploma', 'event.natal.estrela', 'event.reveillon.serpentina'], particles: 'confete' },
};
