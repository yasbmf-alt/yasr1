// Registro modular de ilustrações. Cada SLOT tem uma chave estável, um
// desenho provisório e uma sugestão de arte. Para trocar: Configurações →
// Ilustrações → enviar PNG/SVG/WebP. A chave nunca muda, então o app não
// precisa ser reconstruído quando a arte nova chega.
import React from 'react';
import { useStore } from '../data/store';
import { assetUrlSync, useAssetUrl } from '../platform/platform';
import {
  CelebrationArt, Chest, DoorArt, DrawerArt, GardenDecor, Mascot, PlantArt, SPECIES_LABEL, SpecialFlower,
  StationIcon, StickerArt, TrailDecor, type Species,
} from './art';
import { STICKERS } from '../logic/stickers';
import * as EV from './eventArt';
import { Bridge, Bush, Fence, FlowerBed, FlowerCluster, Fern, Grass, Hedge, Lantern, Leaf, Mushrooms, Pine, Pond, Rocks, Stone, TreeBlossom, TreeRound, Tulips } from './trailArt';

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
  ['lago', 'lago', Pond],
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
  placeholder?: boolean; // ainda sem desenho provisório: precisa criar
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
    id: 'Eventos',
    label: 'Eventos especiais',
    idea: 'Peças soltas, com fundo transparente, que entram nas laterais dos ambientes durante cada data. Mantenha a mesma espessura de traço e a paleta do app. As faixas (luzinhas, bandeirinhas, morcegos) são horizontais e longas, para ocupar o topo do cenário.',
  },
  {
    id: 'Adesivos',
    label: 'Adesivos',
    idea: 'Adesivos quadrados com borda branca de "die-cut" e fundo transparente. Ficam ótimos em PNG 512×512. Pense em coisas do seu dia a dia de interna: jaleco, crachá, café, plantão, um gatinho, a cidade.',
  },
];

export const SLOTS: Slot[] = [
  { key: 'mascot.greeting', group: 'Geral', label: 'Personagem da saudação', size: '400×400', render: () => <Mascot /> },
  { key: 'mascot.comemorando', group: 'Geral', label: 'Personagem · comemorando', size: '400×400', render: () => <Mascot mood="comemorando" /> },
  { key: 'mascot.chocada', group: 'Geral', label: 'Personagem · chocada', size: '400×400', render: () => <Mascot mood="chocada" /> },
  { key: 'mascot.sono', group: 'Geral', label: 'Personagem · com sono (madrugada)', size: '400×400', render: () => <Mascot mood="sono" /> },
  { key: 'mascot.festa', group: 'Geral', label: 'Personagem · festa (aniversários e Réveillon)', size: '400×400', render: () => <Mascot mood="festa" /> },
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

const BatGarland = () => (
  <span className="ev-garland-row">
    <span><EV.Bat /></span><span><EV.Bat /></span><span><EV.Bat /></span>
  </span>
);

const EVENT_ART: [string, string, string, React.ComponentType][] = [
  ['halloween.abobora', 'Halloween · abóbora', '300×270', EV.Pumpkin],
  ['halloween.fantasma', 'Halloween · fantasminha', '240×300', EV.Ghost],
  ['halloween.morcego', 'Halloween · morcego', '360×180', EV.Bat],
  ['halloween.lua', 'Halloween · lua', '300×300', EV.Moon],
  ['halloween.teia', 'Halloween · teia (canto)', '300×300', EV.Web],
  ['halloween.morcegos', 'Halloween · faixa de morcegos', '1200×180', BatGarland],
  ['natal.arvore', 'Natal · árvore', '300×360', EV.XmasTree],
  ['natal.presente', 'Natal · presente', '300×300', EV.Gift],
  ['natal.estrela', 'Natal · estrela', '300×300', EV.Star],
  ['natal.laco', 'Natal · laço', '300×210', EV.Bow],
  ['natal.enfeite', 'Natal · bola de enfeite', '180×240', EV.Ornament],
  ['natal.luzinhas', 'Natal · faixa de luzinhas', '1200×180', EV.Lights],
  ['praia.concha', 'Praia · conchinha', '300×270', EV.Shell],
  ['praia.estrela-do-mar', 'Praia · estrela-do-mar', '300×300', EV.Starfish],
  ['praia.coracao', 'Romance · coração', '300×270', EV.Heart],
  ['praia.hibisco', 'Praia · flor tropical', '300×300', EV.Hibiscus],
  ['praia.coqueiro', 'Praia · coqueiro', '300×360', EV.Palm],
  ['aniversario.balao', 'Aniversário · balão rosa', '180×330', EV.Balloon],
  ['aniversario.balao-azul', 'Aniversário · balão azul', '180×330', EV.BalloonBlue],
  ['aniversario.presente', 'Aniversário · presentinho', '300×300', EV.Gift],
  ['aniversario.laco', 'Aniversário · laço', '300×210', EV.Bow],
  ['aniversario.bolo', 'Aniversário · bolo', '300×300', EV.Cake],
  ['aniversario.bandeirinhas', 'Aniversário · faixa de bandeirinhas', '1200×180', EV.Bunting],
  ['reveillon.fogos', 'Réveillon · fogos', '300×300', EV.Fireworks],
  ['reveillon.serpentina', 'Réveillon · serpentina', '300×300', EV.Streamer],
  ['formatura.capelo', 'Formatura · capelo', '360×270', EV.Cap],
  ['formatura.diploma', 'Formatura · diploma', '360×180', EV.Diploma],
  ['flores.margarida', 'Flores · margarida', '300×330', EV.Daisy],
  ['natureza.sol', 'Natureza · sol', '300×300', EV.Sun],
  ['natureza.broto', 'Natureza · broto', '300×300', EV.Sprout],
  ['medico.estetoscopio', 'Dia do Médico · estetoscópio', '300×300', EV.Stethoscope],
  ['medico.cruz', 'Dia do Médico · cruz', '300×300', EV.MedCross],
  ['coracoes.envelope', 'Corações · envelope', '300×228', EV.Envelope],
];

SLOTS.push(
  ...EVENT_ART.map(([k, label, size, C]) => ({ key: `event.${k}`, group: 'Eventos', label, size: `${size}, PNG transparente`, render: () => <C /> })),
);

// ── Organização dos arquivos (pastas, nomes e estado) ─────────

export const FOLDER: Record<string, { folder: string; where: string }> = {
  Geral: { folder: 'interface', where: 'Saudação e celebrações' },
  Trilha: { folder: 'trilha', where: 'Minha Trilha' },
  Jardim: { folder: 'jardim', where: 'Jardim' },
  Biblioteca: { folder: 'biblioteca', where: 'Biblioteca (armário)' },
  Adesivos: { folder: 'biblioteca/adesivos', where: 'Biblioteca (gaveta de adesivos)' },
  Eventos: { folder: 'eventos', where: 'Eventos, nos ambientes marcados' },
};

/** nome de arquivo sugerido, sempre o mesmo para o mesmo slot */
export const fileNameOf = (s: Slot) => `${FOLDER[s.group]?.folder ?? 'outros'}/${s.key.replace(/\./g, '-')}.png`;

export type AssetStatus = 'enviado' | 'provisorio' | 'criar';
export const statusOf = (s: Slot, assetMap: Record<string, string>): AssetStatus =>
  assetMap[s.key] ? 'enviado' : s.placeholder ? 'criar' : 'provisorio';
export const STATUS_LABEL: Record<AssetStatus, string> = {
  enviado: 'Arte sua (existente)',
  provisorio: 'Provisório · precisa substituir',
  criar: 'Precisa criar',
};

const SLOT_MAP = new Map(SLOTS.map((s) => [s.key, s]));

/** endereço imediato de um arquivo (no site próprio pode ainda estar carregando) */
export const assetUrl = (id: string) => assetUrlSync(id) ?? '';

/** imagem de um arquivo enviado, no Claude ou no site próprio */
export function AssetImg({ id, className, alt = '', onError, loading }: { id: string; className?: string; alt?: string; onError?: () => void; loading?: 'lazy' }) {
  const url = useAssetUrl(id);
  if (!url) return <span className={`asset-loading ${className ?? ''}`} aria-hidden="true" />;
  return <img className={className} src={url} alt={alt} draggable={false} onError={onError} loading={loading} />;
}

/** Renderiza a arte da Yasmim se existir; senão, o provisório. */
export function Asset({ slot, className, alt = '' }: { slot: string; className?: string; alt?: string }) {
  const { data } = useStore();
  const id = data.settings.assetMap[slot];
  const [broken, setBroken] = React.useState(false);
  if (id && !broken) return <AssetImg id={id} className={`asset-img ${className ?? ''}`} alt={alt} onError={() => setBroken(true)} />;
  const s = SLOT_MAP.get(slot);
  return <span className={`asset-svg ${className ?? ''}`}>{s?.render() ?? null}</span>;
}
