// Sons do Yas R1.
//  • Foley (porta, gaveta, livro, papel): modelos físicos renderizados uma vez
//    num OfflineAudioContext — atrito de dobradiça (stick-slip) excitando as
//    ressonâncias da madeira, baques filtrados, papel em ruído granular.
//    Nada de tons eletrônicos ou glissandos descendentes.
//  • Gravações próprias: qualquer som pode ser trocado por um arquivo enviado
//    em Configurações → Sons (tem prioridade sobre o modelo).
//  • Tons curtos (conclusão, celebração) continuam sintetizados ao vivo.

let ctx: AudioContext | null = null;
let enabled = true;
let volume = 0.7;
const cache = new Map<string, AudioBuffer>();
const custom = new Map<string, AudioBuffer>();
const lastPlay = new Map<string, number>();

export const setSoundEnabled = (on: boolean) => {
  enabled = on;
};
export const setSoundVolume = (v: number) => {
  volume = Math.min(1, Math.max(0, v));
};
export const soundState = () => ({ enabled, volume });

export function audioCtx() {
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

// ── utilidades de síntese offline ─────────────────────────────

const SR = 44100;
type OC = OfflineAudioContext;

function rand(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

function noiseBuf(oc: OC, dur: number, seed = 7, brown = false) {
  const r = rand(seed);
  const b = oc.createBuffer(1, Math.max(1, Math.floor(SR * dur)), SR);
  const d = b.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    const w = r() * 2 - 1;
    if (brown) {
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    } else d[i] = w;
  }
  return b;
}

/** rajada de ruído filtrada com envelope (ataque/decaimento exponencial) */
function burst(oc: OC, out: AudioNode, t: number, dur: number, o: { type?: BiquadFilterType; f: number; q?: number; gain: number; attack?: number; seed?: number; brown?: boolean }) {
  const src = oc.createBufferSource();
  src.buffer = noiseBuf(oc, dur + 0.02, o.seed ?? Math.floor(t * 1000) + 3, o.brown);
  const f = oc.createBiquadFilter();
  f.type = o.type ?? 'lowpass';
  f.frequency.value = o.f;
  f.Q.value = o.q ?? 0.7;
  const g = oc.createGain();
  const a = o.attack ?? 0.002;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(o.gain, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(out);
  src.start(t);
  src.stop(t + dur + 0.02);
}

/** modo ressonante amortecido (corpo da madeira) */
function mode(oc: OC, out: AudioNode, t: number, freq: number, decay: number, gain: number) {
  const o = oc.createOscillator();
  o.type = 'sine';
  o.frequency.value = freq;
  const g = oc.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + decay + 0.02);
}

/**
 * Rangido de dobradiça: trem de impulsos de atrito (stick-slip) com taxa
 * levemente oscilante, filtrado por um banco de ressonâncias de madeira.
 */
function creak(oc: OC, out: AudioNode, t0: number, dur: number, o: { rate: [number, number]; gain: number; seed: number; body?: number }) {
  const r = rand(o.seed);
  const len = Math.floor(SR * dur);
  const b = oc.createBuffer(1, len, SR);
  const d = b.getChannelData(0);
  let t = 0;
  while (t < dur) {
    const p = t / dur;
    const env = Math.sin(Math.PI * Math.min(1, p * 1.15)) ** 0.7 * (0.75 + 0.25 * Math.sin(p * 17 + r() * 0.5));
    const rate = o.rate[0] + (o.rate[1] - o.rate[0]) * (0.5 - 0.5 * Math.cos(p * Math.PI * 1.6)) + (r() - 0.5) * 10;
    const i = Math.floor(t * SR);
    const amp = env * (0.6 + r() * 0.4);
    for (let k = 0; k < 90 && i + k < len; k++) d[i + k] += amp * Math.exp(-k / 9) * (k === 0 ? 1 : (r() * 2 - 1) * 0.35);
    t += 1 / Math.max(18, rate) * (0.85 + r() * 0.3);
  }
  const src = oc.createBufferSource();
  src.buffer = b;
  const sum = oc.createGain();
  sum.gain.value = o.gain;
  const body = o.body ?? 1;
  for (const [f, q, g] of [[230, 9, 1], [520, 11, 0.85], [960, 13, 0.55], [1580, 15, 0.32], [2700, 18, 0.16]] as const) {
    const bp = oc.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = f * body;
    bp.Q.value = q;
    const gg = oc.createGain();
    gg.gain.value = g;
    src.connect(bp).connect(gg).connect(sum);
  }
  sum.connect(out);
  src.start(t0);
}

/** atrito de madeira deslizando (gaveta) */
function slide(oc: OC, out: AudioNode, t0: number, dur: number, gain: number, seed: number) {
  const r = rand(seed);
  const len = Math.floor(SR * dur);
  const b = oc.createBuffer(1, len, SR);
  const d = b.getChannelData(0);
  let grain = 0;
  for (let i = 0; i < len; i++) {
    const p = i / len;
    if (i % 220 === 0) grain = 0.55 + r() * 0.45;
    const env = Math.min(1, p / 0.12) * Math.min(1, (1 - p) / 0.25);
    d[i] = (r() * 2 - 1) * env * grain;
  }
  const src = oc.createBufferSource();
  src.buffer = b;
  const bp = oc.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1100;
  bp.Q.value = 0.9;
  const lp = oc.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 3200;
  const g = oc.createGain();
  g.gain.value = gain;
  src.connect(bp).connect(lp).connect(g).connect(out);
  src.start(t0);
  burst(oc, out, t0, dur, { f: 260, gain: gain * 0.6, brown: true, attack: 0.05, seed: seed + 1 });
}

/** papel: microestalos granulares */
function paper(oc: OC, out: AudioNode, t0: number, dur: number, n: number, gain: number, seed: number, center = 4200) {
  const r = rand(seed);
  for (let i = 0; i < n; i++) {
    const t = t0 + r() * dur;
    burst(oc, out, t, 0.008 + r() * 0.03, { type: 'bandpass', f: center * (0.6 + r() * 0.9), q: 0.9, gain: gain * (0.4 + r() * 0.6), seed: seed + i * 13 });
  }
  burst(oc, out, t0, dur, { type: 'highpass', f: 2500, gain: gain * 0.25, attack: dur * 0.3, seed: seed + 99 });
}

const RECIPES: Record<string, { dur: number; build: (oc: OC, out: AudioNode) => void }> = {
  door: {
    dur: 1.0,
    build: (oc, out) => {
      // trinco soltando
      burst(oc, out, 0.0, 0.025, { type: 'bandpass', f: 2600, q: 1.2, gain: 0.25, seed: 11 });
      mode(oc, out, 0.0, 180, 0.09, 0.08);
      // dobradiça
      creak(oc, out, 0.07, 0.62, { rate: [38, 70], gain: 0.5, seed: 21 });
      // ar e madeira se movendo
      burst(oc, out, 0.08, 0.7, { f: 420, gain: 0.05, attack: 0.2, brown: true, seed: 31 });
      // porta para no fim do curso
      burst(oc, out, 0.74, 0.06, { f: 520, gain: 0.12, seed: 41 });
      mode(oc, out, 0.74, 140, 0.12, 0.06);
    },
  },
  doorClose: {
    dur: 0.6,
    build: (oc, out) => {
      creak(oc, out, 0.0, 0.18, { rate: [55, 66], gain: 0.28, seed: 51, body: 1.08 });
      // porta encostando no batente
      burst(oc, out, 0.2, 0.09, { f: 380, gain: 0.55, seed: 61 });
      mode(oc, out, 0.2, 118, 0.2, 0.22);
      mode(oc, out, 0.2, 262, 0.12, 0.1);
      // trinco
      burst(oc, out, 0.235, 0.006, { type: 'highpass', f: 3200, gain: 0.22, seed: 71 });
      burst(oc, out, 0.252, 0.005, { type: 'highpass', f: 3600, gain: 0.14, seed: 72 });
    },
  },
  drawer: {
    dur: 0.65,
    build: (oc, out) => {
      burst(oc, out, 0, 0.02, { f: 900, gain: 0.12, seed: 81 });
      slide(oc, out, 0.02, 0.42, 0.22, 83);
      burst(oc, out, 0.45, 0.05, { f: 600, gain: 0.3, seed: 85 });
      mode(oc, out, 0.45, 160, 0.12, 0.09);
    },
  },
  drawerClose: {
    dur: 0.5,
    build: (oc, out) => {
      slide(oc, out, 0, 0.26, 0.2, 91);
      burst(oc, out, 0.27, 0.08, { f: 420, gain: 0.5, seed: 93 });
      mode(oc, out, 0.27, 130, 0.16, 0.16);
    },
  },
  page: {
    dur: 0.42,
    build: (oc, out) => {
      paper(oc, out, 0.0, 0.16, 10, 0.14, 101, 3800);
      burst(oc, out, 0.04, 0.28, { type: 'bandpass', f: 3000, q: 0.5, gain: 0.08, attack: 0.09, seed: 103 });
      paper(oc, out, 0.18, 0.12, 6, 0.1, 107, 4600);
    },
  },
  bookClose: {
    dur: 0.35,
    build: (oc, out) => {
      paper(oc, out, 0, 0.08, 5, 0.08, 111);
      burst(oc, out, 0.09, 0.08, { f: 700, gain: 0.32, seed: 113 });
      mode(oc, out, 0.09, 190, 0.08, 0.06);
    },
  },
  paper: {
    dur: 0.5,
    build: (oc, out) => paper(oc, out, 0, 0.38, 24, 0.12, 121),
  },
  envelope: {
    dur: 0.8,
    build: (oc, out) => {
      // lacre de papel soltando e aba abrindo
      paper(oc, out, 0, 0.1, 8, 0.12, 131, 3600);
      burst(oc, out, 0.12, 0.42, { type: 'bandpass', f: 2600, q: 0.6, gain: 0.07, attack: 0.15, seed: 133 });
      paper(oc, out, 0.42, 0.22, 10, 0.1, 137, 4800);
    },
  },
  note: {
    dur: 0.25,
    build: (oc, out) => paper(oc, out, 0, 0.12, 7, 0.1, 141, 5200),
  },
  sticker: {
    dur: 0.3,
    build: (oc, out) => {
      burst(oc, out, 0, 0.16, { type: 'highpass', f: 2200, gain: 0.12, attack: 0.08, seed: 151 });
      burst(oc, out, 0.17, 0.03, { f: 800, gain: 0.18, seed: 153 });
    },
  },
  drop: {
    dur: 0.2,
    build: (oc, out) => {
      burst(oc, out, 0, 0.05, { f: 650, gain: 0.25, seed: 161 });
      mode(oc, out, 0, 220, 0.07, 0.05);
    },
  },
  key: {
    dur: 0.5,
    build: (oc, out) => {
      for (const [t, f] of [[0, 3900], [0.05, 5200], [0.12, 4400]] as const) {
        burst(oc, out, t, 0.04, { type: 'bandpass', f, q: 8, gain: 0.18, seed: Math.floor(t * 100) + 171 });
        mode(oc, out, t, f / 2, 0.18, 0.03);
      }
    },
  },
};

export const FOLEY = Object.keys(RECIPES);

async function render(name: string) {
  const r = RECIPES[name];
  if (!r) return null;
  const OAC = window.OfflineAudioContext || (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;
  if (!OAC) return null;
  const oc = new OAC(1, Math.ceil(SR * r.dur), SR);
  const comp = oc.createDynamicsCompressor();
  comp.threshold.value = -12;
  comp.ratio.value = 3;
  const master = oc.createGain();
  master.gain.value = 0.9;
  master.connect(comp).connect(oc.destination);
  r.build(oc, master);
  const buf = await oc.startRendering();
  cache.set(name, buf);
  return buf;
}

let warmed = false;
/** pré-renderiza os sons de foley no primeiro gesto da usuária */
export function warmSounds() {
  if (warmed) return;
  warmed = true;
  for (const n of FOLEY) void render(n);
}

/** carrega gravações enviadas pela usuária (nome do som → url) */
export async function loadCustomSounds(map: Record<string, string>) {
  const a = audioCtx();
  for (const k of [...custom.keys()]) if (!map[k]) custom.delete(k);
  if (!a) return;
  for (const [name, url] of Object.entries(map)) {
    try {
      const res = await fetch(url);
      const ab = await res.arrayBuffer();
      custom.set(name, await a.decodeAudioData(ab));
    } catch {
      custom.delete(name);
    }
  }
}

function playBuffer(buf: AudioBuffer, gain = 1) {
  const a = audioCtx();
  if (!a) return;
  const src = a.createBufferSource();
  src.buffer = buf;
  const g = a.createGain();
  g.gain.value = volume * gain;
  src.connect(g).connect(a.destination);
  src.start();
}

// ── tons ao vivo (conclusões e celebrações) ───────────────────

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.12) {
  const a = audioCtx();
  if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, a.currentTime + start);
  const peak = gain * volume;
  g.gain.setValueAtTime(0, a.currentTime + start);
  g.gain.linearRampToValueAtTime(peak, a.currentTime + start + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + dur);
  o.connect(g).connect(a.destination);
  o.start(a.currentTime + start);
  o.stop(a.currentTime + start + dur + 0.05);
}

/** lâmina de caixinha de música: fundamental + parcial inarmônico, decaimento longo */
function tine(freq: number, start: number, gain = 0.08) {
  tone(freq, start, 1.4, 'sine', gain);
  tone(freq * 4.2, start, 0.35, 'sine', gain * 0.25);
}

// melodia original da caixinha (não é de nenhuma música existente)
const MUSIC_BOX: [number, number][] = [
  [784, 0], [988, 0.32], [1175, 0.64], [988, 0.96], [1319, 1.28], [1175, 1.76], [988, 2.08], [784, 2.4],
  [880, 2.88], [988, 3.2], [784, 3.52], [659, 3.84], [784, 4.32],
];

export type SoundName =
  | 'check' | 'uncheck' | 'mission' | 'chapter' | 'pop' | 'grow' | 'flip'
  | 'door' | 'doorClose' | 'drawer' | 'drawerClose' | 'page' | 'bookClose' | 'paper' | 'envelope'
  | 'sticker' | 'note' | 'drop' | 'key' | 'kiss' | 'meow' | 'purr' | 'musicbox' | 'candy'
  | 'fizzle' | 'ignite';

export function play(name: SoundName) {
  if (!enabled || volume <= 0) return;
  const now = performance.now();
  if (now - (lastPlay.get(name) ?? 0) < 140) return; // um clique, um som
  lastPlay.set(name, now);
  warmSounds();
  try {
    const own = custom.get(name);
    if (own) return playBuffer(own);
    if (RECIPES[name]) {
      const b = cache.get(name);
      if (b) playBuffer(b);
      else void render(name).then((x) => x && playBuffer(x));
      return;
    }
    switch (name) {
      case 'check':
        tone(880, 0, 0.12, 'triangle');
        tone(1320, 0.07, 0.18, 'triangle');
        break;
      case 'uncheck':
        tone(587, 0, 0.12, 'triangle', 0.07);
        break;
      case 'pop':
        tone(660, 0, 0.07, 'sine', 0.07);
        break;
      case 'fizzle': // chama apagando: dois tons baixinhos, sem drama
        tone(440, 0, 0.16, 'sine', 0.035);
        tone(349, 0.13, 0.3, 'sine', 0.03);
        break;
      case 'ignite': // chama acendendo de novo
        [392, 523, 784].forEach((f, i) => tone(f, i * 0.07, 0.22, 'triangle', 0.05));
        break;
      case 'flip':
        void (cache.get('page') ? playBuffer(cache.get('page')!, 0.7) : render('page').then((x) => x && playBuffer(x, 0.7)));
        break;
      case 'grow':
        [523, 659, 784].forEach((f, i) => tone(f, i * 0.06, 0.25, 'sine', 0.06));
        break;
      case 'mission':
        [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.3, 'triangle', 0.09));
        break;
      case 'chapter':
        [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.11, 0.38, 'triangle', 0.09));
        break;
      case 'kiss': {
        // estalinho: ruído curto e ressonante
        const a = audioCtx();
        if (!a) break;
        tone(1400, 0, 0.05, 'sine', 0.05);
        tone(1900, 0.02, 0.06, 'sine', 0.04);
        break;
      }
      case 'meow': {
        const a = audioCtx();
        if (!a) break;
        const o = a.createOscillator();
        o.type = 'sawtooth';
        const t = a.currentTime;
        o.frequency.setValueAtTime(520, t);
        o.frequency.linearRampToValueAtTime(760, t + 0.18);
        o.frequency.linearRampToValueAtTime(640, t + 0.5);
        const f1 = a.createBiquadFilter();
        f1.type = 'bandpass';
        f1.Q.value = 6;
        f1.frequency.setValueAtTime(900, t);
        f1.frequency.linearRampToValueAtTime(1800, t + 0.2);
        f1.frequency.linearRampToValueAtTime(1100, t + 0.5);
        const g = a.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.09 * volume, t + 0.06);
        g.gain.setValueAtTime(0.09 * volume, t + 0.32);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
        o.connect(f1).connect(g).connect(a.destination);
        o.start(t);
        o.stop(t + 0.6);
        break;
      }
      case 'purr': {
        const a = audioCtx();
        if (!a) break;
        const t = a.currentTime;
        const src = a.createBufferSource();
        const b = a.createBuffer(1, a.sampleRate * 1.4, a.sampleRate);
        const d = b.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (0.5 + 0.5 * Math.sin((i / a.sampleRate) * 2 * Math.PI * 26));
        src.buffer = b;
        const lp = a.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 320;
        const g = a.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.16 * volume, t + 0.2);
        g.gain.linearRampToValueAtTime(0, t + 1.4);
        src.connect(lp).connect(g).connect(a.destination);
        src.start(t);
        break;
      }
      case 'musicbox':
        MUSIC_BOX.forEach(([f, t]) => tine(f, t));
        break;
      case 'candy':
        [1047, 1319, 1568].forEach((f, i) => tine(f, i * 0.08, 0.05));
        break;
    }
  } catch {
    /* sem áudio */
  }
}

/** sons que podem ser trocados por gravações próprias */
export const SOUND_SLOTS: { id: SoundName; label: string }[] = [
  { id: 'door', label: 'Porta do armário abrindo' },
  { id: 'doorClose', label: 'Porta do armário fechando' },
  { id: 'drawer', label: 'Gaveta abrindo' },
  { id: 'drawerClose', label: 'Gaveta fechando' },
  { id: 'page', label: 'Virar página' },
  { id: 'bookClose', label: 'Livro fechando' },
  { id: 'envelope', label: 'Carta abrindo' },
  { id: 'paper', label: 'Papel (vales e bilhetes)' },
  { id: 'note', label: 'Post-it' },
  { id: 'check', label: 'Atividade concluída' },
  { id: 'mission', label: 'Missão concluída' },
  { id: 'chapter', label: 'Capítulo concluído' },
];
