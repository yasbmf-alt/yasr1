// Sprite: SVG em pixel amplia sem borrar (pixelated); ilustração raster reduz suave.
import { isVector } from './sprites';
export function BattleSprite({ src, alt, className, w, h }: { src?: string; alt: string; className?: string; w: number; h: number }) {
  if (!src) return <span className={`bt-sprite bt-sprite-missing ${className ?? ''}`} style={{ width: w, height: h }} aria-label={alt} />;
  return <img className={`bt-sprite ${isVector(src) ? '' : 'is-raster'} ${className ?? ''}`} src={src} alt={alt} width={w} height={h} draggable={false} />;
}
