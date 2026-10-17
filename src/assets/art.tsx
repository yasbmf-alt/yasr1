// Ilustrações PROVISÓRIAS em SVG. Cada uma ocupa um "slot" substituível
// pelas artes da Yasmim (ver registry.tsx). Estilo: 2D flat, sem contorno,
// sombras em blocos de cor — nada de gradiente 3D.
import React from 'react';
import type { Area } from '../types';

const C = {
  azul: '#2E4A7F',
  lima: '#D9EE76',
  rosa: '#F8C9F1',
  manteiga: '#FFF3B0',
  lilas: '#E9D8FF',
  azulClaro: '#CFE4FF',
  pessego: '#FFAEB1',
  rosaMedio: '#F38CB8',
  salvia: '#AFC47E',
  salviaEsc: '#8DA35C',
  terra: '#C9A27E',
  terraEsc: '#A9805D',
  tronco: '#9A6B4F',
  laranja: '#FFB86B',
  roxo: '#B79AF0',
  branco: '#FFFDFB',
};

type P = { size?: number | string; className?: string };
const svgProps = (vb: string, p: P) => ({
  viewBox: vb,
  width: p.size ?? '100%',
  height: p.size ?? '100%',
  className: p.className,
  xmlns: 'http://www.w3.org/2000/svg',
  'aria-hidden': true as const,
});

// ── Estações da trilha (ícone dentro do círculo) ──────────────

export function StationIcon({ area, ...p }: P & { area: Area | 'internato' }) {
  const vb = '0 0 64 64';
  switch (area) {
    case 'clinica':
      return (
        <svg {...svgProps(vb, p)}>
          <path d="M32 52 C14 40 8 30 8 22 a11 11 0 0 1 24-6 a11 11 0 0 1 24 6 c0 8-6 18-24 30z" fill={C.rosaMedio} />
          <path d="M12 29 h10 l4-8 l6 16 l5-10 h15" fill="none" stroke={C.branco} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'cirurgia':
      return (
        <svg {...svgProps(vb, p)}>
          <rect x="8" y="36" width="30" height="9" rx="4.5" transform="rotate(-35 23 40)" fill={C.azul} />
          <path d="M33 30 L54 12 c3 6 0 13-6 17 L37 37z" fill={C.azulClaro} />
          <path d="M33 30 L54 12 c1 3 0 6-2 8 L36 34z" fill={C.branco} />
        </svg>
      );
    case 'go':
      return (
        <svg {...svgProps(vb, p)}>
          {[0, 72, 144, 216, 288].map((r) => (
            <ellipse key={r} cx="32" cy="18" rx="9" ry="14" fill={C.roxo} transform={`rotate(${r} 32 32)`} opacity="0.85" />
          ))}
          <circle cx="32" cy="32" r="8" fill={C.manteiga} />
        </svg>
      );
    case 'pediatria':
      return (
        <svg {...svgProps(vb, p)}>
          <circle cx="18" cy="18" r="8" fill={C.laranja} />
          <circle cx="46" cy="18" r="8" fill={C.laranja} />
          <circle cx="32" cy="35" r="19" fill={C.laranja} />
          <ellipse cx="32" cy="42" rx="9" ry="7" fill={C.manteiga} />
          <circle cx="25" cy="31" r="2.6" fill={C.azul} />
          <circle cx="39" cy="31" r="2.6" fill={C.azul} />
          <ellipse cx="32" cy="39" rx="3" ry="2.2" fill={C.azul} />
        </svg>
      );
    case 'preventiva':
      return (
        <svg {...svgProps(vb, p)}>
          <path d="M32 6 L54 14 v16 c0 14-10 24-22 28 C20 54 10 44 10 30 V14z" fill={C.salvia} />
          <path d="M32 6 L54 14 v16 c0 14-10 24-22 28z" fill={C.salviaEsc} opacity=".35" />
          <rect x="28" y="20" width="8" height="24" rx="2" fill={C.branco} />
          <rect x="20" y="28" width="24" height="8" rx="2" fill={C.branco} />
        </svg>
      );
    case 'internato':
      return (
        <svg {...svgProps(vb, p)}>
          <rect x="12" y="20" width="40" height="34" rx="4" fill={C.branco} />
          <rect x="12" y="20" width="40" height="8" fill={C.pessego} />
          <path d="M20 20 L32 8 L44 20z" fill={C.rosaMedio} />
          <rect x="28" y="32" width="8" height="16" rx="1.5" fill={C.rosaMedio} />
          <rect x="22" y="38" width="20" height="5" rx="1.5" fill={C.rosaMedio} />
          <rect x="16" y="46" width="8" height="8" fill={C.azulClaro} />
          <rect x="40" y="46" width="8" height="8" fill={C.azulClaro} />
        </svg>
      );
    default:
      return (
        <svg {...svgProps(vb, p)}>
          <rect x="14" y="10" width="34" height="44" rx="4" fill={C.pessego} />
          <rect x="14" y="10" width="7" height="44" rx="2" fill={C.rosaMedio} />
          <rect x="26" y="18" width="16" height="4" rx="2" fill={C.branco} />
          <rect x="26" y="26" width="12" height="3" rx="1.5" fill={C.branco} opacity=".7" />
          <path d="M40 54 v8 l3-2 l3 2 v-8z" fill={C.laranja} />
        </svg>
      );
  }
}

// ── Baú de recompensa do capítulo ─────────────────────────────

export function Chest({ open, ...p }: P & { open?: boolean }) {
  return (
    <svg {...svgProps('0 0 80 70', p)}>
      <ellipse cx="40" cy="64" rx="30" ry="4" fill="#000" opacity=".08" />
      <rect x="10" y="30" width="60" height="32" rx="6" fill={C.rosaMedio} />
      <rect x="10" y="30" width="60" height="8" fill="#E2729F" />
      <rect x="34" y="30" width="12" height="32" fill={C.manteiga} />
      {open ? (
        <>
          <path d="M10 30 L18 8 h44 l8 22z" fill={C.rosa} />
          <path d="M34 30 L38 8 h4 l4 22z" fill={C.manteiga} />
          {[18, 30, 48, 60].map((x, i) => (
            <circle key={x} cx={x} cy={22 - (i % 2) * 6} r="4" fill={i % 2 ? C.lima : C.laranja} />
          ))}
        </>
      ) : (
        <>
          <path d="M10 30 c0-12 8-18 30-18 s30 6 30 18z" fill={C.rosa} />
          <rect x="34" y="12" width="12" height="18" fill={C.manteiga} />
          <rect x="35" y="34" width="10" height="10" rx="2" fill={C.azul} />
        </>
      )}
    </svg>
  );
}

// ── Decoração da trilha ───────────────────────────────────────

export function TrailDecor({ kind, ...p }: P & { kind: 'arvore' | 'nuvem' | 'flor' | 'arbusto' }) {
  if (kind === 'nuvem')
    return (
      <svg {...svgProps('0 0 120 50', p)}>
        <path d="M14 44 h92 a14 14 0 0 0-10-24 a20 20 0 0 0-36-6 a16 16 0 0 0-30 10 a12 12 0 0 0-16 20z" fill={C.branco} opacity=".9" />
      </svg>
    );
  if (kind === 'flor')
    return (
      <svg {...svgProps('0 0 40 50', p)}>
        <rect x="19" y="20" width="2.5" height="28" fill={C.salviaEsc} />
        <ellipse cx="14" cy="36" rx="6" ry="3" fill={C.salvia} transform="rotate(-30 14 36)" />
        {[0, 72, 144, 216, 288].map((r) => (
          <ellipse key={r} cx="20" cy="12" rx="5" ry="8" fill={C.pessego} transform={`rotate(${r} 20 18)`} />
        ))}
        <circle cx="20" cy="18" r="4" fill={C.manteiga} />
      </svg>
    );
  if (kind === 'arbusto')
    return (
      <svg {...svgProps('0 0 80 44', p)}>
        <circle cx="22" cy="28" r="16" fill={C.salvia} />
        <circle cx="44" cy="22" r="20" fill={C.salviaEsc} />
        <circle cx="62" cy="30" r="14" fill={C.salvia} />
        <circle cx="40" cy="16" r="3" fill={C.rosaMedio} />
        <circle cx="54" cy="26" r="3" fill={C.manteiga} />
      </svg>
    );
  return (
    <svg {...svgProps('0 0 60 90', p)}>
      <rect x="27" y="50" width="6" height="38" rx="2" fill={C.tronco} />
      <circle cx="30" cy="34" r="22" fill={C.rosaMedio} />
      <circle cx="18" cy="44" r="12" fill={C.rosa} />
      <circle cx="42" cy="22" r="11" fill={C.rosa} />
    </svg>
  );
}

// ── Plantas do jardim ─────────────────────────────────────────

export type Species = 'ipe' | 'mandacaru' | 'lirio' | 'girassol' | 'pequizeiro' | 'samambaia';

export const SPECIES_BY_AREA: Record<Area, Species> = {
  clinica: 'ipe',
  cirurgia: 'mandacaru',
  go: 'lirio',
  pediatria: 'girassol',
  preventiva: 'pequizeiro',
  geral: 'samambaia',
};

export const SPECIES_LABEL: Record<Species, string> = {
  ipe: 'Ipê-rosa',
  mandacaru: 'Mandacaru',
  lirio: 'Lírio',
  girassol: 'Girassol',
  pequizeiro: 'Pequizeiro',
  samambaia: 'Samambaia',
};

const SP: Record<Species, { leaf: string; leaf2: string; bloom: string; bloom2: string }> = {
  ipe: { leaf: C.salvia, leaf2: C.salviaEsc, bloom: C.rosaMedio, bloom2: C.rosa },
  mandacaru: { leaf: C.salvia, leaf2: C.salviaEsc, bloom: C.pessego, bloom2: C.branco },
  lirio: { leaf: C.salvia, leaf2: C.salviaEsc, bloom: C.roxo, bloom2: C.lilas },
  girassol: { leaf: C.salvia, leaf2: C.salviaEsc, bloom: C.laranja, bloom2: C.manteiga },
  pequizeiro: { leaf: C.salviaEsc, leaf2: C.salvia, bloom: C.manteiga, bloom2: C.laranja },
  samambaia: { leaf: '#B8D16A', leaf2: C.salviaEsc, bloom: C.lima, bloom2: C.salvia },
};

const Leaf = ({ x, y, r, s = 1, fill }: { x: number; y: number; r: number; s?: number; fill: string }) => (
  <path
    d={`M0 0 C ${6 * s} ${-6 * s} ${16 * s} ${-6 * s} ${22 * s} 0 C ${16 * s} ${6 * s} ${6 * s} ${6 * s} 0 0z`}
    transform={`translate(${x} ${y}) rotate(${r})`}
    fill={fill}
  />
);

const Soil = () => (
  <>
    <ellipse cx="50" cy="112" rx="30" ry="6" fill={C.terraEsc} />
    <ellipse cx="50" cy="110" rx="26" ry="5" fill={C.terra} />
  </>
);

export function PlantArt({ species, stage, ...p }: P & { species: Species; stage: 1 | 2 | 3 | 4 }) {
  const c = SP[species];
  const vb = '0 0 100 120';
  if (stage === 1)
    return (
      <svg {...svgProps(vb, p)}>
        <Soil />
        <ellipse cx="50" cy="104" rx="7" ry="5" fill="#E6CDA8" />
        <path d="M50 100 c0-6 3-9 7-10 c-1 4-3 7-7 10z" fill={c.leaf} />
      </svg>
    );
  if (stage === 2)
    return (
      <svg {...svgProps(vb, p)}>
        <Soil />
        <rect x="48.8" y="80" width="2.4" height="30" rx="1.2" fill={c.leaf2} />
        <Leaf x={50} y={84} r={-150} s={0.9} fill={c.leaf} />
        <Leaf x={50} y={84} r={-30} s={0.9} fill={c.leaf2} />
      </svg>
    );
  if (stage === 3)
    return (
      <svg {...svgProps(vb, p)}>
        <Soil />
        <rect x="48.6" y="50" width="2.8" height="60" rx="1.4" fill={c.leaf2} />
        <Leaf x={50} y={92} r={-160} fill={c.leaf} />
        <Leaf x={50} y={84} r={-20} fill={c.leaf2} />
        <Leaf x={50} y={70} r={-150} s={0.8} fill={c.leaf2} />
        <Leaf x={50} y={62} r={-30} s={0.8} fill={c.leaf} />
        <ellipse cx="50" cy="46" rx="6" ry="9" fill={c.bloom} />
        <path d="M44 48 q6 8 12 0 q-6 4-12 0z" fill={c.leaf} />
      </svg>
    );
  // estágio 4 — espécie completa
  switch (species) {
    case 'ipe':
      return (
        <svg {...svgProps(vb, p)}>
          <Soil />
          <path d="M47 110 L48 64 L38 50 L41 48 L50 58 L58 44 L61 46 L52 64 L53 110z" fill={C.tronco} />
          {[
            [32, 42, 15], [50, 30, 18], [68, 42, 15], [40, 52, 11], [60, 54, 11], [50, 46, 13],
          ].map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} fill={i % 2 ? c.bloom2 : c.bloom} />
          ))}
          {[[36, 34], [58, 26], [66, 48], [46, 44]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="2.4" fill={C.branco} opacity=".8" />
          ))}
        </svg>
      );
    case 'mandacaru':
      return (
        <svg {...svgProps(vb, p)}>
          <Soil />
          <rect x="42" y="30" width="16" height="80" rx="8" fill={c.leaf} />
          <rect x="47" y="30" width="3" height="78" rx="1.5" fill={c.leaf2} opacity=".6" />
          <path d="M42 74 h-10 a6 6 0 0 1-6-6 v-18 a6 6 0 0 1 12 0 v12 h4z" fill={c.leaf2} />
          <path d="M58 64 h10 a6 6 0 0 0 6-6 v-14 a6 6 0 0 0-12 0 v8 h-4z" fill={c.leaf2} />
          {[0, 60, 120, 180, 240, 300].map((r) => (
            <ellipse key={r} cx="50" cy="22" rx="3.5" ry="7" fill={r % 120 ? c.bloom : c.bloom2} transform={`rotate(${r} 50 28)`} />
          ))}
          <circle cx="50" cy="28" r="3" fill={C.manteiga} />
        </svg>
      );
    case 'lirio':
      return (
        <svg {...svgProps(vb, p)}>
          <Soil />
          <rect x="48.6" y="44" width="2.8" height="66" rx="1.4" fill={c.leaf2} />
          <Leaf x={50} y={100} r={-120} s={1.4} fill={c.leaf} />
          <Leaf x={50} y={96} r={-60} s={1.4} fill={c.leaf2} />
          <Leaf x={50} y={80} r={-145} s={1.1} fill={c.leaf2} />
          {[-60, -20, 20, 60, 180].map((r, i) => (
            <path key={r} d="M50 42 C 44 30 46 16 50 10 C 54 16 56 30 50 42z" fill={i % 2 ? c.bloom2 : c.bloom} transform={`rotate(${r} 50 42)`} />
          ))}
          <circle cx="50" cy="40" r="4" fill={C.manteiga} />
        </svg>
      );
    case 'girassol':
      return (
        <svg {...svgProps(vb, p)}>
          <Soil />
          <rect x="48.4" y="44" width="3.2" height="66" rx="1.6" fill={c.leaf2} />
          <Leaf x={50} y={90} r={-160} s={1.3} fill={c.leaf} />
          <Leaf x={50} y={76} r={-20} s={1.3} fill={c.leaf2} />
          {Array.from({ length: 14 }).map((_, i) => (
            <ellipse key={i} cx="50" cy="18" rx="4.5" ry="11" fill={i % 2 ? c.bloom : c.bloom2} transform={`rotate(${i * (360 / 14)} 50 32)`} />
          ))}
          <circle cx="50" cy="32" r="10" fill={C.tronco} />
          <circle cx="50" cy="32" r="6" fill={C.terraEsc} />
        </svg>
      );
    case 'pequizeiro':
      return (
        <svg {...svgProps(vb, p)}>
          <Soil />
          <path d="M46 110 L47 70 L36 58 L40 56 L50 64 L58 52 L62 54 L53 70 L54 110z" fill={C.tronco} />
          <ellipse cx="50" cy="44" rx="34" ry="24" fill={c.leaf} />
          <ellipse cx="38" cy="38" rx="16" ry="12" fill={c.leaf2} />
          <ellipse cx="64" cy="48" rx="14" ry="10" fill={c.leaf2} />
          {[[32, 50], [50, 34], [68, 40], [56, 56], [42, 58]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="4" fill={c.bloom} />
          ))}
        </svg>
      );
    default:
      return (
        <svg {...svgProps(vb, p)}>
          <Soil />
          {[-150, -120, -90, -60, -30].map((r, i) => (
            <g key={r} transform={`translate(50 108) rotate(${r})`}>
              <path d={`M0 0 Q ${30 + i * 2} -6 ${44 + (i % 2) * 6} 4`} fill="none" stroke={i % 2 ? c.leaf2 : c.leaf} strokeWidth="3" strokeLinecap="round" />
              {Array.from({ length: 6 }).map((_, k) => (
                <ellipse key={k} cx={8 + k * 6} cy={-3 + k * 0.4} rx="3" ry="6" fill={i % 2 ? c.leaf2 : c.leaf} transform={`rotate(${-20} ${8 + k * 6} ${-3})`} />
              ))}
            </g>
          ))}
        </svg>
      );
  }
}

/** Flor especial — uma por capítulo concluído */
export function SpecialFlower(p: P) {
  return (
    <svg {...svgProps('0 0 100 120', p)}>
      <Soil />
      <rect x="48.6" y="40" width="2.8" height="70" rx="1.4" fill={C.salviaEsc} />
      <Leaf x={50} y={92} r={-150} s={1.2} fill={C.salvia} />
      <Leaf x={50} y={80} r={-30} s={1.2} fill={C.salviaEsc} />
      {Array.from({ length: 8 }).map((_, i) => (
        <path key={i} d="M50 34 C 44 24 46 10 50 4 C 54 10 56 24 50 34z" fill={i % 2 ? C.laranja : C.manteiga} transform={`rotate(${i * 45} 50 34)`} />
      ))}
      <circle cx="50" cy="34" r="7" fill={C.rosaMedio} />
      <circle cx="50" cy="34" r="3" fill={C.branco} />
    </svg>
  );
}

// ── Decoração do jardim ───────────────────────────────────────

export function GardenDecor({ kind, ...p }: P & { kind: string }) {
  switch (kind) {
    case 'regador':
      return (
        <svg {...svgProps('0 0 80 60', p)}>
          <path d="M18 22 h30 v28 a6 6 0 0 1-6 6 h-18 a6 6 0 0 1-6-6z" fill={C.azulClaro} />
          <path d="M48 30 L70 16 l4 4 L50 40z" fill={C.azulClaro} />
          <rect x="66" y="10" width="10" height="8" rx="2" fill={C.azul} transform="rotate(-30 71 14)" />
          <path d="M22 22 c0-14 22-14 22 0" fill="none" stroke={C.azul} strokeWidth="4" />
        </svg>
      );
    case 'banco':
      return (
        <svg {...svgProps('0 0 90 50', p)}>
          <rect x="8" y="10" width="74" height="7" rx="3" fill={C.tronco} />
          <rect x="8" y="21" width="74" height="7" rx="3" fill={C.tronco} />
          <rect x="6" y="30" width="78" height="7" rx="3" fill="#B5845F" />
          <rect x="14" y="36" width="5" height="12" fill={C.azul} />
          <rect x="71" y="36" width="5" height="12" fill={C.azul} />
        </svg>
      );
    case 'lanterna':
      return (
        <svg {...svgProps('0 0 40 90', p)}>
          <rect x="18" y="30" width="4" height="58" fill={C.azul} />
          <path d="M8 14 h24 l-4 20 h-16z" fill={C.manteiga} />
          <path d="M6 14 h28 l-6-8 h-16z" fill={C.azul} />
          <circle cx="20" cy="24" r="4" fill={C.laranja} />
        </svg>
      );
    case 'fonte':
      return (
        <svg {...svgProps('0 0 100 70', p)}>
          <ellipse cx="50" cy="56" rx="44" ry="12" fill={C.lilas} />
          <ellipse cx="50" cy="52" rx="36" ry="8" fill={C.azulClaro} />
          <rect x="46" y="22" width="8" height="30" fill={C.lilas} />
          <ellipse cx="50" cy="22" rx="16" ry="5" fill={C.lilas} />
          <path d="M50 18 c-2-10 2-14 0-16 M50 18 c6-8 12-6 14 2 M50 18 c-6-8-12-6-14 2" fill="none" stroke={C.azulClaro} strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

// ── Mascote provisório e celebração ───────────────────────────

export type MascotMood = 'acenando' | 'comemorando' | 'chocada' | 'sono' | 'festa';

export function Mascot({ mood = 'acenando', ...p }: P & { mood?: MascotMood }) {
  // Placeholder: estetoscópio que forma um coração, num círculo rosa.
  // As expressões só acrescentam detalhes; o desenho base é o mesmo.
  return (
    <svg {...svgProps('0 0 120 120', p)}>
      <circle cx="60" cy="60" r="56" fill={C.rosa} />
      <path d="M36 30 v22 a24 24 0 0 0 48 0 v-22" fill="none" stroke={C.azul} strokeWidth="6" strokeLinecap="round" />
      <circle cx="36" cy="28" r="5" fill={C.azul} />
      <circle cx="84" cy="28" r="5" fill={C.azul} />
      <path d="M60 76 v14 a10 10 0 0 0 20 0" fill="none" stroke={C.azul} strokeWidth="6" strokeLinecap="round" />
      <circle cx="80" cy="92" r="9" fill={C.rosaMedio} />
      <circle cx="80" cy="92" r="4" fill={C.branco} />
      <path d="M60 62 c-8-6-14-10-14-16 a6 6 0 0 1 14-3 a6 6 0 0 1 14 3 c0 6-6 10-14 16z" fill={C.rosaMedio} />
      {mood === 'comemorando' && (
        <>
          <path d="M53 46 q2 -3 4 0 M63 46 q2 -3 4 0" stroke={C.azul} strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M56 51 q4 4 8 0" stroke={C.azul} strokeWidth="1.8" fill={C.branco} strokeLinecap="round" />
          {[[18, 30], [100, 24], [104, 70], [14, 76]].map(([x, y], i) => (
            <path key={i} d={`M${x} ${y - 6} l1.8 4.2 4.2 1.8 -4.2 1.8 -1.8 4.2 -1.8 -4.2 -4.2 -1.8 4.2 -1.8z`} fill={i % 2 ? C.manteiga : C.branco} />
          ))}
        </>
      )}
      {mood === 'chocada' && (
        <>
          <circle cx="55" cy="46" r="2.4" fill={C.azul} />
          <circle cx="65" cy="46" r="2.4" fill={C.azul} />
          <ellipse cx="60" cy="53" rx="2.4" ry="3" fill={C.azul} />
          <path d="M94 34 q4 6 0 9 q-4 -3 0 -9z" fill={C.azulClaro} />
        </>
      )}
      {mood === 'sono' && (
        <>
          <path d="M52 47 q3 2 6 0 M62 47 q3 2 6 0" stroke={C.azul} strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M90 22 h8 l-8 9 h8 M100 10 h6 l-6 7 h6" stroke={C.azul} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {mood === 'festa' && (
        <>
          <path d="M52 47 q2 -3 4 0 M64 47 q2 -3 4 0" stroke={C.azul} strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M60 6 L72 28 H48z" fill={C.lima} stroke={C.azul} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M53 20 l12 -4 M51 25 l18 -5" stroke={C.rosaMedio} strokeWidth="2" />
          <circle cx="60" cy="6" r="4" fill={C.manteiga} />
        </>
      )}
    </svg>
  );
}

export function CelebrationArt(p: P & { big?: boolean }) {
  return (
    <svg {...svgProps('0 0 200 160', p)}>
      <circle cx="100" cy="86" r="62" fill={C.lima} />
      {[[30, 30, C.rosaMedio], [170, 40, C.laranja], [24, 120, C.roxo], [178, 124, C.azul], [60, 10, C.pessego], [140, 14, C.salvia]].map(([x, y, f], i) => (
        <rect key={i} x={x as number} y={y as number} width="10" height="16" rx="3" fill={f as string} transform={`rotate(${i * 37} ${x} ${y})`} />
      ))}
      <path d="M62 120 l16-64 l22 30 l22-30 l16 64z" fill={C.manteiga} />
      <path d="M62 120 h76 v10 h-76z" fill={C.laranja} />
      <circle cx="78" cy="54" r="6" fill={C.rosaMedio} />
      <circle cx="100" cy="84" r="6" fill={C.rosaMedio} />
      <circle cx="122" cy="54" r="6" fill={C.rosaMedio} />
    </svg>
  );
}

// ── Biblioteca (preparado para a etapa do armário) ────────────

export function Wardrobe({ open, ...p }: P & { open?: boolean }) {
  return (
    <svg {...svgProps('0 0 200 240', p)}>
      <rect x="14" y="10" width="172" height="224" rx="10" fill="#B5845F" />
      <rect x="24" y="22" width="152" height="196" rx="6" fill={open ? '#8A5E44' : '#C99A72'} />
      {open ? (
        [70, 120, 170].map((y) => <rect key={y} x="24" y={y} width="152" height="6" fill="#B5845F" />)
      ) : (
        <>
          <rect x="99" y="22" width="2" height="196" fill="#8A5E44" />
          <circle cx="90" cy="120" r="4" fill={C.manteiga} />
          <circle cx="110" cy="120" r="4" fill={C.manteiga} />
        </>
      )}
      <rect x="10" y="226" width="180" height="10" rx="3" fill="#8A5E44" />
    </svg>
  );
}

// ── Armário: portas e gaveta (camadas separadas para animar) ──

export function DoorArt({ side, ...p }: P & { side: 'left' | 'right' }) {
  const knobX = side === 'left' ? 172 : 28;
  return (
    <svg {...svgProps('0 0 200 520', p)} preserveAspectRatio="none">
      <rect x="0" y="0" width="200" height="520" rx="6" fill="#C99A72" />
      <rect x="18" y="18" width="164" height="220" rx="10" fill="#D6AA82" />
      <rect x="18" y="262" width="164" height="240" rx="10" fill="#D6AA82" />
      <rect x="30" y="30" width="140" height="196" rx="6" fill="#CFA078" />
      <rect x="30" y="274" width="140" height="216" rx="6" fill="#CFA078" />
      {[60, 110, 330, 400].map((y) => (
        <path key={y} d={`M38 ${y} q60 -8 124 0`} fill="none" stroke="#BB8B63" strokeWidth="2" opacity=".5" />
      ))}
      <rect x={knobX - 5} y="232" width="10" height="56" rx="5" fill="#8A5E44" />
      <circle cx={knobX} cy="260" r="7" fill="#FFF3B0" />
    </svg>
  );
}

export function DrawerArt(p: P) {
  return (
    <svg {...svgProps('0 0 400 70', p)} preserveAspectRatio="none">
      <rect x="0" y="0" width="400" height="70" rx="8" fill="#C99A72" />
      <rect x="14" y="10" width="372" height="50" rx="8" fill="#D6AA82" />
      <rect x="170" y="28" width="60" height="12" rx="6" fill="#8A5E44" />
    </svg>
  );
}

// ── Adesivos colecionáveis ────────────────────────────────────

const DieFilter = () => (
  <defs>
    <filter id="die-cut" x="-20%" y="-20%" width="140%" height="140%">
      <feMorphology in="SourceAlpha" operator="dilate" radius="4" result="d" />
      <feFlood floodColor="#fff" />
      <feComposite in2="d" operator="in" result="o" />
      <feMerge>
        <feMergeNode in="o" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
);

export function StickerArt({ id, ...p }: P & { id: string }) {
  const body = (() => {
    switch (id) {
      case 'estetoscopio':
        return (
          <>
            <path d="M28 18 v26 a22 22 0 0 0 44 0 v-26" fill="none" stroke={C.azul} strokeWidth="9" strokeLinecap="round" />
            <path d="M50 66 v10 a10 10 0 0 0 20 0" fill="none" stroke={C.azul} strokeWidth="9" strokeLinecap="round" />
            <circle cx="70" cy="80" r="12" fill={C.rosaMedio} />
            <circle cx="70" cy="80" r="5" fill={C.branco} />
          </>
        );
      case 'coracao':
        return (
          <>
            <path d="M50 86 C20 66 10 50 10 34 a20 20 0 0 1 40-8 a20 20 0 0 1 40 8 c0 16-10 32-40 52z" fill={C.rosaMedio} />
            <ellipse cx="32" cy="34" rx="7" ry="10" fill={C.branco} opacity=".6" transform="rotate(-30 32 34)" />
          </>
        );
      case 'estrela':
        return (
          <>
            <path d="M50 8 l12 26 28 4 -20 20 5 28 -25 -13 -25 13 5 -28 -20 -20 28 -4z" fill={C.manteiga} />
            <path d="M50 8 l12 26 28 4 -20 20 5 28 -25 -13z" fill={C.laranja} opacity=".45" />
          </>
        );
      case 'cafe':
        return (
          <>
            <path d="M20 40 h48 v26 a18 18 0 0 1-18 18 h-12 a18 18 0 0 1-18-18z" fill={C.lilas} />
            <path d="M68 46 h6 a10 10 0 0 1 0 20 h-6" fill="none" stroke={C.lilas} strokeWidth="7" />
            <path d="M34 12 c-6 8 6 12 0 20 M50 12 c-6 8 6 12 0 20" fill="none" stroke={C.roxo} strokeWidth="5" strokeLinecap="round" />
            <rect x="20" y="40" width="48" height="8" fill={C.roxo} opacity=".4" />
          </>
        );
      case 'flor':
        return (
          <>
            {[0, 60, 120, 180, 240, 300].map((r) => (
              <ellipse key={r} cx="50" cy="26" rx="14" ry="20" fill={C.pessego} transform={`rotate(${r} 50 50)`} />
            ))}
            <circle cx="50" cy="50" r="14" fill={C.manteiga} />
          </>
        );
      case 'livros':
        return (
          <>
            <rect x="14" y="62" width="72" height="18" rx="4" fill={C.rosaMedio} />
            <rect x="20" y="42" width="62" height="18" rx="4" fill={C.azulClaro} />
            <rect x="16" y="22" width="66" height="18" rx="4" fill={C.lima} />
            <rect x="26" y="26" width="30" height="4" rx="2" fill={C.branco} />
          </>
        );
      case 'ecg':
        return (
          <>
            <rect x="8" y="20" width="84" height="60" rx="14" fill={C.azul} />
            <path d="M16 54 h18 l6-14 l8 26 l7-18 h29" fill="none" stroke={C.lima} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );
      case 'raio':
        return (
          <>
            <circle cx="50" cy="50" r="40" fill={C.azul} />
            <path d="M56 14 L28 56 h18 l-6 30 l30 -44 h-18z" fill={C.lima} />
          </>
        );
      case 'cartas':
        return (
          <>
            <rect x="14" y="20" width="44" height="60" rx="8" fill={C.azulClaro} transform="rotate(-12 36 50)" />
            <rect x="42" y="20" width="44" height="60" rx="8" fill={C.rosa} transform="rotate(10 64 50)" />
            <text x="64" y="58" textAnchor="middle" fontSize="22" fontWeight="800" fill={C.rosaMedio} transform="rotate(10 64 50)">?</text>
          </>
        );
      case 'sol':
        return (
          <>
            {Array.from({ length: 10 }).map((_, i) => (
              <rect key={i} x="46" y="4" width="8" height="18" rx="4" fill={C.laranja} transform={`rotate(${i * 36} 50 50)`} />
            ))}
            <circle cx="50" cy="50" r="24" fill={C.manteiga} />
          </>
        );
      case 'r1':
        return (
          <>
            <rect x="8" y="26" width="84" height="48" rx="24" fill={C.rosaMedio} transform="rotate(-8 50 50)" />
            <text x="50" y="62" textAnchor="middle" fontSize="32" fontWeight="900" fill={C.branco} fontFamily="'Bricolage Grotesque', sans-serif" transform="rotate(-8 50 50)">R1</text>
          </>
        );
      case 'coroa':
        return (
          <>
            <path d="M14 74 L10 28 L32 46 L50 18 L68 46 L90 28 L86 74z" fill={C.manteiga} />
            <rect x="14" y="72" width="72" height="12" rx="4" fill={C.laranja} />
            {[30, 50, 70].map((x) => <circle key={x} cx={x} cy="60" r="5" fill={C.rosaMedio} />)}
          </>
        );
      default:
        return <circle cx="50" cy="50" r="36" fill={C.lilas} />;
    }
  })();
  return (
    <svg {...svgProps('0 0 100 100', p)}>
      <DieFilter />
      <g filter="url(#die-cut)">{body}</g>
    </svg>
  );
}
