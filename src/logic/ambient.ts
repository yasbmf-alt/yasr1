// Sons ambientes do Cantinho (volume próprio, independente dos efeitos).
import { audioCtx, play } from './sound';

export type AmbientKind = 'chuva' | 'biblioteca' | 'natureza' | 'lareira';
export const AMBIENTS: { id: AmbientKind; label: string; emoji: string }[] = [
  { id: 'chuva', label: 'Chuva', emoji: '🌧️' },
  { id: 'biblioteca', label: 'Biblioteca', emoji: '📚' },
  { id: 'natureza', label: 'Natureza', emoji: '🌿' },
  { id: 'lareira', label: 'Lareira', emoji: '🔥' },
];

let current: { kind: AmbientKind; stop: () => void } | null = null;
let master: GainNode | null = null;
let vol = 0.5;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
export const onAmbient = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
export const ambientKind = () => current?.kind ?? null;

export function setAmbientVolume(v: number) {
  vol = Math.max(0, Math.min(1, v));
  if (master) master.gain.value = vol * 0.6;
}

function loopNoise(a: AudioContext, seconds: number, color: 'white' | 'pink' | 'brown') {
  const b = a.createBuffer(1, a.sampleRate * seconds, a.sampleRate);
  const d = b.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, last = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    if (color === 'white') d[i] = w;
    else if (color === 'pink') {
      b0 = 0.997 * b0 + w * 0.029591;
      b1 = 0.985 * b1 + w * 0.032534;
      b2 = 0.95 * b2 + w * 0.048056;
      d[i] = (b0 + b1 + b2 + w * 0.05) * 2.2;
    } else {
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    }
  }
  // costura suave do loop
  const fade = Math.floor(a.sampleRate * 0.05);
  for (let i = 0; i < fade; i++) {
    const k = i / fade;
    d[i] *= k;
    d[d.length - 1 - i] *= k;
  }
  const s = a.createBufferSource();
  s.buffer = b;
  s.loop = true;
  return s;
}

function blip(a: AudioContext, out: AudioNode, f: number, q: number, dur: number, gain: number) {
  const b = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (d.length / 5));
  const s = a.createBufferSource();
  s.buffer = b;
  const bp = a.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = f;
  bp.Q.value = q;
  const g = a.createGain();
  g.gain.value = gain;
  s.connect(bp).connect(g).connect(out);
  s.start();
}

function chirp(a: AudioContext, out: AudioNode) {
  const t = a.currentTime;
  const base = 2600 + Math.random() * 1400;
  const n = 2 + Math.floor(Math.random() * 3);
  for (let k = 0; k < n; k++) {
    const o = a.createOscillator();
    o.type = 'sine';
    const st = t + k * 0.13;
    o.frequency.setValueAtTime(base, st);
    o.frequency.exponentialRampToValueAtTime(base * 1.35, st + 0.07);
    const g = a.createGain();
    g.gain.setValueAtTime(0, st);
    g.gain.linearRampToValueAtTime(0.05, st + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, st + 0.1);
    o.connect(g).connect(out);
    o.start(st);
    o.stop(st + 0.12);
  }
}

export function startAmbient(kind: AmbientKind) {
  stopAmbient();
  const a = audioCtx();
  if (!a) return;
  master = a.createGain();
  master.gain.value = vol * 0.6;
  master.connect(a.destination);
  const out = master;
  const nodes: AudioScheduledSourceNode[] = [];
  const timers: ReturnType<typeof setInterval>[] = [];
  const every = (fn: () => void, min: number, max: number) => {
    let id: ReturnType<typeof setTimeout>;
    const tick = () => {
      fn();
      id = setTimeout(tick, min + Math.random() * (max - min));
      timers[0] = id;
    };
    id = setTimeout(tick, min + Math.random() * (max - min));
    timers.push(id);
    return () => clearTimeout(id);
  };
  const cleaners: (() => void)[] = [];

  if (kind === 'chuva') {
    const n = loopNoise(a, 4, 'pink');
    const hp = a.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 400;
    const lp = a.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 5200;
    const g = a.createGain();
    g.gain.value = 0.55;
    n.connect(hp).connect(lp).connect(g).connect(out);
    n.start();
    nodes.push(n);
    cleaners.push(every(() => blip(a, out, 2500 + Math.random() * 3000, 2, 0.03, 0.12), 40, 180));
  } else if (kind === 'lareira') {
    const n = loopNoise(a, 5, 'brown');
    const lp = a.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 700;
    const g = a.createGain();
    g.gain.value = 0.7;
    const lfo = a.createOscillator();
    lfo.frequency.value = 0.18;
    const lg = a.createGain();
    lg.gain.value = 0.2;
    lfo.connect(lg).connect(g.gain);
    n.connect(lp).connect(g).connect(out);
    n.start();
    lfo.start();
    nodes.push(n, lfo);
    cleaners.push(every(() => blip(a, out, 1800 + Math.random() * 2500, 1.5, 0.012 + Math.random() * 0.02, 0.35 + Math.random() * 0.3), 90, 700));
  } else if (kind === 'natureza') {
    const n = loopNoise(a, 6, 'pink');
    const bp = a.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 700;
    bp.Q.value = 0.6;
    const g = a.createGain();
    g.gain.value = 0.28;
    const lfo = a.createOscillator();
    lfo.frequency.value = 0.07;
    const lg = a.createGain();
    lg.gain.value = 0.15;
    lfo.connect(lg).connect(g.gain);
    n.connect(bp).connect(g).connect(out);
    n.start();
    lfo.start();
    nodes.push(n, lfo);
    cleaners.push(every(() => chirp(a, out), 2500, 9000));
  } else {
    const n = loopNoise(a, 5, 'brown');
    const lp = a.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 260;
    const g = a.createGain();
    g.gain.value = 0.45;
    n.connect(lp).connect(g).connect(out);
    n.start();
    nodes.push(n);
    cleaners.push(every(() => play('page'), 9000, 24000));
    cleaners.push(every(() => blip(a, out, 900, 3, 0.05, 0.08), 15000, 40000));
  }
  current = {
    kind,
    stop: () => {
      cleaners.forEach((c) => c());
      timers.forEach((t) => clearTimeout(t));
      nodes.forEach((n) => {
        try {
          n.stop();
        } catch {
          /* ignore */
        }
      });
      master?.disconnect();
      master = null;
    },
  };
  notify();
}

export function stopAmbient() {
  current?.stop();
  current = null;
  notify();
}
