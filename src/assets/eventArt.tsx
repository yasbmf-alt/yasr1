// Ilustrações provisórias dos eventos especiais. Cada uma tem um slot próprio
// no registro (grupo "Eventos") e pode ser trocada por um PNG/SVG seu em
// Configurações → Ilustrações. Estilo: 2D, formas arredondadas, paleta do app.
import React from 'react';

const C = {
  azul: '#2E4A7F', azulEsc: '#22396A', azulClaro: '#CFE4FF', rosa: '#F8C9F1', rosaMedio: '#F38CB8', rosaEsc: '#D9578F',
  manteiga: '#FFF3B0', ouro: '#F2C14E', lilas: '#E9D8FF', lilasEsc: '#A98BE0', lima: '#D9EE76', salvia: '#AFC47E', salviaEsc: '#7E9A4A',
  pessego: '#FFAEB1', laranja: '#F6A255', laranjaEsc: '#D97F34', branco: '#FFFFFF', creme: '#FFFDF4', tronco: '#A47551', noite: '#34497A',
};

const sv = (vb: string, children: React.ReactNode) => (
  <svg viewBox={vb} width="100%" height="100%" aria-hidden="true" style={{ overflow: 'visible' }}>{children}</svg>
);

// ── Halloween ──────────────────────────────────────────────────
export const Pumpkin = () =>
  sv('0 0 100 90', <>
    <ellipse cx="50" cy="86" rx="34" ry="4" fill="#000" opacity=".08" />
    <path d="M48 14 q-2 -10 8 -12" stroke={C.salviaEsc} strokeWidth="5" fill="none" strokeLinecap="round" />
    <path d="M56 10 q10 -4 14 4 q-8 2 -14 -4z" fill={C.salvia} />
    <ellipse cx="30" cy="52" rx="20" ry="30" fill={C.laranjaEsc} />
    <ellipse cx="70" cy="52" rx="20" ry="30" fill={C.laranjaEsc} />
    <ellipse cx="50" cy="52" rx="22" ry="33" fill={C.laranja} />
    <ellipse cx="44" cy="34" rx="6" ry="10" fill="#fff" opacity=".25" />
    <path d="M34 48 l7 -7 l7 7z M52 48 l7 -7 l7 7z" fill={C.azulEsc} />
    <path d="M36 62 q14 12 28 0 q-4 8 -14 8 q-10 0 -14 -8z" fill={C.azulEsc} />
    <circle cx="28" cy="60" r="4" fill={C.pessego} opacity=".7" />
    <circle cx="72" cy="60" r="4" fill={C.pessego} opacity=".7" />
  </>);

export const Ghost = () =>
  sv('0 0 80 100', <>
    <path d="M10 46 a30 30 0 0 1 60 0 v40 l-10 -8 -10 10 -10 -10 -10 10 -10 -10 -10 8z" fill={C.branco} stroke="#E8E2F2" strokeWidth="2" />
    <ellipse cx="29" cy="46" rx="4.5" ry="6" fill={C.azulEsc} />
    <ellipse cx="51" cy="46" rx="4.5" ry="6" fill={C.azulEsc} />
    <ellipse cx="40" cy="60" rx="5" ry="4" fill={C.azulEsc} />
    <circle cx="22" cy="56" r="4" fill={C.rosa} />
    <circle cx="58" cy="56" r="4" fill={C.rosa} />
  </>);

export const Bat = () =>
  sv('0 0 120 60', <>
    <path d="M60 22 c-10 -10 -26 -14 -44 -6 c8 4 10 10 8 16 c6 -4 12 -2 14 4 c4 -6 10 -6 14 -2z" fill={C.noite} />
    <path d="M60 22 c10 -10 26 -14 44 -6 c-8 4 -10 10 -8 16 c-6 -4 -12 -2 -14 4 c-4 -6 -10 -6 -14 -2z" fill={C.noite} />
    <ellipse cx="60" cy="30" rx="10" ry="12" fill={C.azul} />
    <path d="M53 20 l2 -8 l4 6z M67 20 l-2 -8 l-4 6z" fill={C.azul} />
    <circle cx="56" cy="28" r="2.2" fill={C.manteiga} />
    <circle cx="64" cy="28" r="2.2" fill={C.manteiga} />
    <path d="M57 35 l1.5 3 l1.5 -3 M60 35 l1.5 3 l1.5 -3" stroke="#fff" strokeWidth="1.2" fill="none" />
  </>);

export const Moon = () =>
  sv('0 0 100 100', <>
    <circle cx="50" cy="50" r="40" fill={C.manteiga} opacity=".35" />
    <circle cx="50" cy="50" r="30" fill={C.manteiga} />
    <circle cx="40" cy="42" r="5" fill={C.ouro} opacity=".35" />
    <circle cx="60" cy="60" r="7" fill={C.ouro} opacity=".3" />
    <circle cx="58" cy="38" r="3" fill={C.ouro} opacity=".35" />
  </>);

export const Web = () =>
  sv('0 0 100 100', <g stroke="#B9B2CF" strokeWidth="1.6" fill="none" strokeLinecap="round">
    <path d="M0 0 L100 100 M0 0 L50 100 M0 0 L100 50 M0 0 L20 100 M0 0 L100 20" />
    <path d="M30 0 q4 26 -30 30 M55 0 q8 46 -55 55 M80 0 q12 66 -80 80" />
    <circle cx="62" cy="62" r="5" fill={C.azul} stroke="none" />
    <path d="M62 0 V57" />
  </g>);

// ── Natal ──────────────────────────────────────────────────────
export const XmasTree = () =>
  sv('0 0 100 120', <>
    <ellipse cx="50" cy="114" rx="30" ry="4" fill="#000" opacity=".08" />
    <rect x="44" y="96" width="12" height="16" rx="3" fill={C.tronco} />
    <path d="M50 14 L82 56 H66 L88 84 H68 L90 100 H10 L32 84 H12 L34 56 H18z" fill={C.salviaEsc} />
    <path d="M50 14 L70 42 H30z" fill={C.salvia} opacity=".55" />
    {[[40, 52, C.rosaMedio], [60, 64, C.manteiga], [36, 78, C.azulClaro], [62, 86, C.rosaMedio], [48, 92, C.lilas], [70, 94, C.manteiga], [30, 94, C.pessego]].map(([x, y, c], i) => (
      <circle key={i} cx={x as number} cy={y as number} r="4.5" fill={c as string} stroke="#fff" strokeWidth="1.5" />
    ))}
    <path d="M30 70 q20 10 40 -6 M24 90 q26 10 52 -8" stroke={C.manteiga} strokeWidth="2.5" fill="none" strokeLinecap="round" />
    <path d="M50 2 l3.5 7 7.5 1 -5.5 5 1.5 7.5 -7 -4 -7 4 1.5 -7.5 -5.5 -5 7.5 -1z" fill={C.ouro} />
  </>);

export const Gift = () =>
  sv('0 0 100 100', <>
    <ellipse cx="50" cy="94" rx="34" ry="4" fill="#000" opacity=".08" />
    <rect x="16" y="40" width="68" height="52" rx="8" fill={C.rosaMedio} />
    <rect x="12" y="30" width="76" height="18" rx="6" fill={C.rosa} />
    <rect x="44" y="30" width="12" height="62" fill={C.manteiga} />
    <path d="M50 30 c-6 -16 -26 -18 -24 -6 c2 8 18 6 24 6z M50 30 c6 -16 26 -18 24 -6 c-2 8 -18 6 -24 6z" fill={C.manteiga} stroke={C.ouro} strokeWidth="1.5" />
    <circle cx="50" cy="30" r="5" fill={C.ouro} />
  </>);

export const Star = () =>
  sv('0 0 100 100', <>
    <path d="M50 6 l12 26 28 3 -21 19 6 28 -25 -14 -25 14 6 -28 -21 -19 28 -3z" fill={C.ouro} stroke="#E0A93A" strokeWidth="2" strokeLinejoin="round" />
    <path d="M50 20 l6 14 14 2" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".6" />
  </>);

export const Bow = () =>
  sv('0 0 100 70', <>
    <path d="M50 30 c-14 -22 -44 -26 -40 -6 c4 18 30 12 40 6z" fill={C.rosaMedio} />
    <path d="M50 30 c14 -22 44 -26 40 -6 c-4 18 -30 12 -40 6z" fill={C.rosaMedio} />
    <path d="M44 34 l-14 32 l10 -4 l6 8 l4 -34z M56 34 l14 32 l-10 -4 l-6 8 l-4 -34z" fill={C.rosaEsc} />
    <circle cx="50" cy="31" r="8" fill={C.rosaEsc} />
    <path d="M22 22 q8 -4 16 4" stroke="#fff" strokeWidth="2.5" fill="none" opacity=".5" strokeLinecap="round" />
  </>);

export const Ornament = () =>
  sv('0 0 60 80', <>
    <rect x="24" y="4" width="12" height="10" rx="2" fill={C.ouro} />
    <circle cx="30" cy="44" r="26" fill={C.azulClaro} stroke="#fff" strokeWidth="2" />
    <path d="M6 40 q24 10 48 0" stroke={C.rosaMedio} strokeWidth="5" fill="none" />
    <path d="M8 52 q22 8 44 0" stroke={C.manteiga} strokeWidth="4" fill="none" />
    <ellipse cx="20" cy="32" rx="5" ry="8" fill="#fff" opacity=".6" />
  </>);

/** varal de luzinhas (faixa horizontal) */
export const Lights = () =>
  sv('0 0 400 60', <>
    <path d="M0 10 Q50 34 100 12 T200 12 T300 12 T400 12" stroke={C.azul} strokeWidth="2.5" fill="none" />
    {Array.from({ length: 12 }).map((_, i) => {
      const x = 16 + i * 33;
      const y = 14 + 10 * Math.abs(Math.sin((x / 100) * Math.PI));
      const c = [C.rosaMedio, C.manteiga, C.azulClaro, C.lima, C.lilas, C.pessego][i % 6];
      return (
        <g key={i} className="bulb" style={{ animationDelay: `${(i % 4) * 0.4}s` }}>
          <rect x={x - 3} y={y} width="6" height="5" rx="1" fill={C.azul} />
          <ellipse cx={x} cy={y + 13} rx="6" ry="9" fill={c} />
          <ellipse cx={x - 2} cy={y + 10} rx="1.6" ry="3" fill="#fff" opacity=".7" />
        </g>
      );
    })}
  </>);

// ── Praia / romance ────────────────────────────────────────────
export const Shell = () =>
  sv('0 0 100 90', <>
    <path d="M50 84 C14 80 6 44 22 26 C34 12 66 12 78 26 C94 44 86 80 50 84z" fill={C.pessego} />
    {[-30, -15, 0, 15, 30].map((a) => (
      <path key={a} d="M50 82 L50 22" transform={`rotate(${a} 50 82)`} stroke={C.rosaEsc} strokeWidth="2" opacity=".45" />
    ))}
    <path d="M38 84 h24 l-4 6 h-16z" fill={C.rosaMedio} />
    <path d="M30 36 q10 -10 22 -10" stroke="#fff" strokeWidth="3" fill="none" opacity=".6" strokeLinecap="round" />
  </>);

export const Starfish = () =>
  sv('0 0 100 100', <>
    <path d="M50 8 C56 30 60 34 90 38 C66 52 64 58 74 88 C52 70 48 70 26 88 C36 58 34 52 10 38 C40 34 44 30 50 8z" fill={C.laranja} stroke={C.laranjaEsc} strokeWidth="2" strokeLinejoin="round" />
    {[[50, 30], [62, 44], [40, 44], [56, 58], [44, 58], [50, 46]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.4" fill={C.manteiga} />)}
  </>);

export const Heart = () =>
  sv('0 0 100 90', <>
    <path d="M50 84 C20 62 6 46 6 28 C6 14 18 4 31 4 C40 4 46 9 50 16 C54 9 60 4 69 4 C82 4 94 14 94 28 C94 46 80 62 50 84z" fill={C.rosaMedio} />
    <path d="M24 20 q6 -8 16 -4" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" opacity=".6" />
  </>);

export const Hibiscus = () =>
  sv('0 0 100 100', <>
    {[0, 72, 144, 216, 288].map((r) => (
      <path key={r} d="M50 50 C36 34 38 10 50 8 C62 10 64 34 50 50z" fill={C.rosaMedio} transform={`rotate(${r} 50 50)`} />
    ))}
    {[36, 108, 180, 252, 324].map((r) => (
      <path key={r} d="M50 50 C44 40 45 26 50 24" stroke={C.rosaEsc} strokeWidth="1.5" fill="none" transform={`rotate(${r} 50 50)`} opacity=".6" />
    ))}
    <circle cx="50" cy="50" r="7" fill={C.ouro} />
    <path d="M50 50 L72 20" stroke={C.ouro} strokeWidth="2.5" />
    <circle cx="72" cy="20" r="3.5" fill={C.manteiga} />
  </>);

export const Palm = () =>
  sv('0 0 100 120', <>
    <path d="M52 116 C48 88 50 62 58 40" stroke={C.tronco} strokeWidth="9" fill="none" strokeLinecap="round" />
    {[[-70, C.salviaEsc], [-20, C.salvia], [20, C.salviaEsc], [70, C.salvia], [140, C.salvia], [-140, C.salviaEsc]].map(([r, c], i) => (
      <path key={i} d="M58 40 C70 30 88 30 98 40 C84 38 72 42 58 40z" fill={c as string} transform={`rotate(${r} 58 40)`} />
    ))}
    <circle cx="54" cy="46" r="5" fill={C.tronco} />
    <circle cx="62" cy="46" r="5" fill="#8D6343" />
  </>);

// ── Aniversário / Réveillon / Formatura ────────────────────────
export const Balloon = () =>
  sv('0 0 60 110', <>
    <path d="M30 70 q-6 14 4 24 q8 8 -2 16" stroke="#B9AFC8" strokeWidth="1.5" fill="none" />
    <ellipse cx="30" cy="36" rx="24" ry="30" fill={C.rosaMedio} />
    <path d="M26 66 h8 l-4 6z" fill={C.rosaEsc} />
    <ellipse cx="21" cy="24" rx="5" ry="9" fill="#fff" opacity=".55" />
  </>);

export const BalloonBlue = () =>
  sv('0 0 60 110', <>
    <path d="M30 70 q6 14 -4 24 q-8 8 2 16" stroke="#B9AFC8" strokeWidth="1.5" fill="none" />
    <ellipse cx="30" cy="36" rx="24" ry="30" fill={C.azulClaro} />
    <path d="M26 66 h8 l-4 6z" fill="#9CC3F2" />
    <ellipse cx="21" cy="24" rx="5" ry="9" fill="#fff" opacity=".7" />
  </>);

export const Cake = () =>
  sv('0 0 100 100', <>
    <ellipse cx="50" cy="94" rx="40" ry="5" fill="#000" opacity=".08" />
    <rect x="12" y="58" width="76" height="32" rx="8" fill={C.rosa} />
    <rect x="22" y="34" width="56" height="28" rx="8" fill={C.creme} />
    <path d="M12 66 q8 8 16 0 q8 8 16 0 q8 8 16 0 q8 8 16 0 q8 8 12 0" stroke={C.rosaMedio} strokeWidth="5" fill="none" strokeLinecap="round" />
    <path d="M22 40 q7 6 14 0 q7 6 14 0 q7 6 14 0 q7 6 14 0" stroke={C.lilas} strokeWidth="4" fill="none" strokeLinecap="round" />
    {[36, 50, 64].map((x, i) => (
      <g key={x}>
        <rect x={x - 2.5} y="20" width="5" height="16" rx="2" fill={[C.azulClaro, C.lima, C.manteiga][i]} />
        <path d={`M${x} 10 q5 6 0 10 q-5 -4 0 -10z`} fill={C.ouro} className="flame" />
      </g>
    ))}
    {[[24, 78], [44, 82], [66, 76], [80, 84]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.5" fill={[C.manteiga, C.azulClaro, C.lima, C.lilas][i]} />)}
  </>);

/** bandeirinhas (faixa) */
export const Bunting = () =>
  sv('0 0 400 60', <>
    <path d="M0 8 Q100 30 200 10 T400 10" stroke={C.azul} strokeWidth="2" fill="none" />
    {Array.from({ length: 11 }).map((_, i) => {
      const x = 14 + i * 36;
      const y = 10 + 12 * Math.abs(Math.sin((x / 200) * Math.PI));
      return <path key={i} d={`M${x - 13} ${y} L${x + 13} ${y} L${x} ${y + 26}z`} fill={[C.rosaMedio, C.manteiga, C.azulClaro, C.lima, C.lilas][i % 5]} />;
    })}
  </>);

export const Fireworks = () =>
  sv('0 0 100 100', <g strokeLinecap="round">
    {Array.from({ length: 12 }).map((_, i) => {
      const a = (i / 12) * Math.PI * 2;
      const c = [C.rosaMedio, C.ouro, C.azulClaro, C.lima][i % 4];
      return <path key={i} d={`M${50 + Math.cos(a) * 12} ${50 + Math.sin(a) * 12} L${50 + Math.cos(a) * 40} ${50 + Math.sin(a) * 40}`} stroke={c} strokeWidth="4" />;
    })}
    {Array.from({ length: 12 }).map((_, i) => {
      const a = (i / 12) * Math.PI * 2 + 0.26;
      return <circle key={`d${i}`} cx={50 + Math.cos(a) * 46} cy={50 + Math.sin(a) * 46} r="2.5" fill={C.manteiga} />;
    })}
    <circle cx="50" cy="50" r="5" fill="#fff" />
  </g>);

export const Streamer = () =>
  sv('0 0 100 100', <>
    <path d="M10 10 C40 10 20 40 50 40 S60 70 90 70" stroke={C.rosaMedio} strokeWidth="6" fill="none" strokeLinecap="round" />
    <path d="M14 30 C34 30 24 56 50 58 S70 86 86 90" stroke={C.ouro} strokeWidth="5" fill="none" strokeLinecap="round" />
    <path d="M30 6 C50 14 40 30 64 26 S84 44 94 40" stroke={C.azulClaro} strokeWidth="5" fill="none" strokeLinecap="round" />
  </>);

export const Cap = () =>
  sv('0 0 120 90', <>
    <path d="M30 40 v22 c0 10 60 10 60 0 v-22" fill={C.azulEsc} />
    <path d="M60 14 L114 36 L60 58 L6 36z" fill={C.azul} />
    <path d="M60 14 L114 36 L60 58 L6 36z" fill="none" stroke={C.azulEsc} strokeWidth="2" />
    <path d="M60 36 L96 46 V72" stroke={C.ouro} strokeWidth="3" fill="none" />
    <path d="M92 70 h8 l3 14 h-14z" fill={C.ouro} />
    <circle cx="60" cy="36" r="4" fill={C.ouro} />
  </>);

export const Diploma = () =>
  sv('0 0 120 60', <>
    <rect x="10" y="14" width="100" height="32" rx="16" fill={C.creme} stroke="#E8D9A8" strokeWidth="2" />
    <ellipse cx="14" cy="30" rx="8" ry="16" fill="#F3E7C2" stroke="#E8D9A8" strokeWidth="2" />
    <rect x="52" y="12" width="14" height="36" fill={C.rosaMedio} />
    <path d="M59 46 l-8 14 l8 -4 l8 4z" fill={C.rosaEsc} />
  </>);

// ── Datas do ano ───────────────────────────────────────────────
export const Daisy = () =>
  sv('0 0 100 110', <>
    <path d="M50 58 C50 80 46 94 44 108" stroke={C.salviaEsc} strokeWidth="4" fill="none" strokeLinecap="round" />
    <path d="M47 86 c-12 -8 -22 -4 -24 2 c10 2 18 4 24 -2z" fill={C.salvia} />
    {Array.from({ length: 10 }).map((_, i) => (
      <ellipse key={i} cx="50" cy="22" rx="7" ry="16" fill={i % 2 ? C.lilas : C.branco} stroke="#EADFF7" strokeWidth="1" transform={`rotate(${i * 36} 50 38)`} />
    ))}
    <circle cx="50" cy="38" r="10" fill={C.ouro} />
  </>);

export const Sun = () =>
  sv('0 0 100 100', <>
    {Array.from({ length: 12 }).map((_, i) => (
      <path key={i} d="M50 4 l5 14 h-10z" fill={C.ouro} transform={`rotate(${i * 30} 50 50)`} />
    ))}
    <circle cx="50" cy="50" r="26" fill={C.manteiga} stroke={C.ouro} strokeWidth="3" />
    <circle cx="42" cy="46" r="3" fill={C.laranjaEsc} />
    <circle cx="58" cy="46" r="3" fill={C.laranjaEsc} />
    <path d="M42 58 q8 7 16 0" stroke={C.laranjaEsc} strokeWidth="3" fill="none" strokeLinecap="round" />
  </>);

export const Sprout = () =>
  sv('0 0 100 100', <>
    <ellipse cx="50" cy="90" rx="30" ry="8" fill={C.tronco} opacity=".7" />
    <path d="M50 90 V44" stroke={C.salviaEsc} strokeWidth="5" strokeLinecap="round" />
    <path d="M50 56 C30 56 18 42 18 28 C36 28 50 40 50 56z" fill={C.salvia} />
    <path d="M50 46 C70 46 84 32 84 16 C64 16 50 30 50 46z" fill={C.salviaEsc} />
  </>);

export const Stethoscope = () =>
  sv('0 0 100 100', <>
    <path d="M26 10 v24 c0 18 12 28 24 28 s24 -10 24 -28 v-24" stroke={C.azul} strokeWidth="6" fill="none" strokeLinecap="round" />
    <path d="M50 62 v10 c0 12 10 18 20 18 s16 -6 16 -16 v-8" stroke={C.azul} strokeWidth="6" fill="none" strokeLinecap="round" />
    <circle cx="86" cy="58" r="10" fill={C.rosaMedio} stroke={C.azul} strokeWidth="4" />
    <circle cx="26" cy="8" r="5" fill={C.azulClaro} />
    <circle cx="74" cy="8" r="5" fill={C.azulClaro} />
  </>);

export const MedCross = () =>
  sv('0 0 100 100', <>
    <circle cx="50" cy="50" r="44" fill={C.rosa} />
    <path d="M40 18 h20 v22 h22 v20 h-22 v22 h-20 v-22 h-22 v-20 h22z" fill={C.branco} stroke={C.rosaMedio} strokeWidth="3" strokeLinejoin="round" />
  </>);

export const Envelope = () =>
  sv('0 0 100 76', <>
    <rect x="6" y="10" width="88" height="60" rx="8" fill={C.creme} stroke="#E8D9A8" strokeWidth="2" />
    <path d="M8 14 L50 46 L92 14" fill="none" stroke="#E8D9A8" strokeWidth="2.5" />
    <path d="M50 52 C40 44 36 38 36 34 C36 30 39 27 43 27 C46 27 48 29 50 31 C52 29 54 27 57 27 C61 27 64 30 64 34 C64 38 60 44 50 52z" fill={C.rosaMedio} />
  </>);
