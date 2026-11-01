// Mapa da Yasland: cidadezinha 2D flat vista de cima, com ruas, praça e os
// seis prédios clicáveis. Movimentos sutis: carrinho, nuvens, árvores e fonte.
import React from 'react';
import { Hot } from './ui';

export type PlaceId = 'academia' | 'mercadinho' | 'casa' | 'spa' | 'horta' | 'prefeitura';
export const PLACES: { id: PlaceId; name: string; emoji: string }[] = [
  { id: 'academia', name: 'Academia', emoji: '🏋🏻‍♀️' },
  { id: 'mercadinho', name: 'Mercadinho', emoji: '🛒' },
  { id: 'prefeitura', name: 'Prefeitura', emoji: '🏛️' },
  { id: 'casa', name: 'Minha Casa', emoji: '🏠' },
  { id: 'spa', name: 'Spa', emoji: '🧖🏻‍♀️' },
  { id: 'horta', name: 'Horta', emoji: '🌱' },
];

const Tree = ({ x, y, s = 1, c = '#9CC77A', d = 0 }: { x: number; y: number; s?: number; c?: string; d?: number }) => (
  <g className="yl-tree" transform={`translate(${x} ${y}) scale(${s})`} style={{ animationDelay: `${d}s` }}>
    <ellipse cx="0" cy="26" rx="20" ry="6" fill="rgba(46,74,127,.12)" />
    <rect x="-3" y="8" width="6" height="18" rx="3" fill="#B98B64" />
    <circle cx="0" cy="0" r="20" fill={c} />
    <circle cx="-9" cy="-6" r="9" fill="#fff" opacity=".18" />
  </g>
);

const Label = ({ x, y, t }: { x: number; y: number; t: string }) => (
  <g className="yl-map-label" transform={`translate(${x} ${y})`}>
    <rect x={-t.length * 4.3 - 14} y="-15" width={t.length * 8.6 + 28} height="30" rx="15" />
    <text textAnchor="middle" y="5">{t}</text>
  </g>
);

export function CityMap({ onPick, badges }: { onPick: (p: PlaceId) => void; badges?: Partial<Record<PlaceId, number>> }) {
  const pick = (id: string) => onPick(id as PlaceId);
  const dot = (p: PlaceId, x: number, y: number) =>
    badges?.[p] ? (
      <g className="yl-map-dot" transform={`translate(${x} ${y})`}>
        <circle r="13" />
        <text textAnchor="middle" y="5">{badges[p]}</text>
      </g>
    ) : null;
  return (
    <svg viewBox="0 0 1200 760" className="yl-map" role="img" aria-label="Mapa da Yasland">
      <defs>
        <pattern id="yl-grass" width="40" height="40" patternUnits="userSpaceOnUse">
          <rect width="40" height="40" fill="#CFE6B4" />
          <circle cx="8" cy="10" r="1.6" fill="#B9D99A" /><circle cx="28" cy="30" r="1.6" fill="#B9D99A" />
        </pattern>
        <linearGradient id="yl-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#E6F3FF" /><stop offset="1" stopColor="#A9CCF2" /></linearGradient>
        <linearGradient id="yl-water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#BFE0FF" /><stop offset="1" stopColor="#7FB4EE" /></linearGradient>
      </defs>
      <rect width="1200" height="760" fill="url(#yl-grass)" />

      {/* ruas e calçadas */}
      <g className="yl-roads">
        <rect x="0" y="352" width="1200" height="74" fill="#E9E2D8" />
        <rect x="0" y="362" width="1200" height="54" fill="#8F96A8" />
        <rect x="560" y="0" width="80" height="760" fill="#E9E2D8" />
        <rect x="570" y="0" width="60" height="760" fill="#8F96A8" />
        {Array.from({ length: 14 }).map((_, i) => <rect key={`h${i}`} x={i * 90 + 10} y="387" width="44" height="5" rx="2.5" fill="#F4F1EA" opacity=".85" />)}
        {Array.from({ length: 9 }).map((_, i) => <rect key={`v${i}`} x="597" y={i * 90 + 6} width="5" height="40" rx="2.5" fill="#F4F1EA" opacity=".85" />)}
        <circle cx="600" cy="389" r="58" fill="#E9E2D8" />
        <circle cx="600" cy="389" r="44" fill="#BFE0A3" stroke="#A7CF88" strokeWidth="4" />
        {/* fonte da praça */}
        <circle cx="600" cy="389" r="24" fill="url(#yl-water)" stroke="#fff" strokeWidth="4" />
        <g className="yl-fountain"><circle cx="600" cy="384" r="4" fill="#fff" /><circle cx="594" cy="380" r="2.5" fill="#fff" /><circle cx="606" cy="379" r="2.5" fill="#fff" /></g>
      </g>

      {/* carrinho dando a volta */}
      <g className="yl-car">
        <rect x="-26" y="-12" width="52" height="24" rx="9" fill="#F38CB8" />
        <rect x="-12" y="-9" width="22" height="18" rx="5" fill="#FFE3F1" />
        <circle cx="-15" cy="13" r="4" fill="#3B3F52" /><circle cx="15" cy="13" r="4" fill="#3B3F52" />
      </g>

      {/* ── Academia (vidro, equipamentos à frente, quadra atrás) ── */}
      <Hot id="academia" label="Academia" onPick={pick}>
        <g transform="translate(70 40)">
          <rect x="0" y="0" width="420" height="120" rx="14" fill="#DDEFC9" stroke="#B8D79A" strokeWidth="3" />
          <rect x="40" y="18" width="180" height="84" fill="#F4A770" rx="6" />
          <line x1="130" y1="18" x2="130" y2="102" stroke="#fff" strokeWidth="3" />
          <line x1="40" y1="60" x2="220" y2="60" stroke="#fff" strokeWidth="2" opacity=".8" />
          <rect x="250" y="22" width="140" height="76" rx="6" fill="#9FD0A0" />
          <line x1="320" y1="22" x2="320" y2="98" stroke="#fff" strokeWidth="3" />
          <rect x="0" y="130" width="420" height="160" rx="18" fill="#F3F7FB" stroke="#D3DEEA" strokeWidth="3" />
          <rect x="16" y="146" width="388" height="112" rx="10" fill="url(#yl-glass)" />
          {[0, 1, 2, 3].map((i) => <line key={i} x1={16 + (i + 1) * 77.6} y1="146" x2={16 + (i + 1) * 77.6} y2="258" stroke="#fff" strokeWidth="3" opacity=".8" />)}
          <g fill="#2E4A7F" opacity=".75">
            <rect x="40" y="220" width="56" height="10" rx="5" /><rect x="88" y="196" width="8" height="30" rx="3" />
            <rect x="140" y="214" width="8" height="26" rx="3" /><rect x="190" y="214" width="8" height="26" rx="3" /><rect x="132" y="210" width="74" height="7" rx="3.5" />
            <circle cx="136" cy="213" r="9" fill="#F38CB8" /><circle cx="202" cy="213" r="9" fill="#F38CB8" />
            <rect x="260" y="200" width="70" height="8" rx="4" /><rect x="292" y="206" width="6" height="26" rx="3" />
          </g>
          <rect x="0" y="262" width="420" height="28" rx="0" fill="#2E4A7F" opacity=".9" />
          <text x="210" y="281" textAnchor="middle" className="yl-sign">ACADEMIA</text>
        </g>
        <Label x={280} y={350} t="Academia" />
      </Hot>
      {dot('academia', 480, 60)}

      {/* ── Mercadinho (toldo listrado e vitrine) ── */}
      <Hot id="mercadinho" label="Mercadinho" onPick={pick}>
        <g transform="translate(700 70)">
          <rect x="0" y="40" width="210" height="220" rx="12" fill="#FFF6E8" stroke="#EAD9BD" strokeWidth="3" />
          <rect x="-8" y="20" width="226" height="34" rx="10" fill="#E9F3D4" />
          {Array.from({ length: 8 }).map((_, i) => <path key={i} d={`M${-8 + i * 28.25} 54 h28.25 v20 a14 14 0 0 1 -28.25 0z`} fill={i % 2 ? '#fff' : '#EE6F87'} />)}
          <rect x="20" y="100" width="80" height="70" rx="6" fill="url(#yl-glass)" />
          <g>{['#F4C430', '#E8455F', '#8DC26F', '#F08C3A'].map((c, i) => <circle key={i} cx={36 + i * 16} cy="150" r="7" fill={c} />)}</g>
          <rect x="120" y="100" width="70" height="160" rx="6" fill="#A9CCF2" />
          <circle cx="178" cy="182" r="4" fill="#fff" />
          <rect x="16" y="190" width="88" height="60" rx="8" fill="#F7E3C3" />
          <text x="105" y="42" textAnchor="middle" className="yl-sign yl-sign-dark">MERCADINHO</text>
        </g>
        <Label x={805} y={350} t="Mercadinho" />
      </Hot>
      {dot('mercadinho', 905, 80)}

      {/* ── Prefeitura (colunas, cúpula, bandeira) ── */}
      <Hot id="prefeitura" label="Prefeitura" onPick={pick}>
        <g transform="translate(950 50)">
          <rect x="0" y="120" width="220" height="160" rx="8" fill="#F5F1FA" stroke="#DCD3EA" strokeWidth="3" />
          <path d="M-10 124 L110 60 L230 124 Z" fill="#C9B6EE" />
          <circle cx="110" cy="58" r="30" fill="#E9D8FF" />
          <line x1="110" y1="28" x2="110" y2="0" stroke="#5A3D99" strokeWidth="3" />
          <path className="yl-flag" d="M110 2 h26 l-6 7 l6 7 h-26z" fill="#F38CB8" />
          {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={22 + i * 40} y="140" width="16" height="110" rx="6" fill="#fff" stroke="#DCD3EA" strokeWidth="2" />)}
          <rect x="88" y="200" width="44" height="80" rx="20" fill="#5A3D99" />
          <rect x="-6" y="276" width="232" height="12" rx="6" fill="#DCD3EA" />
        </g>
        <Label x={1060} y={350} t="Prefeitura" />
      </Hot>
      {dot('prefeitura', 1170, 70)}

      {/* ── Minha Casa ── */}
      <Hot id="casa" label="Minha Casa" onPick={pick}>
        <g transform="translate(90 470)">
          <rect x="0" y="80" width="230" height="170" rx="10" fill="#FFF0F6" stroke="#F3C9DD" strokeWidth="3" />
          <path d="M-14 90 L115 0 L244 90 Z" fill="#F38CB8" />
          <rect x="160" y="16" width="26" height="46" fill="#D9578F" />
          <g className="yl-smoke"><circle cx="173" cy="8" r="7" fill="#fff" opacity=".8" /><circle cx="182" cy="-6" r="5" fill="#fff" opacity=".6" /></g>
          <rect x="94" y="160" width="46" height="90" rx="22" fill="#B98B64" />
          <circle cx="130" cy="208" r="3.5" fill="#FFE08A" />
          <rect x="24" y="120" width="52" height="46" rx="6" fill="url(#yl-glass)" stroke="#fff" strokeWidth="4" />
          <rect x="158" y="120" width="52" height="46" rx="6" fill="#FFE9A8" stroke="#fff" strokeWidth="4" />
          <rect x="18" y="236" width="64" height="14" rx="7" fill="#9CC77A" />
          <rect x="150" y="236" width="64" height="14" rx="7" fill="#9CC77A" />
        </g>
        <Label x={205} y={740} t="Minha Casa" />
      </Hot>
      {dot('casa', 330, 560)}

      {/* ── Spa (cúpula lilás, folhas, toalhas) ── */}
      <Hot id="spa" label="Spa" onPick={pick}>
        <g transform="translate(400 480)">
          <rect x="0" y="80" width="140" height="170" rx="16" fill="#F4EEFF" stroke="#D9CBF5" strokeWidth="3" />
          <path d="M0 96 a70 70 0 0 1 140 0z" fill="#B9A3EE" />
          <circle cx="70" cy="66" r="10" fill="#fff" opacity=".7" />
          <rect x="45" y="170" width="50" height="80" rx="24" fill="#8C6CD6" />
          <rect x="16" y="112" width="108" height="40" rx="20" fill="url(#yl-glass)" />
          <path d="M-6 250 q20 -40 8 -70 q-24 30 -8 70z" fill="#8DC26F" />
          <path d="M146 250 q-20 -40 -8 -70 q24 30 8 70z" fill="#8DC26F" />
        </g>
        <Label x={470} y={740} t="Spa" />
      </Hot>
      {dot('spa', 545, 560)}

      {/* ── Horta (canteiros cercados) ── */}
      <Hot id="horta" label="Horta" onPick={pick}>
        <g transform="translate(700 480)">
          <rect x="0" y="0" width="440" height="230" rx="18" fill="#E6D2B5" stroke="#CDB28B" strokeWidth="3" />
          {[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => (
            <g key={`${r}${c}`} transform={`translate(${24 + c * 104} ${20 + r * 70})`}>
              <rect width="88" height="54" rx="10" fill="#9C6B45" />
              <rect x="6" y="6" width="76" height="42" rx="8" fill="#7D5236" />
              {(r + c) % 3 !== 2 && [0, 1, 2].map((k) => <circle key={k} className="yl-sprout" cx={20 + k * 24} cy="26" r="7" fill={['#8DC26F', '#5FA36A', '#A7D37F'][k]} style={{ animationDelay: `${(r + c + k) * 0.3}s` }} />)}
            </g>
          )))}
          {Array.from({ length: 23 }).map((_, i) => <rect key={i} x={-4 + i * 20} y="-14" width="8" height="22" rx="3" fill="#F7EBD8" />)}
        </g>
        <Label x={920} y={740} t="Horta" />
      </Hot>
      {dot('horta', 1150, 490)}

      {/* árvores e jardins */}
      <Tree x={40} y={330} /><Tree x={520} y={300} s={0.8} c="#8DC26F" d={1.2} /><Tree x={670} y={300} s={0.9} d={0.6} />
      <Tree x={930} y={320} s={0.8} c="#A7D37F" d={1.6} /><Tree x={1170} y={320} s={0.7} d={0.3} />
      <Tree x={360} y={470} s={0.75} c="#8DC26F" d={0.9} /><Tree x={650} y={470} s={0.8} d={1.9} /><Tree x={30} y={700} s={0.8} c="#A7D37F" />
      <Tree x={560} y={720} s={0.7} d={2.2} /><Tree x={1180} y={730} s={0.7} c="#8DC26F" d={0.4} />

      {/* sombras de nuvem passando */}
      <g className="yl-cloud-shadow"><ellipse cx="0" cy="0" rx="120" ry="40" fill="rgba(46,74,127,.07)" /></g>
    </svg>
  );
}
