// Mapa da Yasland: a ilustração da cidade com os prédios clicáveis e selinhos
// com o que está acontecendo em cada lugar. Nuvens, passarinhos e brilhos
// passam por cima para a cidade parecer viva.
import React from 'react';
import { motion } from 'framer-motion';
import { ImgScene, over } from './ui';

export type PlaceId = 'academia' | 'mercadinho' | 'casa' | 'spa' | 'horta' | 'prefeitura';
export const PLACES: { id: PlaceId; name: string; emoji: string }[] = [
  { id: 'academia', name: 'Academia', emoji: '🏋🏻‍♀️' },
  { id: 'mercadinho', name: 'Mercadinho', emoji: '🛒' },
  { id: 'prefeitura', name: 'Prefeitura', emoji: '🏛️' },
  { id: 'casa', name: 'Minha Casa', emoji: '🏠' },
  { id: 'spa', name: 'Spa', emoji: '🧖🏻‍♀️' },
  { id: 'horta', name: 'Horta', emoji: '🌱' },
];

const W = 909;
const H = 797;

export type Pins = Partial<Record<PlaceId, { text: string; tone?: 'alert' | 'ok' } | null>>;

export function CityMap({ onPick, pins }: { onPick: (p: PlaceId) => void; pins?: Pins }) {
  const at: Record<PlaceId, [number, number]> = {
    academia: [380, 82], mercadinho: [700, 92], prefeitura: [790, 250], casa: [180, 318], spa: [330, 536], horta: [700, 530],
  };
  return (
    <ImgScene
      img="s-mapa" w={W} h={H} onPick={(id) => onPick(id as PlaceId)} sparkles={10}
      areas={[
        { id: 'academia', label: 'Academia', box: [118, 92, 330, 210] },
        { id: 'mercadinho', label: 'Mercadinho', box: [512, 100, 262, 200] },
        { id: 'prefeitura', label: 'Prefeitura', box: [650, 262, 245, 255] },
        { id: 'casa', label: 'Minha Casa', box: [8, 320, 290, 205] },
        { id: 'spa', label: 'Spa', box: [150, 540, 262, 220] },
        { id: 'horta', label: 'Horta', box: [488, 535, 300, 225] },
      ]}
    >
      {/* nuvenzinhas passando e passarinhos */}
      <span className="yl-cloud c1" aria-hidden="true" />
      <span className="yl-cloud c2" aria-hidden="true" />
      <span className="yl-bird b1" aria-hidden="true">🕊️</span>
      <span className="yl-bird b2" aria-hidden="true">🦋</span>
      <span className="yl-fount" style={over(W, H, 440, 375)} aria-hidden="true"><i /><i /><i /></span>
      {(Object.keys(at) as PlaceId[]).map((p, i) =>
        pins?.[p] ? (
          <motion.span key={p} className={`yl-mpin ${pins[p]!.tone ? `is-${pins[p]!.tone}` : ''}`} style={over(W, H, at[p][0], at[p][1])} initial={{ scale: 0, y: 10 }} animate={{ scale: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.08, type: 'spring', stiffness: 300, damping: 14 }}>
            {pins[p]!.text}
          </motion.span>
        ) : null,
      )}
    </ImgScene>
  );
}
