// Cenários da trilha: cada capítulo recebe um ambiente (sorteado de forma
// estável, sem repetir entre capítulos vizinhos). Só muda o visual — posições,
// progresso e conclusão continuam iguais.

export type SceneTheme = 'classico' | 'florido' | 'bosque' | 'riacho' | 'pedras' | 'jardim' | 'noturno';
export const SCENE_LABEL: Record<SceneTheme, string> = {
  classico: 'caminho clássico',
  florido: 'caminho florido', bosque: 'bosque', riacho: 'riacho com pontes', pedras: 'caminho de pedras', jardim: 'jardim', noturno: 'noite estrelada',
};
const ORDER: SceneTheme[] = ['florido', 'bosque', 'riacho', 'pedras', 'jardim', 'noturno'];

// a Yas preferiu o caminho clássico (azul, florzinhas, lago): ele vale para todos os capítulos
export function themeFor(_chapterNumber: number): SceneTheme {
  return 'classico';
}

export function variedThemeFor(chapterNumber: number, salt = 'yas-r1') {
  let h = 0;
  for (const c of salt) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return ORDER[(chapterNumber - 1 + (h % 6)) % 6];
}

export const SCENE_COLORS: Record<SceneTheme, { bg: string; hill: string; hill2: string; edge: string; path: string; dash: string }> = {
  classico: { bg: '#E3EEFC', hill: '#D5E3FA', hill2: '#DCE8FC', edge: '#94B2E3', path: '#C3D8F7', dash: '#FFFFFF' },
  florido: { bg: '#EFF6CF', hill: '#DDEBB0', hill2: '#E6F0C2', edge: '#C9B27E', path: '#F3E3C2', dash: '#FFFDF6' },
  bosque: { bg: '#E3EDCF', hill: '#CFE0B0', hill2: '#D8E7BE', edge: '#B08A62', path: '#D9B98F', dash: '#F3E3C2' },
  riacho: { bg: '#E7F2DA', hill: '#D2E6C0', hill2: '#DDEDCC', edge: '#C7AE84', path: '#EEDDBB', dash: '#FFFDF6' },
  pedras: { bg: '#EEF0DC', hill: '#DEE4C3', hill2: '#E6EAD0', edge: '#D8D0C0', path: '#ECE6DA', dash: 'transparent' },
  jardim: { bg: '#F1F6DE', hill: '#E0EBBF', hill2: '#E9F0CF', edge: '#E1D6C4', path: '#F6EFE2', dash: '#FFFFFF' },
  noturno: { bg: '#34497A', hill: '#3E5689', hill2: '#465F94', edge: '#5B6E9E', path: '#7F8FBA', dash: '#FFF3B0' },
};

export const W = 1000;
export const TOP = 130;
export const ROW = 196;
export const xAt = (i: number) => 500 + 250 * Math.sin(i * 1.15);

export function rng(seed: number) {
  let s = (seed * 9301 + 49297) % 233280;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export interface Pt {
  x: number;
  y: number;
  ang: number; // direção do caminho (rad), em unidades do viewBox
}

/** amostras ao longo das curvas da trilha (mesma geometria do SVG) */
export function samplePath(pts: { x: number; y: number }[], step = 6): Pt[] {
  const out: Pt[] = [];
  if (pts.length) {
    for (let y = pts[0].y - 70; y < pts[0].y; y += step) out.push({ x: pts[0].x, y, ang: Math.PI / 2 });
  }
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const dy = (b.y - a.y) / 2;
    const c1 = { x: a.x, y: a.y + dy };
    const c2 = { x: b.x, y: b.y - dy };
    const n = Math.ceil(ROW / step);
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const mt = 1 - t;
      const x = mt ** 3 * a.x + 3 * mt * mt * t * c1.x + 3 * mt * t * t * c2.x + t ** 3 * b.x;
      const y = mt ** 3 * a.y + 3 * mt * mt * t * c1.y + 3 * mt * t * t * c2.y + t ** 3 * b.y;
      const dx = 3 * mt * mt * (c1.x - a.x) + 6 * mt * t * (c2.x - c1.x) + 3 * t * t * (b.x - c2.x);
      const ddy = 3 * mt * mt * (c1.y - a.y) + 6 * mt * t * (c2.y - c1.y) + 3 * t * t * (b.y - c2.y);
      out.push({ x, y, ang: Math.atan2(ddy, dx) });
    }
  }
  return out;
}

export interface Prop {
  kind: string;
  x: number; // viewBox
  y: number; // px (base do objeto)
  size: number;
  flip?: boolean;
  sway?: boolean;
  rot?: number;
  layer?: 'back' | 'front';
}

const SIDE_KINDS: Record<SceneTheme, string[]> = {
  classico: ['florzinha', 'moita', 'florzinha', 'arvorezinha', 'moita', 'florzinha'],
  florido: ['ipe', 'arbusto', 'arvore', 'tulipas', 'ipe', 'flor'],
  bosque: ['pinheiro', 'arvore', 'pinheiro', 'samambaia', 'arvore', 'cogumelos'],
  riacho: ['arvore', 'arbusto', 'samambaia', 'pedras', 'ipe', 'arbusto'],
  pedras: ['pedras', 'arvore', 'grama', 'arbusto', 'pedras', 'pinheiro'],
  jardim: ['canteiro', 'sebe', 'ipe', 'cerca', 'arbusto', 'canteiro'],
  noturno: ['pinheiro', 'arvore', 'cogumelos', 'lanterna', 'arbusto', 'pinheiro'],
};
const SIZE: Record<string, [number, number]> = {
  florzinha: [40, 56], moita: [70, 84], arvorezinha: [56, 70],
  ipe: [96, 130], arvore: [96, 130], pinheiro: [80, 120], arbusto: [80, 110], flor: [44, 60], tulipas: [44, 60], samambaia: [60, 80],
  cogumelos: [44, 58], pedras: [60, 80], grama: [34, 46], lanterna: [40, 54], cerca: [90, 110], canteiro: [100, 130], sebe: [96, 120],
};

/** gera os objetos do cenário evitando a trilha e as estações */
export function buildScene(theme: SceneTheme, n: number, H: number, seed: number, samples: Pt[]) {
  const r = rng(seed * 7 + n);
  const props: Prop[] = [];
  const pathX = (y: number) => {
    let best = samples[0];
    for (const s of samples) if (Math.abs(s.y - y) < Math.abs(best.y - y)) best = s;
    return best?.x ?? 500;
  };
  const free = (x: number, y: number, rad: number) => {
    if (Math.abs(pathX(y) - x) < 70 + rad) return false;
    for (let i = 0; i <= n; i++) if (Math.hypot(xAt(i) - x, (TOP + i * ROW - y) * 1) < 140 + rad) return false;
    return !props.some((p) => Math.abs(p.x - x) < (p.size + rad) * 0.55 && Math.abs(p.y - y) < (p.size + rad) * 0.45);
  };
  const kinds = SIDE_KINDS[theme];
  const classic = theme === 'classico';
  const tries = Math.round((H / 1000) * (classic ? 16 : 46));
  for (let k = 0; k < tries; k++) {
    const kind = kinds[Math.floor(r() * kinds.length)];
    const [a, b] = SIZE[kind] ?? [70, 100];
    const size = (a + r() * (b - a)) ;
    const side = r() > 0.5;
    const x = side ? 30 + r() * 300 : 670 + r() * 300;
    const y = 90 + r() * (H - 90);
    if (!free(x, y, size * 0.4)) continue;
    props.push({ kind, x, y, size, flip: r() > 0.5, sway: !['pedras', 'cerca', 'canteiro', 'sebe', 'lanterna'].includes(kind) });
  }
  // detalhes miúdos: grama e flores perto da trilha
  const small = classic ? ['florzinha'] : theme === 'noturno' ? ['grama', 'cogumelos'] : theme === 'bosque' ? ['grama', 'samambaia', 'cogumelos'] : ['grama', 'flor', 'grama'];
  for (let i = 0; i < samples.length; i += 9) {
    const s = samples[i];
    if (r() > (classic ? 0.3 : 0.55)) continue;
    const off = (r() > 0.5 ? 1 : -1) * (58 + r() * 40);
    const nx = s.x + Math.sin(s.ang) * off;
    const ny = s.y - Math.cos(s.ang) * off * 0.4;
    const kind = small[Math.floor(r() * small.length)];
    const sz = (SIZE[kind]?.[0] ?? 40) * (0.7 + r() * 0.3);
    if (!free(nx, ny, 4)) continue;
    props.push({ kind, x: Math.min(985, Math.max(15, nx)), y: ny, size: sz, sway: true, flip: r() > 0.5 });
  }
  props.sort((a, b) => a.y - b.y);

  // decoração do próprio caminho
  const pathDeco: { kind: string; x: number; y: number; size: number; rot: number }[] = [];
  if (theme === 'pedras') {
    for (let i = 0; i < samples.length; i += 6) {
      const s = samples[i];
      const off = (i / 6) % 2 ? 9 : -9;
      pathDeco.push({ kind: 'pedra', x: s.x + Math.sin(s.ang) * off, y: s.y, size: 40 + r() * 10, rot: (s.ang * 180) / Math.PI + (r() - 0.5) * 30 });
    }
  }
  if (theme === 'florido' || theme === 'jardim') {
    for (let i = 4; i < samples.length; i += theme === 'jardim' ? 11 : 7) {
      const s = samples[i];
      for (const sgn of [1, -1]) {
        if (r() > 0.7) continue;
        const off = sgn * 34;
        pathDeco.push({ kind: theme === 'jardim' ? 'grama' : 'flor', x: s.x + Math.sin(s.ang) * off, y: s.y + 10, size: theme === 'jardim' ? 28 : 30 + r() * 8, rot: 0 });
      }
    }
  }
  if (theme === 'noturno') {
    for (let i = 20; i < samples.length; i += 26) {
      const s = samples[i];
      const sgn = (i / 26) % 2 ? 1 : -1;
      pathDeco.push({ kind: 'lanterna', x: s.x + Math.sin(s.ang) * 44 * sgn, y: s.y + 6, size: 46, rot: 0 });
    }
  }
  // riacho: corta a trilha entre algumas estações, com pontinha de madeira
  const streams: { y: number; bridgeX: number; bridgeAng: number }[] = [];
  if (theme === 'riacho') {
    for (let i = 0; i < n; i++) {
      if (i % 2 === 1 && n > 1) continue;
      const y = TOP + i * ROW + ROW / 2;
      if (y > H - 60) continue;
      let best = samples[0];
      for (const s of samples) if (Math.abs(s.y - y) < Math.abs(best.y - y)) best = s;
      streams.push({ y, bridgeX: best.x, bridgeAng: best.ang });
    }
  }
  const pond = classic ? { x: seed % 2 ? 180 : 820, y: Math.min(H - 170, TOP + ROW * 1.55) } : theme === 'riacho' || theme === 'noturno' ? null : { x: seed % 2 ? 160 : 840, y: Math.min(H - 170, TOP + ROW * 1.55) };
  return { props, pathDeco, streams, pond };
}

// ── Paisagem do caminho clássico ─────────────────────────────
// Em vez de enfeites soltos, o cenário é montado em zonas a partir da
// distância até a trilha: bosque denso longe dela, arbustos e pedras no meio,
// flores e grama na beira. Tudo é calculado em pixels (largura real do mapa),
// para que as ilustrações mantenham a proporção em qualquer tela.

/** altura/largura de cada ilustração, para a base sempre tocar o chão */
export const PROP_ASPECT: Record<string, number> = {
  arvore: 150 / 120, ipe: 150 / 120, pinheiro: 160 / 90, arbusto: 70 / 120, flor: 70 / 80,
  tulipas: 1, pedras: 44 / 80, grama: 30 / 50, samambaia: 70 / 90, cogumelos: 56 / 70,
};

export interface Patch { cx: number; cy: number; rx: number; ry: number; tone: 'light' | 'dark' }
export interface Landscape {
  props: Prop[];
  pond: { x: number; y: number; w: number } | null; // x em viewBox, y e w em px
  patches: Patch[]; // manchas do gramado, em unidades do viewBox
  scale: number;
}

export function buildLandscape(n: number, H: number, Bw: number, seed: number, samples: Pt[]): Landscape {
  const r = rng(seed * 13 + n * 7 + 3);
  const k = Bw / W; // px por unidade do viewBox
  const s = Math.min(1.05, Math.max(0.5, Bw / 1150));
  const path = samples.filter((_, i) => i % 2 === 0).map((p) => ({ x: p.x * k, y: p.y }));
  const stations = Array.from({ length: n + 1 }, (_, i) => ({ x: xAt(i) * k, y: TOP + i * ROW, chest: i === n }));
  const distPath = (x: number, y: number) => {
    let m = Infinity;
    for (const p of path) {
      const d = (p.x - x) ** 2 + (p.y - y) ** 2;
      if (d < m) m = d;
    }
    return Math.sqrt(m);
  };
  const pathXAt = (y: number) => {
    let best = path[0];
    for (const p of path) if (Math.abs(p.y - y) < Math.abs(best.y - y)) best = p;
    return best?.x ?? Bw / 2;
  };

  type Box = { x0: number; x1: number; y0: number; y1: number };
  const hit = (a: Box, b: Box) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
  // estação = anel + nome embaixo + balão "Continuar" em cima
  const reserved: Box[] = stations.map((st) =>
    st.chest
      ? { x0: st.x - 80, x1: st.x + 80, y0: st.y - 70, y1: st.y + 70 }
      : { x0: st.x - 100, x1: st.x + 100, y0: st.y - 112, y1: st.y + 122 },
  );

  // lago: o maior que couber num espaço livre ao lado da trilha
  let pond: Landscape['pond'] = null;
  if (n >= 1) {
    const ys: number[] = [];
    for (let y = TOP + 70; y < TOP + n * ROW - 30; y += 24) ys.push(y);
    const xs: number[] = [];
    for (let x = 60 * s; x < Bw - 60 * s; x += 24) xs.push(x);
    outer: for (const w of [340, 300, 260, 220, 190].map((v) => v * s)) {
      const h = w * 0.46;
      const opts: { x: number; y: number }[] = [];
      for (const y of ys) for (const x of xs) if (x - w / 2 > 6 && x + w / 2 < Bw - 6) opts.push({ x, y });
      // começa por um ponto sorteado, para cada capítulo ter o lago num lugar
      const off = Math.floor(r() * Math.max(1, opts.length));
      for (let j = 0; j < opts.length; j++) {
        const { x, y } = opts[(j + off) % opts.length];
        const box = { x0: x - w / 2, x1: x + w / 2, y0: y - h / 2, y1: y + h / 2 };
        if (reserved.some((b) => hit(b, box))) continue;
        let ok = distPath(x, y) > 40 + h / 2;
        for (let a = 0; ok && a < 16; a++) {
          const t = (a / 16) * Math.PI * 2;
          ok = distPath(x + (Math.cos(t) * w) / 2, y + (Math.sin(t) * h) / 2) > 34 * s;
        }
        if (!ok) continue;
        reserved.push({ ...box, y0: box.y0 - 14 * s });
        pond = { x: x / k, y, w };
        break outer;
      }
    }
  }

  const props: Prop[] = [];
  const placed: { x: number; y: number; w: number; h: number }[] = [];
  const tryPlace = (kind: string, x: number, y: number, w: number, opts: { edge?: boolean; skipStations?: boolean } = {}) => {
    const h = w * (PROP_ASPECT[kind] ?? 1);
    if (y - h > H || y < 10) return false;
    // nada nasce no horizonte nem cobre o título do capítulo
    if (y < 96 || y - h < (opts.edge ? -34 : -6)) return false;
    // não invade o caminho (base e miolo da copa)
    const clear = 26 + w * 0.36;
    if (distPath(x, y) < clear || distPath(x, y - h * 0.45) < 24 + w * 0.42) return false;
    const box = { x0: x - w * 0.4, x1: x + w * 0.4, y0: y - h * 0.85, y1: y };
    if (!opts.skipStations && reserved.some((b) => hit(b, box))) return false;
    if (opts.skipStations && reserved.slice(0, n + 1).some((b) => hit({ x0: b.x0 + 12, x1: b.x1 - 12, y0: b.y0 + 30, y1: b.y1 - 6 }, box))) return false;
    // copas podem se sobrepor (bosque), mas as bases não se empilham
    if (placed.some((p) => Math.abs(p.x - x) < (p.w + w) * (opts.edge ? 0.2 : 0.3) && Math.abs(p.y - y) < Math.max(14, Math.min(p.h, h) * 0.26))) return false;
    placed.push({ x, y, w, h });
    props.push({ kind, x: x / k, y, size: w, flip: r() > 0.5, sway: !['pedras'].includes(kind) });
    return true;
  };
  const pick = (tbl: [string, number][]) => {
    let t = r() * tbl.reduce((a, [, p]) => a + p, 0);
    for (const [kind, p] of tbl) if ((t -= p) <= 0) return kind;
    return tbl[0][0];
  };
  const TREES: [string, number][] = [['arvore', 5], ['pinheiro', 3], ['ipe', 3]];

  // 1. bosque que emoldura as laterais (árvores cortadas pela borda)
  for (const side of [0, 1]) {
    for (let y = 40 + r() * 30; y < H + 60; y += (54 + r() * 26) * s) {
      const inset = (-14 + r() * 46) * s;
      const x = side ? Bw - inset : inset;
      tryPlace(pick(TREES), x, y, (150 + r() * 50) * s, { edge: true });
    }
  }

  // 2. vegetação em zonas, da mais distante para a mais próxima da trilha
  const step = 64 * s;
  const cands: { x: number; y: number; d: number }[] = [];
  for (let gy = 50; gy < H + 40; gy += step) {
    for (let gx = step / 2; gx < Bw; gx += step) {
      const x = gx + (r() - 0.5) * step * 0.8;
      const y = gy + (r() - 0.5) * step * 0.8;
      cands.push({ x, y, d: distPath(x, y) });
    }
  }
  cands.sort((a, b) => b.d - a.d);
  for (const c of cands) {
    const roll = r();
    if (c.d > 165 * s) {
      if (roll < 0.6) tryPlace(pick(TREES), c.x, c.y, (122 + r() * 46) * s);
    } else if (c.d > 92 * s) {
      if (roll < 0.42) {
        const kind = pick([['arbusto', 6], ['pedras', 1.5], ['tulipas', 1.5], ['samambaia', 1]]);
        const w = kind === 'arbusto' ? 86 + r() * 22 : kind === 'pedras' ? 58 + r() * 14 : 50 + r() * 10;
        tryPlace(kind, c.x, c.y, w * s);
      }
    } else if (c.d > 44 * s && roll < 0.42) {
      const kind = pick([['flor', 5], ['grama', 3], ['tulipas', 1.5]]);
      tryPlace(kind, c.x, c.y, (kind === 'grama' ? 30 + r() * 8 : 38 + r() * 10) * s);
    }
  }

  // 3. canteirinhos que ladeiam cada estação, como uma praça
  for (let i = 0; i < n; i++) {
    const st = stations[i];
    for (const sgn of [-1, 1]) tryPlace(r() > 0.35 ? 'flor' : 'tulipas', st.x + sgn * (108 + r() * 14), st.y + 46, 42 * Math.max(0.8, s), { skipStations: true });
  }

  // manchas de grama mais clara/escura para dar relevo ao gramado
  const patches: Patch[] = [];
  for (let y = 120; y < H; y += 110 + r() * 60) {
    const side = r() > 0.5;
    patches.push({ cx: side ? 120 + r() * 200 : 680 + r() * 200, cy: y, rx: 140 + r() * 120, ry: 34 + r() * 26, tone: r() > 0.45 ? 'light' : 'dark' });
  }

  props.sort((a, b) => a.y - b.y);
  return { props, pond, patches, scale: s };
}
