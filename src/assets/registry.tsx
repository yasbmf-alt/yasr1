// Registro modular de ilustrações. Cada SLOT tem uma chave estável, um
// desenho provisório e uma sugestão de arte. Para trocar: Configurações →
// Ilustrações → enviar PNG/SVG/WebP. A chave nunca muda, então o app não
// precisa ser reconstruído quando a arte nova chega.
import React from 'react';
import { useStore } from '../data/store';
import {
  CelebrationArt, Chest, DoorArt, DrawerArt, GardenDecor, Mascot, PlantArt, SPECIES_LABEL, SpecialFlower,
  StationIcon, StickerArt, TrailDecor, type Species,
} from './art';
import { STICKERS } from '../logic/stickers';
import { Bridge, Bush, Fence, FlowerBed, FlowerCluster, Fern, Grass, Hedge, Lantern, Leaf, Mushrooms, Pine, Rocks, Stone, TreeBlossom, TreeRound, Tulips } from './trailArt';

const TRAIL_ART: [string, string, React.ComponentType][] = [
  ['arvore', 'árvore', TreeRound],
  ['ipe', 'ipê florido', TreeBlossom],
  ['pinheiro', 'pinheiro', Pine],
  ['arbusto', 'arbusto florido', Bush],
  ['flor', 'flores', FlowerCluster],
  ['tulipas', 'tulipas', Tulips],
  ['samambaia', 'samambaia', Fern],
  ['cogumelos', 'cogumelos', Mushrooms],
  ['pedras', 'pedras', Rocks],
  ['grama', 'tufo de grama', Grass],
  ['lanterna', 'lanterna', Lantern],
  ['cerca', 'cerquinha', Fence],
  ['canteiro', 'canteiro', FlowerBed],
  ['sebe', 'cerca viva', Hedge],
  ['ponte', 'ponte', Bridge],
  ['folha', 'folha', () => <Leaf />],
  ['pedra', 'pedra do caminho', () => <Stone />],
  ['florzinha', 'florzinha (clássico)', () => <TrailDecor kind="flor" />],
  ['moita', 'moita (clássico)', () => <TrailDecor kind="arbusto" />],
  ['arvorezinha', 'árvore rosa (clássico)', () => <TrailDecor kind="arvore" />],
];
import { AREAS } from '../types';

export interface Slot {
  key: string;
  group: string;
  label: string;
  size: string; // tamanho recomendado
  idea?: string;
  render: () => React.ReactNode;
}

const SPECIES: Species[] = ['ipe', 'mandacaru', 'lirio', 'girassol', 'pequizeiro', 'samambaia'];
const STAGES = ['Semente', 'Broto', 'Planta', 'Em flor'];

export const GROUPS: { id: string; label: string; idea: string }[] = [
  {
    id: 'Geral',
    label: 'Personagem e celebração',
    idea: 'Uma personagem sua (pode ser você de jaleco, ou um mascote) em 3 expressões: acenando, comemorando e "chocada". PNG transparente, corte limpo. Na celebração ela entra pulando de baixo e o balão de fala aparece com um leve atraso.',
  },
  {
    id: 'Trilha',
    label: 'Trilha',
    idea: 'Cada estação é um "carimbo" circular por grande área. Funciona bem como ícone dentro de um círculo (fundo transparente, ~70% do quadro). O baú pode ganhar uma terceira versão "brilhando" quando o capítulo estiver a 1 missão de fechar. Decorações soltas (ipê, nuvem, arbusto) dão o clima de mapa; a ideia é trocar o cenário por estação do ano.',
  },
  {
    id: 'Jardim',
    label: 'Jardim do Conhecimento',
    idea: 'Seis espécies, uma por grande área, cada uma em 4 estágios desenhados no MESMO enquadramento (base da terra sempre na mesma linha) para a troca de estágio parecer crescimento. O app já anima o crescimento com mola; se quiser, as folhas podem ser uma camada à parte depois.',
  },
  {
    id: 'Biblioteca',
    label: 'Armário',
    idea: 'O armário é montado em camadas para a porta abrir de verdade: porta esquerda e porta direita (mesmo tamanho, formato retrato, sem fundo), gaveta e fundo interno. Desenhe as portas de frente, com a dobradiça no lado de fora: o app gira cada uma pela borda externa. As capas dos livros você troca direto no livro, dentro do armário.',
  },
  {
    id: 'Adesivos',
    label: 'Adesivos',
    idea: 'Adesivos quadrados com borda branca de "die-cut" e fundo transparente. Ficam ótimos em PNG 512×512. Pense em coisas do seu dia a dia de interna: jaleco, crachá, café, plantão, um gatinho, a cidade.',
  },
];

export const SLOTS: Slot[] = [
  { key: 'mascot.greeting', group: 'Geral', label: 'Personagem da saudação', size: '400×400', render: () => <Mascot /> },
  { key: 'celebration.mission', group: 'Geral', label: 'Celebração de missão', size: '600×480, PNG transparente', render: () => <CelebrationArt /> },
  { key: 'celebration.chapter', group: 'Geral', label: 'Celebração de capítulo', size: '800×640, PNG transparente', render: () => <CelebrationArt big /> },
  ...AREAS.map((a) => ({
    key: `trail.station.${a.id}`,
    group: 'Trilha',
    label: `Estação · ${a.label}`,
    size: '256×256',
    render: () => <StationIcon area={a.id} />,
  })),
  { key: 'trail.station.internato', group: 'Trilha', label: 'Estação · Missão do Internato', size: '256×256', render: () => <StationIcon area="internato" /> },
  { key: 'trail.chest.closed', group: 'Trilha', label: 'Baú fechado', size: '320×280', render: () => <Chest /> },
  { key: 'trail.chest.open', group: 'Trilha', label: 'Baú aberto', size: '320×280', render: () => <Chest open /> },
  { key: 'trail.decor.nuvem', group: 'Trilha', label: 'Cenário · nuvem', size: '300×130', render: () => <TrailDecor kind="nuvem" /> },
  ...TRAIL_ART.map(([k, label, C]) => ({ key: `trail.decor.${k}`, group: 'Trilha', label: `Cenário · ${label}`, size: '300×300, PNG transparente', render: () => <C /> })),
  ...SPECIES.flatMap((sp) =>
    [1, 2, 3, 4].map((st) => ({
      key: `garden.plant.${sp}.${st}`,
      group: 'Jardim',
      label: `${SPECIES_LABEL[sp]} · ${STAGES[st - 1]}`,
      size: '300×360 (terra na base)',
      render: () => <PlantArt species={sp} stage={st as 1 | 2 | 3 | 4} />,
    })),
  ),
  { key: 'garden.special', group: 'Jardim', label: 'Flor do capítulo (especial)', size: '300×360', render: () => <SpecialFlower /> },
  ...['regador', 'banco', 'lanterna', 'fonte'].map((k) => ({
    key: `garden.decor.${k}`,
    group: 'Jardim',
    label: `Decoração · ${k}`,
    size: '300×220',
    render: () => <GardenDecor kind={k} />,
  })),
  { key: 'library.door.left', group: 'Biblioteca', label: 'Porta esquerda', size: '400×1040, PNG transparente', render: () => <DoorArt side="left" /> },
  { key: 'library.door.right', group: 'Biblioteca', label: 'Porta direita', size: '400×1040, PNG transparente', render: () => <DoorArt side="right" /> },
  { key: 'library.drawer', group: 'Biblioteca', label: 'Gaveta de adesivos', size: '800×140', render: () => <DrawerArt /> },
  { key: 'library.interior', group: 'Biblioteca', label: 'Fundo interno', size: '800×1000', render: () => <span className="interior-default" /> },
  ...STICKERS.map((st) => ({
    key: `sticker.${st.id}`,
    group: 'Adesivos',
    label: `${st.label} · ${st.how.toLowerCase()}`,
    size: '512×512, PNG transparente',
    render: () => <StickerArt id={st.id} />,
  })),
];

const SLOT_MAP = new Map(SLOTS.map((s) => [s.key, s]));

export const assetUrl = (id: string) => `/_blob/${id}`;

/** Renderiza a arte da Yasmim se existir; senão, o provisório. */
export function Asset({ slot, className, alt = '' }: { slot: string; className?: string; alt?: string }) {
  const { data } = useStore();
  const id = data.settings.assetMap[slot];
  const [broken, setBroken] = React.useState(false);
  if (id && !broken)
    return <img className={`asset-img ${className ?? ''}`} src={assetUrl(id)} alt={alt} draggable={false} onError={() => setBroken(true)} />;
  const s = SLOT_MAP.get(slot);
  return <span className={`asset-svg ${className ?? ''}`}>{s?.render() ?? null}</span>;
}
