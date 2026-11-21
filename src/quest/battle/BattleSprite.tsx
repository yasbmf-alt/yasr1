// Sprite em pixel art: amplia sem borrar (image-rendering: pixelated).
export function BattleSprite({ src, alt, className, w, h }: { src?: string; alt: string; className?: string; w: number; h: number }) {
  if (!src) return <span className={`bt-sprite bt-sprite-missing ${className ?? ''}`} style={{ width: w, height: h }} aria-label={alt} />;
  return <img className={`bt-sprite ${className ?? ''}`} src={src} alt={alt} width={w} height={h} draggable={false} />;
}
