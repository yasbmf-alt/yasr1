// O quarto de estudos: cenário 2D com objetos clicáveis. Cada objeto é um <g>
// com id estável; o Quarto decide quais ficam interativos.
import React from 'react';

export type RoomSpot =
  | 'janela' | 'armario' | 'estante' | 'gaveta' | 'mesa' | 'cartas' | 'pote'
  | 'mural' | 'calendario' | 'rotacoes' | 'mimos' | 'gato' | 'chave' | 'caixinha';

export const SPOT_BOX: Record<RoomSpot, [number, number, number, number]> = {
  // x, y, largura, altura (no viewBox 1600×900) — usados para o zoom da câmera
  janela: [630, 70, 340, 350],
  armario: [350, 160, 260, 500],
  estante: [50, 140, 290, 510],
  gaveta: [670, 470, 300, 240],
  mesa: [1050, 360, 440, 420],
  cartas: [690, 395, 120, 80],
  pote: [870, 360, 80, 115],
  mural: [1140, 90, 290, 220],
  calendario: [990, 110, 130, 160],
  rotacoes: [1000, 300, 110, 140],
  mimos: [960, 680, 100, 100],
  gato: [690, 740, 170, 90],
  chave: [818, 420, 50, 55],
  caixinha: [210, 150, 80, 60],
};

const W = {
  wall: '#F6E6F2', wallStripe: '#F1DCEB', floor: '#E2C3A3', floorLine: '#D2AE8C', base: '#EBD1BF',
  wood: '#C99A72', woodDark: '#A9784F', woodLight: '#DDB48E', brass: '#F2D27A',
  rosa: '#F8C9F1', rosaM: '#F38CB8', lilas: '#E9D8FF', azul: '#2E4A7F', azulC: '#CFE4FF', lima: '#D9EE76',
  pess: '#FFAEB1', mant: '#FFF3B0', salvia: '#AFC47E', salviaE: '#7E9A4A', branco: '#FFFDFB',
};

function Hot({ id, label, on, onPick, children }: { id: RoomSpot; label: string; on: boolean; onPick: (id: RoomSpot) => void; children: React.ReactNode }) {
  if (!on) return <g>{children}</g>;
  return (
    <g
      className={`hs hs-${id}`}
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={() => onPick(id)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onPick(id))}
    >
      <title>{label}</title>
      {children}
    </g>
  );
}

export function RoomArt({ active, onPick, night, catAwake, keyFound, boxOpen }: {
  active: Set<RoomSpot>; onPick: (id: RoomSpot) => void; night: boolean; catAwake: boolean; keyFound: boolean; boxOpen: boolean;
}) {
  const on = (id: RoomSpot) => active.has(id);
  return (
    <svg viewBox="0 0 1600 900" className="room-svg" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="stripes" width="44" height="44" patternUnits="userSpaceOnUse">
          <rect width="44" height="44" fill={W.wall} />
          <rect width="14" height="44" fill={W.wallStripe} />
          <circle cx="29" cy="22" r="2.2" fill="#EFCFE4" />
        </pattern>
        <radialGradient id="lampGlow" cx="0.5" cy="0" r="1">
          <stop offset="0" stopColor="#FFF3B0" stopOpacity={night ? 0.75 : 0.35} />
          <stop offset="1" stopColor="#FFF3B0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={night ? '#2E4A7F' : '#BFDCFB'} />
          <stop offset="1" stopColor={night ? '#5C6FA6' : '#E6F1FF'} />
        </linearGradient>
      </defs>

      {/* parede e piso */}
      <rect width="1600" height="630" fill="url(#stripes)" />
      <rect y="610" width="1600" height="22" fill={W.base} />
      <rect y="630" width="1600" height="270" fill={W.floor} />
      {Array.from({ length: 9 }).map((_, i) => (
        <path key={i} d={`M0 ${660 + i * 30} H1600`} stroke={W.floorLine} strokeWidth="2" opacity=".5" />
      ))}
      {Array.from({ length: 24 }).map((_, i) => (
        <path key={`v${i}`} d={`M${(i * 137 + (i % 3) * 40) % 1600} ${660 + (i % 8) * 30} v30`} stroke={W.floorLine} strokeWidth="2" opacity=".5" />
      ))}

      {/* varal de luzinhas */}
      <path d="M0 36 Q 400 92 800 40 T 1600 46" fill="none" stroke="#B7A3B4" strokeWidth="2" />
      {Array.from({ length: 17 }).map((_, i) => {
        const x = i * 100 + 20;
        const y = 36 + Math.sin((x / 1600) * Math.PI * 2) * 22 + 22;
        return <circle key={i} cx={x} cy={y} r="7" fill={[W.mant, W.rosaM, W.azulC, W.lima][i % 4]} className={night ? 'bulb bulb-on' : 'bulb'} style={{ animationDelay: `${i * 0.3}s` }} />;
      })}

      {/* tapete */}
      <ellipse cx="830" cy="805" rx="340" ry="72" fill={W.rosa} />
      <ellipse cx="830" cy="805" rx="300" ry="56" fill="none" stroke={W.branco} strokeWidth="5" strokeDasharray="2 12" strokeLinecap="round" />

      {/* JANELA → jardim */}
      <Hot id="janela" label="Janela: ir para o jardim" on={on('janela')} onPick={onPick}>
        <rect x="652" y="92" width="296" height="300" rx="16" fill="url(#sky)" />
        {night ? (
          <>
            <circle cx="880" cy="150" r="22" fill="#F4F1FF" />
            {[[700, 130], [760, 175], [820, 120], [905, 210], [720, 220]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.2" fill="#fff" />)}
          </>
        ) : (
          <>
            <circle cx="880" cy="150" r="24" fill={W.mant} />
            <path d="M690 170 h70 a14 14 0 0 0-8-24 a20 20 0 0 0-36-4 a14 14 0 0 0-26 28z" fill="#fff" opacity=".9" />
          </>
        )}
        <path d="M652 300 C 720 260 800 290 948 268 V392 H652z" fill={night ? '#6F8C5C' : '#BCD488'} />
        <path d="M652 340 C 760 320 860 350 948 330 V392 H652z" fill={night ? '#5E7A4C' : '#A6C06E'} />
        {[[690, 330, W.rosaM], [740, 345, W.mant], [800, 335, W.lilas], [870, 345, W.pess], [915, 330, W.rosaM]].map(([x, y, c], i) => (
          <g key={i}><rect x={(x as number) - 1.5} y={y as number} width="3" height="22" fill={W.salviaE} /><circle cx={x as number} cy={y as number} r="7" fill={c as string} /></g>
        ))}
        <rect x="640" y="80" width="320" height="324" rx="22" fill="none" stroke={W.branco} strokeWidth="16" />
        <path d="M800 84 V400 M644 242 H956" stroke={W.branco} strokeWidth="10" />
        <rect x="628" y="396" width="344" height="18" rx="8" fill={W.branco} />
        {/* cortinas */}
        <path d="M606 60 C 640 160 600 280 640 420 L 600 420 C 570 300 590 150 572 60z" fill={W.rosaM} opacity=".9" />
        <path d="M994 60 C 960 160 1000 280 960 420 L 1000 420 C 1030 300 1010 150 1028 60z" fill={W.rosaM} opacity=".9" />
        <rect x="560" y="52" width="480" height="12" rx="6" fill={W.woodDark} />
      </Hot>

      {/* ESTANTE → macetes */}
      <Hot id="estante" label="Estante: biblioteca de macetes" on={on('estante')} onPick={onPick}>
        <rect x="60" y="150" width="270" height="490" rx="10" fill={W.woodDark} />
        <rect x="74" y="164" width="242" height="462" rx="6" fill="#8A5E44" />
        {[0, 1, 2, 3].map((r) => (
          <g key={r}>
            {Array.from({ length: 8 }).map((_, i) => {
              const h = 64 + ((i * 7 + r * 3) % 4) * 10;
              const cols = [W.rosaM, W.azulC, W.lima, W.mant, W.lilas, W.pess, W.salvia, W.rosa];
              return <rect key={i} x={86 + i * 27} y={276 + r * 112 - h} width="22" height={h} rx="3" fill={cols[(i + r * 3) % 8]} />;
            })}
            <rect x="74" y={276 + r * 112} width="242" height="12" fill={W.wood} />
          </g>
        ))}
        <rect x="60" y="140" width="270" height="16" rx="6" fill={W.wood} />
      </Hot>
      {/* caixinha musical secreta no alto da estante */}
      <Hot id="caixinha" label="Uma caixinha esquecida" on={on('caixinha')} onPick={onPick}>
        <g className={boxOpen ? 'musicbox open' : 'musicbox'}>
          <rect x="216" y="112" width="70" height="30" rx="5" fill={W.lilas} />
          <rect x="216" y="112" width="70" height="8" fill="#CDB7F2" />
          <path d={boxOpen ? 'M216 112 L226 84 H296 L286 112z' : 'M212 104 H290 V114 H212z'} fill="#D7C4F7" />
          <circle cx="251" cy="128" r="4" fill={W.brass} />
        </g>
      </Hot>

      {/* ARMÁRIO → biblioteca */}
      <Hot id="armario" label="Armário: biblioteca dos temas" on={on('armario')} onPick={onPick}>
        <rect x="362" y="168" width="236" height="22" rx="8" fill={W.woodDark} />
        <rect x="372" y="186" width="216" height="456" fill={W.wood} />
        <rect x="384" y="198" width="94" height="430" rx="6" fill={W.woodLight} />
        <rect x="482" y="198" width="94" height="430" rx="6" fill={W.woodLight} />
        <rect x="396" y="214" width="70" height="180" rx="5" fill="#D6AA82" />
        <rect x="494" y="214" width="70" height="180" rx="5" fill="#D6AA82" />
        <rect x="396" y="414" width="70" height="196" rx="5" fill="#D6AA82" />
        <rect x="494" y="414" width="70" height="196" rx="5" fill="#D6AA82" />
        <circle cx="470" cy="408" r="6" fill={W.brass} />
        <circle cx="490" cy="408" r="6" fill={W.brass} />
        <rect x="380" y="642" width="22" height="14" rx="3" fill={W.woodDark} />
        <rect x="558" y="642" width="22" height="14" rx="3" fill={W.woodDark} />
        {/* adesivinhos */}
        <circle cx="430" cy="250" r="12" fill={W.rosaM} stroke="#fff" strokeWidth="4" />
        <path d="M520 470 l6 12 13 2 -9 9 2 13 -12 -6 -12 6 2 -13 -9 -9 13 -2z" fill={W.mant} stroke="#fff" strokeWidth="3" />
      </Hot>

      {/* CÔMODA → gaveta dos erros */}
      <Hot id="gaveta" label="Cômoda: gaveta dos erros" on={on('gaveta')} onPick={onPick}>
        <rect x="676" y="474" width="288" height="18" rx="6" fill={W.woodDark} />
        <rect x="686" y="488" width="268" height="212" fill={W.wood} />
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <rect x="698" y={500 + i * 64} width="244" height="54" rx="6" fill={i === 0 ? '#E3BB93' : W.woodLight} />
            <rect x="800" y={520 + i * 64} width="40" height="10" rx="5" fill={W.woodDark} />
          </g>
        ))}
        <rect x="716" y="508" width="58" height="22" rx="4" fill={W.branco} />
        <text x="745" y="524" textAnchor="middle" fontSize="13" fontWeight="800" fill={W.azul} fontFamily="Figtree, sans-serif">erros</text>
        <rect x="694" y="700" width="18" height="14" fill={W.woodDark} />
        <rect x="928" y="700" width="18" height="14" fill={W.woodDark} />
      </Hot>

      {/* sobre a cômoda: caixa de cartas, vaso (chave), pote */}
      <Hot id="cartas" label="Caixa de cartas para a Yas do futuro" on={on('cartas')} onPick={onPick}>
        <rect x="700" y="420" width="104" height="56" rx="8" fill={W.pess} />
        <rect x="700" y="420" width="104" height="14" rx="6" fill="#F58F95" />
        <rect x="728" y="410" width="48" height="8" rx="3" fill="#F58F95" />
        <path d="M722 446 h60 v24 h-60z" fill={W.branco} />
        <path d="M722 446 l30 14 l30 -14" fill="none" stroke={W.rosaM} strokeWidth="3" />
        <circle cx="752" cy="460" r="5" fill={W.rosaM} />
      </Hot>
      <g>
        <path d="M824 440 h40 l-5 36 h-30z" fill={W.pess} />
        <path d="M844 440 c-6-20 -22-26 -26-40 c14 4 22 14 26 26 c2-16 10-26 22-32 c-4 16-14 26-22 46z" fill={W.salvia} />
      </g>
      {!keyFound && (
        <Hot id="chave" label="Algo brilha no vaso" on={on('chave')} onPick={onPick}>
          <g className="key-glint">
            <circle cx="858" cy="466" r="5" fill="none" stroke={W.brass} strokeWidth="3" />
            <path d="M862 468 l10 5 m-4 -2 l2 -4 m2 5 l2 -4" stroke={W.brass} strokeWidth="2.5" strokeLinecap="round" />
          </g>
        </Hot>
      )}
      <Hot id="pote" label="Pote de conquistas" on={on('pote')} onPick={onPick}>
        <rect x="882" y="378" width="56" height="14" rx="5" fill={W.rosaM} />
        <path d="M878 392 h64 v70 a12 12 0 0 1-12 12 h-40 a12 12 0 0 1-12-12z" fill="#EAF4FF" opacity=".85" />
        {[[894, 456, W.mant], [912, 448, W.rosa], [928, 458, W.lima], [900, 436, W.lilas], [922, 430, W.pess], [908, 418, W.mant]].map(([x, y, c], i) => (
          <path key={i} d={`M${x} ${(y as number) - 7} l2.5 5 5.5 .8 -4 3.9 1 5.5 -5 -2.6 -5 2.6 1 -5.5 -4 -3.9 5.5 -.8z`} fill={c as string} />
        ))}
        <path d="M884 400 v52" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".8" />
      </Hot>

      {/* CALENDÁRIO → retrospectiva */}
      <Hot id="calendario" label="Calendário: retrospectiva do mês" on={on('calendario')} onPick={onPick}>
        <rect x="1000" y="120" width="110" height="140" rx="8" fill={W.branco} />
        <rect x="1000" y="120" width="110" height="34" rx="8" fill={W.rosaM} />
        <circle cx="1030" cy="118" r="5" fill={W.azul} />
        <circle cx="1080" cy="118" r="5" fill={W.azul} />
        {Array.from({ length: 15 }).map((_, i) => (
          <rect key={i} x={1012 + (i % 5) * 18} y={166 + Math.floor(i / 5) * 26} width="12" height="12" rx="3" fill={[W.rosa, W.lima, W.azulC][i % 3]} opacity={i % 4 ? 1 : 0.4} />
        ))}
      </Hot>

      {/* CRACHÁ → rotações */}
      <Hot id="rotacoes" label="Crachá: rotações do internato" on={on('rotacoes')} onPick={onPick}>
        <path d="M1055 290 L1036 330 M1055 290 L1074 330" stroke={W.azul} strokeWidth="4" />
        <circle cx="1055" cy="288" r="5" fill={W.woodDark} />
        <rect x="1012" y="330" width="86" height="104" rx="10" fill={W.branco} />
        <rect x="1012" y="330" width="86" height="24" rx="10" fill={W.azulC} />
        <circle cx="1055" cy="378" r="16" fill={W.rosa} />
        <rect x="1030" y="402" width="50" height="7" rx="3" fill={W.azul} />
        <rect x="1036" y="414" width="38" height="5" rx="2.5" fill="#C9C3D6" />
      </Hot>

      {/* MURAL → revisão rápida */}
      <Hot id="mural" label="Mural: revisão rápida" on={on('mural')} onPick={onPick}>
        <rect x="1150" y="100" width="270" height="200" rx="12" fill={W.woodDark} />
        <rect x="1162" y="112" width="246" height="176" rx="6" fill="#E3BE93" />
        {[[1180, 128, W.mant, -4], [1262, 122, W.rosa, 3], [1336, 134, W.azulC, -2], [1196, 206, W.lima, 5], [1290, 200, W.lilas, -5]].map(([x, y, c, r], i) => (
          <g key={i} transform={`rotate(${r} ${(x as number) + 30} ${(y as number) + 30})`}>
            <rect x={x as number} y={y as number} width="62" height="58" rx="3" fill={c as string} />
            <rect x={(x as number) + 10} y={(y as number) + 16} width="40" height="4" rx="2" fill="#000" opacity=".12" />
            <rect x={(x as number) + 10} y={(y as number) + 26} width="30" height="4" rx="2" fill="#000" opacity=".12" />
            <circle cx={(x as number) + 31} cy={(y as number) + 6} r="5" fill={W.rosaM} />
          </g>
        ))}
      </Hot>

      {/* MESA → cantinho de concentração */}
      <Hot id="mesa" label="Mesa: cantinho de concentração" on={on('mesa')} onPick={onPick}>
        <ellipse cx="1360" cy="440" rx="150" ry="120" fill="url(#lampGlow)" />
        <rect x="1060" y="516" width="420" height="22" rx="8" fill={W.woodDark} />
        <rect x="1078" y="538" width="16" height="230" fill={W.woodDark} />
        <rect x="1446" y="538" width="16" height="230" fill={W.woodDark} />
        <rect x="1300" y="538" width="146" height="90" rx="6" fill={W.wood} />
        <rect x="1352" y="576" width="40" height="9" rx="4.5" fill={W.woodDark} />
        {/* luminária */}
        <path d="M1420 516 v-12 h40 v12z" fill={W.azul} />
        <path d="M1440 506 L1410 430 L1376 446" fill="none" stroke={W.azul} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M1352 470 L1392 430 L1412 462z" fill={W.rosaM} />
        {/* livros e caderno */}
        <rect x="1110" y="496" width="110" height="20" rx="3" fill={W.azulC} />
        <rect x="1118" y="478" width="96" height="18" rx="3" fill={W.lima} />
        <rect x="1240" y="508" width="90" height="8" rx="2" fill={W.branco} />
        <path d="M1240 508 l8 -26 h74 l8 26z" fill={W.lilas} />
        {/* caneca */}
        <rect x="1340" y="482" width="30" height="34" rx="6" fill={W.mant} />
        <path d="M1370 490 h6 a8 8 0 0 1 0 16 h-6" fill="none" stroke={W.mant} strokeWidth="5" />
        <path className="steam" d="M1350 474 c-6-8 6-12 0-20 M1362 474 c-6-8 6-12 0-20" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
        {/* cadeira */}
        <rect x="1166" y="560" width="120" height="110" rx="20" fill={W.rosaM} />
        <rect x="1150" y="660" width="152" height="26" rx="12" fill="#E2729F" />
        <rect x="1170" y="686" width="12" height="86" fill={W.azul} />
        <rect x="1270" y="686" width="12" height="86" fill={W.azul} />
      </Hot>

      {/* planta grande no canto */}
      <g className="sway-big">
        <path d="M1500 800 h70 l-8 -84 h-54z" fill={W.pess} />
        {[[-50, 70], [-25, 90], [0, 100], [25, 90], [50, 72], [-10, 80], [15, 84]].map(([r, h], i) => (
          <ellipse key={i} cx="1535" cy={716 - (h as number) / 2} rx="16" ry={(h as number) / 2} fill={i % 2 ? W.salvia : W.salviaE} transform={`rotate(${r} 1535 716)`} />
        ))}
      </g>

      {/* PRESENTE → mimos */}
      <Hot id="mimos" label="Presentinho: meus mimos" on={on('mimos')} onPick={onPick}>
        <rect x="968" y="712" width="84" height="62" rx="6" fill={W.lilas} />
        <rect x="962" y="696" width="96" height="22" rx="6" fill="#D7C4F7" />
        <rect x="1004" y="696" width="12" height="78" fill={W.rosaM} />
        <path d="M1010 696 c-20 -26 -40 -6 -20 0 M1010 696 c20 -26 40 -6 20 0" fill="none" stroke={W.rosaM} strokeWidth="6" strokeLinecap="round" />
      </Hot>

      {/* GATINHO dormindo no tapete */}
      <Hot id="gato" label="Um gatinho dormindo" on={on('gato')} onPick={onPick}>
        <g className={catAwake ? 'cat awake' : 'cat'}>
          <ellipse cx="775" cy="804" rx="78" ry="30" fill="#000" opacity=".06" />
          <path d="M710 800 c0 -40 40 -56 76 -54 c34 2 62 22 62 50 c0 14 -10 22 -26 22 h-90 c-14 0 -22 -6 -22 -18z" fill="#F2C38E" />
          <path d="M740 760 c16 -8 40 -10 58 -4" fill="none" stroke="#E2A666" strokeWidth="6" strokeLinecap="round" />
          <path d="M770 776 c14 -6 34 -6 46 0" fill="none" stroke="#E2A666" strokeWidth="6" strokeLinecap="round" />
          <circle cx="726" cy="790" r="26" fill="#F2C38E" />
          <path d="M706 772 l-4 -22 l18 12z M738 768 l8 -20 l6 22z" fill="#F2C38E" />
          {catAwake ? (
            <>
              <circle cx="718" cy="790" r="3.5" fill={W.azul} />
              <circle cx="736" cy="790" r="3.5" fill={W.azul} />
            </>
          ) : (
            <path d="M712 790 q5 4 10 0 M730 790 q5 4 10 0" fill="none" stroke={W.azul} strokeWidth="2.5" strokeLinecap="round" />
          )}
          <path d="M724 798 l3 3 l3 -3" fill="none" stroke="#C97B8A" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M846 806 c18 0 30 -10 26 -26" fill="none" stroke="#F2C38E" strokeWidth="12" strokeLinecap="round" className="cat-tail" />
        </g>
      </Hot>
    </svg>
  );
}
