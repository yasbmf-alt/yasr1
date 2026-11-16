// Visual de cada missão na trilha: Medway (pela área do tema), internato (pelo
// tema escolhido) e simulado (fazer / corrigir).
import type { InternatoTheme, Mission } from '../types';

export const INTERNATO_THEMES: { id: InternatoTheme; label: string; emoji: string; color: string }[] = [
  { id: 'hospital', label: 'Hospital', emoji: '🏥', color: 'var(--pessego)' },
  { id: 'psiquiatria', label: 'Psiquiatria', emoji: '💭', color: 'var(--lilas)' },
  { id: 'emergencia', label: 'Emergência', emoji: '🚨', color: '#FFD3C4' },
  { id: 'simulacao', label: 'Simulação', emoji: '🎬', color: 'var(--azul-claro)' },
  { id: 'ambulatorio', label: 'Ambulatório', emoji: '🩺', color: '#E3F0C8' },
  { id: 'clinica', label: 'Clínica', emoji: '🫀', color: 'var(--rosa)' },
  { id: 'cirurgia', label: 'Cirurgia', emoji: '🔪', color: 'var(--azul-claro)' },
  { id: 'go', label: 'GO', emoji: '🌸', color: 'var(--lilas)' },
  { id: 'pediatria', label: 'Pediatria', emoji: '🧸', color: 'var(--manteiga)' },
  { id: 'preventiva', label: 'Preventiva', emoji: '📋', color: '#E3F0C8' },
];
export const internatoTheme = (id: InternatoTheme | undefined) => INTERNATO_THEMES.find((t) => t.id === (id ?? 'hospital')) ?? INTERNATO_THEMES[0];

export const SIM_COLOR_BG = 'var(--lilas)';
export const missionKindLabel = (m: Mission) =>
  m.kind === 'internato' ? `Internato · ${internatoTheme(m.theme).label}` : m.kind === 'simulado' ? (m.simTask === 'corrigir' ? 'Correção de simulado' : 'Simulado') : 'Missão Medway';
