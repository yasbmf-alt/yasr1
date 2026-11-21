// Efeitos sonoros 8-bit da batalha, sintetizados na hora (Web Audio). Nada gravado,
// nada copiado de jogo nenhum. Respeitam o liga/desliga e o volume do app.
import { audioCtx, soundState } from '../../logic/sound';

type Wave = OscillatorType;
const last = new Map<string, number>();

function env(g: GainNode, t: number, peak: number, dur: number) {
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}
function sweep(f0: number, f1: number, at: number, dur: number, wave: Wave = 'square', gain = 0.06) {
  const a = audioCtx(); if (!a) return;
  const { volume } = soundState();
  const t = a.currentTime + at;
  const o = a.createOscillator(); o.type = wave;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const g = a.createGain(); env(g, t, gain * volume, dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.05);
}
function noise(at: number, dur: number, gain = 0.08, from = 4000, to = 300, type: BiquadFilterType = 'lowpass') {
  const a = audioCtx(); if (!a) return;
  const { volume } = soundState();
  const t = a.currentTime + at;
  const b = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = a.createBufferSource(); s.buffer = b;
  const f = a.createBiquadFilter(); f.type = type;
  f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = a.createGain(); env(g, t, gain * volume, dur);
  s.connect(f).connect(g).connect(a.destination); s.start(t);
}
const note = (f: number, at: number, dur: number, wave: Wave = 'square', gain = 0.045) => sweep(f, f * 0.999, at, dur, wave, gain);

const SFX = {
  /** golpe da Yasmin: corte (whoosh) + impacto */
  golpe() { noise(0, 0.18, 0.06, 6000, 800, 'highpass'); sweep(1400, 260, 0.12, 0.14, 'square', 0.05); noise(0.14, 0.16, 0.1, 2500, 120); sweep(180, 60, 0.14, 0.2, 'triangle', 0.12); },
  /** golpe que desviou de pegadinha: impacto + brilho subindo */
  efetivo() { SFX.golpe(); [880, 1175, 1568].forEach((f, i) => note(f, 0.32 + i * 0.06, 0.12, 'square', 0.035)); },
  /** HP descendo: bipes rápidos */
  drena() { [740, 660, 590, 520].forEach((f, i) => note(f, 0.05 + i * 0.05, 0.05, 'square', 0.025)); },
  /** contra-ataque do monstro (sem punição: só o susto) */
  contra() { sweep(220, 520, 0, 0.12, 'sawtooth', 0.04); noise(0.1, 0.22, 0.09, 1800, 200); sweep(420, 90, 0.12, 0.28, 'square', 0.05); },
  /** chefão desmaiando */
  desmaio() { sweep(700, 60, 0, 0.9, 'square', 0.05); noise(0.5, 0.5, 0.05, 900, 80); },
  /** fanfarra de vitória (melodia original) */
  vitoria() { [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.36], [784, 0.56], [1047, 0.68]].forEach(([f, t]) => { note(f, t, 0.18, 'square', 0.045); note(f / 2, t, 0.18, 'triangle', 0.05); }); note(1319, 0.9, 0.5, 'square', 0.05); note(659, 0.9, 0.5, 'triangle', 0.06); },
  /** escolher um golpe */
  escolhe() { note(1046, 0, 0.05, 'square', 0.03); note(1568, 0.05, 0.07, 'square', 0.03); },
  /** passar o dedo / foco num golpe */
  foco() { note(880, 0, 0.03, 'square', 0.015); },
  /** letrinha do texto (bem baixinho) */
  letra() { note(660 + Math.random() * 80, 0, 0.025, 'square', 0.008); },
  /** entrada da batalha */
  entrada() { [196, 262, 330, 392].forEach((f, i) => note(f, i * 0.07, 0.1, 'square', 0.04)); noise(0, 0.3, 0.03, 5000, 500, 'highpass'); },
  /** chefão aparecendo na história */
  chefao() { [110, 104, 98].forEach((f, i) => { note(f, i * 0.18, 0.22, 'sawtooth', 0.05); note(f * 2, i * 0.18, 0.22, 'square', 0.02); }); noise(0, 0.6, 0.04, 400, 60); },
  /** barquinho no mapa */
  remo() { noise(0, 0.35, 0.04, 1200, 300, 'bandpass'); note(523, 0.05, 0.06, 'triangle', 0.03); note(784, 0.12, 0.08, 'triangle', 0.03); },
};
export type SfxName = keyof typeof SFX;

export function sfx(name: SfxName) {
  const { enabled, volume } = soundState();
  if (!enabled || volume <= 0) return;
  const now = performance.now();
  const gap = name === 'letra' ? 45 : 90;
  if (now - (last.get(name) ?? 0) < gap) return;
  last.set(name, now);
  try { SFX[name](); } catch { /* sem áudio, sem drama */ }
}
