// Partículas rápidas no ponto do clique (brilhos, folhas, gotas, corações).
// São elementos soltos com animação CSS, removidos sozinhos em menos de 1 s.
// Não aparecem com movimento reduzido.

export type BurstKind = 'brilho' | 'folhas' | 'gotas' | 'coracoes' | 'confete';

const COLORS: Record<BurstKind, string[]> = {
  brilho: ['#FFF3B0', '#F2C14E', '#FFFFFF', '#F8C9F1'],
  folhas: ['#AFC47E', '#7E9A4A', '#D9EE76'],
  gotas: ['#9CC3F2', '#CFE4FF', '#FFFFFF'],
  coracoes: ['#F38CB8', '#F8C9F1', '#FFAEB1'],
  confete: ['#F38CB8', '#D9EE76', '#FFF3B0', '#CFE4FF', '#E9D8FF'],
};

// a classe é ligada pelo App conforme a preferência (Configurações ou sistema)
const reduced = () => document.documentElement.classList.contains('reduce-motion');

type Pointish = { clientX: number; clientY: number; currentTarget?: unknown };

export function burst(at: { x: number; y: number } | Pointish | Element, kind: BurstKind = 'brilho', count = 10) {
  if (typeof document === 'undefined' || reduced()) return;
  let x: number;
  let y: number;
  if (at instanceof Element) {
    const r = at.getBoundingClientRect();
    x = r.left + r.width / 2;
    y = r.top + r.height / 2;
  } else if ('clientX' in at) {
    x = at.clientX;
    y = at.clientY;
    if (!x && !y && 'currentTarget' in at && at.currentTarget instanceof Element) {
      const r = at.currentTarget.getBoundingClientRect();
      x = r.left + r.width / 2;
      y = r.top + r.height / 2;
    }
  } else {
    x = at.x;
    y = at.y;
  }
  const host = document.createElement('div');
  host.className = `fx-burst fx-${kind}`;
  host.style.left = `${x}px`;
  host.style.top = `${y}px`;
  host.setAttribute('aria-hidden', 'true');
  const colors = COLORS[kind];
  for (let i = 0; i < count; i++) {
    const p = document.createElement('i');
    const a = (i / count) * Math.PI * 2 + Math.random() * 0.5;
    const d = 26 + Math.random() * 30;
    p.style.setProperty('--dx', `${Math.cos(a) * d}px`);
    p.style.setProperty('--dy', `${Math.sin(a) * d - (kind === 'gotas' ? -10 : 12)}px`);
    p.style.setProperty('--r', `${Math.round(Math.random() * 300 - 150)}deg`);
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = `${Math.random() * 60}ms`;
    host.appendChild(p);
  }
  document.body.appendChild(host);
  setTimeout(() => host.remove(), 900);
}

/** conta cliques seguidos no mesmo objeto (para segredos de "clique 3 vezes") */
const taps = new Map<string, { n: number; t: number }>();
export function multiTap(id: string, need = 3, windowMs = 900): boolean {
  const now = Date.now();
  const cur = taps.get(id);
  const n = cur && now - cur.t < windowMs ? cur.n + 1 : 1;
  taps.set(id, { n, t: now });
  if (n >= need) {
    taps.delete(id);
    return true;
  }
  return false;
}
