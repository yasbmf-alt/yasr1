// Cenário da trilha: elementos ilustrados, orgânicos e em camadas.
// Cada um ocupa um slot substituível (trail.decor.<id>).
import React from 'react';

type P = { night?: boolean };
const s = (vb: string) => ({ viewBox: vb, width: '100%', height: '100%', xmlns: 'http://www.w3.org/2000/svg', 'aria-hidden': true as const });

const blob = (cx: number, cy: number, r: number, k = 0) => {
  // contorno orgânico (8 lóbulos levemente irregulares)
  const pts = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2;
    const rr = r * (0.88 + (((i * 7 + k * 3) % 5) / 5) * 0.24);
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.92];
  });
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < 8; i++) {
    const p = pts[(i + 1) % 8];
    const q = pts[i];
    const mx = (p[0] + q[0]) / 2;
    const my = (p[1] + q[1]) / 2;
    const a = Math.atan2(my - cy, mx - cx);
    d += ` Q${mx + Math.cos(a) * r * 0.18} ${my + Math.sin(a) * r * 0.18} ${p[0]} ${p[1]}`;
  }
  return `${d}Z`;
};

export function TreeRound({ night }: P) {
  const dark = night ? '#5E7A4C' : '#8DA35C';
  const mid = night ? '#6F8C5C' : '#AFC47E';
  const light = night ? '#87A372' : '#C9DC94';
  return (
    <svg {...s('0 0 120 150')}>
      <ellipse cx="60" cy="146" rx="34" ry="5" fill="#000" opacity=".08" />
      <path d="M55 146 C 56 120 52 104 46 92 L 52 90 C 58 100 60 108 62 100 L 66 82 L 72 84 C 66 104 66 124 67 146z" fill="#9A6B4F" />
      <path d="M58 146 C 59 124 57 110 54 100" stroke="#B5845F" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d={blob(60, 62, 46, 1)} fill={dark} />
      <path d={blob(52, 54, 34, 2)} fill={mid} />
      <path d={blob(72, 50, 24, 3)} fill={mid} />
      <path d={blob(46, 42, 16, 4)} fill={light} />
      <path d={blob(70, 38, 10, 5)} fill={light} />
      {[[38, 70], [82, 66], [62, 84], [58, 28]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.6" fill={light} opacity=".9" />)}
    </svg>
  );
}

export function TreeBlossom({ night }: P) {
  const a = night ? '#C789AE' : '#F38CB8';
  const b = night ? '#E1B3D3' : '#F8C9F1';
  return (
    <svg {...s('0 0 120 150')}>
      <ellipse cx="60" cy="146" rx="32" ry="5" fill="#000" opacity=".08" />
      <path d="M56 146 C 57 118 50 104 40 94 L 46 90 C 54 98 58 104 60 96 C 62 86 70 78 80 74 L 82 80 C 72 86 66 96 66 110 C 65 124 66 136 66 146z" fill="#8A5E44" />
      <path d={blob(60, 60, 44, 6)} fill={a} />
      <path d={blob(48, 52, 28, 7)} fill={b} />
      <path d={blob(76, 56, 22, 8)} fill={b} />
      <path d={blob(62, 36, 16, 9)} fill={b} />
      {Array.from({ length: 12 }).map((_, i) => (
        <circle key={i} cx={22 + ((i * 37) % 76)} cy={24 + ((i * 23) % 64)} r={i % 3 ? 2.2 : 3.4} fill="#FFFDFB" opacity=".85" />
      ))}
      {[[30, 120], [86, 128], [70, 138]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="4" ry="2.4" fill={b} transform={`rotate(${i * 40} ${x} ${y})`} />)}
    </svg>
  );
}

export function Pine({ night }: P) {
  const c = night ? ['#4E6A48', '#5E7A4C', '#6F8C5C'] : ['#6E8F3A', '#8DA35C', '#AFC47E'];
  return (
    <svg {...s('0 0 90 160')}>
      <ellipse cx="45" cy="156" rx="26" ry="4" fill="#000" opacity=".08" />
      <rect x="40" y="128" width="10" height="28" rx="3" fill="#8A5E44" />
      {[[132, 42], [104, 36], [78, 29], [54, 21]].map(([y, w], i) => (
        <path key={i} d={`M${45 - w} ${y} Q 45 ${y - 52 + i * 4} ${45 + w} ${y} Q 45 ${y + 8} ${45 - w} ${y}z`} fill={c[i % 3]} />
      ))}
      <path d="M45 6 l3 8 h-6z" fill={c[2]} />
    </svg>
  );
}

export function Bush({ night }: P) {
  const a = night ? '#5E7A4C' : '#8DA35C';
  const b = night ? '#6F8C5C' : '#AFC47E';
  return (
    <svg {...s('0 0 120 70')}>
      <ellipse cx="60" cy="66" rx="52" ry="5" fill="#000" opacity=".08" />
      <path d={blob(36, 44, 26, 1)} fill={a} />
      <path d={blob(78, 40, 30, 2)} fill={a} />
      <path d={blob(56, 34, 24, 3)} fill={b} />
      <path d={blob(90, 34, 14, 4)} fill={b} />
      {[[40, 30, '#F38CB8'], [64, 22, '#FFF3B0'], [86, 44, '#FFFDFB'], [30, 48, '#FFFDFB'], [72, 48, '#F38CB8']].map(([x, y, f], i) => (
        <g key={i}>
          {[0, 72, 144, 216, 288].map((r) => <ellipse key={r} cx={x as number} cy={(y as number) - 3} rx="2" ry="3.2" fill={f as string} transform={`rotate(${r} ${x} ${y})`} />)}
          <circle cx={x as number} cy={y as number} r="1.6" fill="#FFB86B" />
        </g>
      ))}
    </svg>
  );
}

export function FlowerCluster({ night }: P) {
  const cols = night ? ['#C789AE', '#D9CFF2', '#E8DB9A'] : ['#F38CB8', '#E9D8FF', '#FFF3B0', '#FFAEB1'];
  return (
    <svg {...s('0 0 80 70')}>
      {[[16, 30, 40], [30, 18, 52], [46, 26, 44], [60, 14, 56], [70, 34, 36]].map(([x, top, h], i) => (
        <g key={i}>
          <path d={`M${x} 68 Q ${x + (i % 2 ? 4 : -4)} ${68 - h / 2} ${x} ${top}`} stroke="#7E9A4A" strokeWidth="2.4" fill="none" />
          <ellipse cx={x + (i % 2 ? 6 : -6)} cy={58 - i * 3} rx="6" ry="2.6" fill="#AFC47E" transform={`rotate(${i % 2 ? -30 : 30} ${x} ${58 - i * 3})`} />
          {[0, 60, 120, 180, 240, 300].map((r) => <ellipse key={r} cx={x} cy={top - 5} rx="3" ry="5" fill={cols[i % cols.length]} transform={`rotate(${r} ${x} ${top})`} />)}
          <circle cx={x} cy={top} r="2.6" fill="#FFB86B" />
        </g>
      ))}
    </svg>
  );
}

export function Tulips() {
  return (
    <svg {...s('0 0 70 70')}>
      {[[16, 24, '#F38CB8'], [34, 14, '#FFAEB1'], [52, 22, '#E9A9F0']].map(([x, y, c], i) => (
        <g key={i}>
          <path d={`M${x} 70 V${(y as number) + 10}`} stroke="#7E9A4A" strokeWidth="3" />
          <path d={`M${x} 60 q -12 -8 -10 -24 q 8 6 10 18z`} fill="#AFC47E" />
          <path d={`M${(x as number) - 8} ${y} q 0 14 8 14 q 8 0 8 -14 l -4 4 l -4 -6 l -4 6z`} fill={c as string} />
        </g>
      ))}
    </svg>
  );
}

export function Fern({ night }: P) {
  const c = night ? '#5E7A4C' : '#8DA35C';
  return (
    <svg {...s('0 0 90 70')}>
      {[-60, -35, -10, 15, 40].map((r, i) => (
        <g key={i} transform={`translate(45 68) rotate(${r})`}>
          <path d="M0 0 Q 4 -30 0 -58" stroke={c} strokeWidth="2" fill="none" />
          {Array.from({ length: 7 }).map((_, k) => (
            <g key={k}>
              <ellipse cx={-5} cy={-8 - k * 7} rx="5" ry="2.2" fill={i % 2 ? '#AFC47E' : c} transform={`rotate(-30 -5 ${-8 - k * 7})`} />
              <ellipse cx={5} cy={-8 - k * 7} rx="5" ry="2.2" fill={i % 2 ? '#AFC47E' : c} transform={`rotate(30 5 ${-8 - k * 7})`} />
            </g>
          ))}
        </g>
      ))}
    </svg>
  );
}

export function Mushrooms({ night }: P) {
  return (
    <svg {...s('0 0 70 56')}>
      <ellipse cx="35" cy="53" rx="28" ry="3" fill="#000" opacity=".08" />
      <rect x="20" y="30" width="10" height="22" rx="4" fill="#FFF7EE" />
      <path d="M6 32 Q 25 2 44 32z" fill={night ? '#E07BAE' : '#F38CB8'} />
      {[[16, 24], [26, 16], [34, 26]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.6" fill="#FFFDFB" />)}
      <rect x="46" y="40" width="7" height="13" rx="3" fill="#FFF7EE" />
      <path d="M38 42 Q 49.5 24 61 42z" fill={night ? '#B79AF0' : '#FFB86B'} />
      {night && <circle cx="25" cy="22" r="20" fill="#F8C9F1" opacity=".18" />}
    </svg>
  );
}

export function Rocks() {
  return (
    <svg {...s('0 0 80 44')}>
      <ellipse cx="40" cy="41" rx="34" ry="3" fill="#000" opacity=".07" />
      <path d="M8 40 Q 6 22 24 18 Q 40 16 42 30 Q 44 40 30 41z" fill="#C9C1D3" />
      <path d="M38 41 Q 36 26 52 24 Q 70 24 72 36 Q 72 42 60 42z" fill="#B7AEC4" />
      <path d="M14 26 Q 20 20 28 22" stroke="#E4DFEA" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M46 30 Q 52 26 60 27" stroke="#D2CBDB" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M4 40 q 4 -10 6 0 M70 41 q 3 -8 5 0" stroke="#8DA35C" strokeWidth="2.4" fill="none" />
    </svg>
  );
}

export function Grass() {
  return (
    <svg {...s('0 0 50 30')}>
      {[[8, -18], [14, -8], [20, 4], [26, -12], [32, 10], [38, -4], [44, 14]].map(([x, r], i) => (
        <path key={i} d={`M${x} 30 Q ${x + (r as number) / 4} 14 ${x + (r as number) / 2} ${6 + (i % 3) * 4}`} stroke={i % 2 ? '#8DA35C' : '#AFC47E'} strokeWidth="2.6" fill="none" strokeLinecap="round" />
      ))}
    </svg>
  );
}

export function Lantern() {
  return (
    <svg {...s('0 0 40 100')}>
      <circle cx="20" cy="30" r="22" fill="#FFF3B0" opacity=".22" className="lantern-glow" />
      <rect x="18.5" y="40" width="3" height="58" rx="1.5" fill="#2E4A7F" />
      <path d="M10 20 h20 l-3 20 h-14z" fill="#FFE9A0" />
      <path d="M8 20 h24 l-5 -8 h-14z" fill="#2E4A7F" />
      <circle cx="20" cy="29" r="4" fill="#FFB86B" />
      <rect x="12" y="96" width="16" height="4" rx="2" fill="#2E4A7F" />
    </svg>
  );
}

export function Fence() {
  return (
    <svg {...s('0 0 110 50')}>
      {[6, 32, 58, 84].map((x) => <path key={x} d={`M${x} 48 V12 l8 -8 l8 8 V48z`} fill="#FFFDFB" />)}
      <rect x="0" y="20" width="110" height="6" rx="3" fill="#F1E4D6" />
      <rect x="0" y="34" width="110" height="6" rx="3" fill="#F1E4D6" />
    </svg>
  );
}

export function FlowerBed() {
  return (
    <svg {...s('0 0 120 54')}>
      <ellipse cx="60" cy="40" rx="56" ry="14" fill="#C9A27E" />
      <ellipse cx="60" cy="36" rx="52" ry="11" fill="#A9805D" />
      {Array.from({ length: 9 }).map((_, i) => {
        const x = 16 + i * 11;
        const c = ['#F38CB8', '#FFF3B0', '#E9D8FF', '#FFAEB1'][i % 4];
        return (
          <g key={i}>
            <path d={`M${x} 36 v-12`} stroke="#7E9A4A" strokeWidth="2" />
            {[0, 90, 180, 270].map((r) => <ellipse key={r} cx={x} cy={20} rx="2.4" ry="4" fill={c} transform={`rotate(${r} ${x} 24)`} />)}
          </g>
        );
      })}
    </svg>
  );
}

export function Hedge() {
  return (
    <svg {...s('0 0 120 50')}>
      <rect x="4" y="12" width="112" height="36" rx="16" fill="#8DA35C" />
      <rect x="4" y="12" width="112" height="14" rx="7" fill="#AFC47E" />
      {[18, 44, 70, 96].map((x) => <circle key={x} cx={x} cy="22" r="3" fill="#C9DC94" />)}
    </svg>
  );
}

export function Bridge() {
  return (
    <svg {...s('0 0 120 90')}>
      <ellipse cx="60" cy="84" rx="56" ry="5" fill="#000" opacity=".08" />
      <path d="M6 70 Q 60 30 114 70 L 114 82 Q 60 44 6 82z" fill="#A9784F" />
      {Array.from({ length: 9 }).map((_, i) => {
        const x = 12 + i * 12;
        const y = 70 - Math.sin((i / 8) * Math.PI) * 26;
        return <rect key={i} x={x - 5} y={y - 4} width="10" height="12" rx="2" fill={i % 2 ? '#C99A72' : '#D6AA82'} />;
      })}
      <path d="M8 56 Q 60 14 112 56" stroke="#8A5E44" strokeWidth="4" fill="none" strokeLinecap="round" />
      {[14, 36, 60, 84, 106].map((x, i) => <rect key={x} x={x - 2} y={56 - Math.sin((i / 4) * Math.PI) * 26 - (i === 0 || i === 4 ? 0 : 0)} width="4" height="16" fill="#8A5E44" />)}
    </svg>
  );
}

export function Leaf({ hue = 0 }: { hue?: number }) {
  const c = ['#E0A458', '#F2C14E', '#D9774B', '#AFC47E'][hue % 4];
  return (
    <svg {...s('0 0 20 20')}>
      <path d="M2 18 C 2 8 10 2 18 2 C 18 10 12 18 2 18z" fill={c} />
      <path d="M3 17 L 15 5" stroke="#fff" strokeWidth="1" opacity=".6" />
    </svg>
  );
}

export function Stone({ k = 0 }: { k?: number }) {
  const c = ['#E4DFEA', '#D8D1E2', '#EDE8F2'][k % 3];
  return (
    <svg {...s('0 0 40 26')}>
      <ellipse cx="20" cy="15" rx="18" ry="10" fill="#B7AEC4" />
      <ellipse cx="20" cy="12" rx="17" ry="9" fill={c} />
      <ellipse cx="14" cy="9" rx="6" ry="2.4" fill="#fff" opacity=".6" />
    </svg>
  );
}

export function Stream() {
  return null;
}

export function Pond() {
  const pads: [number, number, number, number][] = [[196, 70, 15, 20], [222, 84, 11, -30], [92, 82, 12, 60]];
  return (
    <svg {...s('0 0 300 138')}>
      <path d="M22 74 C 18 36 82 14 152 16 C 226 18 286 40 282 76 C 278 112 214 128 148 126 C 78 124 26 110 22 74z" fill="#C3D8A4" />
      <path d="M34 72 C 32 42 88 26 152 27 C 218 28 270 46 268 76 C 266 106 210 118 148 116 C 84 114 36 102 34 72z" fill="#9FC3EC" />
      <path d="M44 74 C 44 50 94 38 152 38 C 212 39 258 54 256 78 C 254 102 206 110 148 108 C 90 106 44 98 44 74z" fill="#BCD8F7" />
      <path d="M78 52 C 110 44 150 44 176 48" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" opacity=".7" />
      <path d="M190 98 C 206 96 220 92 230 86" stroke="#fff" strokeWidth="3.5" fill="none" strokeLinecap="round" opacity=".55" />
      {pads.map(([x, y, rr, rot], i) => (
        <g key={i} transform={`rotate(${rot} ${x} ${y})`}>
          <path d={`M${x} ${y} L ${x + rr} ${y - 3} A ${rr} ${rr * 0.62} 0 1 0 ${x + rr} ${y + 3} Z`} fill={i === 1 ? '#AFC47E' : '#8DA35C'} />
        </g>
      ))}
      <g transform="translate(200 66)">
        {[0, 72, 144, 216, 288].map((r) => <ellipse key={r} cx="0" cy="-5" rx="3.6" ry="6" fill="#F8C9F1" transform={`rotate(${r})`} />)}
        <circle r="2.6" fill="#FFB86B" />
      </g>
      {/* juncos e pedrinhas na margem */}
      {[[30, 0], [40, 1], [48, 2], [262, 1], [272, 0]].map(([x, i]) => (
        <g key={x}>
          <path d={`M${x} 86 Q ${x + (i % 2 ? 3 : -3)} 62 ${x + (i % 2 ? -2 : 2)} ${44 + i * 6}`} stroke="#7E9A4A" strokeWidth="3" fill="none" strokeLinecap="round" />
          {i !== 1 && <rect x={x - 3 + (i % 2 ? -2 : 2)} y={42 + i * 6} width="6" height="14" rx="3" fill="#A9784F" />}
        </g>
      ))}
      <ellipse cx="104" cy="122" rx="14" ry="8" fill="#C9C1D3" />
      <ellipse cx="102" cy="119" rx="11" ry="5.5" fill="#E4DFEA" />
      <ellipse cx="124" cy="126" rx="8" ry="5" fill="#B7AEC4" />
    </svg>
  );
}
