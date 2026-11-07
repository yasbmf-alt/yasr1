// Cena ilustrada do arquipélago: a imagem é o cenário e cada ilha tem uma área
// clicável por cima (posições em px da imagem original).
import React from 'react';
import { play } from '../../logic/sound';

export interface Area { id: string; label: string; box: [number, number, number, number] } // x, y, largura, altura

export function ImgScene({ src, w, h, areas, on, onPick, children, sparkles = 8 }: {
  src: string; w: number; h: number; areas: Area[]; on?: string | null; onPick: (id: string) => void; children?: React.ReactNode; sparkles?: number;
}) {
  const pct = (v: number, t: number) => `${(v / t) * 100}%`;
  return (
    <div className="yl-iscene" style={{ aspectRatio: `${w} / ${h}` }}>
      <img src={src} alt="" draggable={false} className="yl-iscene-img" />
      {Array.from({ length: sparkles }).map((_, i) => (
        <i key={i} className="yl-spark" style={{ left: `${(i * 37 + 11) % 92 + 4}%`, top: `${(i * 53 + 7) % 70 + 6}%`, animationDelay: `${(i * 0.7) % 4}s` }} aria-hidden="true" />
      ))}
      {children}
      {areas.map((a) => (
        <button
          key={a.id}
          className={`yl-area ${on === a.id ? 'is-on' : ''}`}
          style={{ left: pct(a.box[0], w), top: pct(a.box[1], h), width: pct(a.box[2], w), height: pct(a.box[3], h) }}
          onClick={() => { play('pop'); onPick(a.id); }}
          aria-label={a.label}
          aria-pressed={on === a.id}
        >
          <span className="yl-area-tip">{a.label}</span>
        </button>
      ))}
    </div>
  );
}

/** posição de um elemento por cima da cena, em px da imagem */
export const over = (w: number, h: number, x: number, y: number, ww?: number, hh?: number): React.CSSProperties => ({
  position: 'absolute', left: `${(x / w) * 100}%`, top: `${(y / h) * 100}%`, ...(ww ? { width: `${(ww / w) * 100}%` } : {}), ...(hh ? { height: `${(hh / h) * 100}%` } : {}),
});
