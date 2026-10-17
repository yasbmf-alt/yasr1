// Adesivos colecionáveis: conquistados por marcos, sem prazo e sem cobrança.
import type { DataSnapshot } from '../types';
import { chapterProgress, missionProgress, topicStats } from './progress';

export interface StickerDef {
  id: string;
  label: string;
  how: string;
  earned: (d: DataSnapshot) => boolean;
}

const chaptersDone = (d: DataSnapshot) => d.chapters.filter((c) => chapterProgress(c, d.missions).complete).length;
const books = (d: DataSnapshot) => new Set(d.sessions.map((s) => s.topicId)).size;

export const STICKERS: StickerDef[] = [
  { id: 'estetoscopio', label: 'Estetoscópio', how: 'Primeiro registro de estudo', earned: (d) => d.sessions.length > 0 },
  { id: 'coracao', label: 'Coração', how: 'Primeira missão concluída', earned: (d) => d.missions.some((m) => missionProgress(m).complete) },
  { id: 'ecg', label: 'Monitor', how: 'Primeira revisão registrada', earned: (d) => d.sessions.some((s) => s.type === 'revisao') },
  { id: 'livros', label: 'Pilha de livros', how: '5 livros na biblioteca', earned: (d) => books(d) >= 5 },
  { id: 'cafe', label: 'Cafezinho', how: '10 sessões de estudo', earned: (d) => d.sessions.length >= 10 },
  { id: 'sol', label: 'Sol', how: 'Estudar em 5 dias diferentes', earned: (d) => new Set(d.sessions.map((s) => s.date)).size >= 5 },
  { id: 'flor', label: 'Flor', how: 'Primeira planta em flor no jardim', earned: (d) => d.topics.some((t) => topicStats(t, d.sessions).stage === 4) },
  { id: 'estrela', label: 'Estrela', how: 'Primeiro capítulo concluído', earned: (d) => chaptersDone(d) >= 1 },
  { id: 'raio', label: 'Raio', how: 'Primeiro simulado registrado', earned: (d) => d.simulados.length > 0 },
  { id: 'cartas', label: 'Cartas', how: 'Primeira revisão de flashcards', earned: (d) => d.cards.some((c) => c.fsrs.reps > 0) },
  { id: 'r1', label: 'R1', how: 'Três capítulos concluídos', earned: (d) => chaptersDone(d) >= 3 },
  { id: 'coroa', label: 'Coroa', how: 'Seis capítulos concluídos', earned: (d) => chaptersDone(d) >= 6 },
];
